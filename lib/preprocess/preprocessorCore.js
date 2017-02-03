module.exports = class PreprocessorCore {

  constructor(schema) {
    this._payload;
    this._schema = schema;
  }

  preprocess() {
    var payload, errors;
    payload = this._payload;
    errors = payload.map(payload2 => payload2.preprocess()).filter(Boolean);
    return errors && errors.length ? errors : null;
  }

  resetPayload() {
    this._payload.forEach(payload => payload.clearValues());
  }


}
