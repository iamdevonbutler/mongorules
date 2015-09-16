'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const __ = require('lodash-deep');
const debug = require('debug')('mongorules');
const sanitize = require('xss-filters');
const utils = require('./utils');
const transform = require('./transform');
const Validator = require('./validate');

module.exports = {

 /**
  * Set field default value according to schema.
  * @param {Mixed} value.
  * @param {Object} schema.
  * @return {Mixed}
  * @api private
  */
  _setDefaultValue(value, schema) {
    if (schema.required === false && !_.isUndefined(schema.default)) {
      if (_.isUndefined(value) || (schema.notNull && _.isNull(value))) {
        return schema.default;
      }
    }
    return value;
  },

  /**
   * Validate data against schema for insert/update/save calls.
   * Transform data if schema mandates.
   * @param {Array} argumentsList
   * @param {Object} model
   * @param {String} action
   * @return {Object} - potentially transformed arguments for method call.
   * @api private
   * @tests intergration
   */
  _preprocessQuery(argumentsList, model, action) {
    var result, payload;

    // Validate payload.
    switch (action) {
      case 'insert':
        payload = argumentsList[0];
        result = this._preprocessInsert(payload, model.schema);
        argumentsList[0] = result.payload;
        break;
      case 'update':
        if (argumentsList[2] && argumentsList[2].upsert) {
          throw new Error('Update parameter "upsert" is not supported by monogproxy. Use the `novalidate` prefix to continue operation.');
        }
        payload = argumentsList[1];
        result = this._preprocessUpdate(payload, model.schema);
        argumentsList[1] = result.payload;
        break;
      case 'findAndModify':
        if (argumentsList[3] && argumentsList[3].upsert) {
          throw new Error('Update parameter "upsert" is not supported by monogproxy. Use the `novalidate` prefix to continue operation.');
        }
        result = this._preprocessUpdate(argumentsList[2], model.schema);
        argumentsList[2] = result.payload;
        break;
    }

    return {
      errors: result.errors,
      argumentsList: argumentsList
    }
  },

  /**
   * Itterate over each documents/document, validate &
   * transform payload for insert.
   * @param {Mixed} documents.
   * @param {Object} schema.
   * @return {Object}
   *   `errors` {Array}
   *   `documents` {Array|Object}
   * @api private.
   */
  _preprocessInsert(documents, schema) {
    var errors = null;

    // Multiple documents can be inserted at a time.
    // Make all documents documents itterable.
    if (!utils._isType(documents, 'array')) {
      documents = [documents];
    }

    // Itterate over each document.
    for (let i in documents) {
      let result = this._preprocessDocument(documents[i], schema, true);
      if (result.errors) {
        errors = result.errors;
        break;
      }
      documents[i] = result.document;
    }

    return {
      errors: errors,
      payload: documents.length === 1 ? documents[0] : documents,
    };
  },

  /**
   * Ensure a mongodb update operation values validate according to schema.
   * @param {Object} payload.
   * @param {Object} schema.
   * @return {Object}
   *   `errors` {Array}
   *   `payload` {Array|Object}
   * @api private.
   */
  _preprocessUpdate(payload, schema) {
    var result, _document;

    for (let operation in payload) {
      switch (operation) {
        case '$inc':
          _document = this._getDocumentFromPayload(payload[operation]);
          result = this._preprocessDocument(_document, schema, false);
          break;
        case '$mul':
          _document = this._getDocumentFromPayload(payload[operation]);
          result = this._preprocessDocument(_document, schema, false);
          break;
        case '$rename':
          throw new Error('Update operator "$rename" is not supported by monogproxy. Use the `novalidate` prefix to continue operation.');
          break;
        case '$setOnInsert':
          throw new Error('Update operator "$setOnInsert" is not supported by monogproxy. Use the `novalidate` prefix to continue operation.');
          break;
        case '$set':
          _document = this._getDocumentFromPayload(payload[operation]);
          result = this._preprocessDocument(_document, schema, false);
          break;
        case '$unset':
          throw new Error('Update operator "$unset" is not supported by monogproxy. Use the `novalidate` prefix to continue operation.');
          break;
        case '$min':
          _document = this._getDocumentFromPayload(payload[operation]);
          result = this._preprocessDocument(_document, schema, false);
        case '$max':
          _document = this._getDocumentFromPayload(payload[operation]);
          result = this._preprocessDocument(_document, schema, false);
        case '$currentDate':
          throw new Error('Update operator "$currentDate" is not yet supported by monogproxy. Use the `novalidate` prefix to continue operation.');
          break;
        case '$addToSet':
          _document = this._getDocumentFromPayload(payload[operation]);
          result = this._preprocessDocument(_document, schema, false);
        case '$pop':
          debug('Monoyproxy does not validate update operator $pop');
          break;
        case '$pullAll':
          debug('Monoyproxy does not validate update operator $pullAll');
          break;
        case '$pull':
          debug('Monoyproxy does not validate update operator $pull');
          break;
        case '$pushAll':
          debug('Monoyproxy does not validate update operator $pushAll');
          break;
        case '$push':
          _document = this._getDocumentFromPayload(payload[operation]);
          result = this._preprocessDocument(_document, schema, false);
      }
      // If we preprocessed the payload, replace the modified document.
      if (result && !result.errors) {
        payload[operation] = this._replaceDocumentInPayload(payload[operation], result.document);
      }
    }

    // $inc, - validate (embedded fields)
    // $mul, - validate
    // $rename: throw error if used, tell them to use the .novalidate because we are using a schema
    // $setOnInsert: throw if used, .novalidate, - all document fields should be defined in schema
    // $upsert: true (third param): throw if used.
    // $set
      // embedded documents (dot and embedded array syntax)
      // set elements in array e.g. tags.1: 'rain gear'
    // $unset not allowed
    // $min / $max - validate
    // $currentDate not supported.

    // $ find and replace .$ w/ ''
    // $addToSet - check inside obj for fieldNames - check inside each fieldName for $each, if $each the values are w/i $each.
    // $pop do nothing
    // $pullAll do nothing
    // $pushAll depricated
    // $push  - single value, w/ $each multiple values/objects/arrays to an array

    // $each used w/ addToSet & $push

    return {
      errors: result && result.errors ? result.errors : null,
      payload: payload,
    };
  },

  /**
   * Given a validated/transformed document, splice the new data into the
   * update payload.
   * @param {Object} obj - the object nested inside the operation operator.
   * @param {Object} _document - the validated/transformed document.
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _replaceDocumentInPayload(obj, _document) {
    for (let field in obj) {
      let fieldValue, fieldKey;
      fieldValue = obj[field];
      // Replace '$' and array key operators.
      fieldKey = field.replace('$.', '').replace(/\.\d/g, '');
      // If the value is an object, it either contains an $each property
      // or other nested values.
      if (utils._isType(fieldValue, 'object')) {
        let documentValue = __.deepGet(_document, fieldKey);
        // Itterate over each field in the object.
        for (let objKey in fieldValue) {
          let objValue = fieldValue[objKey];
          if (objKey === '$each') {
            obj[field][objKey] = documentValue;
          }
          // Ignore array modifiers other than $each.
          if (objKey.indexOf('$') !== 0) {
            obj[field][objKey] = this._replaceDocumentInPayload(fieldValue, documentValue);
          }
        }
      }
      else {
        obj[field] = __.deepGet(_document, fieldKey);
      }
    }
    return obj;
  },

  /**
   * Given an update payload, find and return the full/partial document.
   * @param {Object} obj - the object nested inside the operation operator.
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _getDocumentFromPayload(obj) {
    var _document = {};
    if (!obj) {
      return null;
    }
    for (let field in obj) {
      let fieldValue, fieldKey;
      fieldValue = obj[field];
      // Replace '$' and array key operators.
      fieldKey = field.replace('$.', '').replace(/\.\d/g, '');
      // If the value is an object, it either contains an $each property
      // or other nested values.
      if (utils._isType(fieldValue, 'object')) {
        // Itterate over each field in the object.
        for (let objKey in fieldValue) {
          let objValue = fieldValue[objKey];
          if (objKey === '$each') {
            fieldValue = objValue;
          }
          // Ignore array modifiers other than $each.
          if (objKey.indexOf('$') !== 0) {
            fieldValue = this._getDocumentFromPayload(fieldValue);
          }
        }
      }
      __.deepSet(_document, fieldKey, fieldValue);
    }
    return _document;
  },

  /**
   * Validate and transform a document.
   * @param {Object} document.
   * @param {Object} schema.
   * @param {Boolean} isUpdate.
   * @param {String} [parentKey] if processing a nested object,
   * provide the parents path.
   * @return {Object}
   *   `errors` {Array}
   *   `documents` {Array|Object}
   * @api private.
   */
  _preprocessDocument(_document, schema, isUpdate, parentKey = '') {
    var schemaType,
      fieldKey,
      fieldSchema,
      fieldValue,
      result,
      nestedKey,
      defaultValue,
      hasErrors,
      newDocument = {},
      errors = [];

    if (!_document) {
      return {
        errors: [{ message: 'invalid document', document: _document }],
        document: _document
      };
    }

    // Itterate over schema.
    for (schemaType in schema) {
      // For each schema type, itterate over its the fields.
      for (fieldKey in schema[schemaType]) {
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

        // If this is an update, and a field is not present, don't validate,
        // don't transform, don't add to document, just skip.
        if (isUpdate && _.isUndefined(fieldValue)) {
          continue;
        }

        // If we set a default value, don't bother w/ validation/transformation.
        defaultValue = this._setDefaultValue(fieldValue, fieldSchema);
        if (defaultValue !== fieldValue) {
          fieldValue = defaultValue;
          __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
          continue;
        }

        // We don't want to insert undefined values into our database;
        // therefore, if a value is undefined, set it to null.
        if (!fieldSchema.required && _.isUndefined(fieldValue)) {
          fieldValue = null;
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
            // Validate value.
            hasErrors = new Validator(fieldValue, fieldKey, fieldSchema)
              .validateType()
              .validateMinLength(0)
              .validateMaxLength(0)
              .validateDenyXSS()
              .validateFunction(0)
              .getErrors();
            if (hasErrors) {
              errors.push(hasErrors);
              break;
            }
            // Transform value.
            fieldValue = transform._transformValue(fieldValue, fieldSchema, 0);
            // Add validated/transformed value to new document.
            __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
            break;


          /**
           * Validate and transform an array of values.
           */
          case 'arrayValues':
            // Validate outer array.
            hasErrors = new Validator(fieldValue, fieldKey, fieldSchema)
              .validateType('array')
              .validateMinLength(0)
              .validateMaxLength(0)
              .getErrors();
            if (hasErrors) {
              errors.push(hasErrors);
              break;
            }
            // Itterate over each value in the array.
            fieldValue = fieldValue.map((value) => {
              // Validate value.
              hasErrors = new Validator(value, fieldKey, fieldSchema)
                .validateType()
                .validateMinLength(1)
                .validateMaxLength(1)
                .validateDenyXSS()
                .validateFunction(0)
                .getErrors();
              if (hasErrors) {
                errors.push(hasErrors);
                return;
              }
              // Transform value.
              return transform._transformValue(value, fieldSchema, 0);
            });
            // Add validated/transformed value to new document.
            __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
            break;


          /**
           * Validate and transform an array of objects.
           */
          case 'arrayObjects':
            // Validate outer array.
            hasErrors = new Validator(fieldValue, fieldKey, fieldSchema)
              .validateType('array')
              .validateMinLength(0)
              .validateMaxLength(0)
              .getErrors();
            if (hasErrors) {
              errors.push(hasErrors);
              break;
            }
            // Itterate over each object in the array.
            fieldValue = fieldValue.map((obj) => {
              // Validate each object.
              hasErrors = new Validator(obj, fieldKey, fieldSchema)
                .validateType('object')
                .validateFunction(0)
                .getErrors();
              if (hasErrors) {
                errors.push(hasErrors);
                return;
              }
              // Preprocess the contents of the object.
              result = this._preprocessDocument(obj, fieldSchema._schema, isUpdate, fieldKey);
              if (result.errors) {
                errors.push(result.errors);
              }
              else {
                return result.document;
              }
            });
            // Add validated/transformed value to new document.
            __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
            break;


          /**
           * Validate and transform an array of arrays of values.
           */
          case 'arrayArrayValues':
            // Validate outer array.
            hasErrors = new Validator(fieldValue, fieldKey, fieldSchema)
              .validateType('array')
              .validateMinLength(0)
              .validateMaxLength(0)
              .getErrors();
            if (hasErrors) {
              errors.push(hasErrors);
              break;
            }
            // Itterate over each array in the array.
            fieldValue = fieldValue.map((value) => {
              // Validate inner array.
              hasErrors = new Validator(value, fieldKey, fieldSchema)
                .validateType('array')
                .validateMinLength(1)
                .validateMaxLength(1)
                .validateFunction(0)
                .getErrors();
              if (hasErrors) {
                errors.push(hasErrors);
                return;
              }
              // Transform inner array.
              value = transform._transformFunction(value, fieldSchema, 0);
              // Itterate over each value in the nested array.
              return value.map((val) => {
                hasErrors = new Validator(val, fieldKey, fieldSchema)
                  .validateType()
                  .validateMinLength(2)
                  .validateMaxLength(2)
                  .validateDenyXSS()
                  .validateFunction(1)
                  .getErrors();
                if (hasErrors) {
                  errors.push(hasErrors);
                  return;
                }
                // Transform value.
                return transform._transformValue(val, fieldSchema, 1);
              });
            });
            // Add validated/transformed value to new document.
            __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
            break;


          /**
           * Itterate over each array in the array.
           */
          case 'arrayArrayObjects':
            // Validate outer array.
            hasErrors = new Validator(fieldValue, fieldKey, fieldSchema)
              .validateType('array')
              .validateMinLength(0)
              .validateMaxLength(0)
              .getErrors();
            if (hasErrors) {
              errors.push(hasErrors);
              break;
            }
            // Itterate over each array in the array.
            fieldValue = fieldValue.map((value) => {
              // Validate inner array.
              hasErrors = new Validator(value, fieldKey, fieldSchema)
                .validateType('array')
                .validateMinLength(1)
                .validateMaxLength(1)
                .validateFunction(0)
                .getErrors();
              if (hasErrors) {
                errors.push(hasErrors);
                return;
              }
              // Transform inner array.
              value = transform._transformFunction(value, fieldSchema, 0);
                // Itterate over each object in inner array.
                value.map((obj) => {
                  // Validate each object.
                  hasErrors = new Validator(obj, fieldKey, fieldSchema)
                    .validateType('object')
                    .validateFunction(1)
                    .getErrors();
                  if (hasErrors) {
                    errors.push(hasErrors);
                    return;
                  }
                  // Transform object.
                  obj = transform._transformFunction(value, fieldSchema, 1);
                  // Preprocess the contents of the object.
                  result = this._preprocessDocument(obj, fieldSchema._schema, isUpdate, fieldKey);
                  if (result.errors) {
                    errors.push(result.errors);
                  }
                  else {
                    return result.document;
                  }
              });
            });
            // Add validated/transformed value to new document.
            __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
            break;

        } // end switch
      } // end field loop for each schemaType
    } // end schemaType loop

    return {
      errors: errors.length ? _.flatten(errors) : null,
      document: newDocument
    };
  }

};
