'use strict';

/**
 * @file child class of UpdatePreprocessor.
 * Overrides parent methods to handle data specific to findAndModify operations.
 */


const {isType} = require('../utils');
const UpdatePreprocessor = require('./preprocessor.update');

module.exports = class FindAndModifyPreprocessor extends UpdatePreprocessor {

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
    // Cast payload to array for data processing consistency.
    payload = [args[2]];
    payload = payload.map((item) => {
      return isType(item, 'object') && Object.keys(item).length ? item : null;
    }).filter(Boolean);
    return payload;
  }

  /**
   * Is upsert = true;
   * @param {Array} args
   * @return {Boolean}
   */
  isUpsertOperation(args) {
    return args && args[3] && args[3].upsert ? true : false;
  }

  /**
   * Add preprocessed payload back into original args array.
   * @param {Array} args
   * @return {Array} args.
   */
  updateArgs(args) {
    args[2] = this.payloads[0].payload;
    return args;
  }
}
