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
      let payload, result;
      payload = documents[i];
      result = this._preprocessPayload(payload, schema);
      if (result.errors) {
        errors = result.errors;
        break;
      }
      documents[i] = result.payload;
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
    var hasOperator, supportedOperations;

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

    // If upsert, or if an update operator is not present in the query,
    // process as an insert.
    if (!hasOperator || isUpsert) {
      return this._preprocessInsert(payload, schema);
    }

    supportedOperations = ['$inc', '$mul', '$set', '$min', '$max', '$addToSet', '$push'];
    // var unsupportedOperations = ['$rename', '$setOnInsert', '$unset', '$currentDate', '$pop', '$pullAll', '$pull', '$pushAll'];

    // Itterate over each operation.
    for (let operation in payload) {
      let result,
        parsedPayload,
        embeddedFields,
        documentKeys,
        isValidOperation,
        errors;

      // Only process valid operations.
      isValidOperation = supportedOperations.indexOf(operation) > -1;
      if (!isValidOperation) {
        debug(`Update operator "${operation}" is not supported by monogproxy. Validation / transformation will not occur.`);
        continue;
      }

      // Preprocess document.
      result = this._preprocessPayload(payload[operation], schema, operation);

      // Return errors and/or empty document.
      documentKeys = Object.keys(result.payload).length;
      if (result.errors || !documentKeys) {
        return {
          payload: payload,
          errors: result.errors || ['Empty document post . Nothing to update.']
        };
      }

      // Merge processed document back into payload.
      payload[operation] = result.payload;


    } // end for in loop.

    return {
      errors: null,
      payload: payload,
    };
  },

  /**
   * Given a partial payload, e.g...
      'account.notifications': { $each: [1,2,3], $slice: -5 }
   * remove array modifiers from Object and return them.
   * @param {Object} payload.
   * @return {Array|null}
   * @api private.
   * @tests none.
   */
  _spliceModifiers(payload) {
    var keys, modifiers = [];
    keys = Object.keys(payload);
    keys.forEach((key) => {
      let obj = {};
      if (key === '$each') {
        return;
      }
      if (key.indexOf('$') === 0) {
        obj[key] = payload[key];
        modifiers.push(obj);
        delete payload[key];
      }
    });
    return modifiers.length ? modifiers : null;
  },

  /**
   * Parses payload, both update and insert, and returns an object for validation.
   * @param {Object} payload
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _deconstructPayload(payload) {
    var _document = {};
    if (!payload || !utils._isType(payload, 'object')) {
      return {};
    }

    for (let payloadKey in payload) {
      let valueIsObject, fieldValue, fieldKey, payloadPath;

      fieldKey = payloadKey.replace('$.', '').replace(/\.\d/g, '');
      fieldValue = payload[payloadKey];

      valueIsObject = utils._isType(fieldValue, 'object');
      if (valueIsObject) {
        let result, documentKey, modifiers;
        modifiers = this._spliceModifiers(fieldValue);
        result = this._deconstructPayload(fieldValue);
        for (let field in result) {
          // Add item to payload path.
          result[field]['payloadPath'].unshift(payloadKey);
          // Document key's shouldn't include $each.
          documentKey = field === '$each' ? fieldKey : fieldKey+'.'+field;
          _document[documentKey] = {
            payloadPath: result[field]['payloadPath'],
            value: result[field]['value'],
            isEach: result[field]['isEach'],
            fieldInSubdocument: result[field]['isEach'] ? false : true,
            isArrayItemUpdate: result[field]['isArrayItemUpdate'],
            modifiers: modifiers
          };
        }
      }
      else {
        _document[fieldKey] = {
          payloadPath: [payloadKey],
          value: fieldValue,
          isEach: payloadKey === '$each',
          fieldInSubdocument: false,
          modifiers: null,
          isArrayItemUpdate: fieldKey !== payloadKey
        };
      }
    } // end for in loop.

    return _document;
  },

  _reconstructPayload(payload) {
    var _document = {};
    // Itterate over each item in the payload.
    for (let payloadKey in payload) {
      let item;
      item = payload[payloadKey];
      __.deepSet(_document, item.payloadPath, item.value);
      if (item.modifiers) {
        // Itterate over each object in the modifiers array.
        for (let modifier of item.modifiers) {
          // Remove '$each' from payloadPath array to be
          // replaced by the modifier key.
          item.payloadPath.pop();
          // Itterate over the object key.
          for (let key in modifier) {
            item.payloadPath.push(key);
            __.deepSet(_document, item.payloadPath, modifier[key]);
          }
        }
      }
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
   * Validate and transform an array of values given a schema and
   * ac preprocessed payload object.
   * @param {Object} fieldObj - the result of _deconstructPayload() for a field.
   * @param {String} fieldKey
   * @param {Object} schema - the schema for a field.
   * @param {String} [operation] - e.g. $set, $addToSet
   * @return {Errors Array|null}
   * @api private.
   * @tests none.
   */
  _preprocessArrayOfValues(fieldObj, fieldKey, schema, operation) {
    var value, fieldSchema, errors;

    fieldSchema = schema[fieldKey];

    // Validate outer array.
    errors = new Validator(fieldObj.value, fieldKey, fieldSchema)
      .validateType('array')
      .validateMinLength(0)
      .validateMaxLength(0)
      .getErrors();

    if (errors) {
      return errors;
    }

    // Itterate over each value in the array.
    for (let value of fieldObj.value) {
      // Validate value.
      errors = new Validator(value, fieldKey, fieldSchema)
        .validateType()
        .validateMinLength(1)
        .validateMaxLength(1)
        .validateDenyXSS()
        .validateFunction(0)
        .getErrors();
      if (errors) {
        return errors;
      }
      // Transform value.
      value = transform._transformValue(value, fieldSchema, 0);
    }

    return errors;
  },

  /**
   * Validate and transform an array of objects given a schema and a preprocessed
   * payload object.
   * @param {Object} fieldObj - the result of _deconstructPayload() for a field.
   * @param {String} fieldKey
   * @param {Object} schema - the schema for a field.
   * @param {String} [operation] - e.g. $set, $addToSet
   * @return {Errors Array|null}
   * @api private.
   * @tests none.
   */
  _preprocessArrayOfObjects(fieldObj, fieldKey, schema, operation) {
    var value, fieldValue, fieldSchema, errors, result, processedKeys = [];

    fieldSchema = schema[fieldKey];
    fieldValue = fieldObj.value
    // Validate outer array.
    errors = new Validator(fieldValue, fieldKey, fieldSchema)
      .validateType('array')
      .validateMinLength(0)
      .validateMaxLength(0)
      .getErrors();

    if (errors) {
      return errors;
    }

    // Itterate over each object in the array.
    for (let obj of fieldValue) {
      // Add keys so that we can later remove from schema.
      processedKeys.push(Object.keys(obj));
      // Validate each object.
      errors = new Validator(obj, fieldKey, fieldSchema)
        .validateType('object')
        .validateFunction(0)
        .getErrors();
      if (errors) {
        return errors;
      }
      // Run custom transform function.
      obj = transform._transformFunction(obj, fieldSchema, 0);
      if (!utils._isType(obj, 'object')) {
        return this._postTransformTypeError(fieldKey, obj, 'Object')
      }
      // Preprocess the contents of the object.
      result = this._preprocessPayload(obj, schema, operation, fieldKey);
      if (result.errors) {
        return result.errors;
      }
    }

    return errors;

  },

  /**
   * Validate and transform a value given a schema and a preprocessed payload object.
   * @param {Object} fieldObj - the result of _deconstructPayload() for a field.
   * @param {String} fieldKey
   * @param {Object} schema - the schema for a field.
   * @param {String} [operation] - e.g. $set, $addToSet
   * @return {Errors Array|null}
   * @api private.
   * @tests none.
   */
  _preprocessFieldValue(fieldObj, fieldKey, schema, operation) {
    var value, errors;

    // Validate value.
    errors = new Validator(fieldObj.value, fieldKey, schema[fieldKey])
      .validateType()
      .validateMinLength(0)
      .validateMaxLength(0)
      .validateDenyXSS()
      .validateFunction(0)
      .getErrors();

    if (!errors) {
      // Transform value.
      fieldObj.value = transform._transformValue(fieldObj.value, schema[fieldKey], 0);
    }

    return errors;
  },


  /**
   * Validate, transform, and reconstruct a payload.
   * @param {Object} payload - object will be modified.
   * @param {Object} schema - object will be modified, pass in clone.
   * @param {String} operation.
   * @param {String} [parentKey] - if recursed for arrayofobjects, prepend
   * parent key to fieldKey to match in schema.
   * @return {Object}
   *   `errors` {Array}
   *   `documents` {Array|Object}
   * @api private.
   * @tests unit.
   */
  _preprocessPayload(payload, schema, operation, parentKey = '') {
    var errors = [], missingFieldsError;
    // Transform payload into a special object for processing.
    payload = this._deconstructPayload(payload);
    // Set defaults if this is an insert/upsert.
    if (!operation) {
      payload = this._setDefaultValues(payload, schema, parentKey);
    }
    // Validate required.
    missingFieldsError = this._validateRequiredFields(payload, schema, operation, parentKey);
    if (missingFieldsError) {
      return {
        errors: missingFieldsError,
        payload: payload
      };
    }
    // Itterate over each item in the payload object.
    for (let payloadKey in payload) {
      let fieldObj, fullKey, errors;
      // If this is a recursed operation, in the case when processing an
      // array of objects, prepend the parent key so that we can access
      // data in schema.
      fullKey = parentKey ? parentKey+'.'+payloadKey : payloadKey;
      fieldObj = payload[payloadKey];
      // Check to see if the value exists in the schema, and if not,
      // remove the item from the payload.
      if (!schema[fullKey]) {
        delete payload[payloadKey];
        continue;
      }
      // Filter null values for arrays.
      if (schema[fullKey].filterNulls && utils._isType(fieldObj.value, 'array')) {
        fieldObj.value = utils._filterNulls(fieldObj.value);
      }
      // Validate and transform value.
      switch (schema[fullKey]._type) {
        case 'value':
          errors = this._preprocessFieldValue(fieldObj, fullKey, schema, operation);
          break;
        case 'arrayofvalues':
          errors = this._preprocessArrayOfValues(fieldObj, fullKey, schema, operation);
          break;
        case 'arrayofobjects':
          errors = this._preprocessArrayOfObjects(fieldObj, fullKey, schema, operation);
          break;
      }
      // Handle errors.
      if (errors) {
        errors.push(errors);
      }
    }

    // Reconstruct payload if we are are done processing the payload,
    // including nested arrays of objects...
    if (!parentKey) {
      payload = this._reconstructPayload(payload);
    }

    return {
      errors: errors.length ? _.flatten(errors): null,
      payload: payload
    };

  },

  /**
   * For an insert/upsert, all fields that are required in schema
   * must be present. For an update, if a subdocument update,
   * all fields in subdocument must be present. For an embedded field update,
   * ignore other fields in subdocument.
   * @param {Object} payload - deconstructed payload.
   * @param {Object} schema.
   * @param {String} operation.
   * @param {String} parentKey.
   * @return {Object}
   * @api private
   * @tests none.
   */
  _validateRequiredFields(payload, schema, operation, parentKey) {
    let errors = [];

    schema = this._filterSchema(schema, parentKey);

    // Itterate over each schema key.
    for (let schemaKey in schema) {
      // Only process fields required in schema that do not exist in payload.
      if (schema[schemaKey].required && _.isUndefined(payload[schemaKey])) {
        // If this is an insert/upsert, required fields must exist in payload.
        if (!operation) {
          errors.push('required');
          continue;
        }
        // Check payload to see if it contains sibling fields, if there are,
        // this field is only required if this is a subdocument update.
        for (let payloadKey in payload) {
          // If there is another field a part of the same subdocument...
          if (schemaKey.split('.')[0] === payloadKey.split('.')[0]) {
            if (payload[payloadKey].fieldInSubdocument) {
              errors.push('required');
              break;
            }
          }
        } // end for of loop.
      } // end if
    } // end for of

    return errors.length ? errors : null;
  },

 /**
  * Given a deconstructed payload, set default field values for an
  * insert/upsert.
  * @param {Object} payload.
  * @param {Object} schema.
  * @param {String} parentKey.
  * @return {Object}
  * @api private
  * @tests none.
  */
  _setDefaultValues(payload, schema, parentKey) {
    let payloadKeys;
    payloadKeys = Object.keys(payload);
    schema = this._filterSchema(schema, parentKey);

    // Itterate over each schema key.
    for (let schemaKey in schema) {
      let fieldSchema;
      fieldSchema = schema[schemaKey];
      // If the default property is set in schema, and that
      // field is not in the payload...
      if (payloadKeys.indexOf(schemaKey) === -1 && !_.isUndefined(fieldSchema.default)) {
        // Set default value.
        payload[schemaKey] = {
          payloadPath: schemaKey,
          value: fieldSchema.default,
          fieldInSubdocument: false,
          isEach: false,
          isArrayItemUpdate: false,
          modifiers: null
        };
      }
    }
    return payload;
  },

  /**
   * Given a schema, filter out items that are nested inside an array.
   * @param {Object} schema
   * @param {Stirng} parentKey
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _filterSchema(schema, parentKey) {
    let arrayFields = [];
    schema = _.clone(schema);

    if (parentKey) {
      // Filter out keys that are not nested inside the parent.
      // e.g. remove 'newsletter' if parent = 'account.friends'.
      for (let schemaKey in schema) {
        if (schemaKey.indexOf(parentKey) !== 0 || schemaKey === parentKey) {
          delete schema[schemaKey];
        }
      }
    }

    // Find fields nested inside arrays.
    for (let schemaKey in schema) {
      if (schema[schemaKey]._type !== 'value') {
        arrayFields.push(schemaKey);
      }
    }

    // Filter out fields nested inside arrays.
    for (let schemaKey in schema) {
      for (let arrayField of arrayFields) {
        if (schemaKey.indexOf(arrayField) === 0 && schemaKey !== arrayField) {
          delete schema[schemaKey];
        }
      }
    }

    return schema;

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
