const Payload = require('./payload');

module.exports = class SubdocumentPayload extends Payload {

  constructor(payload, schema) {
    super(payload, schema);
  }

  adjustPayloadKeys(payload, rootKey) {
    var keys, obj = {};
    keys = Object.keys(payload);
    keys.forEach(key => {
      obj[rootKey +'.'+ key] = payload[key];
    })
    return obj;
  }

  preprocess(rootKey) {
    var errors, payload, schema;

    payload = this._payload;
    schema = this._schema;

    payload = this.deconstructPayload(payload);
    payload = this.adjustPayloadKeys(payload, rootKey);
    errors = this.buildPayloadSet(payload, schema);
    if (errors && errors.length) {
      return errors;
    }

    errors = super.preprocess();
    if (errors && errors.length) {
      return errors;
    }

    this._payload = this.reconstructPayload();
  }

}
