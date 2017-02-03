module.exports = class PreprocessorCore {

  constructor(schema) {
    this._payload;
    this._schema = schema;
  }

  preprocess(cacheKey) {
    var payload, errors = [];
    payload = this._payload;
    payload.forEach(payload2 => {
      var errors2 = payload2.preprocess(cacheKey);
      if (errors2 && errors2.length) {
        errors = errors.concat(errors2);
      }
    });
    return errors && errors.length ? errors : null;
  }

  resetPayload() {
    this._payload.forEach(payload => payload.clearValues());
  }


}
