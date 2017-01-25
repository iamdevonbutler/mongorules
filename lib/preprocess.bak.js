const _ = require('lodash');
const {deepSet} = require('lodash-deep');
const debug = require('debug')('mongorules');
const {isType, getType, isObjectId} = require('./utils');
const {transformFunction, transformValue} = require('./transform');
const {
  compose,
  validateRequired,
  validateNotNull,
  validateType,
  validateDenyXSS,
  validateMinLength,
  validateMaxLength,
  validateFunction,
} = require('./validate');

const fieldValueValidator     = compose(validateNotNull, validateType(), validateDenyXSS, validateMinLength(0), validateMaxLength(0), validateFunction(0));
const arrayOfValuesValidator1 = compose(validateNotNull, validateType(), validateMinLength(1), validateMaxLength(1), validateDenyXSS, validateFunction(0));
const arrayOfValuesValidator2 = compose(validateNotNull, validateType('array'));
const arrayOfValuesValidator3 = compose(validateNotNull, validateType('array'), validateMinLength(0), validateMaxLength(0));
const arrayOfValuesValidator4 = compose(validateNotNull, validateType(), validateMinLength(1), validateMaxLength(2), validateDenyXSS, validateFunction(0));
const arrayOfObjectsValidator1 = compose(validateNotNull, validateType('array'), validateMaxLength(0));
const arrayOfObjectsValidator2 = compose(validateNotNull, validateType('array'), validateMaxLength(0), validateMaxLength(0));
const objectValidator          = compose(validateNotNull, validateType('object'), validateFunction(0));

const self = module.exports;

/**
 * Validate data against schema for insert/update/save/findAndModify calls.
 * Transform data if schema mandates.
 * @param {Array} args
 * @param {Object} schema - validation object (result of preprocessSchema)
 * @param {String} operation
 * @return {Object} - potentially transformed arguments for method call.
 * @api public
 * @tests intergration
 */
self.preprocessQuery = (args, schema, operation) => {
  var result, payload, query, errors, isUpsert = false;
  // Validate payload.
  switch (operation) {
    case 'insert':
      payload = args[0];
      result = self._preprocessInsert(payload, schema);
      args[0] = result.payload;
      break;
    case 'update':
      query = args[0];
      payload = args[1];
      isUpsert = args[2] && args[2].upsert;
      result = self._preprocessUpdate(payload, schema, query, isUpsert);
      args[1] = result.payload;
      break;
    case 'save':
      payload = args[0];
      // If there is an _id field, this is ther equivalent of an
      // update w/ upsert = true.
      if (payload._id) {
        query = {_id: payload._id};
        isUpsert = true;
        result = self._preprocessUpdate(payload, schema, query, isUpsert);
        args[0] = result.payload;
      }
      // If there is no _id, process as an insert;
      else {
        result = self._preprocessInsert(payload, schema);
        args[0] = result.payload;
      }
      break;
    case 'findAndModify':
      query = args[0];
      payload = args[2];
      isUpsert = args[3] && args[3].upsert;
      result = self._preprocessUpdate(payload, schema, query, isUpsert);
      args[2] = result.payload;
      break;
  }

  errors = result ? result.errors : null;

  return {
    errors,
    args,
  }
};

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
self._preprocessInsert = (documents, schema) => {
  var errors = null;

  // Multiple documents can be inserted at a time.
  // Make all documents documents itterable.
  if (!isType(documents, 'array')) {
    documents = [documents];
  }

  // Filter out empty documents.
  documents = self._removeEmptyDocumentsFromPayload(documents);
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
    result = self._preprocessPayload(payload, schema);
    if (result.errors) {
      errors = result.errors;
      break;
    }
    documents[i] = result.payload;
  }

  // Filter out empty documents.
  documents = self._removeEmptyDocumentsFromPayload(documents);
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
};

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
self._preprocessUpdate = (payload, schema, query, isUpsert) => {
  query = query || {};
  isUpsert = isUpsert || false;
  var hasOperator, supportedOperations;

  // If this is an upsert, ensure that the query does not
  // contain fields that do not exist in schema (to prevent insertion
  // of these fields).
  if (isUpsert && !self._queryFieldsExistInSchema(query, schema)) {
    return { query: query, errors: ['During upsert, query contains fields that are not present in schema.'] };
  }

  // Updates can take place w/o an update operator.
  hasOperator = Object.keys(payload).filter((key) => {
    return key.indexOf('$') === 0;
  }).length;

  // If an update operator is not present in the query,
  // process as an insert.
  if (!hasOperator) {
    return self._preprocessInsert(payload, schema);
  }

  supportedOperations = ['$inc', '$mul', '$set', '$min', '$max', '$addToSet', '$push'];

  // Itterate over each operation.
  for (let operation in payload) {
    let result,
      parsedPayload,
      embeddedFields,
      payloadKeys,
      isValidOperation;

    // Only process valid operations.
    isValidOperation = supportedOperations.indexOf(operation) > -1;
    if (!isValidOperation) {
      debug(`Update operator "${operation}" is not supported by monogrules. Validation / transformation will not occur.`);
      continue;
    }

    // Don't process an empty payload.
    payloadKeys = Object.keys(payload[operation]).length;
    if (!payloadKeys) {
      return {
        payload: payload,
        errors: [`Empty payload for ${operation} operation. Nothing to update.`]
      };
    }

    // Preprocess document.
    // Upserts should be processed as inserts would.
    result = self._preprocessPayload(payload[operation], schema, operation, isUpsert);

    // Return if errors are present or if an empty payload was returned.
    payloadKeys = Object.keys(result.payload).length;
    if (result.errors || !payloadKeys) {
      return {
        payload: payload,
        errors: result.errors || [`Empty payload for ${operation} operation. Nothing to update.`]
      };
    }

    // Merge processed partial payload back into payload.
    payload[operation] = result.payload;

  } // end for in loop.

  return {
    errors: !Object.keys(payload).length ? ['Empty payload. Nothing to update.'] : null,
    payload: payload,
  };
};

/**
 * Parses query payload, both update and insert, and returns an object for validation.
 * @param {Object} payload
 * @param {String} parentKey - if there is a parentKey (recursed call),
 * then the field is in a subdocument.
 * @return {Object}
 *   payloadPath {Array}
 *   value {Mixed}
 *   isEach {Boolean}
 *   fieldInSubdocument {Boolean}
 *   itemInArrayUpdate {Boolean}
 *   modifiers {Array|null}
 * @api private.
 * @tests unit.
 */
self._deconstructPayload = (payload, parentKey) => {
  var _document = {};

  if (!payload || !isType(payload, 'object')) {
    return {};
  }

  for (let payloadKey in payload) {
    let valueIsObject, fieldValue, fieldKey, payloadPath, itemInArrayUpdate;

    fieldKey = payloadKey.replace('$.', '').replace(/\.\d/g, '');
    fieldValue = payload[payloadKey];
    itemInArrayUpdate = fieldKey !== payloadKey;

    valueIsObject = isType(fieldValue, 'object');
    valueIsObject = valueIsObject && !isType(fieldValue, 'date');

    // ObjectIDs are weird and are actually objects w/ properties and not a string ID.
    // Item in array updates that contain objects for values are seeking to replace
    // an object in an array.
    if (valueIsObject && !isObjectId(fieldValue) && !itemInArrayUpdate) {
      let result, documentKey, modifiers;
      modifiers = self._spliceModifiers(fieldValue);
      result = self._deconstructPayload(fieldValue, fieldKey);
      for (let field in result) {
        // Add item to payload path.
        result[field].payloadPath.unshift(payloadKey);
        // Document key's shouldn't include $each.
        documentKey = field === '$each' ? fieldKey : fieldKey + '.' + field;
        _document[documentKey] = {
          payloadPath: result[field].payloadPath,
          value: result[field].value,
          isEach: result[field].isEach,
          fieldInSubdocument: result[field].isEach ? false : true,
          itemInArrayUpdate: result[field].itemInArrayUpdate,
          modifiers: modifiers
        };
      }
    }
    else {
      _document[fieldKey] = {
        payloadPath: [payloadKey],
        value: fieldValue,
        isEach: payloadKey === '$each',
        fieldInSubdocument: !!parentKey,
        modifiers: null,
        itemInArrayUpdate: itemInArrayUpdate
      };
    }
  } // end for in loop.

  return _document;
};

/**
 * Given a deconstructed payload, recreate payload.
 * @param {Object} payload
 * @return {Object}
 * @api private.
 * @tests none.
 */
self._reconstructPayload = (payload) => {
  var _payload = {};
  // Itterate over each item in the payload.
  for (let payloadKey in payload) {
    let item;
    item = payload[payloadKey];
    deepSet(_payload, item.payloadPath, item.value);
    if (item.modifiers) {
      // Itterate over each object in the modifiers array.
      for (let modifier of item.modifiers) {
        // Remove '$each' from payloadPath array to be
        // replaced by the modifier key.
        item.payloadPath.pop();
        // Itterate over the object key.
        for (let key in modifier) {
          item.payloadPath.push(key);
          deepSet(_payload, item.payloadPath, modifier[key]);
        }
      }
    }
  }
  return _payload;
};

/**
 * Given a partial payload, e.g...
 *  'account.notifications': { $each: [1,2,3], $slice: -5 }
 * remove array modifiers from Object and return them.
 * @param {Object} payload.
 * @return {Array|null}
 * @api private.
 * @tests none.
 */
self._spliceModifiers = (payload) => {
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
};

/**
 * Given an query, return an array of fields that are being queried.
 * @param {Object} query
 * @param {String} [parentKey] if processing a nested object with an $elemMatch,
 * provide the parents path to prepend to the child field.
 * @return {Array}
 * @api private.
 * @tests unit.
 */
self._getQueryFields = (query, parentKey) => {
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
    valueType =  getType(fieldValue);
    valueType = valueType === 'object' && isObjectId(fieldValue) ? 'string' : valueType;
    // If the query is using a logical $and operator or such, its value
    // will be an array.
    if (valueType === 'array' && isMongoOperator) {
      fieldValue.forEach((item) => {
        if (isType(item, 'object')) {
          fields.push(self._getQueryFields(item));
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
        fields.push(self._getQueryFields(fieldValue, parentKey));
      }
      else {
        // fieldKey is parent key for next call.
        let result = self._getQueryFields(fieldValue, fullKey);
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
};

/**
 * Ensures that a update operation, with upsert = true,
 * has a query that only contains fields that exist in schema.
 * @param {Object} query
 * @param {Object} schema
 * @return {Boolean}
 * @api private.
 * @tests unit.
 */
self._queryFieldsExistInSchema = (query, schema) => {
  var queryFields, schemaFields;
  queryFields = self._getQueryFields(query);
  schemaFields = Object.keys(schema);
  for (let queryField of queryFields) {
    if (schemaFields.indexOf(queryField) === -1) {
      return false;
    }
  }
  return true;
};

/**
 * Validate and transform an array of values, by reference, given a schema and
 * a preprocessed payload item.
 * @param {String} fieldKey
 * @param {Object} fieldObj - the result of _deconstructPayload() for a field.
 * @param {Object} fieldSchema - the schema for a field.
 * @param {String} [operation] - e.g. $set, $addToSet
 * @return {Errors Array|null}
 * @api private.
 * @tests none.
 */
self._preprocessArrayOfValues = (fieldKey, fieldObj, fieldSchema, operation) => {
  var errors, isArrayUpdateOperation;

  // Handle array item updates and $addToSet and $push operations.
  // The value for array item updates will not be an array as it normally would.
  // Same for $push and $addToSet operations, unless they are using $each.
  isArrayUpdateOperation = ['$addToSet', '$push'].indexOf(operation) > -1;

  if (fieldObj.itemInArrayUpdate || (!fieldObj.isEach && isArrayUpdateOperation)) {
    errors = arrayOfValuesValidator1(fieldObj.value, fieldKey, fieldSchema)
    if (errors && errors.length) {
      return errors;
    }
    // Transform value.
    fieldObj.value = transformValue(fieldObj.value, fieldSchema, 0);
  }

  // Validate outer array.
  // Validation is slightly different if the $each modifier is present.
  if (fieldObj.isEach) {
    errors = arrayOfValuesValidator2(fieldObj.value, fieldKey, fieldSchema);
  }
  else {
    errors = arrayOfValuesValidator3(fieldObj.value, fieldKey, fieldSchema);
  }

  if (errors && errors.length) {
    return errors;
  }

  // Itterate over each value in the array.
  for (let i in fieldObj.value) {
    let value = fieldObj.value[i];
    // Validate value.
    errors = arrayOfValuesValidator4(value, fieldKey, fieldSchema);
    if (errors && errors.length) {
      return errors;
    }
    // Transform value.
    fieldObj.value[i] = transformValue(value, fieldSchema, 0);
  }

  return errors && errors.length ? errors : null;
};

/**
 * Validate and transform an array of objects, by reference, given a schema
 * and a preprocessed payload item.
 * @param {String} fieldKey
 * @param {Object} fieldObj - the result of _deconstructPayload() for a field.
 * @param {Object} schema
 * @param {String} [operation] - e.g. $set, $addToSet
 * @param {String} [parentKey] - values of $addToSet and $push operations are not
 * arrays but rather objects; however these objects may contain other arrays of Objects
 * and should be processed as such. parentKey let's us know if this call has been recursed.
 * @param {Boolean} [isUpsert]
 * @return {Errors Array|null}
 * @api private.
 * @tests none.
 */
self._preprocessArrayOfObjects = (fieldKey, fieldObj, schema, operation, isUpsert, parentKey) => {
  var value, fieldValue, fieldSchema, errors,
    isArrayUpdateOperation, recursedArrayOperation;

  fieldSchema = schema[fieldKey];
  fieldValue = fieldObj.value;

  // Handle array item updates and $addToSet and $push operations.
  // The value for array item updates will not be an array as it normally would.
  // Same for $push and $addToSet operations, unless they are using $each.
  // $addToSet & $push values may not always be an object in instances where
  // a value in the object is an array of objects, in which case, we process as
  // we normally would.
  isArrayUpdateOperation = ['$addToSet', '$push'].indexOf(operation) > -1;
  recursedArrayOperation = !!parentKey && isArrayUpdateOperation;
  if (fieldObj.itemInArrayUpdate || (!fieldObj.isEach && isArrayUpdateOperation && !recursedArrayOperation)) {
    let result;
    result = self._preprocessObject(fieldValue, fieldKey, schema, operation, isUpsert);
    fieldObj.value = result.payload;
    return result.errors;
  }

  // Validate outer array.
  // Validation is slightly different if the $each modifier is present.
  if (fieldObj.isEach) {
    errors = arrayOfObjectsValidator1(fieldObj.value, fieldKey, fieldSchema);
  }
  else {
    errors = arrayOfObjectsValidator2(fieldValue, fieldKey, fieldSchema);
  }

  if (errors && errors.length) {
    return errors;
  }

  // Itterate over each object in the array.
  for (let i in fieldValue) {
    let result, obj;
    obj = fieldValue[i];
    result = self._preprocessObject(obj, fieldKey, schema, operation, isUpsert);
    if (result.errors) {
      return result.errors;
    }
    fieldObj.value[i] = result.payload;
  }

  return errors;

};

/**
 * Validate and transform an object in an array of objects.
 * @param {Object} obj.
 * @param {String} fieldKey
 * @param {Object} fieldSchema - the schema for a field.
 * @param {String} [operation] - e.g. $set, $addToSet
 * @param {Boolean} [isUpsert]
 * @return {Object}
 * @api private.
 * @tests none.
 */
self._preprocessObject = (obj, fieldKey, schema, operation, isUpsert) => {
  var errors, result, fieldSchema;

  fieldSchema = schema[fieldKey];

  // Validate object.
  errors = objectValidator(obj, fieldKey, fieldSchema);

  if (!errors || !errors.length) {
    // Run custom transform function.
    obj = transformFunction(obj, fieldSchema, 0);
    if (isType(obj, 'object')) {
      // Preprocess the contents of the object.
      result = self._preprocessPayload(obj, schema, operation, isUpsert, fieldKey);
    }
    else {
      errors = self._postTransformTypeError(fieldKey, obj, 'Object')
    }
  }

  return {
    errors: result ? result.errors : errors,
    payload: result ? result.payload : obj
  };
};

/**
 * Validate and transform a value given a schema and a preprocessed payload object.
 * @param {String} fieldKey
 * @param {Object} fieldObj - the result of _deconstructPayload() for a field.
 * @param {Object} fieldSchema - the schema for a field.
 * @return {Errors Array|null}
 * @api private.
 * @tests none.
 */
self._preprocessFieldValue = (fieldKey, fieldObj, fieldSchema) => {
  var errors;
  errors = fieldValueValidator(fieldObj.value, fieldKey, fieldSchema);
  if (errors && errors.length) {
    return errors;
  }
  fieldObj.value = transformValue(fieldObj.value, fieldSchema, 0);
  return null;
};

/**
 * Validate, transform, and reconstruct a payload.
 * @param {Object} payload - object will be modified.
 * @param {Object} schema - object will be modified, pass in clone.
 * @param {String} [operation].
 * @param {Boolean} [isUpsert].
 * @param {String} [parentKey] - if recursed for arrayofobjects, prepend
 * parent key to fieldKey to match in schema.
 * @return {Object}
 *   `errors` {Array}
 *   `documents` {Array|Object}
 * @api private.
 * @tests unit.
 * @todo perf test and improvement - bottleneck.
 */
self._preprocessPayload = (payload, schema, operation, isUpsert, parentKey) => {
  var errors = [], missingFieldsError, filteredSchema;

  // Transform payload into a special object for processing.
  payload = self._deconstructPayload(payload, parentKey);

  // Filter schema when setting defaults and validating required to prevent
  // processing subdocuments updated via embedded fields and objects nested in arrays.
  filteredSchema = self._filterSchema(payload, schema, operation, isUpsert, parentKey);

  // Set defaults.
  payload = self._setDefaultValues(payload, filteredSchema, operation, isUpsert, parentKey);

  // Validate required.
  missingFieldsError = self._validateRequiredFields(payload, filteredSchema, operation, isUpsert, parentKey);
  if (missingFieldsError) {
    return {
      errors: missingFieldsError,
      payload: payload
    };
  }
  // Itterate over each item in the payload object.
  for (let payloadKey in payload) {
    let fieldObj, fullKey, err;
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
    if (schema[fullKey].filterNulls && isType(fieldObj.value, 'array')) {
      fieldObj.value = filterNulls(fieldObj.value);
    }
    // Validate and transform value.
    switch (schema[fullKey]._type) {
      case 'value':
        err = self._preprocessFieldValue(fullKey, fieldObj, schema[fullKey]);
        break;
      case 'arrayofvalues':
        err = self._preprocessArrayOfValues(fullKey, fieldObj, schema[fullKey], operation);
        break;
      case 'arrayofobjects':
        err = self._preprocessArrayOfObjects(fullKey, fieldObj, schema, operation, isUpsert, parentKey);
        break;
    }
    // Handle errors.
    if (err && err.length) {
      errors.push(...err);
    }
  }

  // Reconstruct payload.
  payload = self._reconstructPayload(payload);

  return {
    errors: errors.length ? errors: null,
    payload: payload
  };

};

/**
 * For an insert/upsert, all fields that are required in schema
 * must be present. For an update, if a subdocument update,
 * all fields in subdocument must be present. For an embedded field update,
 * ignore other fields in subdocument. This method is not recursive, and
 * only operates on one schema level - e.g. it will not validate a subdocument
 * and a nested object inside a array field of that subdocument.
 * @param {Object} payload - deconstructed payload.
 * @param {Object} schema.
 * @param {String} [operation].
 * @param {Boolean} [isUpsert].
 * @param {String} [parentKey].
 * @return {Object}
 * @api private
 * @tests unit.
 */
self._validateRequiredFields = (payload, schema, operation, isUpsert, parentKey) => {
  let errors = [];

  // Itterate over each schema key.
  for (let schemaKey in schema) {
    let relativePayloadKey, siblingFields;
    // Get the relative payload key. If parentKey exists, the payload keys will
    // not be prefixed w/ the parent key, but the schema items will.
    relativePayloadKey = parentKey ? schemaKey.slice(parentKey.length + 1) : schemaKey;
    // Required fields must not be undefined in payload.
    if (schema[schemaKey].required && payload[relativePayloadKey] === undefined) {
      errors.push({
        field: schemaKey,
        property: 'required',
        value: undefined,
      });
    }
  }

  return errors.length ? errors : null;
};

/**
* Given a deconstructed payload, set default field values for an
* insert/upsert. This method is not recursive, and
* only operates on one schema level - e.g. it will not validate a subdocument
* and a nested object inside a array field of that subdocument.
* @param {Object} payload.
* @param {Object} schema.
* @param {String} [operation].
* @param {Boolean} [isUpsert].
* @param {String} [parentKey].
* @return {Object}
* @api private
* @tests unit.
*/self.
_setDefaultValues = (payload, schema, operation, isUpsert, parentKey) => {
  var payloadKeys, subdocsUpdatedViaEmbeddedFields = [];
  payloadKeys = Object.keys(payload);

  // For upserts only, if an existing field in the payload is being updated
  // via embedded field syntax, make sure the defaults set use that syntax as well.
  if (isUpsert) {
    for (let payloadKey in payload) {
      if (!payload[payloadKey].fieldInSubdocument) {
        let key = parentKey ? parentKey.split('.')[0] : payloadKey.split('.')[0];
        subdocsUpdatedViaEmbeddedFields.push(key);
      }
    }
    subdocsUpdatedViaEmbeddedFields = _.uniq(subdocsUpdatedViaEmbeddedFields);
  }

  // Itterate over each schema key.
  for (let schemaKey in schema) {
    var fieldSchema, relativeSchemaKey, fieldExistsInPayload, fieldInSubdocument = true, payloadPath;

    fieldSchema = schema[schemaKey];
    // If the default property is set in schema, and that
    // field is not in the payload...
    relativeSchemaKey = parentKey ? schemaKey.slice(parentKey.length + 1) : schemaKey;
    fieldExistsInPayload = payloadKeys.indexOf(relativeSchemaKey) > -1;

    if (!fieldExistsInPayload && !_.isUndefined(fieldSchema.default)) {

      // For upserts only, if an existing field in the payload is being updated
      // via embedded field syntax, make sure the defaults set use that syntax as well.
      if (isUpsert) {
        fieldInSubdocument = subdocsUpdatedViaEmbeddedFields.indexOf(schemaKey.split('.')[0]) > -1 ? false : true
      }

      // Get relative payload path. If, during an upsert, we are setting a
      // default for an embedded field, wrap in [] for proper the payload reconstruction.
      payloadPath = parentKey ? schemaKey.slice(parentKey.length + 1) : schemaKey;
      payloadPath = fieldInSubdocument ? payloadPath : [payloadPath];

      // Set default value.
      payload[relativeSchemaKey] = {
        payloadPath: payloadPath,
        value: fieldSchema.default,
        fieldInSubdocument: fieldInSubdocument,
        isEach: false,
        itemInArrayUpdate: false,
        modifiers: null
      };
    }
  }
  return payload;
};

/**
 * For setting defaults and validating required fields, remove items from
 * schema that would not need to be processed. e.g. subdocument fields
 * for an embedded field update, fields of objects that are nested in an array field.
 * @param {Object} payload
 * @param {Object} _schema
 * @param {String} [operation]
 * @param {Boolean} [isUpsert]
 * @param {Stirng} [parentKey]
 * @return {Object}
 * @api private.
 * @tests unit.
 */
self._filterSchema = (payload, _schema, operation, isUpsert, parentKey) => {
  let arrayFields = [];
  let schema = Object.assign({}, _schema);

  // If this is an update, don't set defaults/required validation for
  // subdocument fields that are updated via an embedded field update.
  // For upserts, we must set defaults/valdiate required in the chance of
  // an eventual insert.
  if (operation && !isUpsert) {
    // Find embedded fields in payload.
    let skipSubdocuments = [], isEmbeddedFieldUpdate = true;
    for (let payloadKey in payload) {
      let fieldInSubdocument = payload[payloadKey].fieldInSubdocument;
      if (!fieldInSubdocument) {
        let key = parentKey ? parentKey.split('.')[0] : payloadKey.split('.')[0];
        skipSubdocuments.push(key);
      }
      else {
        isEmbeddedFieldUpdate = false;
      }
    }
    // If this update only contains embedded field updates, there would be
    // no defaults to set and validating required is not necessary.
    if (isEmbeddedFieldUpdate) {
      return {};
    }
    // Purge schema of subdocuments that are are
    // being updated via embedded fields.
    if (skipSubdocuments.length) {
      skipSubdocuments = _.uniq(skipSubdocuments);
      for (let schemaKey in schema) {
        if (skipSubdocuments.indexOf(schemaKey.split('.')[0]) > -1) {
          delete schema[schemaKey];
        }
      }
    }
  }

  if (parentKey) {
    // Filter out keys that are not nested inside the parent.
    // e.g. remove 'newsletter' if parent = 'account.friends'.
    for (let schemaKey in schema) {
      if (schemaKey.indexOf(parentKey) !== 0 || schemaKey === parentKey) {
        delete schema[schemaKey];
      }
    }
  }

  // Find fields of objects nested inside arrays.
  for (let schemaKey in schema) {
    if (schema[schemaKey]._type !== 'value') {
      arrayFields.push(schemaKey);
    }
  }

  // Remove fields of objects nested inside arrays.
  for (let schemaKey in schema) {
    for (let arrayField of arrayFields) {
      if (schemaKey.indexOf(arrayField) === 0 && schemaKey !== arrayField) {
        delete schema[schemaKey];
      }
    }
  }

  return schema;
};

/**
 * Error message for when a transform function returns an invalid type.
 * @param {String} field
 * @param {Mixed} value
 * @param {String} Type
 * @return {Object}
 * @api private.
 * @tests none.
 */
self._postTransformTypeError = (field, value, type) => {
  return {
    field: field,
    property: 'type',
    value: value,
    message: 'Transform function must return a ' + type
  }
}

/**
 * Filter out empty documents from a documents array.
 * @param {Array} documents.
 * @return {Array}
 * @api private.
 * @tests none.
 */
self._removeEmptyDocumentsFromPayload = (documents) => {
  return documents.filter((_document) => {
    if (!isType(_document, 'object')) {
      return false;
    }
    return Object.keys(_document).length;
  });
};
