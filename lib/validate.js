'use strict';

const _ = require('lodash');
const utils = require('./utils');
const sanitize = require('xss-filters');

/**
 * Superclass.
 */
class Validator {

  /**
   * Add methods to validate data.
   * @param {Mixed} value
   * @param {String} fieldKey
   * @param {Object} schema
   * @param {Boolean} validateRequired - override the schema required field (for updates).
   * @return `this`.
   */
  constructor(value, fieldKey, schema, validateRequired) {
    // Init properties.
    this.value = value;
    this.schema = schema;
    this.fieldKey = fieldKey;
    this._errors = [];
    this._skip = false;

    validateRequired = validateRequired !== undefined ? validateRequired : schema.required;
    if (validateRequired) {
      this._validateRequired();
    }
    if (_.isUndefined(value) || _.isNull(value)) {
      this._skip = true;
    }
    return this;
  };

  /**
   * Executres a custom validation function.
   * @param {Mixed} value
   * @param {String} fieldKey
   * @param {Object} schema
   * @param {Function} func - custom validation function.
   * Should add errors to this.addError();
   *     @param {Mixed} value
   *     @param {String} fieldKey
   *     @param {Object} schema
   * @return `this`
   * @api public.
   * @tests none.
   */
  validate(func) {
    if (!this._skip) {
      func.call(this, this._value, this._fieldKey, this._schema);
    }
    return this;
  };

  /**
   * Add error to the errors array.
   * @param {Object} obj.
   * @param {Object} obj.
   * @param {Boolean} custom - if this is a custom error message.
   * @return `this`
   * @api public.
   * @tests none.
   */
  addError(property, obj, custom = false) {
    if (!custom) {
      obj = _.merge({
        field: this.fieldKey,
        property: property,
        value: this.value
      }, obj);
    }
    this._errors.push(obj);
    return this;
  }

  /**
   * Returns errors from validation if the exist.
   * @return {Array|null}
   * @api public.
   */
  getErrors() {
    return this._errors.length ? this._errors : null;
  };

  /**
   * Validate that a field is required.
   * Called on construction.
   * @return `this`
   * @api private.
   * @tests unit.
   */
  _validateRequired() {
    if (!this.schema.required || this._skip) {
      return this;
    }
    if (this.schema.notNull) {
      if (_.isUndefined(this.value) || _.isNull(this.value)) {
        this.addError('required');
      }
    }
    else {
      if (_.isUndefined(this.value)) {
        this.addError('required');
      }
    }
    return this;
  };

  /**
   * Validate that a field is of type defined in schema.
   * @param {String} type - to validate against a type different from the
   * type declared in schema.
   * @return `this`
   * @api public.
   * @tests unit.
   */
  validateType(type) {
    type = type || this.schema.type;
    if (!type || this._skip) {
      return this;
    }
    if (type === 'date') {
      if (!utils._validateDate(this.value, this.schema.dateFormat)) {
        this.addError('type', { expected: type + ': ' + this.schema.dateFormat });
      }
    }
    else {
      if (!utils._isType(this.value, type)) {
        this.addError('type', { expected: type });
      }
    }
    return this;
  };

  /**
   * Validate that a string field does not contain XSS.
   * @return `this`
   * @api public.
   * @tests unit.
   */
  validateDenyXSS() {
    if (!this.schema.denyXSS || this._skip) {
      return this;
    }
    if (utils._isType(this.value, 'string') && this.value !== sanitize.inHTMLData(this.value)) {
      this.addError('denyXSS');
    }
    return this;
  };

  /**
   * Validate that a array/string is w/i the length requirement.
   * ONLY works on scalar values. Arrays of values, must itterate,
   * and pass in each value individually.
   * @param {Number} pos - the minLength value, from schema,
   * to use from the minLength array.
   * @return `this`
   * @api private.
   * @tests unit.
   */
  validateMinLength(pos = 0) {
    var type;
    if (this._skip) {
      return this;
    }
    if (_.isNull(this.schema.minLength[pos]) || _.isUndefined(this.schema.minLength[pos])) {
      return this;
    }
    type = utils._getType(this.value);
    if ((type === 'string' || type === 'array') && this.value.length < this.schema.minLength[pos]) {
      this.addError('minLength', {
        length: this.value.length,
        expected: this.schema.minLength[pos]
      });
    }
    return this;
  };

  /**
   * Validate that a array/string is w/i the length requirement.
   * ONLY works on scalar values. Arrays of values, must itterate,
   * and pass in each value individually.
   * @param {Number} pos - the maxLength value, from schema,
   * to use from the minLength array.
   * @return `this`
   * @api private.
   * @tests unit.
   */
  validateMaxLength(pos = 0) {
    var type;
    if (this._skip) {
      return this;
    }
    if (_.isNull(this.schema.maxLength[pos]) || _.isUndefined(this.schema.maxLength[pos])) {
      return this;
    }
    type = utils._getType(this.value);
    if ((type === 'string' || type === 'array') && this.value.length > this.schema.maxLength[pos]) {
      this.addError('maxLength', {
        length: this.value.length,
        expected: this.schema.maxLength[pos]
      });
    }
    return this;
  };

  /**
   * Execute custom validate function that returns `true` or `false`.
   * @param {Number} pos - the function to use from the validate array.
   * @return `this`
   * @api public.
   * @tests unit.
   */
  validateFunction(pos = 0) {
    if (this._skip || !this.schema.validate[pos]) {
      return this;
    }
    if (!this.schema.validate[pos].call(null, this.value, this.schema)) {
      this.addError('validate');
    }
    return this;
  };

};

module.exports = Validator;
