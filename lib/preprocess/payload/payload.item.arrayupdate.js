const {isType, filterNulls, getSubdocumentSchema} = require('../../utils');
const {transformValue, transformFunction} = require('../../transform');
const SubdocumentPreprocessor = require('../preprocessor.subdocument');
const PayloadItem = require('./payload.item');
const cache = require('../cache');

const {
  validatorArrayOfValuesArrayUpdate,
} = require('../validators');

module.exports = class ArrayUpdatePayloadItem extends PayloadItem {

  constructor(payloadPath, schemaKey, value, fieldSchema, schema, isSetOperation, isUpsert) {
    super(payloadPath, schemaKey, value, fieldSchema, schema, isSetOperation, isUpsert);
  }

  validateArrayOfValues(fieldValue, fieldKey, fieldSchema) {
    var errors = [];
    errors = validatorArrayOfValuesArrayUpdate.call(null, fieldValue, fieldKey, fieldSchema);
    return errors && errors.length ? errors : null;
  }

  validateArrayOfObjects(fieldValue, fieldKey, fieldSchema) {
    var payload, cached, errors = [], schema;
    var {isSetOperation, isUpsert} = this;

    cached = cache.getSubcache();
    if (cached) {
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
        return {errors, fieldValue};
      }

      fieldValue = obj.getPayload()[0]; // notice the [0] - value is cast to array by subdoc preprocessor.

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
        // Different than superclass.
        value = fieldSchema.filterNulls ? filterNulls(value) : value;
        value = transformValue(value, fieldSchema, 1);
        break;
      case 'arrayofobjects':
        value = transformFunction(value, fieldSchema, 0);
        break;
    }
    this.value = value;
  }

};
