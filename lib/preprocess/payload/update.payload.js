const {isType, cleanFieldKey, filterNulls} = require('../../utils');
const {transformValue, transformFunction} = require('../../transform');
const Payload = require('./payload');
const {
  validatorArrayUpdate1,
  validatorArrayUpdate2
} = require('../validators');

module.exports = class UpdatePayload extends Payload {

  constructor(payload, schema, isUpsert) {
    super(payload, schema, isUpsert);
  }

  preprocessSet(payload, schema, cacheKey) {
    var errors = [];
    payload = this.deconstructPayload(payload);
    errors = this.buildPayloadSet(payload, schema, true);
    if (!errors || !errors.length) {
      errors = super.preprocess(cacheKey);
      if (!errors || !errors.length) {
        payload = this.reconstructPayload();
      }
    }
    return {
      errors: errors && errors.length ? errors : null,
      payload,
    }
  }

  preprocessFieldUpdate(payload, schema) {
    var schemaKeys, payloadKeys, errors = [], isValid;
    schemaKeys = Object.keys(schema);
    payloadKeys = Object.keys(payload);
    errors = payloadKeys.map(key => {
      var inSchema, schemaKey;
      schemaKey = cleanFieldKey(key); // @todo test.
      inSchema = schemaKeys.indexOf(schemaKey) > -1;
      if (!inSchema) {
        return {field: key, message: 'Field not present in schema'};
      }
    }).filter(Boolean);
    return {
      errors: errors && errors.length ? errors : null,
      payload,
    }
  }

  preprocessArrayUpdate(payload, schema) {
    var schemaKeys, payloadKeys, errors = [], errors2;
    schemaKeys = Object.keys(schema);
    payloadKeys = Object.keys(payload);
    payloadKeys.forEach(key => {
      var value, schemaKey, inSchema, fieldSchema, isEach, isArray;
      value = payload[key];
      schemaKey = cleanFieldKey(key);
      inSchema = schemaKeys.indexOf(schemaKey) > -1;
      if (!inSchema) {
        errors.push({field: key, message: 'Field not present in schema'});
        return;
      }
      fieldSchema = schema[schemaKey];
      isEach = Object.keys(value).indexOf('$each') > -1;
      value = isEach ? value.$each : value;

      // Transform.
      isArray = isType(value, 'array');
      if (isArray) {
        value = schema.filterNulls ? filterNulls(value) : value;
        value = transformFunction(value, fieldSchema, 0);
        value = value.map(value2 => transformValue(value2, fieldSchema, 1));
      }
      else {
        value = transformFunction(value, fieldSchema, 0);
        value = transformValue(value, fieldSchema, 1);
      }

      value = !isEach ? [value] : value;

      // Validate.
      errors2 = validatorArrayUpdate1.call(null, value, schemaKey, fieldSchema);
      if (!errors2 || !errors2.length) {
        value.forEach((value2) => {
          var errors3;
          errors3 = validatorArrayUpdate2.call(null, value2, schemaKey, fieldSchema);
          if (errors3 && errors3.length) {
            errors = errors.concat(errors3);
            return;
          }
        });
      }
      else {
        errors = errors.concat(errors2);
        return;
      }

      // Update payload.
      if (isEach) {
        payload[key].$each = value;
      }
      else {
        payload[key] = value[0];
      }
    });
    return {
      errors: errors && errors.length ? errors : null,
      payload,
    }
  }

  preprocess(cacheKey) {
    var keys, errors = [], payload, schema, obj = {};
    schema = this._schema;
    payload = this._payload;
    keys = Object.keys(payload);
    keys.forEach((operation) => {
      var set;
      switch (operation) {
        case '$set':
          obj[operation] = this.preprocessSet(payload[operation], schema, cacheKey);
          break;
        case '$inc':
          obj[operation] = this.preprocessFieldUpdate(payload[operation], schema._schema);
          break;
        case '$mul':
          obj[operation] = this.preprocessFieldUpdate(payload[operation], schema._schema);
          break;
        case '$min':
          obj[operation] = this.preprocessFieldUpdate(payload[operation], schema._schema);
          break;
        case '$max':
          obj[operation] = this.preprocessFieldUpdate(payload[operation], schema._schema);
          break;
        case '$addToSet':
          obj[operation] = this.preprocessArrayUpdate(payload[operation], schema._schema);
          break;
        case '$push':
          obj[operation] = this.preprocessArrayUpdate(payload[operation], schema._schema);
          break;
        // case '$currentDate':
        //   break;
        //   break;
        // case '$pop':
        //   break;
        // case '$pullAll':
        //   break;
        // case '$pull':
        //   break;
        // case '$rename':
        //   break;
        // case '$setOnInsert':
          // break;
        // case '$unset':
        //   break;
        default:
          throw new Error(`Operation "${operation}" not supported. Use the 'novalidate' prefix to continue operation w/o validation.`);
          break;
      }
    });
    keys.forEach(operation => {
      var {errors: err, payload} = obj[operation];
      if (err && err.length) {
        errors = errors.concat(err);
      }
      else {
        this._payload[operation] = payload;
      }
    });
    return errors && errors.length ? errors : null;
  }


}
