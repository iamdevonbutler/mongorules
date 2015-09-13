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
   * Searches schema to determine if a field array contains objects as
   * opposed to values, and returns the child objects, w/ new key readjusted
   * for parent, or `null` if there are none.
   * @param {Object} schema
   * @param {String} fieldKey
   * @return {Object|null}
   * @api private
   */
  _getArrayObjectChildren(schema, fieldKey) {
    var arrayObjects = {};
    for (let schemaKey in schema) {
      if (schemaKey.indexOf(fieldKey + '.') > -1) {
        arrayObjects[schemaKey] = schema[schemaKey];
      }
    }

    return Object.keys(arrayObjects).length ? arrayObjects : null;
  },

  /**
   * Sorts schema by key, splitting on `.`.
   * e.g. 'a.b' will be above 'a.b.c'
   * @param {Object} schema
   * @return {Object}
   * @api private
   */
  _sortByFieldKey(schema) {
    var sortedKeys, sortedSchema = {};
    sortedKeys = _.sortBy(Object.keys(schema), (fieldKey) => {
      return fieldKey.split('.').length;
    });
    sortedKeys.forEach((key) => {
      sortedSchema[key] = schema[key];
    });
    return sortedSchema;
  },

  /**
   * Validate schema, and transform schema into a validation object based
   * on schema value type (value or array). Set default schema values.
   * @param {Object} schema.
   * @return {Object} validation object.
   * @api private.
   */
  _normalizeSchema(schema) {
    var validationObject = { values: {}, arrayValues: {}, arrayObjects: {}, arrayArrayValues: {}, arrayArrayObjects: {} };

    // Sort schema by field key nesting in asc order.
    schema = this._sortByFieldKey(schema);

    for (let fieldKey in schema) {
      let field = schema[fieldKey];

      if (utils._isType(field, 'array')) {
        // Get nested objects in array, if any exist.
        let arrayObjectChildren = this._getArrayObjectChildren(schema, fieldKey);
        if (arrayObjectChildren) {
          // Remove fields from schema to prevent double processing.
          Object.keys(arrayObjectChildren).forEach((childFieldKey) => {
            delete schema[childFieldKey];
          });
          // If array of arrays.
          if (field[0][0]) {
            this._setSchemaDefaults(field[0][0]);
            this._makeSchemaValuesArrays(field[0][0]);
            this._validateSchema(field[0][0], fieldKey);
            validationObject.arrayArrayObjects[fieldKey] = field[0][0];
            validationObject.arrayArrayObjects[fieldKey]._schema = this._normalizeSchema(arrayObjectChildren);
          }
          // If array of objects.
          else {
            // console.log(arrayObjectChildren);
            this._setSchemaDefaults(field[0]);
            this._makeSchemaValuesArrays(field[0]);
            this._validateSchema(field[0], fieldKey);
            validationObject.arrayObjects[fieldKey] = field[0];
            validationObject.arrayObjects[fieldKey]._schema = this._normalizeSchema(arrayObjectChildren);
          }
        }
        // Is array of values.
        else {
          // If array of arrays.
          if (field[0][0]) {
            this._setSchemaDefaults(field[0][0]);
            this._makeSchemaValuesArrays(field[0][0]);
            this._validateSchema(field[0][0], fieldKey);
            validationObject.arrayArrayValues[fieldKey] = field[0][0];
          }
          // If array of values.
          else {
            this._setSchemaDefaults(field[0]);
            this._makeSchemaValuesArrays(field[0]);
            this._validateSchema(field[0], fieldKey);
            validationObject.arrayValues[fieldKey] = field[0];
          }
        }
      }
      // If the field is not an array but an value in the document.
      else {
        this._setSchemaDefaults(field);
        this._makeSchemaValuesArrays(field);
        this._validateSchema(field, fieldKey);
        validationObject.values[fieldKey] = field;
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
  _validateSchema(schema, schemaName) {
     var allowedTypes;

    // Type check values.
    if (!_.isBoolean(schema.required))
      throw new SchemaValidationError(schemaName, '`required` must be a boolean.');

    if (!_.isBoolean(schema.notNull))
      throw new SchemaValidationError(schemaName, '`notNull` must be a boolean.');

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

    if ( (schema.validate[0] && !utils._isType(schema.validate[0], 'function')) || (schema.validate[1] && !utils._isType(schema.validate[1], 'function')) )
      throw new SchemaValidationError(schemaName, '`validate` must be a function or array containing a function(s).');

    if ( (schema.transform[0] && !utils._isType(schema.transform[0], 'function')) || (schema.transform[1] && !utils._isType(schema.transform[1], 'function')) )
      throw new SchemaValidationError(schemaName, '`transform` must be a function or array containing a function(s).');

    if (schema.dateFormat && !utils._isType(schema.dateFormat, 'string'))
      throw new SchemaValidationError(schemaName, '`dateFormat` must be a string.');

    if ( (schema.minLength[0] && !_.isNumber(schema.minLength[0])) || (schema.minLength[1] && !_.isNumber(schema.minLength[0])) )
      throw new SchemaValidationError(schemaName, '`maxLength` must be a number or array contianing a number(s).');

    if ( (schema.maxLength[0] && !_.isNumber(schema.maxLength[0])) || (schema.maxLength[1] && !_.isNumber(schema.maxLength[0])) )
      throw new SchemaValidationError(schemaName, '`maxLength` must be a number or array contianing a number(s).');

    if ( schema.filterNulls[0] !== null && !_.isBoolean(schema.filterNulls[0]) || (schema.filterNulls[1] !== null && !_.isBoolean(schema.filterNulls[1])) )
      throw new SchemaValidationError(schemaName, '`filterNulls` must be a boolean or array contianing a boolean(s).');

    // Type field.
    allowedTypes = ['string', 'number', 'boolean', 'date'];
    if (schema.type && allowedTypes.indexOf(schema.type) === -1)
      throw new SchemaValidationError(schemaName, 'Allowed schema types include: `string`, `number`, `boolean`, and `date`. "'+schema.type+'" given. Objects and arrays are implied via schema. See docs...');

    // Contradictory properties.
    if (schema.denyXSS && schema.sanitize)
      throw new SchemaValidationError(schemaName, '`denyXSS` and `sanitize` cannot both be true.');

    if (schema.required && schema.default)
      throw new SchemaValidationError(schemaName, '`required` and `default` cannot both be set.');

    // Must have required to enforce notNull
    if (!schema.required && schema.notNull)
      throw new SchemaValidationError(schemaName, '`required` should be true to enforce `notNull` on a field.');

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
   * Transform values of certain schema properties
   * from basic values into an array.
   * @param {Object} schema
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _makeSchemaValuesArrays(schema) {
    if (!utils._isType(schema.minLength, 'array')) {
      schema.minLength = [schema.minLength];
    }

    if (!utils._isType(schema.maxLength, 'array')) {
      schema.maxLength = [schema.maxLength];
    }

    if (!utils._isType(schema.filterNulls, 'array')) {
      schema.filterNulls = [schema.filterNulls];
    }

    if (!utils._isType(schema.validate, 'array')) {
      schema.validate = [schema.validate];
    }

    if (!utils._isType(schema.transform, 'array')) {
      schema.transform = [schema.transform];
    }
    console.log(schema);
    return schema;
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
      dateFormat: null,
      trim: false,
      lowercase: false,
      sanitize: false,
      denyXSS: false,
      filterNulls: [false, false],
      transform: [null, null],
      validate: [null, null],
      minLength: [null, null],
      maxLength: [null, null]
    });
  },

};
