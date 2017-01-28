const {isType} = require('../utils');
const {deepGet} = require('lodash-deep');
const PreprocessorCore = require('./core.preprocess');

const {
  deconstructPayload,
  reconstructPayload,
} = require('./utils.preprocess');

module.exports = class InsertPreprocessor extends PreprocessorCore {

  /**
   * @param {Array} args.
   * @param {Object} schema.
   */
  constructor(schema) {
    super();
    this._payload;
    this._schema = schema;
  }

  preprocessFromCache(args) {
    var payload, schema, errors;
    schema = this._schema;
    payload = this._payload;

    this._hydratePayload(args);

    errors = this.enforceRequiredFields();
    if (errors) return {errors, args};
    this.setDefaults();
    errors = this.preprocess();
    if (errors) return {errors, args};
    args = this.updateArgs(args);
    this.reset();

    return {
      errors: errors && errors.length ? errors : null,
      args,
    };
  }

  preporces() {
    return super.preprocess();
  }

  enforceRequiredFields() {
    return super.enforceRequiredFields();
  }

  purgeFieldsNotInSchema() {
    return super.purgeFieldsNotInSchema();
  }

  setDefaults() {
    return super.setDefaults();
  }

  validate(value, key, fieldSchema) {
    return super.validate(value, key, fieldSchema);
  }

  validateArrayOfObjects(values, key, fieldSchema) {
    return super.validateArrayOfObjects(values, key, fieldSchema);
  }

  validateArrayOfValues(values, key, fieldSchema) {
    return super.validateArrayOfValues(values, key, fieldSchema);
  }

  transform(value, fieldSchema) {
    return super.transform(value, fieldSchema);
  }

  transformArrayOfObjects(value, fieldSchema) {
    return super.transformArrayOfObjects(value, fieldSchema);
  }

  transformArrayOfValues(value, fieldSchema) {
    return super.transformArrayOfValues(value, fieldSchema);
  }

  /**
   * Parses payload from args, and turns payload
   * into an array and filters empty documents.
   * @param {Object|Array} payload.
   * @return {Array}
   * @tests none.
   * @api private.
   */
  addPayload(args) {
    var payload;
    payload = isType(args[0], 'array') ? args[0] : [args[0]];
    payload = payload.map((item) => {
      return Object.keys(item).length ? item : null;
    }).filter(Boolean).map(deconstructPayload);
    this._payload = payload;
  }

  _hydratePayload(args) {
    var payload;
    payload = this._normalizePayload(args);
    this._payload.forEach((payload2, i) => {
      var keys;
      keys = Object.keys(payload2);
      keys.forEach((key) => {
        this._payload[i][key].value = deepGet(payload[i], key);
      });
    });
  }

  updateArgs(args) {
    var payload;
    payload = this._payload;
    payload = payload.map(reconstructPayload);
    args[0] = payload;
    return args;
  }

  /**
   * Remove the data from the deconstructed payload values property
   * so that it can be updated to work w/ new data for subsequent requests.
   */
  _clearPayloadValues() {
    var payload;
    payload = this._payload;
    payload.forEach((payload2, i) => {
      var keys;
      keys = Object.keys(payload2);
      keys.forEach((key) => {
        this._payload[i][key].value = undefined;
      });
    });
  }

  reset() {
    this._clearPayloadValues();
  }

  getCachePreprocessor() {
    return this;
  }

}
