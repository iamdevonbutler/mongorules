const {isType} = require('../utils');
const {deepSet} = require('lodash-deep');

const {
  cleanUpdateKey,
  getSubdocumentSchema,
  deconstructPayload,
} = require('./utils.preprocess');

const {
  transformValue,
  transformFunction,
  transformString,
} = require('../transform');

const self = module.exports;

class Schema {

  constructor(schema) {
    this._schema = schema;
    this._keys = [];
    this._required = [];
    this._defaults = [];
  }

  isSibling(key1, key2) {
    var notTheSame = key1 !== key2;
    key1 = key1.split('.');
    key2 = key2.split('.');
    return notTheSame
      && key1.length === key2.length
      && key1.slice(0, -1).join('.') === key2.slice(0, -1).join('.');
  }

  get(key) {
    var len, parentKey, keys, required = [], defaults = [];
    if (!this._schema[key]) return null;
    len = key.split('.').length;
    parentKey = key.split('.').slice(0, -1).join('.');
    keys = Object.keys(this._schema);
    keys
      .filter(schemaKey => this.isSibling(key, schemaKey))
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
          if (this.isSibling(item.schemaKey, key)) {
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

  iterate(callback) {
    var keys;
    keys = Object.keys(this._schema);
    keys.forEach((key) => callback.call(null, this.get(key)));
  }

  reset() {
    this._required = [];
    this._defaults = [];
  }

}

class Payload {
  constructor(payload, schema, isUpsert) {
    this.payload = payload;
    this.schema = schema;
    this.isUpsert = isUpsert;

    this.payloadSet = [];
  }

  preprocess() {
    var payloadSet;
    payloadSet = this.payloadSet;
    for (let payloadItem of payloadSet) {
      let errors;
      errors = payloadItem.validate();
      if (errors && errors.length) return errors;
      payloadItem.transform();
    }
  }

  // @todo make deconstruct payload a member method.
  reconstructPayload() {
    var payloadSet, setKeys, payload = {};
    payloadSet = this.payloadSet;
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
    var schemaKeys, set = [], errors = [], required, defaults;

    schema = new Schema(schema);

    schemaKeys = Object.keys(payload);
    schemaKeys.forEach((schemaKey) => {
      var payloadValue, payloadItem, fieldSchema;
      fieldSchema = schema.get(schemaKey);
      if (!fieldSchema) {
        errors.push(`Field "${schemaKey}" does not exist in schema.`);
      }
      else {
        payloadValue = payload[schemaKey];
        let {payloadPath, value, modifiers, isEach, itemInArray, embeddedFieldUpdate} = payloadValue;
        payloadItem = new PayloadItem(payloadPath, schemaKey, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema);
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

    this.payloadSet = set;

    return errors && errors.length ? errors : null;
  }

}

class InsertPayload extends Payload {

  constructor(payload, schema) {
    super(payload, schema);
    payload = deconstructPayload(payload);
    this.buildPayloadSet(payload, schema);
  }


}

class UpdatePayload extends Payload {

  constructor(payload, schema, isUpsert) {
    super(payload, schema, isUpsert);
    var keys, errors = [];
    keys = Object.keys(payload);
    keys.forEach((operation) => {
      var error, set;
      switch (operation) {
        case '$inc':
          break;
        case '$mul':
          break;
        case '$rename':
          break;
        case '$setOnInsert':
          break;
        case '$set':
          payload = deconstructPayload(payload[operation]);
          error = this.buildPayloadSet(payload, schema);
          errors = error ? errors.concat(error) : errors;
          var x = this.reconstructPayload(set);
          process.exit();
          break;
        case '$unset':
          break;
        case '$min':
          break;
        case '$max':
          break;
        case '$currentDate':
          break;
        case '$addToSet':
          break;
        case '$pop':
          break;
        case '$pullAll':
          break;
        case '$pull':
          break;
        case '$push':
          break;
      }
    });

  }


}

class PayloadItem {

  constructor(payloadPath, schemaKey, value, modifiers, isEach, itemInArray, embeddedFieldUpdate, fieldSchema) {
    this.payloadPath = payloadPath;
    this.schemaKey = schemaKey;
    this.value = value;
    this.modifiers = modifiers;
    this.isEach = isEach;
    this.itemInArray = itemInArray;
    this.embeddedFieldUpdate = embeddedFieldUpdate;

    this.fieldSchema = fieldSchema;

    this._errors = [];
  }

  getErrors() {
    return this._errors && this._errors.length ? this._errors : null;
  }

  // setDefaults() {
  //   var value, fieldSchema;
  //   value = this.value;
  //   fieldSchema = this.fieldSchema;
  //   if (value === undefined && fieldSchema.default !== undefined) {
  //     this.value = fieldSchema.default;
  //   }
  // }

  validate() {
    return null;



    var schema, type;
    schema = this.fieldSchema;
    type = schema._type;
    switch (type) {
      case 'value':
        // ({errors, fieldValue} = this.preprocessFieldValue(fieldValue, fieldKey, fieldSchema));
        break;
      case 'arrayofvalues':
        // ({errors, fieldValue} = this.preprocessArrayOfValues(fieldValue, fieldKey, fieldSchema));
        break;
      case 'arrayofobjects':
        // ({errors, fieldValue} = this.preprocessArrayOfObjects(fieldValue, fieldKey, fieldSchema, cacheKey));
        break;
    }
  }

  transform() {
    var schema, type;
    schema = this.fieldSchema;
    type = schema._type;
    switch (type) {
      case 'value':
        this.value = transformValue(this.value);
        break;
      case 'arrayofvalues':
        let value, isArray;
        value = transformFunction(this.value, schema, 0);
        isArray = isType(value, 'array');
        if (isArray) {
          this.value = value.map(value2 => transformValue(value2, schema, 1));
        }
        break;
      case 'arrayofobjects':
        this.value = transformFunction(this.value, schema, 0);
        break;
    }
  }

};

self.Payload = Payload;
self.PayloadItem = PayloadItem;
self.InsertPayload = InsertPayload;
self.UpdatePayload = UpdatePayload;
