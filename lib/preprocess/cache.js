const {isType, getPayloadKeys} = require('../utils');

const self = module.exports;

self._cache = {};

/**
 * Returns a preprocess object from cache or null if dne.
 * @param {String} key
 * @return {Object|null}
 * @api public.
 * @tests none
 */
self.get = (key) => {
  return self._cache[key] || null;
};

/**
 * Adds a preprocess object to cache.
 * @param {String} key
 * @param {Mixed} obj
 * @api public.
 * @tests none.
 */
self.set = (key, obj) => {
  self._cache[key] = obj;
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
    return getPayloadKeys(arg).join('');
  }).join('');
};
