const {isSibling} = require('../utils');

module.exports = class Schema {

  constructor(schema) {
    this._schema = schema;
    this._keys = [];
    this._required = [];
    this._defaults = [];
  }

  // @todo add a param for embedeed field gets.
  get(key) {
    var len, parentKey, keys, required = [], defaults = [];
    if (!this._schema[key]) return null;
    len = key.split('.').length;
    parentKey = key.split('.').slice(0, -1).join('.');
    keys = Object.keys(this._schema);
    keys
      .filter(schemaKey => isSibling(key, schemaKey))
      .forEach(schemaKey => {
        let fieldSchema = this._schema[schemaKey];
        if (fieldSchema.required && !this._required[schemaKey]) {
          this._required.push(schemaKey);
        }
        if (fieldSchema.default !== undefined && !this._defaults[schemaKey]) {
          this._defaults.push(schemaKey);
        }
    });
    this._keys.push(key);
    return this._schema[key];
  }

  getRequired() {
    return this._required.filter(key => this._keys.indexOf(key) === -1);
  }

  // Siblings share some properties in common.
  // Use siblings to build params so that we can create
  // new PayloadItem(s).
  getDefaults(set) {
    return this._defaults
      .filter(key => this._keys.indexOf(key) === -1)
      .map(key => {
        for (let item of set) {
          if (isSibling(item.schemaKey, key)) {
            var payloadPath, schemaKey, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema;
            payloadPath = item.payloadPath.slice(0, -1)
            payloadPath.push(key.split('.').slice(-1).join('.'));
            schemaKey = key;
            fieldSchema = this._schema[key];
            value = fieldSchema.default;
            modifiers = item.modifiers;
            isEach = item.isEach;
            itemInArray = item.itemInArray;
            embeddedFieldUpdate = item.embeddedFieldUpdate;
            return new PayloadItem(payloadPath, schemaKey, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema);
          }
        }
      });
  }

  slice(key, depth) {
    var schema, keys, len, keyLen, schema2 = {};
    schema = this._schema;
    len = key.split('.').length;
    keyLen = key.length;
    keys = Object.keys(schema);
    keys
      .filter(key2 => key2.startsWith(key) && key2.length > key.length)
      .filter(key2 => depth ? key2.split('.').length <= len + depth : true)
      .forEach(key2 => schema2[key2.slice(keyLen)] = schema[key2]);
    return new Schema(schema2);
  }

  // iterate(callback) {
  //   var keys;
  //   keys = Object.keys(this._schema);
  //   keys.forEach((key) => callback.call(null, this.get(key)));
  // }

  reset() {
    this._required = [];
    this._defaults = [];
  }

}
