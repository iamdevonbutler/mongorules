'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const __ = require('lodash-deep');
const sanitize = require('xss-filters');
const utils = require('./utils');
const transform = require('./transform');
const FieldValidationError = require('./errors').FieldValidationError;

// Init validators.
const ValueValidator = require('./validate').ValueValidator;
const ArrayValidator = require('./validate').ArrayValidator;
const InnerArrayValueValidator = require('./validate').InnerArrayValueValidator;
const InnerArrayValidator = require('./validate').InnerArrayValidator;
const ObjectValidator = require('./validate').ObjectValidator;
const InnerArrayObjectValidator = require('./validate').InnerArrayObjectValidator;

const valueValidator = new ValueValidator();
const arrayValidator = new ArrayValidator();
const innerArrayValidator = new InnerArrayValidator();
const innerArrayValueValidator = new InnerArrayValueValidator();
const objectValidator = new ObjectValidator();
const innerArrayObjectValidator = new InnerArrayObjectValidator();

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
    var errors = [],
      newDocuments = [],
      newDocument = {};

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

          // Necessary for nested objects - set the
          // relative field key.
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

          // Filter null values for arrays.
          if (fieldSchema.filterNulls && schemaType !== 'values') {
            fieldValue = utils._filterNulls(fieldValue);
          }

          switch (schemaType) {

            /**
             *  Validate and transform individual values.
             */
            case 'values':
              result = valueValidator.validate(fieldValue, fieldKey, fieldSchema);
              if (!result) {
                errors.push(valueValidator.getErrors());
                break;
              }
              fieldValue = transform._transformValue(fieldValue, fieldSchema, 0);
              __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
              break;


            /**
             * Validate and transform an array of values.
             */
            case 'arrayValues':
              result = arrayValidator.validate(fieldValue, fieldKey, fieldSchema);
              if (!result) {
                errors.push(arrayValidator.getErrors());
                break;
              }
              // Itterate over each value in the array.
              fieldValue = fieldValue.map((value) => {
                result = valueValidator.validate(value, fieldKey, fieldSchema);
                if (!result) {
                  errors.push(valueValidator.getErrors());
                  return;
                }
                return transform._transformValue(value, fieldSchema, 0);
              });
              __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
              break;


            /**
             * Validate and transform an array of objects.
             */
            case 'arrayObjects':
              result = arrayValidator.validate(fieldValue, fieldKey, fieldSchema);
              if (!result) {
                errors.push(arrayValidator.getErrors());
                break;
              }
              // Itterate over each object in the array.
              fieldValue = fieldValue.map((obj) => {
                let type = utils._getType(obj);
                result = objectValidator.validate(obj, fieldKey, fieldSchema);
                if (!result) {
                  errors.push(objectValidator.getErrors());
                  return;
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


            /**
             * Validate and transform an array of arrays of values.
             */
            case 'arrayArrayValues':
              result = arrayValidator.validate(fieldValue, fieldKey, fieldSchema);
              if (!result) {
                errors.push(arrayValidator.getErrors());
                break;
              }
              // Itterate over each array in the array.
              fieldValue = fieldValue.map((value) => {
                // Validate inner array.
                result = innerArrayValidator.validate(fieldValue, fieldKey, fieldSchema);
                if (!result) {
                  errors.push(innerArrayValidator.getErrors());
                  return;
                }
                // Transform inner array.
                value = transform._transformFunction(value, fieldSchema, 0);
                // Itterate over each value in the nested array.
                return value.map((val) => {
                  result = innerArrayValueValidator.validate(val, fieldKey, fieldSchema);
                  if (!result) {
                    errors.push(innerArrayValueValidator.getErrors());
                    return;
                  }
                  return transform._transformValue(val, fieldSchema, 1);
                });
              });
              __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
              break;


            /**
             * Itterate over each array in the array.
             */
            case 'arrayArrayObjects':
              result = arrayValidator.validate(fieldValue, fieldKey, fieldSchema);
              if (!result) {
                errors.push(arrayValidator.getErrors());
                break;
              }
              // Itterate over each array in the array.
              fieldValue = fieldValue.map((value) => {
                // Validate inner array.
                result = innerArrayValidator.validate(fieldValue, fieldKey, fieldSchema);
                if (!result) {
                  errors.push(innerArrayValidator.getErrors());
                  return;
                }
                // Transform inner array.
                value = transform._transformFunction(value, fieldSchema, 0);
                  // Itterate over each object in inner array.
                  value.map((obj) => {
                  result = innerArrayObjectValidator.validate(obj, fieldKey, fieldSchema);
                  if (!result) {
                    errors.push(innerArrayObjectValidator.getErrors());
                    return;
                  }
                  // Transform inner array object.
                  obj = transform._transformFunction(value, fieldSchema, 1);
                  result = this._preprocessInsert(obj, fieldSchema._schema, fieldKey);
                  if (result.errors) {
                    errors.push(result.errors);
                  }
                  else {
                    return result.documents;
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
