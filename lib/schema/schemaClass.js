const {isSibling} = require('../utils');
var PayloadItem;

module.exports = class Schema {

  constructor(schema) {
    this._schema = schema;
    this._keys = [];
    this._required = [];
    this._defaults = [];
    PayloadItem = require('../preprocess/payload/payloadItem'); // @todo
  }

  get(key, isEmbeddedFieldUpdate = false) {
    var len, parentKey, keys, required = [], defaults = [];

    if (!this._schema[key]) return null;

    this._keys.push(key);

    if (isEmbeddedFieldUpdate) {
      return this._schema[key] || null;
    };

    len = key.split('.').length;
    parentKey = key.split('.').slice(0, -1).join('.');
    keys = Object.keys(this._schema);
    keys
      .filter(schemaKey => isSibling(key, schemaKey))
      .forEach(schemaKey => {
        let fieldSchema = this._schema[schemaKey];
        if (fieldSchema.required && !this._required[schemaKey]) {
          this.addRequired(schemaKey);
        }
        if (fieldSchema.default !== undefined && !this._defaults[schemaKey]) {
          this.addDefault(schemaKey);
        }
    });
    return this._schema[key];
  }

  addRequired(key) {
    this._required.push(key);
  }

  addDefault(key) {
    this._defaults.push(key);
  }

  getRequired() {
    return this._required.filter(key => this._keys.indexOf(key) === -1);
  }

  getDefaults(set) {
    return this._defaults
      .filter(key => this._keys.indexOf(key) === -1)
      .map(key => {
        var sibling;
        sibling = this._getSibling(key, set);
        var payloadPath, schemaKey, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema, schema;
        if (sibling) {
          payloadPath = sibling.payloadPath.slice(0, -1);
          payloadPath.push(key.split('.').slice(-1).join('.'));
        }
        else {
          payloadPath = key;
        }
        schemaKey = key;
        modifiers = null;
        isEach = false;
        itemInArray = sibling ? sibling.itemInArray : false;
        embeddedFieldUpdate = false;
        fieldSchema = this._schema[key];
        schema = this._schema;
        value = fieldSchema.default;
        return new PayloadItem(payloadPath, schemaKey, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema, schema);
      }).filter(Boolean);
  }

  getTopKeys() {
    var keys;
    keys = Object.keys(this._schema);
    if (keys && keys.length) {
      let len = keys[0].split('.').length;
      return keys.filter(key => key.split('.').length === len);
    }
    return null;
  }

  // slice(key, depth) {
  //   var schema, keys, len, keyLen, schema2 = {};
  //   schema = this._schema;
  //   len = key.split('.').length;
  //   keyLen = key.length;
  //   keys = Object.keys(schema);
  //   keys
  //     .filter(key2 => key2.startsWith(key) && key2.length > key.length)
  //     .filter(key2 => depth ? key2.split('.').length <= len + depth : true)
  //     .forEach(key2 => schema2[key2.slice(keyLen)] = schema[key2]);
  //   return new Schema(schema2);
  // }

  _getSibling(key, set) {
    for (let item of set) {
      if (isSibling(item.schemaKey, key)) {
        return item;
      }
    }
  }

  reset() {
    this._required = [];
    this._defaults = [];
  }

}
