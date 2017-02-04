const Payload = require('./payload');

module.exports = class InsertPayload extends Payload {

  constructor(payload, schema) {
    super(payload, schema);
  }

  preprocess(cacheKey) {
    var errors, payload, schema;

    payload = this._payload;
    schema = this._schema;

    payload = this.deconstructPayload(payload);
    errors = this.buildPayloadSet(payload, schema);
    if (errors && errors.length) {
     return errors;
    }

    errors = super.preprocess(cacheKey);
    if (errors && errors.length) {
      return errors;
    }

    this._payload = this.reconstructPayload();
  }

}
