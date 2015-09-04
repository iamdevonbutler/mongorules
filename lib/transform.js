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
   * Transforms query input into a data structure (object|array),
   * set defaults per schema, and transforms values.
   * @param {Object|Array} data.
   * @param {Object} schema.
   * @return {Object|Array}
   * @api private.
   */
  _transformData(data, schema) {
    var newData = {};
    utils._itterateData(data, schema, (value, _schema, key) => {

      if (_.isUndefined(value)) return;

      value = this._setDefaultValue(value, _schema);
      if (_.isArray(value)) {
        newData = this._transformArray(value, _schema);
      }
      else {
        value = this._transformValue(value, _schema);
        newData = __.deepSet(newData, key, value);
      }
    });
    return newData;
 },

 /**
  * Transform data that is in an Array according to schema.
  * @return {Array}
  * @param {Array} value.
  * @param {Object} schema.
  * @api private
  */
  _transformArray(value, schema) {
    return value.map((val) => {
      if (schema.type === 'string') {
        val = this._transformString(val, schema);
      }
      if (schema.transform) {
        val = schema.transform.call(mongoproxy._appContext, val, schema);
      }
      return val;
    });
    return value;
  },

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
      value = schema.transform.call(mongoproxy._appContext, value, schema);
    }
    return value;
  },

 /**
  * Set field default value according to schema.
  * @param {Mixed} value.
  * @param {Object} schema.
  * @return {Mixed}
  * @api private
  */
 _setDefaultValue(value, schema) {
   if (_.isUndefined(value) && schema.default) {
     return schema.default;
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
