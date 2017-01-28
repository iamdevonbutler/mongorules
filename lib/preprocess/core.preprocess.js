const {isType} = require('../utils');

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

  constructor() {}

  /**
   * Validate and transform a payload(s).
   * @return {Array - errors|null}
   */
  preprocess(parentKey = '') {
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
        error = this.validate(fieldValue, fullKey, fieldSchema);
        if (error) {
          errors = errors.concat(error);
        }
        else if (fieldValue !== undefined) {
          let transformedValue = this.transform(fieldValue, fieldSchema);
          console.log(9,transformedValue, fieldValue);
          this._payload[i][key].value = transformedValue;
        }
      });
    });
    return errors && errors.length ? errors : null;
  }

  enforceRequiredFields(parentKey = '') {
    var schema, schemaKeys, payload, errors = [], containerArrays = [];
    schema = this._schema;
    schemaKeys = Object.keys(schema);
    payload = this._payload;
    payload.forEach((payload2, documentNumber) => {
      schemaKeys.forEach((key) => {
        var fieldSchema = schema[key];
        if (fieldSchema._type === 'arrayofobjects') {
          containerArrays.push(key);
        }
        if (fieldSchema.required) {
          let payloadKey = parentKey ? key.slice(parentKey.length+1) : key;
          if (!payload2[payloadKey] || payload2[payloadKey].value === undefined) {
            let subdocumentInArray = containerArrays.some(key2 => key.startsWith(key2));
            if (!subdocumentInArray) {
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

  setDefaults() {
    var schema, schemaKeys, payload, errors = [];
    schema = this._schema;
    schemaKeys = Object.keys(schema);
    payload = this._payload;
    schemaKeys.forEach((key) => {
      var fieldSchema = schema[key];
      if (fieldSchema.default !== undefined && payload[key] === undefined) {
        payload[key] = {
          payloadPath: key,
          value: fieldSchema.default,
        };
      }
    });
  }

  purgeFieldsNotInSchema(parentKey = '') {
    var schema, payload, errors = [];
    schema = this._schema;
    payload = this._payload;
    payload.forEach((_document, documentNumber) => {
      var documentKeys = Object.keys(_document);
      documentKeys.forEach((key) => {
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


  validate(value, key, fieldSchema) {
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
        errors = this.validateArrayOfObjects(value, key, fieldSchema);
        break;
    }
    return errors && errors.length ? errors : null;
  }

  validateArrayOfObjects(values, key, fieldSchema) {
    var keys, schema, obj, payload, errors = [], schema2 = {};

    // Validate the array field (not the subdocuments contained w/i).
    errors = validatorArrayOfObjects1.call(null, values, key, fieldSchema);
    if (errors && errors.length) {
      return errors;
    }

    // Process array contained subdocuments.
    keys = Object.keys(this._schema);
    keys.filter(key2 => key2.startsWith(key) && key2.length > key.length)
      .forEach(key2 => schema2[key2] = this._schema[key2]);






    const SubdocumentPreprocessor = require('./subdocument.preprocess');





    obj = new SubdocumentPreprocessor(schema2);
    obj.addPayload(values, key);
    errors = obj.purgeFieldsNotInSchema(key);
    if (errors) return errors;
    errors = obj.enforceRequiredFields(key);
    if (errors) return errors;
    obj.setDefaults();
    errors = obj.preprocess(key);
    if (errors) return errors;
    payload = obj.getPayload();
    // Update values array w/ our new preprocessed subdocument.
    values.forEach((value, i) => values[i] = payload[i]);

    // @todo find a way to cache this.
    // cachePreprocessor = obj.getCachePreprocessor();
    return errors;
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
