'use strict';

/**
 * @file cache for queries. Holds on to state of each query,
 * to eliminate extra processing for each new request.
 */


const {isType, getPayloadKeys} = require('../utils');

const self = module.exports;

self._cache = {};

self._key;

/**
 * Adds a subdocument to cache.
 * @param {String} key2
 * @param {Object} obj
 * @return
 */
self.addSubcache = (key2, obj) => {
  var key;
  key = self._key;
  if (!self._cache[key].subcache[key2]) {
    self._cache[key].subcache[key2] = obj;
  }
};

/**
 * Gets a subdocument from cache.
 * @param {String} key2
 * @return
 */
self.getSubcache = (key2) => {
  if (!self._open) return null;
  var key, cache;
  key = self._key;
  cache = self._cache[key].subcache[key2] || null;
  return cache;
};

/**
 * Resets cache state.
 */
self.close = () => {
  self._key = null;
};

/**
 * Returns a preprocess object from cache or null if dne.
 * @param {String} key
 * @return {Object|null}
 */
self.get = (key) => {
  var cache;
  cache = self._cache[key] ? self._cache[key].main : null;
  self._key = key;
  self._open = true;
  if (!cache) {
    self._open = false;
    self._cache[key] = {subcache: {}};
  }
  return cache;
};

/**
 * Adds a preprocess object to cache.
 * @param {String} key
 * @param {Mixed} obj
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
