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
  * @param {Number} pos - the transform function (in array) to call.
  * @return {Object}
  * @api private
  */
  _transformValue(value, schema, pos = 0) {
    value = this._transformString(value, schema);
    value = this._transformFunction(value, schema, pos);
    return value;
  },


 /**
  * Call custom transformation function from schema.
  * @param {Mixed} value.
  * @param {Object} schema.
  * @param {Number} pos - the transform function (in array) to call.
  * @return {Object}
  * @api private
  */
  _transformFunction(value, schema, pos = 0) {
    if (schema.transform[pos]) {
      return schema.transform[pos].call(null, value, schema);
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
    var type = utils._getType(value);
    if (type === 'string') {
      if (schema.trim) value = value.trim();
      if (schema.lowercase) value = value.toLowerCase();
      if (schema.sanitize) value = sanitize.inHTMLData(value);
    }
    return value;
  },

};
