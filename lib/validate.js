'use strict';

const _ = require('lodash');

module.exports = {

  /**
   * Given a field value, validate according to schema.
   * @param {Mixed} value
   * @param {String} fieldName
   * @param {Object} fieldSchema
   * @return {true|errors Array}
   * @api private.
   */
  _validateValue(value, fieldName, fieldSchema) {
    var errors = [], result;

    // Required field.
    if (fieldSchema.required) {
      result = this._validateRequired(value, fieldSchema)
      if (!result) {
        errors.push({ field: fieldName, property: 'required', value: value });
      }
    }

    // If not required and value is undefined, do not continue validating.
    if (_.isUndefined(value)) {
      return errors.length ? errors : true;
    }

    // Validate type.
    if (schema.type) {
      result = this._validateType(value, fieldSchema);
      if (!result) {
        if (schema.dateFormat) {
          errors.push({ field: fieldName, property: 'type', value: value, expected: schema.type + ': ' + schema.dateFormat });
        }
        else {
          errors.push({ field: fieldName, property: 'type', value: value, expected: schema.type });
        }
      }
    }

    // Validate XSS for strings.
    if (schemaType === 'string' && schema.denyXSS) {
      result = this._validateDenyXSS(value, fieldSchema);
      if (!result) {
        errors.push({ field: fieldName, property: 'denyXSS', value: value });
      }
    }

    // Custom validation function.
    if (schema.validate) {
      result = this._validateFunction(value, fieldSchema)
      if (!result) {
         errors.push({ field: fieldName, property: 'validate', value: value });
      }
    }

    return errors.length ? errros : true;
  },

  /**
   * Validate that a field is required.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   */
  _validateRequired(value, schema) {
    if (!schema.required) {
      return true;
    }
    if (schema.notNull) {
      return !_.isNull(value);
    }
    else {
      return !_.isUndefined(value);
    }
  },

  /**
   * Validate that a field is of type defined in schema.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   */
  _validateType(value, schema) {
    if (schema.type === 'date') {
      return utils._validateDate(value, schema.dateFormat);
    }
    else {
      return utils._isType(value, schema.type);
    }
  },

  /**
   * Validate that a string field does not contain XSS.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   */
  _validateDenyXSS(value, schema) {
    if (schema.denyXSS && value !== sanitize.inHTMLData(value)) {
      return false;
    }
    return true;
  },

  /**
   * Run field through custom validate function that returns `true` or `false`.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   */
  _validateFunction(value, schema) {
    var valid = schema.validate.call(schema, value);
    if (!!valid === false) {
      return false;
    }
    return true;
  }

};
