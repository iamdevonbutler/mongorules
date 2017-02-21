const Preprocessor = require('./preprocessor');
const {isType} = require('../utils');
var SubdocumentPayload; // @todo

module.exports = class SubdocumentPreprocessor extends Preprocessor {

  constructor(schema, isSetOperation = false, isUpsert = false) {
    super(schema, isSetOperation, isUpsert);
    ({SubdocumentPayload} = require('./payload')); // @todo
  }

  /**
   * Using a cached data structures, validate and transform a payload.
   * @param {Array} fieldValue - subdocument array field.
   * @param {String} cacheKey - prefix to SubdocumentPreprocessor obj caching.
   * @return {Object} - errors and updated/transformed args.
   */
  preprocessFromCache(fieldValue, cacheKey, rootKey) {
    var parsedPayload, payloads, errors;

    parsedPayload = this.parsePayload(fieldValue);
    this.hydratePreprocessSet(parsedPayload);

    payloads = this.payloads;
    for (let key in payloads) {
      let payload, payloadSet;
      payload = payloads[key];
      payloadSet = payload.set;
      for (let payloadItem of payloadSet) {
        payloadItem.transform();
        errors = payloadItem.validate(cacheKey);
        if (errors && errors.length) {
          return {errors, fieldValue};
        }
      }
      this.payloads[key].payload = payload.reconstructPayload();
    }

    fieldValue = this.getPayload();

    this.payloads.forEach(payload => payload.resetPayload());

    return {
      errors: errors && errors.length ? errors : null,
      fieldValue,
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
    var {schema, isSetOperation, isUpsert} = this;
    payloads = isType(payloads, 'array') ? payloads : [payloads];
    if (payloads && payloads.length) {
      payloads = payloads.map(payload => new SubdocumentPayload(payload, schema, isSetOperation, isUpsert));
    }
    this.payloads = payloads;
  }

  getPayload() {
    var payloads;
    payloads = this.payloads;
    payloads = payloads.map(payload => payload.payload);
    return payloads;
  }

}
