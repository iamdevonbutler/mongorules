'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const __ = require('lodash-deep');
const utils = require('./utils');
const preprocess = require('./preprocess');
const transform = require('./transform');
const SchemaValidationError = require('./errors').SchemaValidationError;

module.exports = {

  /**
   * Validate schema, and transform schema into a validation object based
   * on schema value type. Set default schema values.
   * Schema types include: values, arrayValues, arrayObjects,
   * arrayArrayValues, arrayArrayObjects.
   * @param {Object} schema.
   * @return {Object} validation object.
   * @api private.
   */
  _normalizeSchema(schema) {
    var arrayFields, validationObj;

    arrayFields = {};
    validationObj = {
      values: {},
      arrayValues: {},
      arrayObjects: {},
      arrayArrayValues: {},
      arrayArrayObjects: {}
    };

    // Pick out array fields in schema.
    for (let key in schema) {
      if (utils._isType(schema[key], 'array')) {
        arrayFields[key] = schema[key];
        delete schema[key];
      }
    }

    // Get objects belonging in array from the schema (if any exist).
    for (let arrayKey in arrayFields) {
      let arrayObjects, arrayFieldSchema;
      arrayObjects  = {};
      arrayFieldSchema = arrayFields[arrayKey];
      for (let schemaKey in schema) {
        if (schemaKey.indexOf(arrayKey + '.') > -1) {
          delete schema[schemaKey];
        }
      }

      // If we found objects belonging in the array...
      if (Object.keys(arrayObjects).length) {
        // If this is a array of arrays of objects...
        if (arrayFieldSchema[0][0]) {
          validationObj.arrayArrayObjects[arrayKey] = this._setArraySchemaDefaults(arrayFieldSchema[0][0]);
          validationObj.arrayArrayObjects[arrayKey]._schema = this._normalizeSchema(arrayObjects);
        }
        // If this is a array of objects...
        else {
          validationObj.arrayObjects[arrayKey] = this._setArraySchemaDefaults(arrayFieldSchema[0]);
          validationObj.arrayObjects[arrayKey]._schema = this._normalizeSchema(arrayObjects);
        }
      }
      // The array is an array of values.
      else {
        // If this is a array of arrays of values...
        if (arrayFieldSchema[0][0]) {
          validationObj.arrayArrayValues[arrayKey] = this._setSchemaDefaults(arrayFieldSchema[0][0]);
        }
        // If this is a array of values...
        else {
          validationObj.arrayValues[arrayKey] = this._setSchemaDefaults(arrayFieldSchema[0]);
        }
      }
    }

    // Add the remaining values in the schema to the validationObj
    // and set default values.
    for (let key in schema) {
      validationObj.values[key] = this._setSchemaDefaults(schema[key]);
    }

    return validationObj;
  },

  /**
   * Ensure user has properly configured his database schemas.
   * @param {Object} schema.
   * @param {String} schemaName.
   * @return `this` - throw error if invaild.
   * @api private.
   */
  _validateSchema(schema, schemaName) {
     var allowedTypes;

    // Type validation.
    allowedTypes = ['string', 'number', 'boolean', 'date'];
    if (schema.type && allowedTypes.indexOf(schema.type) === -1)
      throw new SchemaValidationError(schemaName, 'Allowed schema types include: String, Number, Booolean. "'+schema.type+'" given. Objects and Arrays are implied, see docs...');

    // Contradictory properties.
    if (schema.denyXSS && schema.sanitize)
      throw new SchemaValidationError(schemaName, '`denyXSS` and `sanitize` cannot both be true.');

    if (schema.required && schema.default)
      throw new SchemaValidationError(schemaName, '`required` and `default` cannot both be set.');

    // Must have required to enforce notNull
    if (!schema.required && schema.notNull)
      throw new SchemaValidationError(schemaName, '`required` should be true to enforce `notNull` on a field.');

    // Type check values.
    if (!_.isBoolean(schema.required))
      throw new SchemaValidationError(schemaName, '`required` must be a boolean.');
    if (schema.type && !utils._isType(schema.type, 'string'))
      throw new SchemaValidationError(schemaName, '`type` must be a string.');
    if (!_.isBoolean(schema.trim))
      throw new SchemaValidationError(schemaName, '`trim` must be a boolean.');
    if (!_.isBoolean(schema.lowercase))
      throw new SchemaValidationError(schemaName, '`lowercase` must be a boolean.');
    if (!_.isBoolean(schema.sanitize))
      throw new SchemaValidationError(schemaName, '`sanitize` must be a boolean.');
    if (!_.isBoolean(schema.denyXSS))
      throw new SchemaValidationError(schemaName, '`denyXSS` must be a boolean.');
    if (schema.validate && !utils._isType(schema.validate, 'function'))
      throw new SchemaValidationError(schemaName, '`validate` must be a function.');
    if (schema.transform && !utils._isType(schema.transform, 'function'))
      throw new SchemaValidationError(schemaName, '`transform` must be a function.');
    if (schema.dateFormat && !utils._isType(schema.dateFormat, 'string'))
      throw new SchemaValidationError(schemaName, '`dateFormat` must be a string.');

    // If trim, lowercase, sanitize or denyXSS, are true, make sure the type is a string in an array.
    if (schema.type && schema.type !== 'string' && (schema.trim || schema.lowercase || schema.sanitize || schema.denyXSS))
      throw new SchemaValidationError(schemaName, 'Properties `trim`, `lowercase`, `sanitize`, and `denyXSS` can only be set on strings.');

    // If type is not `date` a user should not set the `dateFormat` field.
    if (schema.type && schema.type !== 'date' && schema.dateFormat)
      throw new SchemaValidationError(schemaName, 'Property `dateFormat` can only be set when `type` === `date`');

    // If type `date` a user must set the `dateFormat` field.
    if (schema.type && schema.type === 'date' && !schema.dateFormat)
      throw new SchemaValidationError(schemaName, 'If field type is `date`, the `dateFormat` property must be provided.');
    return this;
  },

  /**
   * Set schema default values if they do not exist.
   * @param {Object} schema.
   * @return {object} schema field object.
   * @api private.
   */
  _setSchemaDefaults(schema) {
    return _.defaults(schema, {
      required: false,
      notNull: false,
      default: null,
      type: null,
      trim: false,
      lowercase: false,
      sanitize: false,
      denyXSS: false,
      transform: null,
      validate: null,
      dateFormat: null
    });
  },

  /**
   * Set schema default values for an array/array of array of objects
   * if they do not exist.
   * @param {Object} schema.
   * @return {object} schema field object.
   * @api private.
   */
  _setArraySchemaDefaults(schema) {
    return _.defaults(schema, {
      required: false,
      notNull: false,
      default: null,
      minLength: null,
      maxLength: null,
      validate: null,
      transform: null
    });
  }

};
