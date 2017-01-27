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
  argsString = self.getArgsString(args);
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
 * @tests none.
 */
self.set = (connectionName, databaseName, collectionName, operation, args, obj) => {
  var argsString;
  argsString = self.getArgsString(args);
  self._cache[`${connectionName}.${databaseName}.${collectionName}.${operation}.${argsString}`] = obj;
  return true;
};

/**
 * Given an array of arguments, convert keys into a string.
 * @param {Array} args.
 * @return {String}
 * @api public.
 * @tests none.
 */
self.getArgsString = (args) => {
  return args.map((arg) => {
    return isType(arg, 'array') ? self.getArgsString(arg) : self._stringifyKeys(arg);
  }).join('');
};

/**
 * Given a query argument, create a string of the input's keys.
 * @param {Object} input - a param for a database query.
 * @return {String}
 * @api public.
 * @tests none.
 */
self._stringifyKeys = (input) => {
  var keys;
  keys = Object.keys(input);
  return keys.map((key) => {
    return isType(input[key], 'object') ? key + self._stringifyKeys(input[key]) : key;
  }).join('');
};
