'use strict';

/**
 * Module dependencies.
 */

const sanitize = require('xss-filters');
const utils = require('./utils');
const _ = require('lodash');
const __ = require('lodash-deep');

module.exports = {

 /**
  * Transform data that is in an Object according to schema.
  * @param {Mixed} value.
  * @param {Object} schema.
  * @return {Object}
  * @api private
  */
  _transformValue(value, schema) {
    if (schema.type === 'string') {
      value = this._transformString(value, schema);
    }
    if (schema.transform) {
      value = schema.transform.call(null, value, schema);
    }
    return value;
  },

  /**
   * Transforms a String per schema.
   * @param {Mixed} value.
   * @param {Object} schema.
   * @return {String}
   * @api public.
   */
  _transformString(value, schema) {
    if (schema.trim) value = value.trim();
    if (schema.lowercase) value = value.toLowerCase();
    if (schema.sanitize) value = sanitize.inHTMLData(value);
    return value;
  },

};
