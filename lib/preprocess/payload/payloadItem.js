const {isType} = require('../../utils');
const {
  transformValue,
  transformFunction,
} = require('../../transform');

module.exports = class PayloadItem {

  constructor(payloadPath, schemaKey, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema) {
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

  getErrors() {
    return this._errors && this._errors.length ? this._errors : null;
  }

  preprocess() {
    return null;
    console.log('payload item preprocess hit');
    var schema, type, errors;
    schema = this.fieldSchema;
    type = schema._type;
    switch (type) {
      case 'value':
        // ({errors, fieldValue} = this.preprocessFieldValue(fieldValue, fieldKey, fieldSchema));
        break;
      case 'arrayofvalues':
        // ({errors, fieldValue} = this.preprocessArrayOfValues(fieldValue, fieldKey, fieldSchema));
        break;
      case 'arrayofobjects':
        // ({errors, fieldValue} = this.preprocessArrayOfObjects(fieldValue, fieldKey, fieldSchema, cacheKey));
        break;
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
