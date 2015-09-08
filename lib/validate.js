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
   * Ensure a mongodb save operation values validate according to schema.
   * @param {Mixed} value.
   * @param {Object} schema.
   * @return {Array|Undefined} errors occuring during validation.
   * @api private.
   */
  _validateSave(data, schema) {
    if (!utils._isType(data, 'array') || data._id) {
      return this._validateUpdate(data, schema);
    }
    else {
      return this._validateInsert(data, schema);
    }
  },

  /**
   * Ensure a mongodb insert operation values validate according to schema.
   * @param {Mixed} value.
   * @param {Object} schema.
   * @return {Array|Undefined} errors occuring during validation.
   * @api private.
   */
  _validateInsert(data, schema) {
    var errors = [];
    utils._itterateData(data, schema, (value, _schema, field) => {
      var err;
      if (_.isArray(value)) {
        err = this._arrayValidation.required(value, _schema, field);
        if (err) return errors.push(err);

        if (_.isUndefined(value)) return;

        err = this._arrayValidation.type(value, _schema, field);
        if (err) return errors.push(err);

        if (_schema.type === 'string') {
          err = this._arrayValidation.denyXSS(value, _schema, field);
          if (err) return errors.push(err);
        }

        err = this._arrayValidation.validate(value, _schema, field);
        if (err) return errors.push(err);
      }
      else {
        err = this._valueValidation.required(value, _schema, field);
        if (err) return errors.push(err);

        if (_.isUndefined(value)) return;

        err = this._valueValidation.type(value, _schema, field);
        if (err) return errors.push(err);

        if (_schema.type === 'string') {
          err = this._valueValidation.denyXSS(value, _schema, field);
          if (err) return errors.push(err);
        }

        err = this._valueValidation.validate(value, _schema, field);
        if (err) return errors.push(err);
      }
    });
    errors = _.flatten(errors.filter(Boolean));
    return errors.length ? errors  : null;
  },

  /**
   * Ensure a mongodb update operation values validate according to schema.
   * @param {Mixed} value.
   * @param {Object} schema.
   * @return {Array|Undefined} errors occuring during validation.
   * @api private.
   */
  _validateUpdate(data, schema) {
    var errors = [];
    utils._itterateData(data, schema, (value, _schema, field) => {
      var err;

      if (_.isUndefined(value)) return;

      if (_.isArray(value)) {

        err = this._arrayValidation.type(value, _schema, field);
        if (err) return errors.push(err);

        if (_schema.type === 'string') {
          err = this._arrayValidation.denyXSS(value, _schema, field);
          if (err) return errors.push(err);
        }

        err = this._arrayValidation.validate(value, _schema, field);
        if (err) return errors.push(err);
      }
      else {
        err = this._valueValidation.type(value, _schema, field);
        if (err) return errors.push(err);

        if (_schema.type === 'string') {
          err = this._valueValidation.denyXSS(value, _schema, field);
          if (err) return errors.push(err);
        }

        err = this._valueValidation.validate(value, _schema, field);
        if (err) return errors.push(err);
      }
    });
    errors = _.flatten(errors.filter(Boolean));
    return errors.length ? errors  : null;
  },

  /**
   * Array validation object w/ validation methods.
   */
  _arrayValidation: {
    required(value, schema, field) {
      if (schema.required && !_.isUndefined(schema.default) && !value.length) {
        return { field: field, property: 'required', value: value };
      }
    },
    type(value, schema, field) {
      if (schema.type && value.length) {
        for (let i=0, len=value.length; i<len; i++) {
          if (schema.type === 'date' && !utils._validateDate(value[i], schema.dateFormat)) {
            return { field: field, property: 'type', value: value, expected: schema.type + ': ' + schema.dateFormat };
          }
          if (schema.type !== 'date' && !utils._isType(value[i], schema.type)) {
            return { field: field, property: 'type', value: value, expected: schema.type };
          }
        }
      }
    },
    denyXSS(value, schema, field) {
      if (schema.denyXSS) {
        for (let i=0, len=value.length; i<len; i++) {
          if (value[i] !== sanitize.inHTMLData(value[i])) {
            return { field: field, property: 'denyXSS', value: value };
          }
        }
      }
    },
    validate(value, schema, field) {
      if (schema.validate) {
        for (let i=0, len=value.length; i<len; i++) {
          if (!schema.validate.call(schema, value[i])); {
            return { field: field, property: 'validate', value: value };
          }
        }
      }
    }
  },

  /**
   * Non array value validation object w/ validation methods.
   */
  _valueValidation: {
    required(value, schema, field) {
      if (schema.required && !_.isUndefined(schema.default) && (_.isNull(value) || _.isUndefined(value))) {
        return { field: field, property: 'required', value: value };
      }
    },
    type(value, schema, field) {
      if (schema.type === 'date' && !utils._validateDate(value, schema.dateFormat)) {
        return { field: field, property: 'type', value: value, expected: schema.type + ': ' + schema.dateFormat };
      }
      if (schema.type !== 'date' && !utils._isType(value, schema.type)) {
        return { field: field, property: 'type', value: value, expected: schema.type };
      }
    },
    denyXSS(value, schema, field) {
      if (schema.denyXSS && value !== sanitize.inHTMLData(value)) {
        return { field: field, property: 'denyXSS', value: value };
      }
    },
    validate(value, schema, field) {
      if (schema.validate) {
        var valid = schema.validate.call(schema, value);
        if (!valid) {
          return { field: field, property: 'validate', value: value };
        }
      }
    }
  }


};
