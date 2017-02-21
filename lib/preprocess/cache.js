const {isType, getPayloadKeys} = require('../utils');

const self = module.exports;

self._cache = {};

self._open;
self.i = 0;

/**
 * Adds a subdocument to cache.
 */
self.addSubcache = (obj) => {
  var key
  key = self._open;
  if (key) {
    self._cache[key].subcache.push(obj);
  }
};

/**
 * Gets a subdocument from cache.
 */
self.getSubcache = () => {
  var key, cache;
  key = self._open;
  if (key) {
    cache = self._cache[key].subcache[i];
    self.i += 1;
    return cache;
  }
  return null;
};

/**
 * Resets cache state.
 */
self.close = () => {
  self._open = null;
  self.i = 0;
};

/**
 * Returns a preprocess object from cache or null if dne.
 * @param {String} key
 * @return {Object|null}
 * @api public.
 * @tests none
 */
self.get = (key) => {
  var cache;
  if (key) {
    cache = self._cache[key] ? self._cache[key].main : null;
    if (cache) {
      self._open = key;
    }
    else {
      self._cache[key] = {subcache: []};
    }
    return cache;
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
    self._cache[key].main = obj;
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
