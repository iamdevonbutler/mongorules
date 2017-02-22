const {deepSet} = require('lodash-deep');
const {isType, isObjectId, cleanFieldKey} = require('../../utils');
const PayloadItem = require('./payload.item');
const ArrayUpdatePayloadItem = require('./payload.item.arrayupdate');
const Schema = require('./../../schema/schema.class');

module.exports = class Payload {

  constructor(payload, schema, isSetOperation = false, isUpsert = false) {
    this.set = [];

    this.payload = payload;
    this.schema = schema;
    this.isSetOperation = isSetOperation;
    this.isUpsert = isUpsert;
  }

  preprocess() {
    var set, errors = [];
    set = this.set;
    set.forEach(payloadItem => {
      var errors2;
      payloadItem.transform();
      errors2 = payloadItem.validate();
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

      isArrayItemUpdate = fieldKey !== payloadKey;
      fieldValue = payload[payloadKey];

      valueIsObject = isType(fieldValue, 'object');
      valueIsObject = valueIsObject && !isType(fieldValue, 'date');
      hasKeys = fieldValue ? !!Object.keys(fieldValue).length : false;

      if (!isArrayItemUpdate && hasKeys && valueIsObject && !isObjectId(fieldValue)) {
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
    var set, payload = {};
    set = this.set;
    set.forEach(item => deepSet(payload, item.payloadPath, item.value));
    return payload;
  }

  /**
   * Builds an array of payload items on this.set,
   * to be transformed and validated, from a deconstructed payload.
   * @param {Object} payload - deconstructed payload.
   * @param {Schema} schema - schema instance
   * @param {Boolean} isSetOperation - is $set operation
   * @param {Boolean} processAsInsert - dictates how we handle required fields and defaults.
   * @return {undefined} sets data on this.set
   */
  buildPayloadSet(payload, schema, subdocumentInArray = false, isSetOperation = false, isUpsert = false) {
    var keys, set = [], errors = [], required, defaults;

    schema = new Schema(schema, subdocumentInArray, isSetOperation, isUpsert);
    keys = Object.keys(payload);

    if (!keys || !keys.length) {
      let fieldKeys;
      fieldKeys = schema.getTopKeys();
      fieldKeys.forEach(key => {
        var isRequired, hasDefault;
        isRequired = schema._fields[key].required;
        hasDefault = schema._fields[key].default !== undefined;
        if (isRequired) {
          schema.addRequired(key);
        }
        if (hasDefault) {
          schema.addDefault(key);
        }
      });
    }

    keys.forEach((key) => {
      var payloadItem, fieldSchema, valueIsObject;
      var {payloadPath, value, isArrayItemUpdate} = payload[key];
      var {isSetOperation, isUpsert} = this;

      valueIsObject = isType(value, 'object');
      fieldSchema = schema.getFieldSchema(key, valueIsObject, payloadPath);
      if (fieldSchema) {
        if (isArrayItemUpdate) {
          payloadItem = new ArrayUpdatePayloadItem(payloadPath, key, value, fieldSchema, schema._fields, isSetOperation, isUpsert);
        }
        else {
          payloadItem = new PayloadItem(payloadPath, key, value, fieldSchema, schema._fields, isSetOperation, isUpsert);
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

    this.set = set;

    return errors && errors.length ? errors : null;
  }

  /**
   * Remove the data from the deconstructed payload values property
   * so that it can be updated to work w/ new data for subsequent requests.
   */
  resetPayload() {
    var set;
    this.payload = null;
    set = this.set;
    set.forEach((item, i) => {
      this.set[i].value = undefined;
    });
  }

}
