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
   * on schema value type (value or array). Set default schema values.
   * @param {Object} schema.
   * @return {Object} validation object.
   * @api private.
   */
  _normalizeSchema(schema) {
    var validationObject = { values: {}, arrays: {} };
    for (let key in schema) {
      if (utils._isType(schema[key], 'array')) {
        // If array of arrays.
        if (schema[key][0][0]) {
          this._setSchemaDefaults(schema[key][0][0])
          this._validateSchema(schema[key][0][0], key, true);
        }
        // If array of values/objects.
        else {
          this._setSchemaDefaults(schema[key][0])
          this._validateSchema(schema[key][0], key, true);
        }
        validationObject.arrays[key] = schema[key];
      }
      else {
        this._setSchemaDefaults(schema[key]);
        this._validateSchema(schema[key], key, false);
        validationObject.values[key] = schema[key];
      }
    }
    return validationObject;
  },

  /**
   * Ensure user has properly configured his database schemas.
   * @param {Object} schema.
   * @param {String} schemaName.
   * @return `this` - throw error if invaild.
   * @api private.
   */
  _validateSchema(schema, schemaName, isArray = false) {
     var allowedTypes;

    // Type validation.
    allowedTypes = ['string', 'number', 'boolean', 'date', 'object', 'array'];

    if (!isArray && (schema.type === 'array' || schema.type === 'object'))
      throw new SchemaValidationError(schemaName, 'Schema types `object` and `array` can only be set on array fields.');

    if (schema.type && allowedTypes.indexOf(schema.type) === -1)
      throw new SchemaValidationError(schemaName, 'Allowed schema types include: `string`, `number`, `boolean`, `date`, `object`, `array`. "'+schema.type+'" given.');

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

};
