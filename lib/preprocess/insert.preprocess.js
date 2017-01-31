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

    payload = this.parsePayloadFromArgs(args);
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

}
