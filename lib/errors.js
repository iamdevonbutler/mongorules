'use strict';

/**
 * Throw when a field does not gel w/ the schema.
 * @param {String} collectionName
 * @param {String} action
 * @param {Array} errors
 * @return {throw}
 * @api private.
 */
function FieldValidationError(collectionName, action, errors) {
  //  Error.captureStackTrace(this);
   this.name = "mongoproxy field validation error";
   this.message = `Mongo action "${action}" for collection "${collectionName}" failed validation.`;
   this.errors = errors;
}
FieldValidationError.prototype = Object.create(Error.prototype);


/**
 * Throw when the schema contains errors.
 * @param {String} schemaName
 * @param {String} message
 * @return {throw}
 * @api private.
 */
function SchemaValidationError(schemaName, message) {
   this.name = "mongoproxy schema validation error";
   this.message = `Schema field "${schemaName}" - Invalid syntax. ${message}`;
}
SchemaValidationError.prototype = Object.create(Error.prototype);

module.exports = {
  FieldValidationError: FieldValidationError,
  SchemaValidationError: SchemaValidationError,
};
