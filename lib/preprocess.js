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
  * @tests none.
  */
  _setDefaultValue(value, schema) {
    if (schema.required === false && !_.isUndefined(schema.default)) {
      // Set defaults on null values. Useful so that app developers don't
      // need to set `[]` or `{}` on fields that have no data and only need to
      // pass `null`.
      if (_.isUndefined(value) || (schema.notNull && _.isNull(value))) {
        return schema.default;
      }
    }
    return value;
  },

  /**
   * Filter out empty documents from a documents array.
   * @param {Array} documents.
   * @return {Array}
   * @api private.
   * @tests none.
   */
  _filterDocuments(documents) {
    return documents.filter((_document) => {
      if (!utils._isType(_document, 'object')) {
        return false;
      }
      return Object.keys(_document).length;
    });
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

  _preprocessUpsert(query, payload) {

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

    // Filter out empty documents.
    documents = this._filterDocuments(documents);
    if (!documents.length) {
      return { payload: documents, errors: ['Empty document. Nothing to insert.'] };
    }

    // Itterate over each document and preprocess.
    for (let i in documents) {
      let result = this._preprocessDocument(documents[i], schema, false);
      if (result.errors) {
        errors = result.errors;
        break;
      }
      documents[i] = result.document;
    }

    // Filter out empty documents.
    documents = this._filterDocuments(documents);
    if (!documents.length) {
      return { payload: documents, errors: errors ? errors : ['Empty document. Nothing to insert.'] };
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
    var result, _document, hasOperator;

    // Updates can take place w/o an update operator.
    hasOperator = Object.keys(payload).filter((key) => {
      return key.indexOf('$') === 0;
    }).length;

    // If an update operator is not present in the query...
    if (!hasOperator) {
      _document = this._getDocumentFromPayload(payload);
      result = this._preprocessDocument(_document, schema, true);
      if (!Object.keys(result.document).length) {
        return { payload: payload, errors: result.errors ? result.errors : ['Empty document. Nothing to update.'] };
      }
      if (!result.errors) {
        payload = this._replaceDocumentInPayload(payload, result.document);
      }
      return {
        errors: result.errors ? result.errors : null,
        payload: payload,
      };
    }

    // If an update operator is present in the query.
    var validOperations = ['$inc', '$mul', '$set', '$min', '$max', '$addToSet', '$push'];
    var invalidOperations = ['$rename', '$setOnInsert', '$unset', '$currentDate', '$pop', '$pullAll', '$pull', '$pushAll'];
    for (let operation in payload) {
      if (invalidOperations.indexOf(operation) > -1) {
        debug(`Update operator "${operation}" is not supported by monogproxy. Validation / transformation will not occur.`);
        continue;
      }
      if (validOperations.indexOf(operation) > -1) {
        _document = this._getDocumentFromPayload(payload[operation], operation);
        result = this._preprocessDocument(_document, schema, true);
        if (!Object.keys(result.document).length) {
          return { payload: payload, errors: result.errors ? result.errors : ['Empty document post . Nothing to update.'] };
        }
        // If we preprocessed the payload, replace the modified document.
        if (result && !result.errors) {
          payload[operation] = this._replaceDocumentInPayload(payload[operation], result.document, operation);
        }
      }
    }
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
   * @param {String} [operation].
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _replaceDocumentInPayload(obj, _document, operation) {
    if (!obj || !utils._isType(obj, 'object')) {
      return {};
    }
    for (let field in obj) {
      let fieldValue, fieldKey, isArrayItem;
      fieldValue = obj[field];
      // Replace '$' and array key operators.
      fieldKey = field.replace('$.', '').replace(/\.\d/g, '');
      // If the query contains, for example, field.0 or field.2, we are updating
      // an item in an array, which would have previously been cast into an array
      // for validation - and later, will be converted back to original type.
      isArrayItem = fieldKey !== field;
      // If the value is an object, it either contains an $each property
      // or other nested values.
      if (utils._isType(fieldValue, 'object') && !isArrayItem) {
        let documentValue = __.deepGet(_document, fieldKey);
        // Itterate over each field in the object.
        for (let objKey in fieldValue) {
          let objValue = fieldValue[objKey];
          if (objKey === '$each') {
            obj[field][objKey] = documentValue;
          }
          // Ignore array modifiers other than $each.
          if (objKey.indexOf('$') !== 0) {
            obj[field][objKey] = this._replaceDocumentInPayload(fieldValue, documentValue, operation);
          }
        }
      }
      else {
        let newValue =  __.deepGet(_document, fieldKey);
        // If this is an $addToSet or $push operation, or an update of an array
        // item, e.g. field.1, the value has previously been converted to an
        // array for validation, this is where we change it back. @hack.
        if (['$addToSet', '$push'].indexOf(operation) > -1 || isArrayItem) {
          newValue = newValue[0];
        }
        obj[field] = newValue
      }
    }
    return obj;
  },

  /**
   * Given an update payload, find and return the full/partial document.
   * @param {Object} obj - the object nested inside the operation operator.
   * @param {String} [operation].
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _getDocumentFromPayload(obj, operation) {
    var _document = {};
    if (!obj || !utils._isType(obj, 'object')) {
      return {};
    }
    for (let field in obj) {
      let fieldValue, fieldKey, isArrayItem, isEach = false;
      fieldValue = obj[field];
      // Replace '$' and array key operators.
      fieldKey = field.replace('$.', '').replace(/\.\d/g, '');
      // If the query contains, for example, field.0, the .0 will be stripped,
      // and we are updating an item in an array.
      isArrayItem = fieldKey !== field;
      // If the value is an object, it either contains an $each property
      // or other nested values.
      if (utils._isType(fieldValue, 'object') && !isArrayItem) {
        // Itterate over each field in the object.
        for (let objKey in fieldValue) {
          let objValue = fieldValue[objKey];
          if (objKey === '$each') {
            isEach = true;
            fieldValue = objValue;
          }
          // Ignore array modifiers other than $each.
          if (objKey.indexOf('$') !== 0) {
            fieldValue = this._getDocumentFromPayload(fieldValue, operation);
          }
        }
      }
      // If this is an array operation, either $push, $addToSet, or a $set on a specific
      // array item, via the field.0 field.1 syntax, enclose the value in an array only
      // for validation. The value will be conveted back its original type in
      //_replaceDocumentInPayload(). Items added via the $each operator are,
      // conveniently, already enclosed in an extra array.
      if ((['$addToSet', '$push'].indexOf(operation) > -1 && !isEach) || isArrayItem) {
        fieldValue = [fieldValue];
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

    // Itterate over schema.
    for (schemaType in schema) {
      // For each schema type, itterate over its the fields.
      for (fieldKey in schema[schemaType]) {
        fieldSchema = schema[schemaType][fieldKey];
        // Set the relative field key if we are processing an object in an array.
        if (parentKey) {
          nestedKey = fieldKey.slice(parentKey.length+1);
          fieldValue = __.deepGet(_document, nestedKey);
        }
        else {
          fieldValue = __.deepGet(_document, fieldKey);
        }

        // If this is an update, and a field is not present, don't validate,
        // don't transform, don't add to document, just skip; however,
        // if a parentKey exists, then we are processing an object in an array,
        // which when the update is executed, will replace (not merge) the existing
        // object, and because of this, we need to process the action as an insert.
        if (isUpdate && _.isUndefined(fieldValue) && !parentKey) {
          continue;
        }

        // If we set a default value, don't bother w/ validation/transformation.
        defaultValue = this._setDefaultValue(fieldValue, fieldSchema);
        if (defaultValue !== fieldValue) {
          fieldValue = defaultValue;
          __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
          continue;
        }

        // We don't want to process undefined values if they are not required.
        if (!fieldSchema.required && _.isUndefined(fieldValue)) {
          continue;
        }

        // Filter null values for arrays.
        if (fieldSchema.filterNulls && utils._isType(fieldValue, 'array')) {
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
              // Run custom transform function.
              obj = transform._transformFunction(obj, fieldSchema, 0);
              if (!utils._isType(obj, 'object')) {
                errors.push(this._postTransformTypeError(fieldKey, obj, 'Object'));
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
              if (!utils._isType(value, 'array')) {
                errors.push(this._postTransformTypeError(fieldKey, value, 'Array'));
                return;
              }
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
              if (!utils._isType(value, 'array')) {
                errors.push(this._postTransformTypeError(fieldKey, value, 'Array'));
                return;
              }
              // Itterate over each object in inner array.
              return value.map((obj) => {
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
                obj = transform._transformFunction(obj, fieldSchema, 1);
                if (!utils._isType(obj, 'object')) {
                  errors.push(this._postTransformTypeError(fieldKey, obj, 'Object'));
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
  },

  /**
   * Error message for when a transform function returns an invalid type.
   * @param {String} field
   * @param {Mixed} value
   * @param {String} Type
   * @return {Object}
   * @api private.
   * @tests none.
   */
  _postTransformTypeError(field, value, type) {
    return {
      field: field,
      property: 'type',
      value: value,
      message: 'Transform function must return a ' + type
    }
  }

};
