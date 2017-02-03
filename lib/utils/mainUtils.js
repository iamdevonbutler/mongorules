const _ = require('lodash');
const __ = require('lodash-deep');
const moment = require('moment');
const mongodb = require('mongodb');

const self = module.exports;

/**
 * @param {String} key1
 * @param {String} key2
 * @return {Boolean}
 * @tests none.
 */
self.isSibling = (key1, key2) => {
  var notTheSame = key1 !== key2;
  key1 = key1.split('.');
  key2 = key2.split('.');
  return notTheSame
    && key1.length === key2.length
    && key1.slice(0, -1).join('.') === key2.slice(0, -1).join('.');
}

/**
 * Given an array of field keys for arrayofobjects fields,
 * determine if a given field is a subdocument contained
 * in an arrayofobjects field.
 * @param {String} key.
 * @param {Array} arrayFieldKeys.
 * @return {Boolean}
 * @api public.
 * @test none.
 */
self.isSubdocumentInArray = (key, arrayFieldKeys = []) => {
  return arrayFieldKeys.some(key2 => key.startsWith(key2) && key.length > key2.length);
}

/**
 * @param {Mixed} value
 * @return {Boolean}
 * @api public.
 * @tests none.
 */
self.isPromise = (value) => {
  return Promise.resolve(value) == value;
};

/**
 * Validates an ObjectID.
 * @param {Mixed} value - ObjectID
 * @return {Boolean}
 * @api public.
 * @tests unit.
 */
self.isObjectId = (value) => {
  if (self.isType(value, 'object')) {
    value = value.toString();
    if (!value) {
      return false;
    }
  }
  return mongodb.ObjectID.isValid(value);
};

/**
 * Check array for null values.
 * @param {Array} values - array or array of arrays.
 * @return {Boolean}
 * @api public.
 * @tests none.
 */
self.hasNulls = (values) => {
  var nulls = false;
  values.forEach((value) => {
    if (self.isType(value, 'array')) {
      nulls = self.hasNulls(value);
    }
    else {
      if (value === null) {
        nulls = true;
      }
    }
  });
  return nulls;
};

/**
* Remove null values from an array and array of arrays.
* @param {Array} values.
* @return {Array}
* @api public
* @tests unit.
*/
self.filterNulls = (values) => {
  if (!self.isType(values, 'array')) {
    return values;
  }
  return values.map((value) => {
    if (self.isType(value, 'array')) {
      return self.filterNulls(value)
    }
    return value;
  }).filter((value) => {
    return value !== null;
  });
};

/**
 * Ensure a date matches the required format.
 * @param {String} date
 * @param {String} [format]
 * @return {Boolean}
 * @api public.
 * @tests unit.
 */
self.validateDate = (date, format) => {
  switch (format) {
    case 'iso8601':
      return date instanceof Date;
    case 'timestamp':
      return self.isUnixTimestamp(date);
    default:
      return moment(date, format, true).isValid();
  }
};

/**
 * Ensure a date is in unix timestamp format.
 * @param {unix timestamp} timestamp
 * @return {Boolean}
 * @api public.
 * @tests integration.
 */
self.isUnixTimestamp = (timestamp) => {
  var result;
  result = /^\d+$/.exec(timestamp);
  return result !== null;
};

/**
 * Given a Mixed value type check.
 * @param {Mixed} value.
 * @param {String} type.
 * @return {Boolean}
 * @api public.
 * @tests unit.
 */
self.isType = (value, type) => {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isNaN(value) === false;
    case 'boolean':
      return value === true || value === false;
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && Array.isArray(value) === false;
    case 'null':
      return value === null;
    case 'undefined':
      return value === undefined;
    case 'date':
      return value instanceof Date;
    case 'function':
      return Object.prototype.toString.call(value) === '[object Function]';
    case 'symbol':
      return typeof value === 'symbol';
    case 'NaN':
      return Number.isNaN(value);
    default:
      throw new Error(`Unrecgonized type: "${type}"`);
  }
};

/**
 * Given a Mixed value return the type.
 * @param {Mixed} value.
 * @return {String|false}
 * @api public.
 * @tests unit.
 */
self.getType = (value) => {
  // important that date comes before object. Dates are technically objects
  // but here we want to explicitly define them as dates.
  var types = ['string', 'number', 'boolean', 'array',  'date', 'object', 'function',
  'null', 'undefined', 'symbol', 'NaN'];
  for (let key in types) {
    if (self.isType(value, types[key])) {
      return types[key];
    }
  }
  return false;
};
