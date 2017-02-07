const {
  isType,
  getType,
} = require('./utils');

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
 * @tests unit.
 */
self.validateRequired = next => (value, fieldKey, fieldSchema) => {
  var errors = [];
  if (fieldSchema.required && value === undefined) {
    errors.push({
      field: fieldKey,
      property: 'required',
      value: value,
    });
    return errors;
  }
  return next(value, fieldKey, fieldSchema);
};

/**
 * Validate that a field is not === null.
 * @api public.
 * @tests unit.
 */
self.validateNotNull = next => (value, fieldKey, fieldSchema) => {
  var errors = [];
  if (fieldSchema.notNull && value === null) {
    errors.push({
      field: fieldKey,
      property: 'notNull',
      value: value,
    });
    return errors;
  }
  return next(value, fieldKey, fieldSchema);
};

/**
 * Validate that a field is not null.
 * Called on construction.
 * @api public.
 * @tests unit.
 */
self.validateType = next => (value, fieldKey, fieldSchema) => {
  var types, values, isValid, errors = [];

  types = fieldSchema.type.value;
  if (types === ['array']) {
    isValid = isType(value, 'array');
    if (!isValid) {
      errors.push({
        field: fieldKey,
        property: 'type',
        value: value,
        expected: 'array',
      });
      return errors;
    }
    types = fieldSchema.type.children;
    values = value;
  }
  else {
    values = [value];
  }

  errors = values.map(value => {
    isValid = types.some(type => utils.isType(value, type));
    if (!isValid) {
      return {
        field: fieldKey,
        property: 'type',
        value: value,
        expected: types,
      };
    }
  }).filter(Boolean);

  if (errors && errors.length) {
    return errors;
  }

  return next(value, fieldKey, fieldSchema);
};

/**
 * Validate that a string field does not contain XSS.
 * @api public.
 * @tests unit.
 */
self.validateDenyXSS = next => (value, fieldKey, fieldSchema) => {
  var errors = [];
  if (fieldSchema.denyXSS && isType(value, 'string')) {
    let sanitized = sanitize.inHTMLData(value);
    if (sanitized !== value) {
      errors.push({
        field: fieldKey,
        property: 'denyXSS',
        value: value,
        expected: fieldSchema.type,
      });
    }
  }
  return next(value, fieldKey, fieldSchema);
};

/**
 * Validate that a array/string is w/i the length requirement.
 * ONLY works on scalar values. Arrays of values, must itterate,
 * and pass in each value individually.
 * @param {Number} pos - the minLength value, from fieldSchema,
 * to get from the minLength array.
 * @api private.
 * @tests unit.
 */
self.validateMinLength = pos => next => (value, fieldKey, fieldSchema) => {
  var type, errors = [];
  pos = pos || 0;
  if (fieldSchema.minLength[pos] === null || fieldSchema.minLength[pos] === undefined) {
    return next(value, fieldKey, fieldSchema);
  }
  type = getType(value);
  if ((type === 'string' || type === 'array') && value.length < fieldSchema.minLength[pos]) {
    errors.push({
      field: fieldKey,
      property: 'minLength',
      value: value,
      length: value.length,
      expected: fieldSchema.minLength[pos],
    });
    return errors;
  }
  return next(value, fieldKey, fieldSchema);
};

/**
 * Validate that a array/string is w/i the length requirement.
 * ONLY works on scalar values. Arrays of values, must itterate,
 * and pass in each value individually.
 * @param {Number} pos - the maxLength value, from fieldSchema,
 * to use from the minLength array.
 * @api private.
 * @tests unit.
 */
self.validateMaxLength = pos => next => (value, fieldKey, fieldSchema) => {
  var type, errors = [];
  pos = pos || 0;
  if (fieldSchema.maxLength[pos] === null || fieldSchema.maxLength[pos] === undefined) {
    return next(value, fieldKey, fieldSchema);
  }
  type = getType(value);
  if ((type === 'string' || type === 'array') && value.length > fieldSchema.maxLength[pos]) {
    errors.push({
      field: fieldKey,
      property: 'maxLength',
      value: value,
      length: value.length,
      expected: fieldSchema.maxLength[pos],
    });
    return errors;
  }
  return next(value, fieldKey, fieldSchema);
};



/**
 * Execute custom validate function that returns `true` or `false`.
 * @param {Number} pos - the function to use from the validate array.
 * @api public.
 * @tests unit.
 */
self.validateFunction = pos => next => (value, fieldKey, fieldSchema) => {
  var errors = [];
  pos = pos || 0;
  if (fieldSchema.validate[pos]) {
    let result = fieldSchema.validate[pos].call(null, value, fieldSchema);
    if (!result) {
      errors.push({
        field: fieldKey,
        property: 'validate',
        value: value,
      });
      return errors;
    }
  }
  return next(value, fieldKey, fieldSchema);
};
