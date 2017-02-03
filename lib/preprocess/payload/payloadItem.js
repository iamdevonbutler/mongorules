const {isType, getSubdocumentSchema} = require('../../utils');
const {transformValue, transformFunction} = require('../../transform');
const SubdocumentPreprocessor = require('../subdocumentPreprocessor');

const {
  validatorValues,
  validatorArrayOfValues1,
  validatorArrayOfValues2,
  validatorArrayOfObjects1,
} = require('../validators');

module.exports = class PayloadItem {

  constructor(payloadPath, schemaKey, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema, cacheKey) {
    this.payloadPath = payloadPath;
    this.schemaKey = schemaKey;
    this.value = value;
    this.modifiers = modifiers;
    this.isEach = isEach;
    this.itemInArray = itemInArray;
    this.embeddedFieldUpdate = embeddedFieldUpdate;
    this.fieldSchema = fieldSchema;
    this._errors = [];
  }

  preprocess(cacheKey) {
    var schema, type, errors;
    schema = this.fieldSchema;
    type = schema._type;
    switch (type) {
      case 'value':
        errors = this.preprocessFieldValue(this.value, this.schemaKey, this.fieldSchema);
        break;
      case 'arrayofvalues':
        errors = this.preprocessArrayOfValues(this.fieldValue, this.schemaKey, this.fieldSchema);
        break;
      case 'arrayofobjects':
        errors = this.preprocessArrayOfObjects(this.fieldValue, this.schemaKey, this.fieldSchema, cacheKey);
        break;
    }
    return errors && errors.length ? errors : null;
  }

  preprocessFieldValue(fieldValue, fieldKey, fieldSchema) {
    var errors;
    errors = validatorValues.call(null, fieldValue, fieldKey, fieldSchema);
    return errors && errors.length ? errors : null;
  }

  preprocessArrayOfObjects(fieldValue, fieldKey, fieldSchema, cacheKey) {
    var payload, cacheKey, cached, errors = [];

    // Validate the array field (not the subdocuments contained w/i).
    errors = validatorArrayOfObjects1.call(null, fieldValue, fieldKey, fieldSchema);
    if (errors && errors.length) {
      return errors;
    }

    cacheKey = cacheKey + '.' + fieldKey;
    cached = cache.get(cacheKey);
    if (cached) {
      ({errors, payload} = cached.preprocessFromCache(fieldValue, fieldKey, cacheKey));
      if (errors && errors.length) return errors;
    }
    else {
      let obj, schema = {};
      schema = getSubdocumentSchema(fieldKey, this._schema);
      obj = new SubdocumentPreprocessor(schema);
      obj.addPayload(fieldValue, fieldKey);
      errors = obj.preprocess(fieldKey, cacheKey);
      if (errors) return errors;
      payload = obj.getPayload();
      obj.resetPayload();
      cache.set(cacheKey, obj);
    }

    // Update fieldValue array w/ our newly preprocessed subdocument.
    fieldValue = fieldValue.map((value, i) => payload[i]);

    return errors && errors.length ? errors : null;
  }

  preprocessArrayOfValues(fieldValue, fieldKey, fieldSchema) {
    var parents, errors = [];
    errors = validatorArrayOfValues1.call(null, fieldValue, fieldKey, fieldSchema);
    if (!errors) {
      let isArray = isType(fieldValue, 'array');
      if (isArray) {
        fieldValue.forEach((value) => {
          let error;
          error = validatorArrayOfValues2.call(null, value, fieldKey, fieldSchema);
          if (error) {
            errors = errors.concat(error);
          }
        });
      }
    }
    return errors && errors.length ? errors : null;
  }

  transform() {
    var schema, type;
    schema = this.fieldSchema;
    type = schema._type;
    switch (type) {
      case 'value':
        this.value = transformValue(this.value, schema);
        break;
      case 'arrayofvalues':
        let value, isArray;
        value = transformFunction(this.value, schema, 0);
        isArray = isType(value, 'array');
        if (isArray) {
          this.value = value.map(value2 => transformValue(value2, schema, 1));
        }
        break;
      case 'arrayofobjects':
        this.value = transformFunction(this.value, schema, 0);
        break;
    }
  }

};
