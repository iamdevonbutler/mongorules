'use strict';

/**
 * @file child class of Preprocessor.
 * Overrides parent methods to handle data specific to processing subdocuments.
 */


const Preprocessor = require('./preprocessor');
const {isType} = require('../utils');
var SubdocumentPayload; // @todo

module.exports = class SubdocumentPreprocessor extends Preprocessor {

  /**
   * @param {Object} schema
   * @param {Boolean} [isSetOperation]
   * @param {Boolean} [isUpsert]
   */
  constructor(schema, isSetOperation = false, isUpsert = false) {
    super(schema, isSetOperation, isUpsert);
    ({SubdocumentPayload} = require('./payload')); // @todo
  }

  /**
   * Using a cached data structures, validate and transform a payload.
   * @param {Array} fieldValue - subdocument array field.
   * @param {String} rootKey
   * @return {Object} - errors and updated/transformed args.
   */
  preprocessFromCache(fieldValue, rootKey) {
    var parsedPayload, payloads, errors;

    parsedPayload = this.parsePayload(fieldValue);
    this.hydratePreprocessSet(parsedPayload);

    payloads = this.payloads;
    for (let key in payloads) {
      let payload, payloadSet;
      payload = payloads[key];
      payloadSet = payload.set;
      for (let payloadItem of payloadSet) {
        payloadItem.transform();
        errors = payloadItem.validate();
        if (errors && errors.length) {
          this.resetPayload();
          return {errors, fieldValue};
        }
      }
      this.payloads[key].payload = payload.reconstructPayload();
    }

    fieldValue = this.getPayload();
    this.resetPayload();

    return {
      errors: errors && errors.length ? errors : null,
      fieldValue,
    };
  }

  /**
   * Parses the payload out of the args array.
   * @param {Array} obj
   * @return {Object} payload.
   */
  parsePayload(obj) {
    var payload;
    payload = isType(obj, 'array') ? obj : [obj];
    payload = payload.map((item) => {
      return isType(item, 'object') && Object.keys(item).length ? item : null;
    }).filter(Boolean);
    return payload;
  }

  /**
   * Adds a deconstructed payload to state.
   * @param {Array} payloads.
   */
  addPayload(payloads = []) {
    var {schema, isUpsert} = this;
    payloads = isType(payloads, 'array') ? payloads : [payloads];
    if (payloads && payloads.length) {
      payloads = payloads.map(payload => new SubdocumentPayload(payload, schema, isUpsert));
    }
    this.payloads = payloads;
  }

  getPayload() {
    var payloads;
    payloads = this.payloads;
    payloads = payloads.map(payload => payload.payload);
    return payloads;
  }

}
