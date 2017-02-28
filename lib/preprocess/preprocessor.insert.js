'use strict';

/**
 * @file child class of Preprocessor.
 * Overrides parent methods to handle data specific to insert queries.
 */


const {isType} = require('../utils');
const {InsertPayload} = require('./payload');
const Preprocessor = require('./preprocessor');

module.exports = class InsertPreprocessor extends Preprocessor {

  /**
   * @param {Object} schema.
   */
  constructor(schema) {
    super(schema);
  }

  /**
   * Parses the payload out of the args array.
   * @param {Array} args
   * @return {Object} payload.
   */
  parsePayloadFromArgs(args) {
    var payload;
    payload = isType(args[0], 'array') ? args[0] : [args[0]];
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
    var schema;
    schema = this.schema;
    if (payloads && payloads.length) {
      payloads = payloads.map(payload => new InsertPayload(payload, schema));
    }
    this.payloads = payloads;
  }

  /**
   * Add preprocessed payload back into original args array.
   * @note save operations can't work w/ array fields; therefore we must,
   * set args to an array only when necessary.
   * @param {Array} args
   * @return {Array} args.
   */
  updateArgs(args) {
    var payload;
    payload = this.payloads.map(payload => payload.payload);
    args[0] = payload.length > 1 ? payload : payload[0];
    return args;
  }

}
