const {isType} = require('../utils');

const self = module.exports;

self._cache = {};

/**
 * Returns a preprocess object from cache or null if dne.
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {String} collectionName
 * @param {String} operation
 * @param {Mixed} args
 * @return {Object|null}
 * @api public.
 * @tests none
 */
self.get = (connectionName, databaseName, collectionName, operation, args) => {
  var argsString;
  argsString = args.map(self._stringifyKeys).join('');
  return self._cache[`${connectionName}.${databaseName}.${collectionName}.${operation}.${argsString}`] || null;
};

/**
 * Adds a preprocess object to cache.
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {String} collectionName
 * @param {String} operation
 * @param {Mixed} args
 * @param {Object} obj
 * @return `true`
 * @api public.
 * @tests none
 */
self.set = (connectionName, databaseName, collectionName, operation, args, obj) => {
  var argsString;
  argsString = args.map(self._stringifyKeys).join('');
  self._cache[`${connectionName}.${databaseName}.${collectionName}.${operation}.${argsString}`] = obj;
  return true;
};

/**
 * Given a query argument, create a string of the input's keys.
 * @param {Object} input - a param for a database query.
 * @return {String}
 * @api public.
 * @tests unit
 */
self._stringifyKeys = (input) => {
  var keys;
  keys = Object.keys(input);
  return keys.map((key) => {
    return isType(input[key], 'object') ? self._stringifyKeys(input[key]) : key;
  }).join('');
};
