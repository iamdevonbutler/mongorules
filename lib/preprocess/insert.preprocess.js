const {isType} = require('../utils');
const {deepGet} = require('lodash-deep');
const PreprocessorCore = require('./core.preprocess');
const {InsertPayload} = require('./payload.preprocess');

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
    throw 'need to refactor';
    // var payload, schema, errors;
    // schema = this._schema;
    //
    // payload = this.parsePayloadFromArgs(args);
    // this.hydratePayload(payload);
    // errors = this.preprocess(null, cacheKey);
    // if (errors) return {errors, args};
    // args = this.updateArgs(args);
    // this.resetPayload();
    //
    // return {
    //   errors: errors && errors.length ? errors : null,
    //   args,
    // };
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
   * Ensure all fields in payload are present in schema.
   * Prevents the insertion of fields not found in schema.
   * @param {Array} payload
   * @param {Array} args
   * @return {Error|null}
   */
  ensureFieldsExistInSchema(payload, args) {
    var schema, payload, errors = [];
    schema = this._schema;
    payload.forEach((payload2, documentNumber) => {
      var payloadKeys = getPayloadKeys(payload2);
      payloadKeys.forEach((payloadKey) => {
        var fieldExistsInSchema;
        fieldExistsInSchema = !!schema[payloadKey];
        if (!fieldExistsInSchema) {
          errors.push(`Field "${payloadKey}" does not exist in schema (document #${documentNumber}).`);
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  /**
   * Adds a deconstructed payload to state.
   * @param {Array} payload.
   * @tests none.
   * @api private.
   */
  addPayload(payload) {
    var schema;
    schema = this._schema;
    if (!payload || !payload.length) {
      return 'Empty payload. Nothing to insert.';
    }
    payload = payload.map(payload2 => new InsertPayload(payload2, schema));
    this._payload = payload;
  }

  /**
   * Add preprocessed payload back into original args array.
   * @param {Array} args
   * @return {Array} args.
   * @tests none.
   */
  updateArgs(args) {
    var payload;
    payload = this._payload;
    payload = payload.map(reconstructPayload);
    args[0] = payload;
    return args;
  }

  /**
   * Given a new payload, add values to the cached payload object.
   * @param {Array|Object} payload
   */
  hydratePayload(payload) {
    var payload2;
    payload2 = this._payload;
    payload2.forEach((payload3, i) => {
      var keys;
      keys = Object.keys(payload3);
      keys.forEach((key) => {
        this._payload[i][key].value = deepGet(payload[i], key);
      });
    });
  }

}
