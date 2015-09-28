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
    var result, payload, query, isUpsert = false;

    // Validate payload.
    switch (action) {
      case 'insert':
        payload = argumentsList[0];
        result = this._preprocessInsert(payload, model.schema);
        argumentsList[0] = result.payload;
        break;
      case 'update':
        query = argumentsList[0];
        payload = argumentsList[1];
        isUpsert = argumentsList[2] && argumentsList[2].upsert;
        result = this._preprocessUpdate(payload, model.schema, query, isUpsert);
        argumentsList[1] = result.payload;
        break;
      case 'save':
        payload = argumentsList[0];
        // If there is an _id field, this is ther equivalent of an
        // update w/ upsert = true.
        if (payload._id) {
          query = { _id: payload._id }
          isUpsert = true
          result = this._preprocessUpdate(payload, model.schema, query, isUpsert);
          argumentsList[0] = result.payload;
        }
        // If there is no _id, process as an insert;
        else {
          result = this._preprocessInsert(payload, model.schema);
          argumentsList[0] = result.payload;
        }
        break;
      case 'findAndModify':
        query = argumentsList[0];
        payload = argumentsList[2];
        isUpsert = argumentsList[3] && argumentsList[3].upsert;
        result = this._preprocessUpdate(payload, model.schema, query, isUpsert);
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

    // Filter out empty documents.
    documents = this._filterDocuments(documents);
    if (!documents.length) {
      return {
        payload: documents,
        errors: ['Empty document. Nothing to insert.']
      };
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
      return {
        payload: documents,
        errors: errors ? errors : ['Empty document. Nothing to insert.']
      };
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
   * @param {Object} query.
   * @param {Boolean} isUpsert.
   * @return {Object}
   *   `errors` {Array}
   *   `payload` {Array|Object}
   * @api private.
   */
  _preprocessUpdate(payload, schema, query = {}, isUpsert = false) {
    var hasOperator, validOperations;

    // If this is an upsert, ensure that the query does not
    // contain fields that do not exist in schema (to prevent insertion
    // of these fields).
    if (isUpsert && !this._queryFieldsExistInSchema(query, schema._fields)) {
      return { query: query, errors: ['During operation, query contains fields that are not present in schema.'] };
    }

    // Updates can take place w/o an update operator.
    hasOperator = Object.keys(payload).filter((key) => {
      return key.indexOf('$') === 0;
    }).length;

    // If an update operator is not present in the query, process as an insert.
    if (!hasOperator) {
      return this._preprocessInsert(payload, schema);
    }

    validOperations = ['$inc', '$mul', '$set', '$min', '$max', '$addToSet', '$push'];
    // var invalidOperations = ['$rename', '$setOnInsert', '$unset', '$currentDate', '$pop', '$pullAll', '$pull', '$pushAll'];

    for (let operation in payload) {
      let result,
        _document,
        embeddedFields,
        documentKeys,
        preprocessedEmbeddedFields,
        preprocessedDocument,
        isValidOperation,
        errors = [];

      // Only process valid operations.
      isValidOperation = validOperations.indexOf(operation) > -1;
      if (!isValidOperation) {
        debug(`Update operator "${operation}" is not supported by monogproxy. Validation / transformation will not occur.`);
        continue;
      }

      // Preprocess document.
      _document = this._getDocumentFromPayload(payload[operation], operation);
      preprocessedDocument = this._preprocessDocument(_document, schema, isUpsert);

      // Handle errors.
      if (preprocessedDocument.errors) {
        errors.push(preprocessedDocument.errors)
        errors = _.flatten(errors);
      }

      // Merge back preprocessed embedded fields.
      if (preprocessedEmbeddedFields) {
        _.merge(preprocessedDocument.document, preprocessedEmbeddedFields.document);
      }

      documentKeys = Object.keys(preprocessedDocument.document).length;
      if (!documentKeys || errors.length) {
        return {
          payload: payload,
          errors: errors.length ? errors : ['Empty document post . Nothing to update.']
        };
      }

      // Add preprocessed document back to payload.
      payload[operation] = this._replaceDocumentInPayload(payload[operation], preprocessedDocument.document, operation);

    } // end for in loop.

    return {
      errors: errors.length ? errors : null,
      payload: payload,
    };
  },

  /**
   * Parses payload and returns an object for validation.
   * @param {Object} payload
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _preprocessPayload(payload, operation) {
    var _document = {};
    if (!payload || !utils._isType(payload, 'object')) {
      return {};
    }

    let payloadPath = [];
    for (let key in payload) {
      let valueIsObject, fieldValue;

      fieldValue = payload[key];

      payloadPath.push(key);
      valueIsObject = utils._isType(fieldValue, 'object');
    }

    for (let payloadKey in payload) {
      let fieldValue, fieldKey, isArrayItemUpdate, isEach = false;
      fieldValue = payload[payloadKey];
      // Replace '$' and array key operators.
      fieldKey = field.replace('$.', '').replace(/\.\d/g, '');
      // If the query contains, for example, field.0, the .0 will be stripped,
      // and we are updating an item in an array.
      isArrayItemUpdate = fieldKey !== payloadKey;
      // If the value is an object, it either contains an $each property
      // or other nested values.
      if (utils._isType(fieldValue, 'object') && !isArrayItemUpdate) {
        // Itterate over each field in the object.
        for (let objKey in fieldValue) {
          let objValue = fieldValue[objKey];
          if (objKey === '$each') {
            isEach = true;
            fieldValue = objValue;
          }
          // Ignore array modifiers other than $each.
          if (objKey.indexOf('$') !== 0) {
            fieldValue = this._preprocessPayload(fieldValue, operation);
          }
        }
      }


      __.deepSet(_document, fieldKey, {
        path: payloadPath,
        value: fieldValue,
        isEach: isEach,
        isEmbeddedField: isEmbeddedField,
        isArrayItemUpdate: isArrayItemUpdate,
      });
    }
    return _document;
  },

  /**
   * Given an query, return an array of fields that are being queried.
   * @param {Object} query
   * @param {String} [parentKey] if processing a nested object with an $elemMatch,
   * provide the parents path to prepend to the child field.
   * @return {Array}
   * @api private.
   * @tests unit.
   */
  _getQueryFields(query, parentKey = '') {
    var fields = [];
    // Itterate over each field in query.
    for (let fieldKey in query) {
      let fullKey, valueType, fieldValue, isObjectID, isMongoOperator;
      fieldValue = query[fieldKey];
      // Mongo operators begin w/ `$`.
      isMongoOperator = fieldKey.indexOf('$') === 0;
      // Strip mongodb operators `.$` and `.0` from fieldKey;
      fieldKey = fieldKey.replace('$.', '').replace(/\.\d/g, '');
      // Prepend parentKey to current fieldKey if it exists.
      fullKey = parentKey ? parentKey + '.' + fieldKey : fieldKey;
      // ObjectID will be of type object, but we want it to be a string.
      valueType =  utils._getType(fieldValue);
      valueType = valueType === 'object' && fieldValue._bsontype && fieldValue.id ? 'string' : valueType;
      // If the query is using a logical $and operator or such, its value
      // will be an array.
      if (valueType === 'array' && isMongoOperator) {
        fieldValue.forEach((item) => {
          if (utils._isType(item, 'object')) {
            fields.push(this._getQueryFields(item));
          }
        });
        continue;
      }
      // If the field value is an object, it will contain other fields, or
      // mongodb operators containing fields.
      if (valueType === 'object') {
        // $elemMatch is unique in that its children are objects in an array.
        // As such, it's children will have a key equal to the parent
        // of $elemMatch (not $elemMatch itself).
        if (fieldKey === '$elemMatch') {
          fields.push(this._getQueryFields(fieldValue, parentKey));
        }
        else {
          // fieldKey is parent key for next call.
          let result = this._getQueryFields(fieldValue, fullKey);
          if (result.length) {
            fields.push(result);
            continue;
          }
        }
      }

      if (!isMongoOperator) {
        // Prepend parent key to fieldKey if it exists.
        fields.push(fullKey);
      }

    }
    fields = _.flatten(fields);
    // Filter out query operators.
    fields = fields.filter((field) => {
      return field.indexOf('$') !== 0;
    });
    return _.uniq(fields);
  },

  /**
   * Ensures that a update operation, with upsert = true,
   * has a query that only contains fields that exist in schema.
   * @param {Object} query
   * @param {Array} schemaFields
   * @return {Boolean}
   * @api private.
   * @tests unit.
   */
  _queryFieldsExistInSchema(query, schemaFields) {
    var queryFields;
    queryFields = this._getQueryFields(query);
    for (let queryField of queryFields) {
      if (schemaFields.indexOf(queryField) === -1) {
        return false;
      }
    }
    return true;
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
      // Search preprocessed document for the validated/transformed value.
      let documentValue = __.deepGet(_document, fieldKey);
      // If the value is an object, it either contains an $each property
      // or other nested values.
      if (utils._isType(fieldValue, 'object') && !isArrayItem) {
        // Itterate over each field in the object.
        for (let objKey in fieldValue) {
          if (objKey === '$each') {
            // Remove undefined values from payload. Undefined values, would
            // be those that do not exist in schema.
            if (utils._isType(documentValue, 'undefined')) {
              delete obj[field];
            }
            else {
              obj[field][objKey] = documentValue;
            }
          }
          // Ignore array modifiers other than $each.
          if (objKey.indexOf('$') !== 0) {
            this._replaceDocumentInPayload(fieldValue, documentValue, operation);
          }
        }
      }
      else {
        // If this is an $addToSet or $push operation, or an update of an array
        // item, e.g. field.1, the value has previously been converted to an
        // array for validation, this is where we change it back. @hack.
        if (['$addToSet', '$push'].indexOf(operation) > -1 || isArrayItem) {
          documentValue = documentValue[0];
        }
        // Remove undefined values from payload. Undefined values, would
        // be those that do not exist in schema.
        if (utils._isType(documentValue, 'undefined')) {
          delete obj[field];
        }
        else {
          obj[field] = documentValue
        }
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
      // Fields is a special array used to verify if a query field exists in schemaType
      // and is otherwise independent of schema validation.
      if (schemaType === '_fields') {
        continue;
      }
      // For each schema type, itterate over its the fields.
      for (fieldKey in schema[schemaType]) {
        fieldSchema = schema[schemaType][fieldKey];

        // Set the relative field key if we are processing an object in an array.
        // Nested key needed to set properties on an inner object w/ relative nesting.
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
        // For updates - if this is a embedded fields update, don't set default
        // values. If this is a subdocument, set defaults.
        if (!isUpdate || !parentKey) {
          defaultValue = this._setDefaultValue(fieldValue, fieldSchema);
          if (defaultValue !== fieldValue) {
            fieldValue = defaultValue;
            __.deepSet(newDocument, nestedKey || fieldKey, fieldValue);
            continue;
          }
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
