const Payload = require('./payload');

module.exports = class InsertPayload extends Payload {

  constructor(payload, schema) {
    super(payload, schema);
  }

  preprocess(cacheKey) {
    var errors, payload, schema;
    payload = this.payload;
    schema = this.schema;

    payload = this.deconstructPayload(payload);
    errors = this.buildPayloadSet(payload, schema);
    if (errors && errors.length) {
     return errors;
    }

    errors = super.preprocess(cacheKey);
    if (errors && errors.length) {
      return errors;
    }

    this.payload = this.reconstructPayload();
    return null;
  }

}
