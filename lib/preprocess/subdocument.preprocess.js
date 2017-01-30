const PreprocessorCore = require('./core.preprocess');
const {isType} = require('../utils');
const {
  deconstructPayload,
  reconstructPayload,
} = require('./utils.preprocess');

module.exports = class SubdocumentPreprocessor extends PreprocessorCore {

  constructor(schema) {
    super();
    this._payload;
    this._schema = schema;
  }

  preprocessFromCache(payload, parentKey, cacheKey) {
    var schema, errors;
    schema = this._schema;

    this.hydratePayload(payload);
    errors = this.enforceRequiredFields(parentKey);
    if (errors) return errors;
    this.setDefaults();
    errors = this.preprocess(parentKey, cacheKey);
    if (errors) return errors;
    payload = this.getPayload();
    return {
      errors: errors && errors.length ? errors : null,
      payload,
    };
  }

  addPayload(payload, parentKey) {
    payload = isType(payload, 'array') ? payload : [payload];
    payload = payload.map(item => deconstructPayload(item, parentKey));
    this._payload = payload;
  }

  getPayload() {
    var payload;
    payload = this._payload;
    payload = payload.map(reconstructPayload);
    return payload;
  }

}
