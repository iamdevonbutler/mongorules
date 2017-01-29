const {isType} = require('../utils');
const {deepGet} = require('lodash-deep');
const PreprocessorCore = require('./core.preprocess');

const {
  deconstructPayload,
  reconstructPayload,
} = require('./utils.preprocess');

module.exports = class InsertPreprocessor extends PreprocessorCore {

  /**
   * @param {Object} schema.
   */
  constructor(schema) {
    super();
    this._payload;
    this._schema = schema;
  }

  /**
   * Using a cached preprocessor object (e.g. InsertPreprocessor),
   * validate and transform a payload w/o CPU heavy data analysis.
   * @param {Array} args - args in db.users.insert({}, {})
   * @param {String} cacheKey - prefix to SubdocumentPreprocessor obj caching.
   * @return {Object} - errors and updated/transformed args.
   */
  preprocessFromCache(args, cacheKey) {
    var payload, schema, errors;
    schema = this._schema;

    payload = isType(args[0], 'array') ? args[0] : [args[0]];
    this.hydratePayload(payload);
    errors = this.enforceRequiredFields();
    if (errors) return {errors, args};
    this.setDefaults();
    errors = this.preprocess(null, cacheKey);
    if (errors) return {errors, args};
    args = this.updateArgs(args);
    this.resetPayload();

    return {
      errors: errors && errors.length ? errors : null,
      args,
    };
  }

  /**
   * Parses the payload out of the args array.
   * @param {Array} args
   * @return {Object} payload.
   */
  parsePayloadFromArgs(args) {
    var payload;
    payload = isType(args[0], 'array') ? args[0] : [args[0]];
    payload = payload.map((item) => {
      return Object.keys(item).length ? item : null;
    }).filter(Boolean);
    return payload;
  }

  /**
   * Adds a deconstructed payload to state.
   * @param {Array} payload.
   * @tests none.
   * @api private.
   */
  addPayload(payload) {
    payload = payload.map(deconstructPayload);
    if (!payload || !payload.length) {
      return 'Empty payload. Nothing to insert.'
    }
    this._payload = payload;
  }

  updateArgs(args) {
    var payload;
    payload = this._payload;
    payload = payload.map(reconstructPayload);
    args[0] = payload;
    return args;
  }

  ensurePayloadFieldsExistInSchema(payload) {
    return super.ensurePayloadFieldsExistInSchema(payload);
  }

  enforceRequiredFields() {
    return super.enforceRequiredFields();
  }

  setDefaults() {
    return super.setDefaults();
  }

  preprocess(parentKey = '', cacheKey) {
    return super.preprocess(parentKey, cacheKey);
  }

  validate(value, key, fieldSchema, cacheKey) {
    return super.validate(value, key, fieldSchema, cacheKey);
  }

  validateArrayOfObjects(values, key, fieldSchema, cacheKey) {
    return super.validateArrayOfObjects(values, key, fieldSchema, cacheKey);
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

  hydratePayload(payload) {
    return super.hydratePayload(payload);
  }

  resetPayload() {
    return super.resetPayload();
  }


}
