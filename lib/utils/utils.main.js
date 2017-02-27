'use strict';

const mongodb = require('mongodb');

const self = module.exports;

/**
 * @param {String} key1
 * @param {String} key2
 * @return {Boolean}
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
 * @param {String} key1 - the parent
 * @param {String} key2 - the child
 * @param {Number} depth - defaults to any depth.
 * @return {Boolean}
 */
self.isChild = (key1, key2, depth = 0) => {
  var len1, len2;
  key1 = key1.split('.');
  key2 = key2.split('.');
  len1 = key1.length;
  len2 = key2.length;
  return len1 < len2
    && (depth ? len1 + depth >= len2 : true)
    && key1.join('.') === key2.slice(0, key1.length).join('.');
}

/**
 * @param {Mixed} value
 * @return {Boolean}
 */
self.isPromise = (value) => {
  return Promise.resolve(value) == value;
};

/**
 * Validates an ObjectID.
 * @param {Mixed} value - ObjectID
 * @return {Boolean}
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
* Remove null values from an array and array of arrays.
* @param {Array} values.
* @return {Array}
*/
self.filterNulls = (values) => {
  if (!self.isType(values, 'array')) {
    return values;
  }
  return values.map(value => {
    return self.isType(value, 'array') ? self.filterNulls(value) : value;
  })
  .filter(value => value !== null);
};

/**
 * Ensure a date is in unix timestamp format.
 * @param {unix timestamp} timestamp
 * @return {Boolean}
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
    case 'function':
      return Object.prototype.toString.call(value) === '[object Function]';
    case 'symbol':
      return typeof value === 'symbol';
    case 'NaN':
      return Number.isNaN(value);
    case 'date':
      return value instanceof Date;
    case 'timestamp':
      return self.isUnixTimestamp(value);
    case 'objectId':
      return self.isObjectId(value);
    default:
      throw new Error(`Unrecgonized type: "${type}"`);
  }
};

/**
 * Given a Mixed value return the type.
 * @param {Mixed} value.
 * @return {String|false}
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
