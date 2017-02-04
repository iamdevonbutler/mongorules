module.exports = class PreprocessorCore {

  constructor(schema) {
    this.payloads;
    this._schema = schema;
  }

  preprocess(cacheKey) {
    var payloads, errors = [];
    payloads = this.payloads;
    payloads.forEach(payload => {
      var errors2;
      errors2 = payload.preprocess(cacheKey);
      if (errors2 && errors2.length) {
        errors = errors.concat(errors2);
      }
    });
    return errors && errors.length ? errors : null;
  }

  resetPayload() {
    this.payloads.forEach(payload => payload.clearValues());
  }


}
