const {isSibling} = require('../utils');
var PayloadItem;

module.exports = class Schema {

  constructor(schema) {
    this._schema = schema;
    this._accessed = [];
    this._required = [];
    this._defaults = [];
    PayloadItem = require('../preprocess/payload/payload.item'); // @todo
  }

  get(key, isEmbeddedFieldUpdate = false) {
    var len, parentKey, keys, required = [], defaults = [];

    if (!this._schema[key]) return null;

    this.addAccessor(key);

    if (isEmbeddedFieldUpdate) {
      return this._schema[key] || null;
    };

    len = key.split('.').length;
    parentKey = key.split('.').slice(0, -1).join('.');
    keys = Object.keys(this._schema);
    keys
      .filter(schemaKey => {
        let fieldSchema = this._schema[schemaKey];
        // isRoot is false for subdocuments in arrays.
        return fieldSchema._isRoot ? true : isSibling(key, schemaKey);
      })
      .forEach(schemaKey => {
        let fieldSchema = this._schema[schemaKey];
        if (fieldSchema.required) {
          this.addRequired(schemaKey);
        }
        if (fieldSchema.default !== undefined) {
          this.addDefault(schemaKey);
        }
    });
    return this._schema[key];
  }

  accessed(key) {
    return this._accessed.indexOf(key) > -1;
  }

  addAccessor(key) {
    if (this._accessed.indexOf(key) === -1) {
      this._accessed.push(key);
    }
  }

  addRequired(key) {
    if (this._required.indexOf(key) === -1) {
      this._required.push(key);
    }
  }

  addDefault(key) {
    if (this._defaults.indexOf(key) === -1) {
      this._defaults.push(key);
    }
  }

  getRequired() {
    return this._required.filter(key => !this.accessed(key));
  }

  getDefaults(set) {
    return this._defaults
      .filter(key => !this.accessed(key))
      .map(key => {
        var payloadPath, schemaKey, value, modifiers, isEach,
        itemInArray, embeddedFieldUpdate, fieldSchema, schema, sibling;
        sibling = this._getSibling(key, set);
        // @todo - is this still necessary.
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

  _getSibling(key, set) {
    for (let item of set) {
      if (isSibling(item.schemaKey, key)) {
        return item;
      }
    }
  }

  reset() {
    this._accessed = [];
    this._required = [];
    this._defaults = [];
  }

}
