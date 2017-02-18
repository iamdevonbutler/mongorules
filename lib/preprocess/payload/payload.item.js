const {isType, getSubdocumentSchema, filterNulls} = require('../../utils');
const {transformValue, transformFunction} = require('../../transform');
const SubdocumentPreprocessor = require('../preprocessor.subdocument');
const cache = require('../cache');
const Schema = require('../../schema/schema.class');

const {
  validatorValues,
  validatorArrayOfValues1,
  validatorArrayOfValues2,
  validatorArrayOfObjects1,
} = require('../validators');

module.exports = class PayloadItem {

  constructor(payloadPath, schemaKey, value, fieldSchema, schema) {
    this.payloadPath = payloadPath;
    this.schemaKey = schemaKey;
    this.value = value;
    this.fieldSchema = fieldSchema;
    this.schema = schema;
  }

  validate(cacheKey) {
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
        ({errors, fieldValue} = this.validateArrayOfObjects(fieldValue, schemaKey, fieldSchema, cacheKey));
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

  validateArrayOfObjects(fieldValue, fieldKey, fieldSchema, cacheKey) {
    var payload, cacheKey, cached, errors = [], schema;

    // Validate the array field (not the subdocuments contained w/i).
    errors = validatorArrayOfObjects1.call(null, fieldValue, fieldKey, fieldSchema);
    if (errors && errors.length) {
      return {errors, fieldValue};
    }

    cacheKey = cacheKey ? cacheKey + '.' + fieldKey : null;
    cached = cache.get(cacheKey);
    if (cached) {
      ({errors, fieldValue} = cached.preprocessFromCache(fieldValue, cacheKey, fieldKey));
      if (errors && errors.length) {
        return {errors, fieldValue};
      }
    }
    else {
      let obj, schema2 = {};
      schema = this.schema;
      schema2 = getSubdocumentSchema(fieldKey, schema);
      schema2 = new Schema(schema2);
      obj = new SubdocumentPreprocessor(schema2, fieldKey);
      obj.addPayload(fieldValue);

      errors = obj.preprocess(cacheKey, fieldKey);
      if (errors && errors.length) {
        obj.resetPayload();
        return {errors, fieldValue};
      }

      fieldValue = obj.getPayload();

      obj.resetPayload();
      cache.set(cacheKey, obj);
    }

    return {
      errors: errors && errors.length ? errors : null,
      fieldValue,
    }
  }

  transform() {
    var schema, type, value;
    schema = this.fieldSchema;
    value = this.value;
    type = schema._type;
    switch (type) {
      case 'value':
        value = transformValue(value, schema);
        break;
      case 'arrayofvalues':
        let isArray;
        value = schema.filterNulls ? filterNulls(value) : value;
        value = transformFunction(value, schema, 0);
        isArray = isType(value, 'array');
        if (isArray) {
          value = value.map(value2 => transformValue(value2, schema, 1));
        }
        break;
      case 'arrayofobjects':
        value = transformFunction(value, schema, 0);
        break;
    }
    this.value = value;
  }

};
