'use strict';

const {isSibling, isChild, isType} = require('../utils');
var PayloadItem;

module.exports = class Schema {

  /**
   * @param {Object} schema
   * @param {Boolean} subdocumentInArray
   * @param {Boolean} isSetOperation
   * @param {Boolean} isUpsert
   */
  constructor(schema, subdocumentInArray = false, isSetOperation = false, isUpsert = false) {
    this._fields = schema;
    this._accessed = [];
    this._required = [];
    this._defaults = [];

    this.subdocumentInArray = subdocumentInArray;
    this.isSetOperation = isSetOperation;
    this.isUpsert = isUpsert;

    PayloadItem = require('../preprocess/payload/payload.item'); // @todo
  }

  /**
   * @param {String} key
   * @param {Boolean} valueIsObject
   * @return {Object}
   */
  getFieldSchema(key, valueIsObject = false) {
    var keys;
    var {isSetOperation} = this;

    if (!this._fields[key]) return null;

    this.addAccessor(key);

    keys = Object.keys(this._fields);
    keys
      .filter(schemaKey => {
        var fieldSchema, fieldSchema2, isSibling2;
        var {subdocumentInArray, isSetOperation, isUpsert} = this;

        fieldSchema = this._fields[key];
        fieldSchema2 = this._fields[schemaKey];

        if (this.accessed(schemaKey)) return false;
        if (key === schemaKey) return false;

        if (fieldSchema._isRoot && !fieldSchema2._isRoot) return false;
        if (fieldSchema._isRoot && fieldSchema2._isRoot && (isUpsert || !isSetOperation)) return true;

        isSibling2 = isSibling(key, schemaKey);
        if (isSibling2) {
          return isSetOperation ? false : true;
        }

        // if (valueIsObject) {
        //   let isChild2 = isChild(key, schemaKey, 1);
        //   if (isChild2) return true;
        // }

        return false;
      })
      .forEach(schemaKey => {
        var fieldSchema;
        var {subdocumentInArray, isSetOperation, isUpsert} = this;
        fieldSchema = this._fields[schemaKey];
        if (fieldSchema.required) {
          this.addRequired(schemaKey);
        }
        if (fieldSchema.default !== undefined) {
          let sibling, payloadPath2;
          sibling = isSibling(key, schemaKey);
          if (subdocumentInArray) {
            payloadPath2 = schemaKey.split('.').slice(-1);
          }
          else {
            let {isSetOperation} = this;
            payloadPath2 = isSetOperation && !valueIsObject ? [schemaKey] : schemaKey;
          }
          this.addDefault(schemaKey, payloadPath2);
        }
    });
    return this._fields[key];
  }

  /**
   * @param {String} key
   */
  addRequired(key) {
    if (this._required.indexOf(key) === -1) {
      this._required.push(key);
    }
  }

  /**
   * @param {String} key
   * @param {Array} payloadPath
   */
  addDefault(key, payloadPath) {
    var valid = this._defaults.every(item => item.key !== key);
    if (valid) {
      let value = this._fields[key].default;
      value = value && isType(value, 'function') ? value.call(null) : value;
      this._defaults.push({
        key,
        payloadPath,
        value,
      });
    }
  }

  getDefaults() {
    return this._defaults
      .filter(item => !this.accessed(item.key))
      .map(item => {
        var fieldSchema, schema;
        var {payloadPath, key, value} = item;
        var {isSetOperation, isUpsert} = this;
        fieldSchema = this._fields[item.key];
        schema = this._fields;
        return new PayloadItem(payloadPath, key, value, fieldSchema, schema, isSetOperation, isUpsert);
      }).filter(Boolean);
  }

  /**
   * @param {String} key
   * @return {Boolean}
   */
  accessed(key) {
    return this._accessed.indexOf(key) > -1;
  }

  /**
   * @param {String} key
   */
  addAccessor(key) {
    if (this._accessed.indexOf(key) === -1) {
      this._accessed.push(key);
    }
  }

  getRequired() {
    return this._required.filter(key => !this.accessed(key));
  }

  getTopKeys() {
    var keys;
    keys = Object.keys(this._fields);
    if (keys && keys.length) {
      let len = keys[0].split('.').length;
      return keys.filter(key => key.split('.').length === len);
    }
    return null;
  }

  /**
   * We don't require subdocuments fields in arrays
   * when the parent is setting a default.
   * @param {String} key
   * @return {Boolean}
   */
  parentIsADefault(key) {
    var defaults, parentKey, parentIsADefault;
    defaults = this._defaults;
    parentKey = key.split('.').slice(0, -1).join('.');
    if (!parentKey || !defaults.length) return false;
    parentIsADefault = defaults.indexOf(parentKey) > -1;
    return parentIsADefault;
  }


  reset() {
    this._accessed = [];
    this._required = [];
    this._defaults = [];
  }

}
