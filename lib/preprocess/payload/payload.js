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

  preprocess() {
    var payloadSet;
    payloadSet = this._payloadSet;
    for (let payloadItem of payloadSet) {
      let errors;
      errors = payloadItem.validate();
      if (errors && errors.length) return errors;
      payloadItem.transform();
    }
  }


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
      // @doc:1
      if (valueIsObject && !isObjectId(fieldValue) && !itemInArray) {
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
            // fieldInSubdocument: result[field].isEach ? false : true,
            // parentKey: parentKey || null,
          };
        }
      }
      else {
        obj[fieldKey] = {
          payloadPath: [payloadKey],
          value: fieldValue,
          isEach: payloadKey === '$each',
          modifiers: null,
          itemInArray: itemInArray,
          embeddedFieldUpdate,
          // fieldInSubdocument: !!parentKey,
          // parentKey: parentKey || null,
        };
      }
    }
    return obj;
  };


  // @todo make deconstruct payload a member method.
  reconstructPayload() {
    var payloadSet, setKeys, payload = {};
    payloadSet = this._payloadSet;
    // Itterate over each item in the payload.
    setKeys = Object.keys(payloadSet);
    setKeys.forEach(payloadKey => {
      let item;
      item = payloadSet[payloadKey];
      deepSet(payload, item.payloadPath, item.value);
      if (item.modifiers) {
        // Itterate over each object in the modifiers array.
        for (let modifier of item.modifiers) {
          // Remove '$each' from payloadPath array to be
          // replaced by the modifier key.
          item.payloadPath.pop();
          // Itterate over the object key.
          for (let key in modifier) {
            item.payloadPath.push(key);
            deepSet(payload, item.payloadPath, modifier[key]);
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
      var payloadValue, payloadItem, fieldSchema;
      fieldSchema = schema.get(key);
      if (!fieldSchema) {
        errors.push(`Field "${key}" does not exist in schema.`);
      }
      else {
        payloadValue = payload[key];
        let {payloadPath, value, modifiers, isEach, itemInArray, embeddedFieldUpdate} = payloadValue;
        payloadItem = new PayloadItem(payloadPath, key, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema);
        set.push(payloadItem);
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
    var payload;
    payload = this._payloadSet;
    payload.forEach((item, i) => {
      this._payloadSet[i].value = undefined;
    });
  }

}
