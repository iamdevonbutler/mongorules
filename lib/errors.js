/**
 * Throw when a document fails schema validation.
 * @param {String} collectionName
 * @param {String} action
 * @param {Array} errors
 * @return {throw}
 * @api private.
 */
class DocumentValidationError extends Error {
  constructor(collectionName, action, errors) {
    super(message);
    this.name = 'Mongorules - document validation error';
    this.message = `Action "${action}" on collection "${collectionName}" failed validation.`;
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
    this.name = 'Mongorules - schema validation error';
    this.message = `Schema "${schemaName}" - Invalid syntax. ${message}`;;
  }
}

/**
 * Handle errors using custom handlers.
 * @param {Mixed} err
 * @param {String} type - error type
 * @param {String} collectionName
 * @param {String} operation
 * @param {Function} locaHandler - local error handler.
 * @param {Function} globalHandler - global error handler.
 * @api private
 * @tests none
 */
var handleErrors = function(err, type, collectionName, operation, localHandler, globalHandler) {
  if (localHandler) {
    localHandler.call(null, collectionName, operation, err);
  }
  if (globalHandler) {
    globalHandler.call(null, collectionName, operation, err, !!localHandler);
  }
  if (!localHandler || !globalHandler) {
    if (type === 'preprocess') {
      throw new DocumentValidationError(collectionName, operation, err);
    }
    throw new Error(err);
  }
};

module.exports = {
  DocumentValidationError,
  SchemaValidationError,
  handleErrors,
};
