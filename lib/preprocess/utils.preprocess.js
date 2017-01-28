const {isType, getType, isObjectId} = require('../utils');
const {deepSet} = require('lodash-deep');
const {uniq} = require('lodash');
// const debug = require('debug')('mongorules');

const self = module.exports;

/**
 * Parses query payload, both update and insert, and returns an object for validation.
 *  Doc:1
 *   ObjectIDs are weird and are actually objects w/ properties and not a string ID.
 *   Item in array updates that contain objects for values are seeking to replace
 *   an object in an array.
 * @param {Object} payload
 * @param {String} parentKey - if there is a parentKey (recursed call),
 * then the field is in a subdocument.
 * @return {Object}
 *   payloadPath {Array}
 *   value {Mixed}
 *   isEach {Boolean}
 *   fieldInSubdocument {Boolean}
 *   itemInArrayUpdate {Boolean} e.g. 'account.friends.0'
 *   modifiers {Array|null}
 * @api public.
 * @tests unit.
 */
self.deconstructPayload = (payload, parentKey) => {
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
    // @doc:1
    if (valueIsObject && !isObjectId(fieldValue) && !itemInArrayUpdate) {
      let result, documentKey, modifiers;
      modifiers = self.spliceModifiers(fieldValue);
      result = self.deconstructPayload(fieldValue, fieldKey);
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
self.reconstructPayload = (payload) => {
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
 * Given an query, return an array of fields that are being queried.
 * @param {Object} query
 * @param {String} [parentKey] if processing a nested object with an $elemMatch,
 * provide the parents path to prepend to the child field.
 * @return {Array}
 * @api public.
 * @tests unit.
 */
self.getQueryFields = (query, parentKey) => {
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
          fields.push(self.getQueryFields(item));
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
        fields.push(self.getQueryFields(fieldValue, parentKey));
      }
      else {
        // fieldKey is parent key for next call.
        let result = self.getQueryFields(fieldValue, fullKey);
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
  return uniq(fields);
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
self.spliceModifiers = (payload) => {
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
