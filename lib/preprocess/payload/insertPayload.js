const Payload = require('./payload');

module.exports = class InsertPayload extends Payload {

  constructor(payload, schema) {
    super(payload, schema);
    payload = this.deconstructPayload(payload);
    this.buildPayloadSet(payload, schema);
  }

}
