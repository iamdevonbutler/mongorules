const {isType} = require('./utils');

/**
 * Throw when a document fails schema validation.
 * @param {Array} errors
 * @param {String} collectionName
 * @param {String} methodName
 * @param {String} databaseName
 * @param {String} connectionName
 * @return {throw}
 * @api private.
 */
class DocumentValidationError extends Error {
  constructor(errors, collectionName, methodName, databaseName, connectionName) {
    super();
    this.name = 'Document validation error (mongorules)';
    this.message = `Operation "${methodName}" on collection "${collectionName}" failed validation (${connectionName}.${databaseName}).`;
    this.errors = errors;
  }
}

/**
 * Throw when a schema contains errors.
 * @param {String} schemaName
 * @param {String} message
 * @return {throw}
 * @api private.
 */
class SchemaValidationError extends Error {
  constructor(schemaName, message) {
    super(message);
    this.name = 'Schema validation error (mongorules)';
    this.message = `Invalid syntax (${schemaName}). ${message}`;
  }
}

/**
 * Handle errors using custom handlers.
 * @param {Mixed} errors
 * @param {String} type - error type
 * @param {Function} localHandler - local error handler.
 * @param {Function} globalHandler - global error handler.
 * @param {String} collectionName
 * @param {String} methodName
 * @param {String} databaseName
 * @param {String} connectionName
 * @api private
 * @tests none
 */
var handleErrors = (errors, type, localHandler, globalHandler, collectionName, methodName, databaseName, connectionName) => {
  var result1, result2, info;
  info = {connectionName, databaseName, collectionName, methodName};

  if (localHandler) {
    result1 = localHandler.call(null, errors, info);
  }
  if (globalHandler) { // is an empty object otherwise.
    result2 = globalHandler.call(null, errors, info, !!localHandler);
  }
  if (localHandler || globalHandler) {
    return result1 ? result1 : result2 ? result2 : errors;
  }
  if (type === 'preprocess') {
    return new DocumentValidationError(errors, collectionName, methodName, databaseName, connectionName);
  }
  else {
    return new Error(errors);
  }
};

module.exports = {
  DocumentValidationError,
  SchemaValidationError,
  handleErrors,
};
