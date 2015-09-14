'use strict';

/**
 * Throw when a document does not gel w/ the schema.
 * @param {String} collectionName
 * @param {String} action
 * @param {Array} errors
 * @return {throw}
 * @api private.
 */
function DocumentValidationError(collectionName, action, errors) {
  //  Error.captureStackTrace(this);
   this.name = "DocumentValidationError";
   this.message = `Mongo action "${action}" for collection "${collectionName}" failed validation.`;
   this.errors = errors;
}
DocumentValidationError.prototype = Object.create(Error.prototype);


/**
 * Throw when the schema contains errors.
 * @param {String} schemaName
 * @param {String} message
 * @return {throw}
 * @api private.
 */
function SchemaValidationError(schemaName, message) {
   this.name = "mongoproxy schema validation error";
   this.message = `Schema "${schemaName}" - Invalid syntax. ${message}`;
}
SchemaValidationError.prototype = Object.create(Error.prototype);

module.exports = {
  DocumentValidationError: DocumentValidationError,
  SchemaValidationError: SchemaValidationError,
};
