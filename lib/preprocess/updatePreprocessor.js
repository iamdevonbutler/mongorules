const {deepGet} = require('lodash-deep');
const {isType} = require('../utils');
const PreprocessorCore = require('./preprocessorCore');
const {InsertPayload, UpdatePayload} = require('./payload');

module.exports = class UpdatePreprocessor extends PreprocessorCore {

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
  }

  /**
   * Parses the payload out of the args array.
   * @param {Array} args
   * @return {Object} payload.
   */
  parsePayloadFromArgs(args) {
    var payload;
    // Cast payload to array for data processing consistency.
    payload = isType(args[1], 'array') ? args[1] : [args[1]];
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
  addPayload(payload, isUpsert) {
    var schema;
    schema = this._schema;
    if (!payload || !payload.length) {
      return 'Empty payload. Nothing to insert.';
    }
    payload = payload.map((payload2) => {
      var keys, hasOperator;
      keys = Object.keys(payload2);
      hasOperator = keys.some(key => key.indexOf('$') === 0);
      return hasOperator ? new UpdatePayload(payload2, schema, isUpsert) : new InsertPayload(payload2, schema);
    });
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
    payload = payload.map(payload2 => payload2.reconstructPayload());
    args[1] = payload;
    return args;
  }

  hydratePreprocessSet(payload) {
    throw 'need to build this.';
    this._preprocessSet.forEach((item) => {
      var path;
      path = item.payloadPath.join('.');
      item.value = deepGet(payload, path);
    });
  }

}
