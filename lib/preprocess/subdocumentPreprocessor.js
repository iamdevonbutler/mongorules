const PreprocessorCore = require('./preprocessorCore');
const {isType} = require('../utils');

module.exports = class SubdocumentPreprocessor extends PreprocessorCore {

  constructor(schema) {
    super();
    this._payload;
    this._schema = schema;
  }

  preprocessFromCache(payload, parentKey, cacheKey) {
    throw 'need to refactor';

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

  addPayload(payload, parentKey) {
    payload = isType(payload, 'array') ? payload : [payload];
    payload = payload.map(item => deconstructPayload(item, parentKey));
    this._payload = payload;
  }

  getPayload() {
    var payload;
    payload = this._payload;
    payload = payload.map(payload2 => payload2.reconstructPayload());
    return payload;
  }

}
