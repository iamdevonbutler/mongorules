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
   * @return {Object}
   *   `errors` {Array}
   *   `documents` {Array|Object}
   * @api private.
   */
  _preprocessInsert(documents, schema) {
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
          let fieldSchema, fieldValue, result, type;
          fieldSchema = schema[schemaType][fieldKey];
          fieldValue = __.deepGet(_document, fieldKey);

          switch (schemaType) {
            case 'values':
              fieldValue = this._setDefaultValue(fieldValue, fieldSchema);
              result = validate._validateValue(fieldValue, fieldKey, fieldSchema);
              if (result === true) {
                fieldValue = transform._transformValue(fieldValue, fieldSchema);
                __.deepSet(newDocument, fieldKey, fieldValue);
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

              type = utils._getType(fieldValue);
              if (type !== 'array') {
                errors.push({ field: fieldKey, expected: 'array', actual: type });
                break;
              }

              fieldValue = fieldValue.map((obj) => {
                // @todo pass each obj to validate function.
                // @todo min max length
                // makes sure all values are objects.
                let type = utils._getType(obj);
                if (type !== 'object') {
                  errors.push({ field: fieldKey, expected: 'object', actual: type });
                }
                result = this._preprocessInsert(obj, fieldSchema._schema);
                if (result.errors) {
                  errors.push(result.errors);
                }
                else {
                  return result.documents;
                }
              });
              __.deepSet(newDocument, fieldKey, fieldValue);
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
   * Itterates user input by applying values to expected schema values. Will
   * pass undefined to callback if input does not exist for schema field.
   * @param {Object} _document.
   * @param {Object} schema.
   * @param {Function} callback - to be called for each schema field.
   *    @param {Mixed} value - document field value
   *    @param {String} schemaType - types include:
   *    values, arrayValues, arrayObjects, arrayArrayValues, arrayArrayObjects.
   *    @param {String} fieldName - includes dot notation for nested fields.
   *    @param {Object} fieldSchema
   *    @return {Mixed} modified and validated value.
   * @return {Object} transformed and validated document.
   * @api private.
   */
  _itterateDocument(_document, schema, callback) {
    var newDocument = {};
    // Itterate over each schema type.
    for (let schemaType in schema) {
      // For each schema type, itterate over its the fields.
      for (let fieldKey in schema[schemaType]) {
        let result, fieldSchema;
        fieldSchema = schema[schemaType][fieldKey];



      }
    }
    return newDocument;
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
