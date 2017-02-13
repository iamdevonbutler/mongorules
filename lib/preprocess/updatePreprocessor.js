const {isType, getQueryFields} = require('../utils');
const PreprocessorCore = require('./preprocessorCore');
const {InsertPayload, UpdatePayload} = require('./payload');

module.exports = class UpdatePreprocessor extends PreprocessorCore {

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
    payload = isType(args[1], 'array') ? args[1] : [args[1]];
    payload = payload.map((item) => {
      return isType(item, 'object') && Object.keys(item).length ? item : null;
    }).filter(Boolean);
    return payload;
  }

  /**
   * Adds a deconstructed payload to state.
   * @param {Array} payloads.
   * @param {Boolean} [isUpsert].
   * @tests none.
   * @api private.
   */
  addPayload(payloads = [], isUpsert) {
    var schema;
    schema = this._schema;
    payloads = payloads.map((payload) => {
      var keys, hasOperator;
      keys = Object.keys(payload);
      hasOperator = keys.some(key => key.indexOf('$') === 0);
      return hasOperator ? new UpdatePayload(payload, schema, isUpsert)
        : new InsertPayload(payload, schema);
    });
    this.payloads = payloads;
  }

  /**
   * Is upsert = true;
   * @param {Array} args
   * @return {Boolean}
   */
  isUpsert(args) {
    return args && args[2] && args[2].upsert ? true : false;
  }

  validateQuery(query, schema) {
    var queryFields, schemaFields;
    queryFields = getQueryFields(query);
    schemaFields = Object.keys(schema._schema);
    return queryFields.every(queryField => schemaFields.indexOf(queryField) > -1);
  }

  /**
   * Add preprocessed payload back into original args array.
   * @param {Array} args
   * @return {Array} args.
   * @tests none.
   */
  updateArgs(args) {
    args[1] = this.payloads[0]._payload;
    return args;
  }

}
