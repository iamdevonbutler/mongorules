'use strict';

/**
 * Module dependencies.
 */
const _ = require('lodash');
const __ = require('lodash-deep');
const moment = require('moment');

module.exports = {

  /**
   * Ensure a date matches the required format.
   * @param {String} date
   * @param {String} [format]
   * @api private.
   */
  _validateDate(date, format = null) {
    switch (format) {
      case '8601':
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
   * @api private.
   */
  _isUnixTimestamp(timestamp) {
    var result;
    result = /^\d+$/.exec(timestamp);
    console.log(timestamp.length, Date.now().length);
    if (result !== null) {
      return timestamp.length <= Date.now().toString().length;
    }
  },

  /**
   * Itterates user input by applying values to expected schema values. will
   * pass undefined to callback if input does not exist for schema field.
   * @param {Object|Array} data.
   * @param {Object} schema.
   * @param {Function} callback - to be called on each itteration.
   * @api private.
   */
  _itterateData(data, schema, callback) {
    for (let key in schema) {
      let value = __.deepGet(data, key);
      callback(value, schema[key], key);
    }
  },

  /**
   * Given a Mixed value type check.
   * @param {Mixed} value.
   * @param {String} type.
   * @return {Boolean}
   * api private.
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
   * api private.
   */
  _getType(value) {
    var types = ['string', 'number', 'boolean', 'array', 'object', 'function', 'null', 'undefined', 'symbol'];
    for (let key in types) {
      if (this._isType(value, types[key])) {
        return type;
      }
    }
    return false;
  }

};
