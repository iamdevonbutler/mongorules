'use strict';

/**
 * Module dependencies.
 */
const _ = require('lodash');
const __ = require('lodash-deep');
const moment = require('moment');

module.exports = {

  /**
   * Check array for null values.
   * @param {Array} values - array or array of arrays.
   * @return {Boolean}
   * @api private.
   * @tests none.
   */
  _hasNulls(values) {
    var nulls = false;
    values.forEach((value) => {
      if (this._isType(value, 'array')) {
        nulls = this._hasNulls(value);
      }
      else {
        if (value === null) {
          nulls = true;
        }
      }
    });
    return nulls;
  },

 /**
  * Remove null values from an array and array of arrays.
  * @param {Array} values.
  * @return {Array}
  * @api private
  * @tests unit.
  */
  _filterNulls(values) {
    return values.map((value) => {
      if (this._isType(value, 'array')) {
        return this._filterNulls(value)
      }
      return value;
    }).filter((value) => {
      return value !== null;
    });
  },

  /**
   * Ensure a date matches the required format.
   * @param {String} date
   * @param {String} [format]
   * @return {Boolean}
   * @api private.
   * @tests unit.
   */
  _validateDate(date, format = null) {
    switch (format) {
      case 'iso8601':
        return moment(date, moment.ISO_8601, true).isValid();
      case 'unix':
        return this._isUnixTimestamp(date);
      default:
        return moment(date, format, true).isValid();
    }
  },

  /**
   * Ensure a date is in unix timestamp format.
   * @param {unix timestamp} timestamp
   * @return {Boolean}
   * @api private.
   * @tests integration.
   */
  _isUnixTimestamp(timestamp) {
    var result;
    result = /^\d+$/.exec(timestamp);
    if (result !== null) {
      return timestamp.length <= 10;
    }
    return false;
  },

  /**
   * Given a Mixed value type check.
   * @param {Mixed} value.
   * @param {String} type.
   * @return {Boolean}
   * @api private.
   * @tests unit.
   */
  _isType(value, type) {
    switch (type) {
      case 'string':
        return Object.prototype.toString.call(value) === '[object String]';
      case 'boolean':
        return Object.prototype.toString.call(value) === '[object Boolean]';
      case 'array':
        return Object.prototype.toString.call(value) === '[object Array]';
      case 'object':
        return Object.prototype.toString.call(value) === '[object Object]';
      case 'null':
        return Object.prototype.toString.call(value) === '[object Null]';
      case 'number':
        return Object.prototype.toString.call(value) === '[object Number]';
      case 'undefined':
        return Object.prototype.toString.call(value) === '[object Undefined]';
      case 'function':
        return Object.prototype.toString.call(value) === '[object Function]';
      case 'symbol':
        return Object.prototype.toString.call(value) === '[object Symbol]';
    }
  },

  /**
   * Given a Mixed value return the type.
   * @param {Mixed} value.
   * @return {String}
   * @api private.
   * @tests unit.
   */
  _getType(value) {
    var types = ['string', 'number', 'boolean', 'array', 'object', 'function', 'null', 'undefined', 'symbol'];
    for (let key in types) {
      if (this._isType(value, types[key])) {
        return types[key];
      }
    }
    return false;
  }

};
