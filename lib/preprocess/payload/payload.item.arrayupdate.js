const {isType, filterNulls} = require('../../utils');
const {transformValue, transformFunction} = require('../../transform');
const PayloadItem = require('./payload.item');

const {
  validatorArrayOfValuesArrayUpdate,
} = require('../validators');

module.exports = class ArrayUpdatePayloadItem extends PayloadItem {

  constructor(payloadPath, schemaKey, value, fieldSchema, schema) {
    super(payloadPath, schemaKey, value, fieldSchema, schema);
  }

  validateArrayOfValues(fieldValue, fieldKey, fieldSchema) {
    var errors = [];
    errors = validatorArrayOfValuesArrayUpdate.call(null, fieldValue, fieldKey, fieldSchema);
    return errors && errors.length ? errors : null;
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
        // Different than superclass.
        value = schema.filterNulls ? filterNulls(value) : value;
        value = transformValue(value, schema, 1);
        break;
      case 'arrayofobjects':
        value = transformFunction(value, schema, 0);
        break;
    }
    this.value = value;
  }

};
