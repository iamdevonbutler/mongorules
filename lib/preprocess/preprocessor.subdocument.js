const Preprocessor = require('./preprocessor');
const {isType} = require('../utils');
var SubdocumentPayload; // @todo

module.exports = class SubdocumentPreprocessor extends Preprocessor {

  constructor(schema) {
    super(schema);
    ({SubdocumentPayload} = require('./payload')); // @todo
  }

  /**
   * Using a cached data structures, validate and transform a payload.
   * @param {Array} fieldValue - subdocument array field.
   * @param {String} cacheKey - prefix to SubdocumentPreprocessor obj caching.
   * @return {Object} - errors and updated/transformed args.
   */
  preprocessFromCache(fieldValue, cacheKey, rootKey) {
    var payload, schema, errors;
    schema = this._schema;
    payload = this.parsePayload(fieldValue);
    this.hydratePreprocessSet(payload);



    // var payloads = this.payloads;
    // for (let payload of payloads) {
    //   var payloadSet = payload._payloadSet;
    //   for (let payloadItem of payloadSet) {
    //     payloadItem.transform();
    //     errors = payloadItem.validate(cacheKey);
    //     if (errors && errors.length) {
    //       return {errors, args};
    //     }
    //   }
    // }


    errors = this.preprocess(cacheKey, rootKey);
    payload = this.getPayload();
    this.resetPayload();

    return {
      errors: errors && errors.length ? errors : null,
      fieldValue: payload,
    };
  }

  /**
   * Parses the payload out of the args array.
   * @param {Array} args
   * @return {Object} payload.
   */
  parsePayload(obj) {
    var payload;
    payload = isType(obj, 'array') ? obj : [obj];
    payload = payload.map((item) => {
      return isType(item, 'object') && Object.keys(item).length ? item : null;
    }).filter(Boolean);
    return payload;
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
