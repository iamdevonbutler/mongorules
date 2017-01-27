module.exports = class Payload {

  constructor(payload, schema) {
    this._payload = payload;
    this._schema = schema;
    this._preprocessor;
    this._payloadParser;
    this._getArgs;
  }

  /**
   * Remove the data from the deconstructed payload values property
   * so that it can be updated to work w/ new data for subsequent requests.
   */
  clearPayloadValues() {
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
  _addValuesToPayload(obj) {
    var payload;
    payload = this._payload;
    payload.forEach((item, key) => {
      this._payload[key].value = obj[key];
    });
    return this._payload;
  }

  addPayloadParser(parser) {
    this._payloadParser = parser;
  }

  addPreprocessor(preprocessor) {
    this._preprocessor = preprocessor;
  }

  addArgsGetter(getter) {
    this._getArgs = getter;
  }

  preprocess(args) {
    console.log('payload preprocess hit');
    var payload, schema, preprocessor, errors, args;
    preprocessor = this._preprocessor;
    schema = this._schema;
    payload = this._payloadParser(args);
    payload = this._addValuesToPayload(payload);
    errors = preprocessor.call(null, payload, schema);
    args = this._getArgs();
    this.clearPayloadValues();
    return {
      errors: errors && errors.length ? errors : null,
      args,
    };
  }

}
