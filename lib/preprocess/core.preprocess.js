const cache = require('./cache');
const {isType} = require('../utils');
const {getPayloadKeys, getSubdocumentSchema} = require('./utils.preprocess');
const {deepGet} = require('lodash-deep');

const {
  deconstructPayload,
  // reconstructPayload,
} = require('./utils.preprocess');

const {
  transformValue,
  transformFunction,
  transformString,
} = require('../transform');

const {
  compose,
  validateRequired,
  validateNotNull,
  validateType,
  validateDenyXSS,
  validateMinLength,
  validateMaxLength,
  validateFunction,
} = require('../validate');

const validatorValues = compose(
  validateRequired,
  validateNotNull,
  validateType(),
  validateDenyXSS,
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayOfValues1 = compose(
  validateRequired,
  validateNotNull,
  validateType('array'),
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayOfValues2 = compose(
  validateNotNull,
  validateType(),
  validateMinLength(1),
  validateMaxLength(1),
  validateFunction(1)
);

const validatorArrayOfObjects1 = compose(
  validateRequired,
  validateNotNull,
  validateType('object'),
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

module.exports = class PreprocessorCore {

  constructor() {
    this.SubdocumentPreprocessor = require('./subdocument.preprocess');
  }

  /**
   * Ensure all fields in payload are present in schema.
   * Prevents the insertion of fields not found in schema.
   * @param {String} [parentKey] - used to build a full
   * key for subdocuments in array (their full keys are listed in schema)
   * @return {Error|null}
   */
  ensurePayloadFieldsExistInSchema(payload, parentKey = '') {
    var schema, payload, errors = [];
    schema = this._schema;
    payload.forEach((payload2, documentNumber) => {
      var payloadKeys = getPayloadKeys(payload2);
      payloadKeys.forEach((key) => {
        var fullKey, fieldExistsInSchema;
        fullKey = parentKey ? parentKey + '.' + key : key;
        fieldExistsInSchema = !!schema[fullKey];
        if (!fieldExistsInSchema) {
          errors.push(`Field "${fullKey}" does not exist in schema (document #${documentNumber}).`);
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  /**
   * Ensure all fields marked required=true in schema are not
   * `undefined` in playload.
   * @param {String} [parentKey] - appends parent key to process subdocuments in arrays.
   * @return {Array of errors | null}
   */
  enforceRequiredFields(parentKey = '') {
    var schema, schemaKeys, payload, errors = [];
    schema = this._schema;
    schemaKeys = Object.keys(schema);
    payload = this._payload;
    payload.forEach((payload2, documentNumber) => {
      schemaKeys.forEach((key) => {
        var fieldSchema = schema[key];
        if (fieldSchema.required) {
          let payloadKey = parentKey ? key.slice(parentKey.length+1) : key;
          if (!payload2[payloadKey] || payload2[payloadKey].value === undefined) {
            // Subdocument field can be required, but that's only enforced,
            // if the subdocument itself is present or is required.
            let isSubdocumentInArray = fieldSchema._isSubdocumentInArray;
            if (!isSubdocumentInArray) {
              errors.push({
                field: key,
                property: 'required',
                value: payload2[payloadKey] ? payload2[payloadKey].value : undefined,
                documentNumber,
              });
            }
          }
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  /**
   * Set defaults if a field value is `undefined` and the `default` property
   * for the field schema is not `undefined`.
   */
  setDefaults() {
    var schema, schemaKeys, payload, errors = [], containerArrays = [];
    schema = this._schema;
    schemaKeys = Object.keys(schema);
    payload = this._payload;
    schemaKeys.forEach((key) => {
      var fieldSchema = schema[key];
      if (fieldSchema.default !== undefined && payload[key] === undefined) {
        // Subdocument field can be required, but that's only enforced,
        // if the subdocument itself is present or is required.
        let isSubdocumentInArray = fieldSchema._isSubdocumentInArray;
        if (!isSubdocumentInArray) {
          payload[key] = {
            payloadPath: key,
            value: fieldSchema.default,
          };
        }
      }
    });
  }

  /**
   * Validate and transform a payload(s).
   * @param {String} [parentKey] - appends parent key to process subdocuments in arrays.
   * @param {String} cacheKey - prefix to SubdocumentPreprocessor obj caching.
   * @return {Array of errors|null}
   */
  preprocess(parentKey = '', cacheKey) {
    var payload, schema, errors = [];
    payload = this._payload;
    schema = this._schema;
    payload.forEach((payload2, i) => {
      var payload2Keys;
      payload2Keys = Object.keys(payload2);
      payload2Keys.forEach((key) => {
        var fullKey, fieldValue, fieldSchema, error;
        fullKey = parentKey ? parentKey+'.'+key : key;
        fieldValue = payload2[key] ? payload2[key].value : undefined;
        fieldSchema = schema[fullKey];
        error = this.validate(fieldValue, fullKey, fieldSchema, cacheKey);
        if (error) {
          errors = errors.concat(error);
        }
        else if (fieldValue !== undefined) {
          let transformedValue = this.transform(fieldValue, fieldSchema);
          this._payload[i][key].value = transformedValue;
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  preprocessField() {

  }

  validate(value, key, fieldSchema, cacheKey) {
    var type, errors = [];
    type = fieldSchema._type;
    switch (type) {
      case 'value':
        errors = validatorValues.call(null, value, key, fieldSchema);
        break;
      case 'arrayofvalues':
        errors = this.validateArrayOfValues(value, key, fieldSchema);
        break;
      case 'arrayofobjects':
        errors = this.validateArrayOfObjects(value, key, fieldSchema, cacheKey);
        break;
    }
    return errors && errors.length ? errors : null;
  }

  // rename func.
  // value reference update sucks.
  // cache redo.
  validateArrayOfObjects(values, key, fieldSchema, cacheKey) {
    var payload, cacheKey, cached, errors = [];

    // Validate the array field (not the subdocuments contained w/i).
    errors = validatorArrayOfObjects1.call(null, values, key, fieldSchema);
    if (errors && errors.length) {
      return errors;
    }

    cacheKey = cacheKey + '.' + key;
    cached = cache.get(cacheKey);
    if (cached) {
      ({errors, payload} = cached.preprocessFromCache(values, key, cacheKey));
      if (errors) return errors;
    }
    else {
      let obj, schema = {};
      schema = getSubdocumentSchema(key, this._schema);
      obj = new this.SubdocumentPreprocessor(schema);
      obj.addPayload(values);
      errors = obj.enforceRequiredFields(key);
      if (errors) return errors;
      obj.setDefaults();
      errors = obj.preprocess(key, cacheKey);
      if (errors) return errors;
      payload = obj.getPayload();
      obj.resetPayload();
      cache.set(cacheKey, obj);
    }

    // Update values array w/ our new preprocessed subdocument.
    values.forEach((value, i) => values[i] = payload[i]);

    return errors && errors.length ? errors : null;
  }

  validateArrayOfValues(values, key, fieldSchema) {
    var parents, errors = [];
    errors = validatorArrayOfValues1.call(null, values, key, fieldSchema);
    if (!errors) {
      let isArray = isType(values, 'array');
      if (isArray) {
        values.forEach((value) => {
          let error;
          error = validatorArrayOfValues2.call(null, value, key, fieldSchema);
          if (error) {
            errors = errors.concat(error);
          }
        });
      }
    }
    return errors && errors.length ? errors : null;
  }

  transform(value, fieldSchema) {
    var type;
    type = fieldSchema._type;
    switch (type) {
      case 'value':
        return transformValue(value, fieldSchema, 0);
      case 'arrayofvalues':
        return this.transformArrayOfValues(value, fieldSchema);
      case 'arrayofobjects':
        return this.transformArrayOfObjects(value, fieldSchema);
    }
        return x;
  }

  transformArrayOfObjects(value, fieldSchema) {
    return transformFunction(value, fieldSchema, 0);
  }

  transformArrayOfValues(value, fieldSchema) {
    var value2, isArray;
    value2 = transformFunction(value, fieldSchema, 0);
    isArray = isType(value2, 'array');
    if (isArray) {
      value2 = value2.map((value3) => {
        return transformValue(value3, fieldSchema, 1);
      });
    }
    return value2;
  }

  /**
   * Remove the data from the deconstructed payload values property
   * so that it can be updated to work w/ new data for subsequent requests.
   */
  clearPayloadValues() {
    var payload;
    payload = this._payload;
    payload.forEach((payload2, i) => {
      var keys;
      keys = Object.keys(payload2);
      keys.forEach((key) => {
        this._payload[i][key].value = undefined;
      });
    });
  }

  /**
   * Given a new payload, add values to the cached payload object.
   * @param {Array|Object} payload
   */
  hydratePayload(payload) {
    var payload2;
    payload2 = this._payload;
    payload2.forEach((payload3, i) => {
      var keys;
      keys = Object.keys(payload3);
      keys.forEach((key) => {
        this._payload[i][key].value = deepGet(payload[i], key);
      });
    });
  }

  resetPayload() {
    this.clearPayloadValues();
  }

  /**
   * @todo - intented as a means to skip validating children in
   * schema when the parent container dne.
   */
  // _parentIsEmpty(childKey) {
  //   var keys, parents;
  //   parents = this._arrayContainers;
  //   keys = Object.keys(parents).reverse();
  //   for (let key of keys) {
  //     let startsWith = childKey.startsWith(key);
  //     if (startsWith) {
  //       return parents[key].isEmpty;
  //     }
  //   }
  //   return false;
  // }



}
