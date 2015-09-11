'use strict';

/**
 * Module dependencies.
 */

const sanitize = require('xss-filters');
const utils = require('./utils');
const validate = require('./validate');
const transform = require('./transform');
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
   * @param {String} [parentKey] if processing a nested object,
   * provide the parents path.
   * @return {Object}
   *   `errors` {Array}
   *   `documents` {Array|Object}
   * @api private.
   */
  _preprocessInsert(documents, schema, parentKey = '') {
    var errors = [], newDocuments = [], newDocument = {};

    // Multiple documents can be inserted at a time.
    // Make all documents documents itterable.
    if (!utils._isType(documents, 'array')) {
      documents = [documents];
    }

    // Itterate over each document.
    for (let i in documents) {
      let _document;
      _document =  documents[i];

      // Itterate over schema.
      for (let schemaType in schema) {
        // For each schema type, itterate over its the fields.
        for (let fieldKey in schema[schemaType]) {
          let fieldSchema, fieldValue, result, type, nestedKey;
          fieldSchema = schema[schemaType][fieldKey];
          if (parentKey) {
            nestedKey = fieldKey.slice(parentKey.length+1);
            fieldValue = __.deepGet(_document, nestedKey);
          }
          else {
            fieldValue = __.deepGet(_document, fieldKey);
          }
          switch (schemaType) {
            case 'values':

              fieldValue = this._setDefaultValue(fieldValue, fieldSchema);
              result = validate._validateValue(fieldValue, fieldKey, fieldSchema);
              if (result === true) {
                fieldValue = transform._transformValue(fieldValue, fieldSchema);
                console.log(999999, fieldValue, fieldKey);
                __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
              }
              else {
                errors.push(result);
              }
              break;

            case 'arrayValues':
              fieldValue = this._setDefaultValue(fieldValue, fieldSchema);
              type = utils._getType(fieldValue);
              if (type !== 'array') {
                errors.push({ field: fieldKey, expected: 'array', actual: type });
                break;
              }
              fieldValue = fieldValue.map((val) => {
                // @todo not null.
                result = validate._validateValue(val, fieldKey, fieldSchema);
                if (result === true) {
                  return transform._transformValue(val, fieldSchema);
                }
                else {
                  errors.push(result);
                }
              });
              __.deepSet(newDocument, fieldKey, fieldValue);
              break;

            case 'arrayObjects':

              fieldValue = this._setDefaultValue(fieldValue, fieldSchema);
              result = validate._validateArrayOfObjects(fieldValue, fieldKey, fieldSchema);
              if (result !== true) {
                errors.push(result);
                break;
              }
              fieldValue = fieldValue.map((obj) => {
                // @todo not null.
                let type = utils._getType(obj);
                if (type !== 'object') {
                  errors.push({ field: fieldKey, expected: 'object', actual: type });
                }
              console.log(fieldValue, fieldKey);
                result = this._preprocessInsert(obj, fieldSchema._schema, fieldKey);
                if (result.errors) {
                  errors.push(result.errors);
                }
                else {
                  return result.documents;
                }
              });
              console.log(newDocument, fieldValue, fieldKey, nestedKey);

              __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
              break;

          }
        }
      }

      newDocuments.push(newDocument);

    }

    return {
      errors: errors.length ? _.flatten(errors) : null,
      documents: documents.length === 1 ? newDocuments[0] : newDocuments,
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
 }


};
