const {isType} = require('../utils');
const {deepGet} = require('lodash-deep');
const {InsertPayload} = require('./payload');
const PreprocessorCore = require('./preprocessorCore');

module.exports = class InsertPreprocessor extends PreprocessorCore {

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
    // var payload, schema, errors;
    // schema = this._schema;
    //
    // payload = this.parsePayloadFromArgs(args);
    // this.hydratePreprocessSet(payload);
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
   * Adds a deconstructed payload to state.
   * @param {Array} payload.
   * @tests none.
   * @api private.
   */
  addPayload(payloads = []) {
    var schema;
    schema = this._schema;
    if (payloads && payloads.length) {
      payloads = payloads.map(payload => new InsertPayload(payload, schema));
    }
    this.payloads = payloads;
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
      return isType(item, 'object') && Object.keys(item).length ? item : null;
    }).filter(Boolean);
    return payload;
  }

  /**
   * Add preprocessed payload back into original args array.
   * @param {Array} args
   * @return {Array} args.
   * @tests none.
   */
  updateArgs(args) {
    args[0] = this.payloads.map(payload => payload._payload);;
    return args;
  }

  /**
   * Given a new payload, add values to the cached payload object.
   * @param {Array|Object} payload
   */
  hydratePreprocessSet(payload) {
    throw 'hydrate payload.';
    var payloads;
    payloads = this.payloads;
    payloads.payloadSet.forEach((set, i) => {
      keys.forEach((key) => {
        this.payloads[i].payloadSet[key].value = deepGet(payload[i], key);
      });
    });
  }

}
