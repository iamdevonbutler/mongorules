'use strict';

/**
 * @file child class of Payload.
 * Overrides parent methods to handle data specific to subdocuments.
 */

const Payload = require('./payload');

module.exports = class SubdocumentPayload extends Payload {

  /**
   * @param {Object} payload
   * @param {Object} schema
   * @param {Boolean} isSetOperation
   * @param {Boolean} isUpsert
   */
  constructor(payload, schema, isSetOperation = false, isUpsert = false) {
    super(payload, schema, isSetOperation, isUpsert);
  }

  /**
   * @param {Object} payload
   * @param {String} rootKey
   * @return {Object}
   */
  adjustPayloadKeys(payload, rootKey) {
    var keys, obj = {};
    keys = Object.keys(payload);
    keys.forEach(key => {
      obj[rootKey +'.'+ key] = payload[key];
    })
    return obj;
  }

  /**
   * @param {String} rootKey
   * @return {Object}
   */
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
