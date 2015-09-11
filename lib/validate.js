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
  // _validateArrayOfValues(value, fieldKey, schema) {
  //   let type, result, errors = [];
  //
  // },

  /**
   * Given a array of values/objects, validate according to schema.
   * @param {Array} value
   * @param {String} fieldKey
   * @param {Object} schema
   * @return {true|errors Array}
   * @api private.
   * @tests none
   */
  _validateArray(value, fieldKey, schema) {
    let type, result, errors = [];

    // Validate required.
    result = this._validateRequired(value, schema)
    if (!result) {
      errors.push({ field: fieldKey, property: 'required', value: value });
    }

    // If not required and value is undefined, do not continue validating.
    if (_.isUndefined(value)) {
      return errors.length ? errors : true;
    }

    // Validate type.
    type = utils._getType(value);
    if (type !== 'array') {
      errors.push({ field: fieldKey, property: 'type', value: value, expected: 'array' });
    }

    // Validate notNull.
    result = this._hasNulls(value);
    if (result) {
      errors.push({ field: fieldKey, property: 'notNull', value: value });
    }

    // Validate minLength.
    result = this._validateMinLength(value, schema);
    if (!result) {
      errors.push({ field: fieldKey, property: 'minLength', actual: value.length, expected: schema.minLength });
    }

    // Validate maxLength.
    result = this._validateMinLength(value, schema);
    if (!result) {
      errors.push({ field: fieldKey, property: 'maxLength', actual: value.length, expected: schema.maxLength });
    }

    // Custom validation function.
    // result = this._validateFunction(value, schema)
    // if (!result) {
    //   errors.push({ field: fieldKey, property: 'validate', value: value });
    // }

    return errors.length ? errors : true;
  },

  /**
   * Given a field value, validate according to schema.
   * @param {Mixed} value
   * @param {String} fieldKey
   * @param {Object} schema
   * @return {true|errors Array}
   * @api private.
   * @tests none
   */
  _validateValue(value, fieldKey, schema) {
    var errors = [], result;

    // Validate required.
    result = this._validateRequired(value, schema)
    if (!result) {
      errors.push({ field: fieldKey, property: 'required', value: value });
    }

    // If not required and value is undefined, do not continue validating.
    if (_.isUndefined(value)) {
      return errors.length ? errors : true;
    }

    // Validate type.
    result = this._validateType(value, schema);
    if (!result) {
      if (schema.dateFormat) {
        errors.push({ field: fieldKey, property: 'type', value: value, expected: schema.type + ': ' + schema.dateFormat });
      }
      else {
        errors.push({ field: fieldKey, property: 'type', value: value, expected: schema.type });
      }
    }

    // Validate minLength.
    result = this._validateMinLength(value, schema);
    if (!result) {
      errors.push({ field: fieldKey, property: 'minLength', actual: value.length, expected: schema.minLength });
    }

    // Validate maxLength.
    result = this._validateMinLength(value, schema);
    if (!result) {
      errors.push({ field: fieldKey, property: 'maxLength', actual: value.length, expected: schema.maxLength });
    }

    // Validate XSS.
    result = this._validateDenyXSS(value, schema);
    if (!result) {
      errors.push({ field: fieldKey, property: 'denyXSS', value: value });
    }

    // Custom validation function.
    result = this._validateFunction(value, schema)
    if (!result) {
      errors.push({ field: fieldKey, property: 'validate', value: value });
    }

    return errors.length ? errors : true;
  },

  /**
   * Check array for null values.
   * @param {Array} values - array or array of arrays.
   * @return {Boolean}
   * @api private.
   * @tests none.
   */
  _hasNulls(values) {
    var nulls = false;
    values.forEach((value) => {
      if (utils._isType(value, 'array')) {
        nulls = this._hasNulls(value);
      }
      else {
        if (value === null) {
          nulls = true;
        }
      }
    });
    return nulls;
  },

  /**
   * Validate that a field is required.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   * @tests none.
   */
  _validateRequired(value, schema) {
    if (!schema.required) {
      return true;
    }
    if (utils._isType(value, 'array')) {
      return !!value.length;
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
   * @tests none.
   */
  _validateType(value, schema) {
    if (!schema.type) {
      return true;
    }
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
   * @tests none.
   */
  _validateDenyXSS(value, schema) {
    if (schema.denyXSS && schema.type === 'string' && value !== sanitize.inHTMLData(value)) {
      return false;
    }
    return true;
  },


  /**
   * Validate that a array/string is w/i the length requirement.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   * @tests none.
   */
  _validateMaxLength(value, schema) {
    if (schema.maxLength === null) {
      return true;
    }
    if (schema.type === 'string' || schema.type === 'array') {
      return value.length <= schema.maxLength;
    }
    return true;
  },

  /**
   * Validate that a array/string is w/i the length requirement.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   * @tests none.
   */
  _validateMinLength(value, schema) {
    if (schema.minLength === null) {
      return true;
    }
    if (schema.type === 'string' || schema.type === 'array') {
      return value.length >= schema.minLength;
    }
    return true;
  },

  /**
   * Run field through custom validate function that returns `true` or `false`.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api private.
   * @tests none.
   */
  _validateFunction(value, schema) {
    if (!schema.validate) {
      return true;
    }
    var valid = schema.validate.call(schema, value);
    if (!!valid === false) {
      return false;
    }
    return true;
  }

};
