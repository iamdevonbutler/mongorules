'use strict';

/**
 * @file child class of Payload.
 * Overrides parent methods to handle data specific to updates.
 */

const {isType, cleanFieldKey, filterNulls, getSubdocumentSchema} = require('../../utils');
const {transformValue, transformFunction} = require('../../transform');
const SubdocumentPreprocessor = require('../preprocessor.subdocument');
const Payload = require('./payload');
const {
  validatorArrayUpdate1,
  validatorArrayUpdate2
} = require('../validators');

module.exports = class UpdatePayload extends Payload {

  /**
   * @param {Object} payload
   * @param {Object} schema
   * @param {Boolean} isUpsert
   */
  constructor(payload, schema, isUpsert = false) {
    super(payload, schema);
    this.isUpsert = isUpsert;
  }

  /**
   * @param {Object} payload
   * @param {Object} schema
   * @return {Object}
   */
  preprocessSet(payload, schema) {
    var errors = [], payloadKeys, isUpsert;
    isUpsert = this.isUpsert;
    payload = this.deconstructPayload(payload);

    // Process all sets as embedded field updates.
    payloadKeys = Object.keys(payload);
    payloadKeys.forEach(key => {
      payload[key].payloadPath = [payload[key].payloadPath.join('.')];
    });

    errors = this.buildPayloadSet(payload, schema, false, true, isUpsert);
    if (!errors || !errors.length) {
      errors = super.preprocess();
      if (!errors || !errors.length) {
        payload = this.reconstructPayload();
      }
    }
    return {
      errors: errors && errors.length ? errors : null,
      payload,
    }
  }

  /**
   * @param {Object} payload
   * @param {Object} schema
   * @return {Object}
   */
  preprocessFieldUpdate(payload, schema) {
    var schemaKeys, payloadKeys, errors = [], isValid;
    schemaKeys = Object.keys(schema);
    payloadKeys = Object.keys(payload);
    errors = payloadKeys.map(key => {
      var inSchema, schemaKey;
      schemaKey = cleanFieldKey(key);
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

  /**
   * @param {Object} payload
   * @param {Object} schema
   * @return {Object}
   */
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
      value = isEach ? value.$each : [value];

      // Transform.
      value = schema.filterNulls ? filterNulls(value) : value;
      value = transformFunction(value, fieldSchema, 0);
      value = value.map(value2 => transformValue(value2, fieldSchema, 1));

      // Validate.
      errors2 = validatorArrayUpdate1.call(null, value, schemaKey, fieldSchema);
      if (errors2 && errors2.length) {
        errors = errors.concat(errors2);
        return;
      }

      value.forEach((value2, i) => {
        var isObject;
        // Validate subdocuments.
        isObject = isType(value2, 'object');
        if (isObject) {
          let schema2, obj = {}, result;
          schema2 = getSubdocumentSchema(schemaKey, schema);
          obj = new SubdocumentPreprocessor(schema2, false,  false);
          obj.addPayload([value2]);
          errors2 = obj.preprocess(schemaKey);
          if (errors2 && errors2.length) {
            errors = errors.concat(errors2);
            return;
          }
          result = obj.getPayload();
          value[i] = result && result.length ? result[0] : value[i];
          // obj.resetPayload();
        }
        else {
          errors2 = validatorArrayUpdate2.call(null, value2, schemaKey, fieldSchema);
        }
        if (errors2 && errors2.length) {
          errors = errors.concat(errors2);
          return;
        }

      });

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

  preprocess() {
    var keys, errors = [], payload, schema, obj = {};
    schema = this.schema;
    payload = this.payload;
    keys = Object.keys(payload);
    keys.forEach((operation) => {
      var set;
      switch (operation) {
        case '$set':
          obj[operation] = this.preprocessSet(payload[operation], schema);
          break;
        case '$inc':
          obj[operation] = this.preprocessFieldUpdate(payload[operation], schema);
          break;
        case '$mul':
          obj[operation] = this.preprocessFieldUpdate(payload[operation], schema);
          break;
        case '$min':
          obj[operation] = this.preprocessFieldUpdate(payload[operation], schema);
          break;
        case '$max':
          obj[operation] = this.preprocessFieldUpdate(payload[operation], schema);
          break;
        case '$addToSet':
          obj[operation] = this.preprocessArrayUpdate(payload[operation], schema);
          break;
        case '$push':
          obj[operation] = this.preprocessArrayUpdate(payload[operation], schema);
          break;
        default:
          obj[operation] = payload[operation];
          break;
      }
    });
    keys.forEach(operation => {
      var {errors: err, payload} = obj[operation];
      if (err && err.length) {
        errors = errors.concat(err);
      }
      else {
        this.payload[operation] = payload;
      }
    });
    return errors && errors.length ? errors : null;
  }


}
