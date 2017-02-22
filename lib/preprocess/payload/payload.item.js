const {isType, getSubdocumentSchema, filterNulls} = require('../../utils');
const {transformValue, transformFunction} = require('../../transform');
const SubdocumentPreprocessor = require('../preprocessor.subdocument');
const cache = require('../cache');

const {
  validatorValues,
  validatorArrayOfValues1,
  validatorArrayOfValues2,
  validatorArrayOfObjects1,
} = require('../validators');

module.exports = class PayloadItem {

  constructor(payloadPath, schemaKey, value, fieldSchema, schema, isSetOperation, isUpsert) {
    this.payloadPath = payloadPath;
    this.schemaKey = schemaKey;
    this.value = value;
    this.fieldSchema = fieldSchema;
    this.schema = schema;
    this.isSetOperation = isSetOperation;
    this.isUpsert = isUpsert;
  }

  validate() {
    var fieldSchema, type, schemaKey, fieldValue, errors;
    fieldSchema = this.fieldSchema;
    schemaKey = this.schemaKey;
    fieldValue = this.value;
    type = fieldSchema._type;
    switch (type) {
      case 'value':
        errors = this.validateFieldValue(fieldValue, schemaKey, fieldSchema);
        break;
      case 'arrayofvalues':
        errors = this.validateArrayOfValues(fieldValue, schemaKey, fieldSchema);
        break;
      case 'arrayofobjects':
        ({errors, fieldValue} = this.validateArrayOfObjects(fieldValue, schemaKey, fieldSchema));
        this.value = fieldValue;
        break;
    }
    return errors && errors.length ? errors : null;
  }

  validateFieldValue(fieldValue, fieldKey, fieldSchema) {
    var errors = [];
    errors = validatorValues.call(null, fieldValue, fieldKey, fieldSchema);
    return errors && errors.length ? errors : null;
  }

  validateArrayOfValues(fieldValue, fieldKey, fieldSchema) {
    var errors = [];
    errors = validatorArrayOfValues1.call(null, fieldValue, fieldKey, fieldSchema);
    if (!errors || !errors.length) {
      fieldValue.forEach((value) => {
        var errors2;
        errors2 = validatorArrayOfValues2.call(null, value, fieldKey, fieldSchema);
        if (errors2) {
          errors = errors.concat(errors2);
        }
      });
    }
    return errors && errors.length ? errors : null;
  }

  validateArrayOfObjects(fieldValue, fieldKey, fieldSchema) {
    var payload, cached, errors = [], schema;
    var {isSetOperation, isUpsert} = this;

    // Validate the array field (not the subdocuments contained w/i).
    errors = validatorArrayOfObjects1.call(null, fieldValue, fieldKey, fieldSchema);
    if (errors && errors.length) {
      return {errors, fieldValue};
    }

    cached = cache.getSubcache();
    if (0 && cached) {
      ({errors, fieldValue} = cached.preprocessFromCache(fieldValue, fieldKey));
      if (errors && errors.length) {
        return {errors, fieldValue};
      }
    }
    else {
      let obj, schema2 = {};
      schema = this.schema;
      schema2 = getSubdocumentSchema(fieldKey, schema);
      obj = new SubdocumentPreprocessor(schema2, isSetOperation, isUpsert);
      obj.addPayload(fieldValue);

      errors = obj.preprocess(fieldKey);
      if (errors && errors.length) {
        obj.resetPayload();
        return {errors, fieldValue};
      }

      fieldValue = obj.getPayload();

      obj.resetPayload();
      cache.addSubcache(obj);
    }

    return {
      errors: errors && errors.length ? errors : null,
      fieldValue,
    }
  }

  transform() {
    var fieldSchema, type, value;
    fieldSchema = this.fieldSchema;
    value = this.value;
    type = fieldSchema._type;
    switch (type) {
      case 'value':
        value = transformValue(value, fieldSchema);
        break;
      case 'arrayofvalues':
        let isArray;
        value = fieldSchema.filterNulls ? filterNulls(value) : value;
        value = transformFunction(value, fieldSchema, 0);
        isArray = isType(value, 'array');
        if (isArray) {
          value = value.map(value2 => transformValue(value2, fieldSchema, 1));
        }
        break;
      case 'arrayofobjects':
        value = transformFunction(value, fieldSchema, 0);
        break;
    }
    this.value = value;
  }

};
