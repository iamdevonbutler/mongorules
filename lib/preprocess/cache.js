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
  if (key) {
    return self._cache[key] || null;
  }
  return null;
};

/**
 * Adds a preprocess object to cache.
 * @param {String} key
 * @param {Mixed} obj
 * @api public.
 * @tests none.
 */
self.set = (key, obj) => {
  if (key && obj) {
    self._cache[key] = obj;
  }
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
    let isArray = isType(arg, 'array');
    if (isArray) {
      return self.getArgsString(arg);
    }
    else {
      return isType(arg, 'object') ? getPayloadKeys(arg).join(',') : null;
    }
  }).filter(Boolean).join('|');
};
