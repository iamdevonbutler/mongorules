const Payload = require('./payload');

module.exports = class SubdocumentPayload extends Payload {

  constructor(payload, schema, isSetOperation = false, isUpsert = false) {
    super(payload, schema, isSetOperation, isUpsert);
  }

  adjustPayloadKeys(payload, rootKey) {
    var keys, obj = {};
    keys = Object.keys(payload);
    keys.forEach(key => {
      obj[rootKey +'.'+ key] = payload[key];
    })
    return obj;
  }

  preprocess(rootKey = '') {
    var errors, payload, schema, isSetOperation, isUpsert;
    var {payload, schema, isSetOperation, isUpsert} = this;

    payload = this.deconstructPayload(payload);
    payload = this.adjustPayloadKeys(payload, rootKey);
    errors = this.buildPayloadSet(payload, schema, true, isSetOperation, isUpsert);
    if (errors && errors.length) {
      return errors;
    }

    errors = super.preprocess();
    if (errors && errors.length) {
      return errors;
    }

    this.payload = this.reconstructPayload();
  }

}
