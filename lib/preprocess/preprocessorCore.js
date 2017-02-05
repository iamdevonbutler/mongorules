module.exports = class PreprocessorCore {

  constructor(schema) {
    this.payloads;
    this._schema = schema;
  }

  preprocess(cacheKey, rootKey) {
    var payloads, errors = [];
    payloads = this.payloads;
    payloads.forEach(payload => {
      var errors2;
      errors2 = payload.preprocess(cacheKey, rootKey);
      if (errors2 && errors2.length) {
        errors = errors.concat(errors2);
      }
    });
    return errors && errors.length ? errors : null;
  }

  /**
   * Remove the values from our payload objects but keep the other meta info.
   */
  resetPayload() {
    this.payloads.forEach(payload => payload.clearValues());
  }


}
