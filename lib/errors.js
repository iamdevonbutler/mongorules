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

module.exports = {
  DocumentValidationError,
  SchemaValidationError,
};
