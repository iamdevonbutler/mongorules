const {isType} = require('../utils');
const Payload = require('./payload');

const {
  deconstructPayload,
  reconstructPayload,
} = require('./utils.preprocess');

const {
  transformValue,
  transformFunction,
  transformString,
} = require('../transform');

const {
  compose,
  validateRequired,
  validateNotNull,
  validateType,
  validateDenyXSS,
  validateMinLength,
  validateMaxLength,
  validateFunction,
} = require('../validate');

const validatorValues = compose(
  validateRequired,
  validateNotNull,
  validateType(),
  validateDenyXSS,
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayOfValues1 = compose(
  validateRequired,
  validateNotNull,
  validateType('array'),
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayOfValues2 = compose(
  validateNotNull,
  validateType(),
  validateMinLength(1),
  validateMaxLength(1),
  validateFunction(1)
);

module.exports = class InsertPreprocessor {

  /**
   * @param {Array} args.
   * @param {Object} schema.
   */
  constructor(args, schema) {
    var payload;
    payload = this._payloadParser(args);

    this._payload = payload;
    this._args = args;
    this._schema = schema;
  }

  _payloadParser(args) {
    var payload;
    payload = this._normalizePayload(args[0]);
    payload = payload.map(deconstructPayload);
    return payload;
  }

  /**
   * Turns payload into an array and filters non-documents.
   * @param {Object|Array} payload.
   * @return {Array}
   * @tests none.
   * @api private.
   */
  _normalizePayload(payload) {
    if (!isType(payload, 'array')) {
      payload = [payload];
      return payload;
    }
    return payload.map((item) => {
      return Object.keys(item).length ? item : null;
    }).filter(Boolean);
  }

  enforceRequiredFields() {
    var schema, schemaKeys, payload, errors = [];
    schema = this._schema;
    schemaKeys = Object.keys(schema);
    payload = this._payload;
    payload.forEach((_document, documentNumber) => {
      schemaKeys.forEach((key) => {
        var fieldSchema = schema[key];
        if (fieldSchema.required) {
          if (!payload[key] || payload[key].value === undefined) {
            errors.push({
              field: key,
              property: 'required',
              value: payload[key] ? payload[key].value : undefined,
              documentNumber,
            });
          }
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  purgeFieldsNotInSchema() {
    var schema, payload, errors = [];
    schema = this._schema;
    payload = this._payload;
    payload.forEach((_document, documentNumber) => {
      var documentKeys = Object.keys(_document);
      documentKeys.forEach((key) => {
        var fieldExistsInSchema;
        fieldExistsInSchema = !!schema[key];
        if (!fieldExistsInSchema) {
          errors.push(`Field "${key}" does not exist in schema (doument #${documentNumber}).`);
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  setDefaults() {
    var schema, schemaKeys, payload, errors = [];
    schema = this._schema;
    schemaKeys = Object.keys(schema);
    payload = this._payload;
    schemaKeys.forEach((key) => {
      var fieldSchema = schema[key];
      if (fieldSchema.default !== undefined && payload[key] === undefined) {
        payload[key] = {
          payloadPath: key,
          value: fieldSchema.default,
        };
      }
    });
  }

  /**
   * Validate and transform a payload(s).
   * @return {Array - errors|null}
   */
  preprocess() {
    var payload, schema, errors = [];
    payload = this._payload;
    schema = this._schema;
    payload.forEach((payload2, i) => {
      var schemaKeys;
      schemaKeys = Object.keys(schema);
      schemaKeys.forEach((key) => {
        var fieldValue, fieldSchema, error, transformedValue;
        fieldValue = payload2[key] ? payload2[key].value : undefined;
        fieldSchema = schema[key];
        error = this.validate(fieldValue, key, schema[key]);
        if (error) {
          errors = errors.concat(error);
        }
        else if (fieldValue !== undefined) {
          transformedValue = this.transform(fieldValue, schema[key]);
          payload[i][key].value = transformedValue;
        }
      });
    });
  }

  validate(value, key, fieldSchema) {
    var type, errors = [];
    type = fieldSchema._type;
    switch (type) {
      case 'values':
        errors = validatorValues.call(null, value, key, fieldSchema);
        break;
      case 'arrayofvalues':
        errors = this.validateArrayOfValues(value, key, fieldSchema);
        break;
      case 'arrayofobjects':
        throw 'asdfasdfasdfasadsfadfsf';
        // errors = validatorArrayOfObjects.call(null, value, key, fieldSchema);
        break;
    }
    return errors && errors.length ? errors : null;
  }

  validateArrayOfValues(values, key, fieldSchema) {
    var errors = [];
    errors = validatorArrayOfValues.call(null, values, key, fieldSchema);
    if (!errors) {
      let isArray = isType(values, 'array');
      if (isArray) {
        values.forEach((value) => {
          let error;
          error = validatorArrayOfValues2.call(null, value, key, fieldSchema);
          if (error) {
            errors = errors.concat(error);
          }
        });
      }
    }
    return errors && errors.length ? errors : null;
  }

  transform(value, fieldSchema) {
    var type;
    type = fieldSchema._type;
    switch (type) {
      case 'values':
        return transformValue(value, fieldSchema, 0);
      case 'arrayofvalues':
        return this.transformArrayOfValues(value, fieldSchema);
      case 'arrayofobjects':
        throw 'dfasdfsfadsfadsfasdfda';
        // return transformValue(value, fieldSchema, pos);
    }
  }

  transformArrayOfValues(value, fieldSchema) {
    var value2, isArray;
    value2 = transformFunction(value, fieldSchema, 0);
    isArray = utils.isType(value2, 'array');
    if (isArray) {
      value2 = value2.map((value3) => {
        return transformValue(value3, fieldSchema, 1);
      });
    }
    return value2;
  }

  /**
   * Returns args array.
   * Call after enforceRequiredFields(), setDefaults(), validate() and transform().
   * @return {Array of Objects}
   */
  getArgs() {
    var payload;
    payload = reconstructPayload(this._payload);
    this._args[0] = payload;
    return this._args;
  }

  getCachePreprocessor() {
    var payload, schema, payloadObj;
    payload = this._payload;
    schema = this._schema;
    payloadObj = new Payload(payload, schema);
    payloadObj.addPayloadParser(this._payloadParser);
    payloadObj.addPreprocessor(this.preprocess);
    payloadObj.addArgsGetter(this.getArgs);
    return payloadObj;

  }
}
