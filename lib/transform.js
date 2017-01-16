const mongo = require('mongodb');
const sanitize = require('xss-filters');
const utils = require('./utils');
const _ = require('lodash');
const __ = require('lodash-deep');

var self = module.exports;

/**
* Transform data that is in an Object according to schema.
* @param {Mixed} value.
* @param {Object} schema.
* @param {Number} pos - the transform function (in array) to call.
* @return {Object}
* @api private
* @tests integration
*/
self._transformValue = (value, schema, pos) => {
  pos = pos || 0;
  value = this._transformString(value, schema);
  value = this._transformFunction(value, schema, pos);
  return value;
};

/**
* Call custom transformation function from schema.
* @param {Mixed} value.
* @param {Object} schema.
* @param {Number} pos - the transform function (in array) to call.
* @return {Object}
* @api private
* @tests unit
*/
self._transformFunction = (value, schema, pos) => {
  pos = pos || 0;
  if (schema.transform[pos]) {
    return schema.transform[pos].call(null, value, schema);
  }
  return value;
};

/**
 * Transforms a String per schema.
 * @param {Mixed} value.
 * @param {Object} schema.
 * @return {String}
 * @api public.
 * @tests unit
 */
self._transformString = (value, schema) => {
  if (utils._isType(value, 'string')) {
    if (schema.trim) {
      value = value.trim();
    }
    if (schema.lowercase) {
      value = value.toLowerCase();
    }
    if (schema.uppercase) {
      value = value.toUpperCase();
    }
    if (schema.sanitize) {
      value = sanitize.inHTMLData(value);
    }
  }
  return value;
};
