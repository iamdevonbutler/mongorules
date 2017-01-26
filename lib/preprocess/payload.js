module.exports = class Payload {

  constructor(payload, schema) {
    this._payload = payload;
    this._schema = schema;;
    this._preprocessor;
  }

  /**
   * Remove the data from the deconstructed payload values property
   * so that it can be updated to work w/ new data for subsequent requests.
   */
  resetValues() {
    var payload;
    payload = this._payload;
    payload.forEach((item, key) => {
      this._payload[key].value = undefined;
    });
  }

  /**
   * Update payload values w/ data for new operation.
   * @param {Object} obj - e.g. {key: value}
   */
  updatePayload(obj) {
    var payload;
    payload = this._payload;
    payload.forEach((item, key) => {
      this._payload[key].value = obj[key];
    });
  }

  addPreprocessor(preprocessor) {
    this._preprocessor = preprocessor;
  }

  preprocess() {
    this._preprocessor.call(null, this._payload, this._schema);
  }

}
