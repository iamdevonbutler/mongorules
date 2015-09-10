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
            value = this._setDefaultValue(value, fieldSchema);
            result = validate._validateValue(value, fieldName, fieldSchema);
            if (result === true) {
              value = transform._transformValue(value, fieldSchema);
            }
            else {
              errors.push(result);
            }
            break;

          case 'arrayValues':
            value = this._setDefaultValue(value, fieldSchema);
            value.forEach((val) => {
              result = validate._validateValue(val, fieldName, fieldSchema);
              if (result === true) {
                val = transform._transformValue(val, fieldSchema);
              }
              else {
                errors.push(result);
              }
            });
            break;

          case 'arrayObjects':
            value = this._setDefaultValue(value, fieldSchema);
            value.forEach((obj) => {
              let type = utils._getType(obj);
              if (type !== 'object') {
                errors.push({ field: fieldName, expected: 'object', actual: type });
                return;
              }
              result = this._preprocessInsert(obj, fieldSchema._schema);

              if (result.errors) {
                errors.push(result);
              }
              else {
                obj = result.documents;
              }
            });
            break;

          case 'arrayArrayValues':
            value = this._setDefaultValue(value, fieldSchema);
            value.forEach((_valueArray) => {
              let type = utils._getType(_valueArray);
              if (type !== 'array') {
                errors.push({ field: fieldName, expected: 'array', actual: type });
                return;
              }
              _valueArray.forEach((_value) => {
                result = validate._validateValue(_value, fieldName, fieldSchema);
                if (result === true) {
                  _value = transform._transformValue(_value, fieldSchema);
                }
                else {
                  errors.push(result);
                }
              });
            });
            break;

          case 'arrayArrayObjects':
            value = this._setDefaultValue(value, fieldSchema);
            value.forEach((_valueArray) => {
              let type = utils._getType(_valueArray);
              if (type !== 'array') {
                errors.push({ field: fieldName, expected: 'array', actual: type });
                return;
              }
              _valueArray.forEach((obj) => {
                result = this._preprocessInsert(obj, fieldSchema._schema);

                if (result.errors) {
                  errors.push(result);
                }
                else {
                  obj = result.documents;
                }
              });
            });
            break;
        }
      });
      // Stop itterating documents if a document has errors.
      // if (errors.length) {
        // break;
      // }
    }
    console.log(documents);
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
      for (let fieldName in schema[schemaType]) {
        let fieldSchema = schema[schemaType][fieldName];
        // If the field is a array containing objects...
        if (fieldSchema._schema) {
          console.log(fieldName, fieldSchema);
          this._itterateDocument(_document, fieldSchema._schema, callback)
        }
        else {
          let fieldValue = __.deepGet(_document, fieldName);
          // console.log(fieldValue, schemaType, fieldName, fieldSchema);
          callback(fieldValue, schemaType, fieldName, fieldSchema);
        }
      }
    }
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
