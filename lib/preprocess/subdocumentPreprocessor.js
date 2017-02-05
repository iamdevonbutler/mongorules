const PreprocessorCore = require('./preprocessorCore');
const {isType} = require('../utils');
var SubdocumentPayload; // @todo

module.exports = class SubdocumentPreprocessor extends PreprocessorCore {

  constructor(schema) {
    super(schema);
    ({SubdocumentPayload} = require('./payload')); // @todo
  }

  preprocessFromCache(parentKey, payload, cacheKey) {
    // var schema, errors;
    // schema = this._schema;
    //
    // this.hydratePreprocessSet(payload);
    // errors = this.preprocess(parentKey, cacheKey);
    // if (errors) return errors;
    // payload = this.getPayload();
    // return {
    //   errors: errors && errors.length ? errors : null,
    //   payload,
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
      payloads = payloads.map(payload => new SubdocumentPayload(payload, schema));
    }
    this.payloads = payloads;
  }

  getPayload() {
    var payloads;
    payloads = this.payloads;
    payloads = payloads.map(payload => payload._payload);
    return payloads;
  }

}
