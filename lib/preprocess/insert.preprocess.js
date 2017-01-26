const {isType} = require('../utils');
const {
  deconstructPayload,
  reconstructPayload,
} = require('./utils.preprocess');
const {
  compose,
  validateRequired,
  validateNotNull,
  validateType,
  validateDenyXSS,
  validateMinLength,
  validateMaxLength,
  validateFunction,
} = require('./validate');

const validator = compose(validateNotNull, validateType(), validateDenyXSS, validateMinLength(0), validateMaxLength(0), validateFunction(0))

module.exports = class InsertPreprocessor {

  /**
   * @param {Array} args.
   * @param {Object} schema.
   */
  constructor(args, schema) {
    var payload;
    payload = this._normalizePayload(args[0]);
    payload = deconstructPayload(payload);

    this._payload = payload;
    this._args = args;
    this._schema = schema;
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
    }
    return payload.map((item) => {
      return Object.keys(item).length ? item : null;
    }).filter(Boolean);
  }

  enforceRequiredFields() {
    var schema, payload, errors = [];
    schema = this._schema;
    payload = this._payload;
    payload.forEach((_document, documentNumber) => {
      schema.forEach((fieldSchema, key) => {
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
      _document.forEach((field, key) => {
        let fieldExistsInSchema;
        fieldExistsInSchema = !!schema[key];
        if (!fieldExistsInSchema) {
          errors.push(`Field "${key}" does not exist in schema (doument #${documentNumber}).`);
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  setDefaults() {
    var schema, payload, errors = [];
    schema = this._schema;
    payload = this._payload;
    schema.forEach((fieldSchema, key) => {
      if (fieldSchema.default !== undefined && payload[key] === undefined) {
        payload[key] = {
          payloadPath: key,
          value: fieldSchema.default,
        };
      }
    });
  }

  preprocess() {
    var payload, schema, errors = [];
    payload = this._payload;
    schema = this._schema;
    return payload.map((item, key) => {
      let error;
      fieldSchema = schema[key]
      error = validator.call(null, item.value, key, schema[key]);
      if (errors) errors.push(error);
      return this._transform();
    }).filter(Boolean);
  }

  validate() {}
  transform() {}

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

  }
}
