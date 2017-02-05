const {deepGet} = require('lodash-deep');
const {isType} = require('../utils');
const PreprocessorCore = require('./preprocessorCore');
const {InsertPayload, UpdatePayload} = require('./payload');

module.exports = class UpdatePreprocessor extends PreprocessorCore {

  /**
   * @param {Object} schema.
   */
  constructor(schema) {
    super(schema);
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
   * @param {Array} payloads.
   * @param {Boolean} [isUpsert].
   * @tests none.
   * @api private.
   */
  addPayload(payloads = [], isUpsert) {
    var schema;
    schema = this._schema;
    payloads = payloads.map((payload) => {
      var keys, hasOperator;
      keys = Object.keys(payload);
      hasOperator = keys.some(key => key.indexOf('$') === 0);
      return hasOperator ? new UpdatePayload(payload, schema, isUpsert)
        : new InsertPayload(payload, schema);
    });
    this.payloads = payloads;
  }

  /**
   * Add preprocessed payload back into original args array.
   * @param {Array} args
   * @return {Array} args.
   * @tests none.
   */
  updateArgs(args) {
    args[1] = this.payloads[0]._payload;
    return args;
  }

  hydratePreprocessSet(payload) {
    throw 'need to build this.';
    var payloads;
    payloads = this.payloads;
    payloads.forEach(payload => {
      var set;
      set = payload._preprocessSet;
      set.forEach((item) => {
        var path;
        path = item.payloadPath.join('.');
        item.value = deepGet(payload, path);
      });
    });
  }

}
