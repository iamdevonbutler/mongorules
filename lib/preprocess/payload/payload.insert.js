'use strict';

const Payload = require('./payload');

module.exports = class InsertPayload extends Payload {

  /**
   * @param {Object} payload
   * @param {Object} schema
   */
  constructor(payload, schema) {
    super(payload, schema);
  }

  preprocess() {
    var errors, payload, schema;
    payload = this.payload;
    schema = this.schema;

    payload = this.deconstructPayload(payload);
    errors = this.buildPayloadSet(payload, schema, false, false, false);
    if (errors && errors.length) {
     return errors;
    }

    errors = super.preprocess();
    if (errors && errors.length) {
      return errors;
    }

    this.payload = this.reconstructPayload();
    return null;
  }

}
