'use strict';

/**
 * Module dependencies.
 */

const sanitize = require('xss-filters');
const utils = require('./utils');
const validate = require('./validate');
const _ = require('lodash');
const __ = require('lodash-deep');

module.exports = {

  /**
   * Validate a mongodb save operation according to schema and transform values.
   * @param {Object|Array} documents.
   * @param {Object} schema.
   * @return {Object}
   *   `errors` {Array}
   *   `documents` {Array|Object}
   * @api private.
   */
  _preprocessSave(data, schema) {
    // Insert operations can accept arrays, updates cannot.
    if (!utils._isType(data, 'array') || data._id) {
      return this._preprocessUpdate(data, schema);
    }
    else {
      return this._preprocessInsert(data, schema);
    }
  },

  /**
   * @param {Mixed} documents.
   * @param {Object} schema.
   * @return {Object}
   *   `errors` {Array}
   *   `documents` {Array|Object}
   * @api private.
   */
  _preprocessInsert(documents, schema) {
    var errors = [];

    // Multiple documents can be inserted at a time.
    // Make all documents documents itterable.
    if (!utils._isType(documents, 'array')) {
      documents = [documents];
    }

    for (let i in documents) {
      let _document;
      _document =  documents[i];

      this._itterateDocument(_document, schema, (value, schemaType, fieldName, fieldSchema) => {
        let result;
        switch (schemaType) {
          case 'values':
            result = validate._validateValue(value, fieldName, fieldSchema);
            if (result === true) {
              value = transform._transformValue(value, fieldSchema);
            }
            else {
              errors.push(result);
            }
            break;
          case 'arrayValues':
            break;
          case 'arrayObjects':
            break;
          case 'arrayArrayValues':
            break;
          case 'arrayArrayObjects':
            break;
        }
      });
      // Stop itterating documents if a document has errors.
      if (errors.length) {
        break;
      }
    }

    return {
      errors: errors.length ? _.flatten(errors) : null,
      documents: documents,
    };
  },

  /**
   * Ensure a mongodb update operation values validate according to schema.
   * @param {Object} documents.
   * @param {Object} schema.
   * @return {Object}
   *   `errors` {Array}
   *   `documents` {Array|Object}
   * @api private.
   */
  _preprocessUpdate(data, schema) {
    var errors = [];
    this._itterateDocument(data, schema, (value, _schema, field) => {
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
    return errors.length ? errors  : true;
  },

  /**
   * Itterates user input by applying values to expected schema values. Will
   * pass undefined to callback if input does not exist for schema field.
   * @param {Object} _document.
   * @param {Object} schema.
   * @param {Function} callback - to be called for each schema field.
   *  @param {Mixed} value - document field value
   *  @param {String} schemaType - types include:
   *  values, arrayValues, arrayObjects, arrayArrayValues, arrayArrayObjects.
   *  @param {String} fieldName - includes dot notation for nested fields.
   *  @param {Object} fieldSchema
   * @api private.
   */
  _itterateDocument(_document, schema, callback) {
    // Itterate over each schema type.
    for (let schemaType in schema) {
      // For each schema type, itterate over its the fields.
      for (let fieldName in schema) {
        let fieldValue = __.deepGet(_document, fieldName);
        let fieldSchema = schema[fieldName];
        callback(fieldValue, schemaType, fieldName, fieldSchema);
      }
    }
  }


};
