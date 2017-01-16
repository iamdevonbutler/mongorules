const _ = require('lodash');
const __ = require('lodash-deep');
const moment = require('moment');
const mongodb = require('mongodb');

var self = module.exports;

/**
  const a = params => errors  => {
    errors.push('funcA')
    return errors;
  }

  const b = params => errors  => {
    errors.push('funcB')
    return errors
  }

  const c = params => errors  => {
    errors.push('funcC')
    return errors
  }

  function isFunc(value) {
    return Object.prototype.toString.call(value) === '[object Function]';
  }

  function compose(...args) {
    return args.reduce((prev,current,cc) => {
      return current(prev)
    }, [])
  }

  var xx = compose(a(),b(),c());
  console.log(xx)

**/

/**
 * @param {Mixed} value
 * @return {Boolean}
 * @api private.
 * @tests none.
 */
self.isPromise = (value) => {
  return Promise.resolve(value) == value;
};

/**
 * Validates an ObjectID.
 * @param {Mixed} value - ObjectID
 * @return {Boolean}
 * @api private.
 * @tests unit.
 */
self._isObjectId = (value) => {
  if (this._isType(value, 'object')) {
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
 * @api private.
 * @tests none.
 */
self._hasNulls = (values) => {
  var nulls = false;
  values.forEach((value) => {
    if (this._isType(value, 'array')) {
      nulls = this._hasNulls(value);
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
* @api private
* @tests unit.
*/
self._filterNulls = (values) => {
  if (!this._isType(values, 'array')) {
    return values;
  }
  return values.map((value) => {
    if (this._isType(value, 'array')) {
      return this._filterNulls(value)
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
 * @api private.
 * @tests unit.
 */
self._validateDate = (date, format) => {
  switch (format) {
    case 'iso8601':
      return date instanceof Date;
    case 'timestamp':
      return this._isUnixTimestamp(date);
    default:
      return moment(date, format, true).isValid();
  }
};

/**
 * Ensure a date is in unix timestamp format.
 * @param {unix timestamp} timestamp
 * @return {Boolean}
 * @api private.
 * @tests integration.
 */
self._isUnixTimestamp = (timestamp) => {
  var result;
  result = /^\d+$/.exec(timestamp);
  return result !== null;
};

/**
 * Given a Mixed value type check.
 * @param {Mixed} value.
 * @param {String} type.
 * @return {Boolean}
 * @api private.
 * @tests unit.
 */
self._isType = (value, type) => {
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
 * @api private.
 * @tests unit.
 */
self._getType = (value) => {
  // important that date comes before object. Dates are technically objects
  // but here we want to explicitly define them as dates.
  var types = ['string', 'number', 'boolean', 'array',  'date', 'object', 'function',
  'null', 'undefined', 'symbol', 'NaN'];
  for (let key in types) {
    if (this._isType(value, types[key])) {
      return types[key];
    }
  }
  return false;
};
