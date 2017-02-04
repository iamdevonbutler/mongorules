const {deepSet} = require('lodash-deep');
const {isType, isObjectId, spliceModifiers} = require('../../utils');
const PayloadItem = require('./payloadItem');

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
      errors2 = payloadItem.preprocess(cacheKey);
      if (errors2 && errors2.length) {
        errors = errors.concat(errors2);
      }
      else {
        payloadItem.transform();
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
   *   isEach {Boolean}
   *   fieldInSubdocument {Boolean}
   *   itemInArray {Boolean} e.g. 'account.friends.0'
   *   modifiers {Array|null}
   *   parentKey {String}
   * @api public.
   * @tests unit.
   */
  deconstructPayload(payload, parentKey) {
    var obj = {};

    if (!payload || !isType(payload, 'object')) return {};

    for (let payloadKey in payload) {
      let valueIsObject, fieldValue, fieldKey, payloadPath, itemInArray,
        embeddedFieldUpdate;

      fieldKey = payloadKey.replace('$.', '').replace(/\.\d/g, '');
      fieldValue = payload[payloadKey];
      itemInArray = fieldKey !== payloadKey;
      embeddedFieldUpdate = fieldKey.indexOf('.') > 0;

      valueIsObject = isType(fieldValue, 'object');
      valueIsObject = valueIsObject && !isType(fieldValue, 'date');

      if (valueIsObject && !isObjectId(fieldValue) && !itemInArray) { // @doc:1
        let result, documentKey, modifiers;
        modifiers = spliceModifiers(fieldValue);
        result = this.deconstructPayload(fieldValue, fieldKey);
        for (let field in result) {
          // Add item to payload path.
          result[field].payloadPath.unshift(payloadKey);
          // Document key's shouldn't include $each.
          documentKey = field === '$each' ? fieldKey : fieldKey + '.' + field;
          obj[documentKey] = {
            payloadPath: result[field].payloadPath,
            value: result[field].value,
            isEach: result[field].isEach,
            itemInArray: result[field].itemInArray,
            modifiers: modifiers || result[field].modifiers,
            embeddedFieldUpdate: result[field].embeddedFieldUpdate,
          };
        }
      }
      else {
        obj[fieldKey] = {
          payloadPath: [payloadKey],
          value: fieldValue,
          isEach: payloadKey === '$each',
          modifiers: null,
          itemInArray,
          embeddedFieldUpdate,
        };
      }
    }
    return obj;
  };

  reconstructPayload() {
    var payloadSet, payload = {};
    payloadSet = this._payloadSet;
    payloadSet.forEach(item => {
      deepSet(payload, item.payloadPath, item.value);
      if (item.modifiers) {
        for (let modifier of item.modifiers) {
          if (item.isEach) item.payloadPath.pop();
          for (let key in modifier) {
            let modifierValue = modifier[key];
            item.payloadPath.push(key);
            deepSet(payload, item.payloadPath, modifierValue);
          }
        }
      }
    });
    return payload;
  }

  buildPayloadSet(payload, schema) {
    var keys, set = [], errors = [], required, defaults;

    keys = Object.keys(payload);
    keys.forEach((key) => {
      var payloadItem, fieldSchema;
      var {payloadPath, value, modifiers, isEach, itemInArray, embeddedFieldUpdate} = payload[key];
      fieldSchema = schema.get(key, embeddedFieldUpdate);
      if (fieldSchema) {
        payloadItem = new PayloadItem(payloadPath, key, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema, schema._schema);
        set.push(payloadItem);
      }
      else {
        errors.push(`Field "${key}" does not exist in schema.`);
      }
    });

    if (errors && errors.length) {
      return errors;
    }

    required = schema.getRequired();
    if (required && required.length) {
      required.forEach(key => errors.push(`Field "${key}" is required in payload.`));
      return errors;
    }

    defaults = schema.getDefaults(set);
    if (defaults && defaults.length) {
      set = set.concat(defaults);
    }

    this._payloadSet = set;

    return errors && errors.length ? errors : null;
  }

  /**
   * Remove the data from the deconstructed payload values property
   * so that it can be updated to work w/ new data for subsequent requests.
   */
  clearValues() {
    var set;
    set = this._payloadSet;
    set.forEach((item, i) => {
      this._payloadSet[i].value = undefined;
    });
  }

}
