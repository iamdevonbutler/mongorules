const {isType} = require('../utils');
const {deepGet} = require('lodash-deep');
const PreprocessorCore = require('./core.preprocess');
const {InsertPayload, UpdatePayload} = require('./payload.preprocess');
const {
  getPayloadKeys,
  cleanUpdateKey,
  getQueryFields,
} = require('./utils.preprocess');

// const {
//   deconstructPayload,
//   reconstructPayload,
// } = require('./utils.preprocess');

module.exports = class UpdatePreprocessor extends PreprocessorCore {

  /**
   * @param {Object} schema.
   */
  constructor(schema) {
    super();
    this._payload;
    this._schema = schema;
  }

  /**
   * Using a cached preprocessor object (e.g. InsertPreprocessor),
   * validate and transform a payload w/o CPU heavy data analysis.
   * @param {Array} args - args in db.users.insert({}, {})
   * @param {String} cacheKey - prefix to SubdocumentPreprocessor obj caching.
   * @return {Object} - errors and updated/transformed args.
   */
  preprocessFromCache(args, cacheKey) {
    throw 'need to refactor';
  }

  /**
   * Parses the payload out of the args array.
   * @param {Array} args
   * @return {Object} payload.
   */
  parsePayloadFromArgs(args) {
    var payload;
    payload = isType(args[1], 'array') ? args[1] : [args[1]];
    payload = payload.map((item) => {
      return Object.keys(item).length ? item : null;
    }).filter(Boolean);
    return payload;
  }

  /**
   * Ensure all fields in payload, and in query, are present in schema.
   * Some update operations insert data from the query.
   * Prevents the insertion of fields not found in schema.
   * @param {Array} payload
   * @param {Array} args
   * @return {Error|null}
   */
  ensureFieldsExistInSchema(payload, args) {
    var validQuery, schema, errors = [];
    schema = this._schema;
    // Validate query.
    validQuery = this._queryFieldsExistInSchema(args[0]);
    if (!validQuery) {
      errors.push(`Query fields do not exist in schema.`);
    }
    // Validate payload.
    payload.forEach((payload2, documentNumber) => {
      var payloadKeys = getPayloadKeys(payload2);
      payloadKeys.forEach((payloadKey) => {
        var fieldExistsInSchema;
        payloadKey = cleanUpdateKey(payloadKey);
        fieldExistsInSchema = !!schema[payloadKey];
        if (!fieldExistsInSchema) {
          errors.push(`Field "${payloadKey}" does not exist in schema (document #${documentNumber}).`);
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  /**
   * Adds a deconstructed payload to state.
   * @param {Array} payload.
   * @tests none.
   * @api private.
   */
  addPayload(payload, isUpsert) {
    var schema;
    schema = this._schema;
    if (!payload || !payload.length) {
      return 'Empty payload. Nothing to insert.';
    }
    payload = payload.map((payload2) => {
      var keys, hasOperator;
      keys = Object.keys(payload2);
      hasOperator = keys.some(key => key.indexOf('$') === 0);
      return hasOperator ? new UpdatePayload(payload2, schema, isUpsert) : new InsertPayload(payload2, schema);
    });
    this._payload = payload;
  }

  /**
   * Add preprocessed payload back into original args array.
   * @param {Array} args
   * @return {Array} args.
   * @tests none.
   */
  updateArgs(args) {
    var payload;
    payload = this._payload;
    payload = payload.map(reconstructPayload);
    args[1] = payload;
    return args;
  }

  /**
   * Ensures that a update operation, with upsert = true,
   * has a query that only contains fields that exist in schema.
   * @param {Object} query
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   * @tests unit. @todo migrate tests.
   */
  _queryFieldsExistInSchema(query) {
    var queryFields, schemaFields, schema;
    schema = this._schema;
    queryFields = getQueryFields(query);
    schemaFields = Object.keys(schema);
    return !queryFields.some((queryField) => {
      return schemaFields.indexOf(queryField) === -1;
    });
  }

  hydratePayload(payload) {
    throw 'need to build this.';
  }

  hydratePreprocessList(payload) {
    this._preprocessList.forEach((item) => {
      var path;
      path = item.payloadPath.join('.');
      item.value = deepGet(payload, path);
    });
  }

}
