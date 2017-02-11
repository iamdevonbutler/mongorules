const {deepSet} = require('lodash-deep');
const {isType, isObjectId, cleanFieldKey} = require('../../utils');
const PayloadItem = require('./payload.item');
const ArrayUpdatePayloadItem = require('./payload.item.arrayupdate');

module.exports = class Payload {

  constructor(payload, schema, isUpsert = false) {
    this._payload = payload;
    this._schema = schema;
    this._isUpsert = isUpsert;
    this._payloadSet = [];
  }

  preprocess(cacheKey) {
    var payloadSet, errors = [];
    payloadSet = this._payloadSet;
    payloadSet.forEach(payloadItem => {
      var errors2;
      payloadItem.transform();
      errors2 = payloadItem.validate(cacheKey);
      if (errors2 && errors2.length) {
        errors = errors.concat(errors2);
      }
    });
    return errors && errors.length ? errors : null;
  }

  /**
   * Parses query payload, both update and insert, and returns an object for validation.
   *  @doc:1
   *   ObjectIDs are weird and are actually objects w/ properties and not a string ID.
   *   Item in array updates that contain objects for values are seeking to replace
   *   an object in an array.
   * @param {Object} payload
   * @param {String} parentKey - if there is a parentKey (recursed call),
   * then the field is in a subdocument.
   * @return {Object}
   *   payloadPath {Array}
   *   value {Mixed}
   * @api public.
   * @tests unit.
   */
  deconstructPayload(payload, parentKey) {
    var obj = {};

    if (!payload || !isType(payload, 'object')) return {};

    for (let payloadKey in payload) {
      let valueIsObject, fieldValue, fieldKey, isArrayItemUpdate, hasKeys, payloadPath;

      fieldKey = cleanFieldKey(payloadKey);

      fieldValue = payload[payloadKey];
      isArrayItemUpdate = fieldKey !== payloadKey;

      valueIsObject = isType(fieldValue, 'object');
      valueIsObject = valueIsObject && !isType(fieldValue, 'date');
      hasKeys = fieldValue ? !!Object.keys(fieldValue).length : false;

      if (hasKeys && valueIsObject && !isArrayItemUpdate && !isObjectId(fieldValue)) { // @doc:1
        let result, documentKey;
        result = this.deconstructPayload(fieldValue, fieldKey);
        for (let field in result) {
          result[field].payloadPath.unshift(payloadKey);
          documentKey = fieldKey + '.' + field;
          obj[documentKey] = {
            payloadPath: result[field].payloadPath,
            value: result[field].value,
            isArrayItemUpdate: result[field].isArrayItemUpdate,
          };
        }
      }
      else {
        obj[fieldKey] = {
          payloadPath: [payloadKey],
          value: fieldValue,
          isArrayItemUpdate,
        };
      }
    }
    return obj;
  };

  /**
   * Given a deconstructed payload, build a new payload object.
   */
  reconstructPayload() {
    var payloadSet, payload = {};
    payloadSet = this._payloadSet;
    payloadSet.forEach(item => deepSet(payload, item.payloadPath, item.value));
    return payload;
  }

  /**
   * Builds an array of payload items on this._payloadSet,
   * to be transformed and validated, from a deconstructed payload.
   * @param {Object} payload - deconstructed payload.
   * @param {Schema} schema - schema instance
   * @param {Boolean} isSetOperation - is $set operation
   * @return {undefined} sets data on this._payloadSet
   */
  buildPayloadSet(payload, schema, isSetOperation) {
    var keys, set = [], errors = [], required, defaults;

    keys = Object.keys(payload);

    if (!keys || !keys.length) {
      let fieldKeys;
      fieldKeys = schema.getTopKeys();
      fieldKeys.forEach(key => {
        var value, isRequired, hasDefault;
        isRequired = schema._schema[key].required;
        hasDefault = schema._schema[key].default !== undefined;
        if (isRequired) {
          schema.addRequired(key);
        }
        if (hasDefault) {
          schema.addDefault(key);
        }
      });
    }

    keys.forEach((key) => {
      var payloadItem, fieldSchema, requireSiblings, requireChildren;
      var {payloadPath, value, isArrayItemUpdate} = payload[key];

      requireSiblings = !isSetOperation;
      requireChildren = isSetOperation && isType(value, 'object');
      fieldSchema = schema.getFieldSchema(key, requireSiblings, requireChildren);
      if (fieldSchema) {
        if (isArrayItemUpdate) {
          payloadItem = new ArrayUpdatePayloadItem(payloadPath, key, value, fieldSchema, schema._schema);
        }
        else {
          payloadItem = new PayloadItem(payloadPath, key, value, fieldSchema, schema._schema);
        }
        set.push(payloadItem);
      }
      else {
        errors.push({field: key, message: 'Field not present in schema'});
      }
    });

    if (errors && errors.length) {
      return errors;
    }

    defaults = schema.getDefaults(set);
    if (defaults && defaults.length) {
      set = set.concat(defaults);
    }

    required = schema.getRequired();
    if (required && required.length) {
      required
        .filter(key => !schema.parentIsADefault(key))
        .forEach(key => {
          var value;
          value = payload[key] ? payload[key].value : undefined;
          errors.push({field: key, property: 'required', value});
        });
      return errors;
    }

    this._payloadSet = set;

    return errors && errors.length ? errors : null;
  }

  /**
   * Remove the data from the deconstructed payload values property
   * so that it can be updated to work w/ new data for subsequent requests.
   */
  resetPayload() {
    var set;
    this._payload = null;
    set = this._payloadSet;
    set.forEach((item, i) => {
      this._payloadSet[i].value = undefined;
    });
  }

}
