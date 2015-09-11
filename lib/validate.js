'use strict';

const _ = require('lodash');
const utils = require('./utils');

module.exports = {

  /**
   * @todo test
   * Given a array of values, validate according to schema.
   * @param {Array} value
   * @param {String} fieldKey
   * @param {Object} schema
   * @return {true|errors Array}
   * @api private.
   */
  _validateArrayOfValues(value, fieldKey, schema) {
    let type, result, errors = [];

  },

  /**
   * @todo test
   * Given a array of objects, validate according to schema.
   * @param {Array} value
   * @param {String} fieldKey
   * @param {Object} schema
   * @return {true|errors Array}
   * @api private.
   */
  _validateArrayOfObjects(value, fieldKey, schema) {

    let type, result, errors = [];

    // Required field.
    if (schema.required) {
      result = this._validateRequired(value, schema)
      if (!result) {
        errors.push({ field: fieldKey, property: 'required', value: value });
      }
    }

    // If not required and value is undefined, do not continue validating.
    if (_.isUndefined(value)) {
      return errors.length ? errors : true;
    }

    // Validate is array.
    type = utils._getType(value);
    if (type !== 'array') {
      errors.push({ field: fieldKey, expected: 'array', actual: type });
    }

    // Validate minLength.
    let len = value.length;
    if (schema.minLength) {
      if (len < schema.minLength) {
        errors.push({ field: fieldKey, property: 'minLength', expected: schema.minLength, actual: len });
      }
    }

    // Validate maxLength.
    if (schema.maxLength) {
      if (len > schema.maxLength) {
        errors.push({ field: fieldKey, property: 'maxLength', expected: schema.maxLength, actual: len });
      }
    }

    // Custom validation function.
    if (schema.validate) {
      result = this._validateFunction(value, fieldSchema)
      if (!result) {
        errors.push({ field: fieldKey, property: 'validate', value: value });
      }
    }

    return errors.length ? errors : true;
  },

  /**
   * Given a field value, validate according to schema.
   * @param {Mixed} value
   * @param {String} fieldKey
   * @param {Object} schema
   * @return {true|errors Array}
   * @api private.
   */
  _validateValue(value, fieldKey, schema) {
    var errors = [], result;

    // Required field.
    if (schema.required) {
      result = this._validateRequired(value, schema)
      if (!result) {
        errors.push({ field: fieldKey, property: 'required', value: value });
      }
    }

    // If not required and value is undefined, do not continue validating.
    if (_.isUndefined(value)) {
      return errors.length ? errors : true;
    }

    // Validate type.
    if (schema.type) {
      result = this._validateType(value, schema);
      if (!result) {
        if (schema.dateFormat) {
          errors.push({ field: fieldKey, property: 'type', value: value, expected: schema.type + ': ' + schema.dateFormat });
        }
        else {
          errors.push({ field: fieldKey, property: 'type', value: value, expected: schema.type });
        }
      }
    }

    // Validate XSS for strings.
    if (schema.type === 'string' && schema.denyXSS) {
      result = this._validateDenyXSS(value, schema);
      if (!result) {
        errors.push({ field: fieldKey, property: 'denyXSS', value: value });
      }
    }

    // Custom validation function.
    if (schema.validate) {
      result = this._validateFunction(value, fieldSchema)
      if (!result) {
        errors.push({ field: fieldKey, property: 'validate', value: value });
      }
    }

    return errors.length ? errors : true;
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
      return !_.isUndefined(value) && !_.isNull(value);
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
