const {compose, isType, getType, validateDate} = require('./utils');
const sanitize = require('xss-filters');

const self = module.exports;

self.compose = (...args) => {
  return args.reduceRight((prev, current, i, array) => {
    return current(prev);
  }, () => []);
};

/**
 * Validate that a field is required.
 * `Required` meaning is value is not `undefined`.
 * @api public.
 * @tests unit.
 */
self.validateRequired = next => (value, fieldKey, schema) => {
  var errors = [];
  if (schema.required && value === undefined) {
    errors.push({
      field: fieldKey,
      property: 'required',
      value: value,
    });
    return errors;
  }
  return [...next(value, fieldKey, schema)];
};

/**
 * Validate that a field is not === null.
 * @api public.
 * @tests unit.
 */
self.validateNotNull = next => (value, fieldKey, schema) => {
  var errors = [];
  if (schema.notNull && value === null) {
    errors.push({
      field: fieldKey,
      property: 'notNull',
      value: value,
    });
    return errors;
  }
  return [...next(value, fieldKey, schema)];
};

/**
 * Validate that a field is not null.
 * Called on construction.
 * @api public.
 * @tests unit.
 */
self.validateType = type => next => (value, fieldKey, schema) => {
  var errors = [];
  var type = type || schema.type;

  return [...next(value, fieldKey, schema)];

  if (type === 'date') {
    if (!validateDate(value, schema.dateFormat)) {
      errors.push({
        field: fieldKey,
        property: 'type (date)',
        value: value,
        expected: schema.dateFormat,
      });
      return errors;
    }
    return [...next(value, fieldKey, schema)];
  }
  else if (type && !isType(value, type)) {
    errors.push({
      field: fieldKey,
      property: 'type',
      value: value,
      expected: type,
    });
    return errors;
  }
  return [...next(value, fieldKey, schema)];
};

/**
 * Validate that a string field does not contain XSS.
 * @api public.
 * @tests unit.
 */
self.validateDenyXSS = next => (value, fieldKey, schema) => {
  var errors = [];
  if (schema.denyXSS && isType(value, 'string')) {
    let sanitized = sanitize.inHTMLData(value);
    if (sanitized !== value) {
      errors.push({
        field: fieldKey,
        property: 'denyXSS',
        value: value,
        expected: schema.type,
      });
    }
  }
  return [...next(value, fieldKey, schema)];
};

/**
 * Validate that a array/string is w/i the length requirement.
 * ONLY works on scalar values. Arrays of values, must itterate,
 * and pass in each value individually.
 * @param {Number} pos - the minLength value, from schema,
 * to get from the minLength array.
 * @api private.
 * @tests unit.
 */
self.validateMinLength = pos => next => (value, fieldKey, schema) => {
  var type, errors = [];
  var pos = pos || 0;
  if (schema.minLength[pos] === null || schema.minLength[pos] === undefined) {
    return errors;
  }
  type = getType(value);
  if ((type === 'string' || type === 'array') && value.length < schema.minLength[pos]) {
    errors.push({
      field: fieldKey,
      property: 'minLength',
      value: value,
      length: value.length,
      expected: schema.minLength[pos],
    });
    return errors;
  }
  return [...next(value, fieldKey, schema)];
};

/**
 * Validate that a array/string is w/i the length requirement.
 * ONLY works on scalar values. Arrays of values, must itterate,
 * and pass in each value individually.
 * @param {Number} pos - the maxLength value, from schema,
 * to use from the minLength array.
 * @api private.
 * @tests unit.
 */
self.validateMaxLength = pos => next => (value, fieldKey, schema) => {
  var type, errors = [];
  var pos = pos || 0;
  if (schema.maxLength[pos] === null || schema.maxLength[pos] === undefined) {
    return errors;
  }
  type = getType(value);
  if ((type === 'string' || type === 'array') && value.length > schema.maxLength[pos]) {
    errors.push({
      field: fieldKey,
      property: 'maxLength',
      value: value,
      length: value.length,
      expected: schema.maxLength[pos],
    });
    return errors;
  }
  return [...next(value, fieldKey, schema)];
};



/**
 * Execute custom validate function that returns `true` or `false`.
 * @param {Number} pos - the function to use from the validate array.
 * @api public.
 * @tests unit.
 */
self.validateFunction = pos => next => (value, fieldKey, schema) => {
  var errors = [];
  var pos = pos || 0;
  if (schema.validate[pos]) {
    let result = schema.validate[pos].call(null, value, schema);
    if (!result) {
      errors.push({
        field: fieldKey,
        property: 'validate()',
        value: value,
      });
      return errors;
    }
  }
  return [...next(value, fieldKey, schema)];
};
