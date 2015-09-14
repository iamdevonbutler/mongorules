'use strict';

const _ = require('lodash');
const utils = require('./utils');

/**
 * Superclass.
 */
class Validator {

  /**
   * Add methods to validate data.
   * @param {Array} methodNames.
   * @return `this`.
   */
  constructor() {
    // Init properties.
    this._methods = [];
    this._setState();
    return this;
  };

  /**
   * Adds a validation method to evaluate data when the
   * validate() function is called.
   * @param {Function} method - validation method to be executed.
   *     @param {Mixed} value
   *     @param {String} fieldKey
   *     @param {Object} schema
   * @param {Function} error - error to be returned upon failed validation.
   *     @param {Mixed} value
   *     @param {String} fieldKey
   *     @param {Object} schema
   * @param {Number} pos - for properties that take arrays of multiple properties,
   * use this property in the array.
   * @return `this`.
   * @api public.
   */
  addMethod(method, error = null, pos = 0) {
    this._methods.push({ method: method, error: error, pos: pos });
    return this;
  };

  /**
   * Removes a method from the validation chain.
   * @param {Function} method - validation method to be renoved.
   * @return `this`.
   * @api public.
   */
  removeMethod(method) {
    for (let key in this._methods) {
      if (this._methods[key] === method) {
        this._methods.splice(key, 1);
      }
    }
    return this;
  };

  /**
   * Validates a value according to provided validation methods.
   * @param {Array} value
   * @param {String} fieldKey
   * @param {Object} schema
   * @return {Boolean}
   * @api public.
   */
  validate(value, fieldKey, schema) {
    var result;

    // Reset state.
    this._setState();

    // Itterate over each validation method.
    for (let obj of this._methods) {
      if (this._break) {
        return !!this._errors.length;
      }
      result = obj.method.call(null, value, schema, obj.pos);
      if (result === false && obj.error) {
        this._errors.push(obj.error.call(null, value, fieldKey, schema));
      }
    }

    return !this._errors.length;
  };

  /**
   * Returns errors from validation if the exist.
   * @return {Array|null}
   * @api public.
   */
  getErrors() {
    return this._errors.length ? this._errors : null;
  };

  /**
   * Break out of a validate loop.
   * @return `this`
   * @api public.
   */
  break() {
    this._break = true;
    return this;
  };

  /**
   * Sets inital state.
   * @return `this`
   * @api private.
   */
  _setState() {
    this._errors = [];
    this._break = false;
    return this;
  };

  /**
   * Convenience function to create a error function.
   * @param {String} type - failed validation type. e.g. 'required'.
   * @param {Object} extra - extra object fields to include with error.
   * @return {Function}
   * @api private.
   */
  _validationError(type = '', extra = {}) {
    return function(value, fieldKey, schema) {
      return _.merge({ field: fieldKey, property: type, value: value }, obj);
    };
  };

  /**
   * Validate that a field is required.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api public.
   * @tests none.
   */
  static validateRequired(value, schema) {
    if (!schema.required) {
      return true;
    }
    if (schema.notNull) {
      return !_.isUndefined(value) && !_.isNull(value);
    }
    else {
      return !_.isUndefined(value);
    }
  };

  /**
   * Validate that a field is of type defined in schema.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api public.
   * @tests none.
   */
  static validateType(value, schema) {
    if (!schema.type) {
      return true;
    }
    if (schema.type === 'date') {
      return utils._validateDate(value, schema.dateFormat);
    }
    else {
      return utils._isType(value, schema.type);
    }
  };

  /**
   * Validate that a string field does not contain XSS.
   * @param {Mixed} value
   * @param {Object} schema
   * @return {Boolean}
   * @api public.
   * @tests none.
   */
  static validateDenyXSS(value, schema) {
    if (schema.denyXSS && schema.type === 'string' && value !== sanitize.inHTMLData(value)) {
      return false;
    }
    return true;
  };

  /**
   * Validate that a array/string is w/i the length requirement.
   * @param {Mixed} value
   * @param {Object} schema
   * @param {Number} pos - the minLength value (in array) to use.
   * @return {Boolean}
   * @api private.
   * @tests none.
   */
  static validateMinLength(value, schema, pos = 0) {
    var type;
    if (_.isNull(schema.minLength[pos]) || _.isUndefined(schema.minLength[pos]) ) {
      return true;
    }
    type = utils._getType(value);
    if (type === 'string' || type === 'array') {
      return value.length >= schema.minLength[pos];
    }
    return false;
  };

  /**
   * Validate that a array/string is w/i the length requirement.
   * @param {Mixed} value
   * @param {Object} schema
   * @param {Number} pos - the maxLength value (in array) to use.
   * @return {Boolean}
   * @api public.
   * @tests none.
   */
  static validateMaxLength(value, schema, pos = 0) {
    var type;
    if (_.isNull(schema.minLength[pos]) || _.isUndefined(schema.minLength[pos]) ) {
      return true;
    }
    type = utils._getType(value);
    if (type === 'string' || type === 'array') {
      return value.length <= schema.maxLength[pos];
    }
    return false;
  };

  /**
   * Run field through custom validate function that returns `true` or `false`.
   * @param {Mixed} value
   * @param {Object} schema
   * @param {Number} pos - the validate function (in array) to call.
   * @return {Boolean}
   * @api public.
   * @tests none.
   */
  static validateFunction(value, schema, pos = 0) {
    if (!schema.validate[pos]) {
      return true;
    }
    return !!schema.validate[pos].call(schema, value);
  };

};

/**
 * Custom error handlers.
 */

function minLengthError(pos = 0) {
  return function(value, fieldKey, schema) {
    return {
      field: fieldKey,
      property: 'minLength',
      value: value,
      length: value.length,
      expected: schema.minLength[pos]
    };
  };
};

function maxLengthError(pos = 0) {
  return function(value, fieldKey, schema) {
    return {
      field: fieldKey,
      property: 'maxLength',
      value: value,
      length: value.length,
      expected: schema.maxLength[pos]
    };
  };
};

function typeError(value, fieldKey, schema) {
  var expected = schema.dateFormat ? schema.type+': '+schema.dateFormat  :  schema.type;
  return {
    field: fieldKey,
    property: 'type',
    value: value,
    expected: expected
  };
};

/**
 * Validates a value is a particular type.
 * @param {String} type
 * @return {Boolean}
 * @api private
 * @tests none
 */
function isType(type) {
  return function(value, fieldKey, schema) {
    return type === utils._getType(value);
  };
}

/**
 * Given a field value, validate according to schema.
 */
class ValueValidator extends Validator {
  constructor() {
    super();
    var self = ValueValidator;
    this.addMethod(self.validateRequired, this._validationError('required'));
    // If value is not required and value is undefined/null, do not continue validating.
    this.addMethod((value, fieldKey, schema) => {
      if (_.isUndefined(value)) {
        this.break();
      }
    });
    this.addMethod(self.validateType, typeError);
    this.addMethod(self.validateMinLength, minLengthError(0), 0);
    this.addMethod(self.validateMaxLength, maxLengthError(0), 0);
    this.addMethod(self.validateDenyXSS, this._validationError('denyXSS'));
    this.addMethod(self.validateFunction, this._validationError('validate'), 0);
  };

};

/**
 * Given a array of values/objects, validate according to schema.
 */
class ArrayValidator extends Validator {
  constructor() {
    super();
    var self = ArrayValidator;
    this.addMethod(self.validateRequired, this._validationError('required'));
    // If value is not required and value is undefined/null, do not continue validating.
    this.addMethod((value, fieldKey, schema) => {
      if (_.isUndefined(value)) {
        this.break();
      }
    });
    this.addMethod(isType('array'), this._validationError('required', { expected: 'array' }));
    this.addMethod(self.validateMinLength, minLengthError(0), 0);
    this.addMethod(self.validateMaxLength, maxLengthError(0), 0);
  };
};

class ObjectValidator extends Validator {
  constructor() {
    super();
    var self = ObjectValidator;
    this.addMethod(isType('object'), this._validationError('required', { expected: 'object' }));
    this.addMethod(self.validateFunction, this._validationError('validate'), 0);
  };
};

class InnerArrayObjectValidator extends Validator {
  constructor() {
    super();
    var self = ObjectValidator;
    this.addMethod(isType('object'), this._validationError('required', { expected: 'object' }));
    this.addMethod(self.validateFunction, this._validationError('validate'), 1);
  };
};

/**
 * Given a array of values/objects, validate according to schema.
 */
class InnerArrayValueValidator extends Validator {
  constructor() {
    super();
    var self = InnerArrayValueValidator;
    this.addMethod(self.validateType, typeError);
    this.addMethod(self.validateMinLength, minLengthError(1), 1);
    this.addMethod(self.validateMaxLength, maxLengthError(1), 1);
    this.addMethod(self.validateDenyXSS, this._validationError('denyXSS'));
    this.addMethod(self.validateFunction, this._validationError('validate'), 1);
  };
};

/**
 * Given a array of arrays, validate according to schema.
 */
class InnerArrayValidator extends Validator {
  constructor() {
    super();
    var self = InnerArrayValidator;
    this.addMethod(isType('array'), this._validationError('required', { expected: 'array' }));
    this.addMethod(self.validateMinLength, minLengthError(0), 0);
    this.addMethod(self.validateMaxLength, maxLengthError(0), 0);
    this.addMethod(self.validateFunction, this._validationError('validate'), 0);
  };
};

module.exports.Validator = Validator;
module.exports.ValueValidator = ValueValidator;
module.exports.ArrayValidator = ArrayValidator;
module.exports.InnerArrayValueValidator = InnerArrayValueValidator;
module.exports.InnerArrayValidator = InnerArrayValidator;
module.exports.ObjectValidator = ObjectValidator;
module.exports.InnerArrayObjectValidator = InnerArrayObjectValidator;
