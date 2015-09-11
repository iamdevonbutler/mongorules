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
const FieldValidationError = require('./errors').FieldValidationError;

module.exports = {

  /**
   * Validate data against schema for insert/update/save calls.
   * Transform data if schema mandates.
   * @param {Array} argumentsList
   * @param {Object} model
   * @param {String} collectionName
   * @param {String} action
   * @param {Function} globalErrorHandler
   * @return {Array|false|throw Error} - potentially transformed arguments for method call.
   * @api private
   * @tests intergration
   */
  _preprocessQuery(argumentsList, model, collectionName, action, globalErrorHandler) {
    var result, documents, globalErrorHandler;

    // Validate documents.
    switch (action) {
      case 'insert':
        documents = argumentsList[0];
        result = this._preprocessInsert(documents, model.schema);
        argumentsList[0] = result.documents;
        break;
      case 'update':
        documents = argumentsList[1];
        result = this._preprocessUpdate(documents, model.schema);
        argumentsList[1] = result.documents;
        break;
      case 'save':
        documents = argumentsList[0];
        result = this._preprocessSave(documents, model.schema);
        argumentsList[0] = result.documents;
        break;
    }

    // Handle errors.
    if (result.errors) {
      // Local collection error handler.
      if (model.onError) {
        model.onError.call(null, collectionName, action, result.errors);
        return false;
      }
      // Global error handler.
      else if (globalErrorHandler) {
        globalErrorHandler.call(null, collectionName, action, result.errors);
        return false;
      }
      // Custom error handler.
      else {
        console.log(result.errors);
        throw new FieldValidationError(collectionName, action, result.errors);
      }
    }

    // Return validated and transformed documents or false if there are
    // errors and the developer decided not to throw.
    return !result.errors ? argumentsList : null;
  },

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
          let fieldSchema, fieldValue, result, type, nestedKey, defaultValue;
          fieldSchema = schema[schemaType][fieldKey];

          // Necessary for nested objects to set the
          // relative depth for object values.
          if (parentKey) {
            nestedKey = fieldKey.slice(parentKey.length+1);
            fieldValue = __.deepGet(_document, nestedKey);
          }
          else {
            fieldValue = __.deepGet(_document, fieldKey);
          }

          // If we set a default value, don't bother w/ validation/transformation.
          defaultValue = this._setDefaultValue(fieldValue, fieldSchema);
          if (defaultValue !== fieldValue) {
            fieldValue = defaultValue;
            __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
            continue;
          }

          switch (schemaType) {

            case 'arrayValues':
            case 'arrayObjects':
            case 'arrayArrayValues':
            case 'arrayArrayObjects':
              if (fieldSchema.filterNulls) {
                fieldValue = transform.filterNulls(fieldValue);
              }

            // Validate and transform individual values.
            case 'values':
              result = validate._validateValue(fieldValue, fieldKey, fieldSchema);
              if (result !== true) {
                errors.push(result);
                break;
              }
              fieldValue = transform._transformValue(fieldValue, fieldSchema);
              __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
              break;


            // Validate and transform an array of values.
            case 'arrayValues':
              result = validate._validateArray(fieldValue, fieldKey, fieldSchema);
              if (result !== true) {
                errors.push(result);
                break;
              }
              fieldValue = fieldValue.map((value) => {
                result = validate._validateValue(value, fieldKey, fieldSchema);
                if (result !== true) {
                  errors.push(result);
                  return;
                }
                return transform._transformValue(value, fieldSchema);
              });
              __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
              break;


            // Validate and transform an array of objects.
            case 'arrayObjects':
              result = validate._validateArray(fieldValue, fieldKey, fieldSchema);
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
                result = this._preprocessInsert(obj, fieldSchema._schema, fieldKey);
                if (result.errors) {
                  errors.push(result.errors);
                }
                else {
                  return result.documents;
                }
              });
              __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
              break;


            // Validate and transform an array of arrays of values.
            case 'arrayArrayValues':
              // result = validate._validateArray(fieldValue, fieldKey, fieldSchema);
              // if (result !== true) {
              //   errors.push(result);
              //   break;
              // }
              // type = utils._getType(fieldValue);
              // if (type !== 'array') {
              //   errors.push({ field: fieldKey, expected: 'array', actual: type });
              //   break;
              // }
              fieldValue = fieldValue.map((value) => {
                return value.map((val) => {
                  result = validate._validateValue(val, fieldKey, fieldSchema);
                  if (result === true) {
                    return transform._transformValue(val, fieldSchema);
                  }
                  else {
                    errors.push(result);
                  }
                });
              });
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
