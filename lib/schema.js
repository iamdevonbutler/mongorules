'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const __ = require('lodash-deep');
const utils = require('./utils');
const mongo = require('mongodb');
const preprocess = require('./preprocess');
const transform = require('./transform');
const SchemaValidationError = require('./errors').SchemaValidationError;

module.exports = {

  /**
   * Searches schema to determine if a field array contains objects as
   * opposed to values, and returns the child objects, w/ parent key prepended
   * to nested child key, or `null` if there are none.
   * @param {Object} schema
   * @param {String} fieldKey
   * @return {Object|null}
   * @api private
   */
  _findSchemaArrayOfObjectsChildFields(schema, fieldKey) {
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
   * @tests unit.
   */
  _sortByFieldKey(schema) {
    var keys, sortedKeys, sortedSchema = {};
    keys = Object.keys(schema);
    sortedKeys = _.sortBy(keys, (fieldKey) => {
      return fieldKey.split('.').length;
    });
    sortedKeys.forEach((key) => {
      sortedSchema[key] = schema[key];
    });
    return sortedSchema;
  },

  /**
   * Add _id field to schema if it does not exist.
   * @param {Object} schema.
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _addIdFieldToSchema(schema) {
    return _.defaults(schema, {
      _id: {
        validate: function(value) {
          return utils._isType(value, 'object') ? value._bsontype && value.id : mongo.ObjectID.isValid(value);
        }
      }
    });
  },

  /**
   * Validate schema, and transform schema into a validation object based
   * on schema value type (value or array). Set default schema values.
   * @param {Object} schema.
   * @return {Object} validation object.
   * @api private.
   */
  _preprocessSchema(schema) {
    var validationObject = {};

    // Sort schema by field key nesting in asc order.
    schema = this._sortByFieldKey(schema);

    // Add _id field w/ validate function to schema.
    schema = this._addIdFieldToSchema(schema);

    // Itterate over each field in the schema.
    for (let fieldKey in schema) {
      let fieldValue, type;
      fieldValue = schema[fieldKey];
      type = 'value';

      if (utils._isType(fieldValue, 'array')) {
        let childObjectsInArray;
        // Get nested objects in array, if any exist.
        childObjectsInArray = this._findSchemaArrayOfObjectsChildFields(schema, fieldKey);
        // If this is an array of objects.
        if (childObjectsInArray) {
          type = 'arrayofobjects';
          fieldValue = fieldValue[0];
        }
        // Is array of values.
        else {
          type = 'arrayofvalues';
          fieldValue = fieldValue[0];
        }
      }

      fieldValue._type = type;
      this._setSchemaDefaults(fieldValue);
      this._arrayifySchemaValue(fieldValue);
      this._validateSchema(fieldValue, fieldKey);
      validationObject[fieldKey] = fieldValue;
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

    if (!_.isBoolean(schema.uppercase))
      throw new SchemaValidationError(schemaName, '`uppercase` must be a boolean.');

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

    if (schema.filterNulls !== null && !utils._isType(schema.filterNulls, 'boolean'))
      throw new SchemaValidationError(schemaName, '`filterNulls` must be a boolean.');

    if (!utils._isType(schema.minLength, 'number') && !utils._isType(schema.minLength, 'array'))
      throw new SchemaValidationError(schemaName, '`minLength` must be a number or an array of numbers.');

    if (!utils._isType(schema.maxLength, 'number') && !utils._isType(schema.maxLength, 'array'))
      throw new SchemaValidationError(schemaName, '`maxLength` must be a number or an array of numbers.');


    // Type field.
    allowedTypes = ['string', 'number', 'boolean', 'date'];
    if (schema.type && allowedTypes.indexOf(schema.type) === -1)
      throw new SchemaValidationError(schemaName, 'Allowed schema types include: `string`, `number`, `boolean`, and `date`. "'+schema.type+'" given. Objects and arrays are implied via schema. See docs...');

    // Contradictory properties.
    if (schema.denyXSS && schema.sanitize)
      throw new SchemaValidationError(schemaName, '`denyXSS` and `sanitize` cannot both be true.');

    if (schema.required && schema.default)
      throw new SchemaValidationError(schemaName, '`required` and `default` cannot both be set.');

    // If trim, lowercase, uppercase, sanitize or denyXSS, are true, make sure the type is a string in an array.
    if (schema.type && schema.type !== 'string' && (schema.trim || schema.lowercase || schema.uppercase || schema.sanitize || schema.denyXSS))
      throw new SchemaValidationError(schemaName, 'Properties `trim`, `lowercase`, `uppercase`, `sanitize`, and `denyXSS` can only be set on strings.');

    // If type is not `date` a user should not set the `dateFormat` field.
    if (schema.type && schema.type !== 'date' && schema.dateFormat)
      throw new SchemaValidationError(schemaName, 'Property `dateFormat` can only be set when `type` === `date`');

    // If type `date` a user must set the `dateFormat` field.
    if (schema.type && schema.type === 'date' && !schema.dateFormat)
      throw new SchemaValidationError(schemaName, 'If field type is `date`, the `dateFormat` property must be provided.');

    // If notNull is true, then the user does not want null values, and shouldn't set a null value as a default.
    if (schema.default === null && schema.notNull)
      throw new SchemaValidationError(schemaName, 'If `notNull` is `true`, setting a default value of `null` is a violation.');

     return this;
  },

  /**
   * Transform values of certain schema properties
   * from basic values into an array & set defaults for missing array fields.
   * Call after setting defaults.
   * @param {Object} schema
   * @return {Object}
   * @api private.
   * @tests unit.
   */
  _arrayifySchemaValue(schema) {
    if (!utils._isType(schema.minLength, 'array')) {
      schema.minLength = [schema.minLength, null];
    }

    if (!utils._isType(schema.maxLength, 'array')) {
      schema.maxLength = [schema.maxLength, null];
    }

    if (!utils._isType(schema.validate, 'array')) {
      schema.validate = [schema.validate, null];
    }

    if (!utils._isType(schema.transform, 'array')) {
      schema.transform = [schema.transform, null];
    }

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
      default: undefined,
      type: null,
      dateFormat: null,
      trim: false,
      lowercase: false,
      uppercase: false,
      sanitize: false,
      denyXSS: false,
      filterNulls: false,
      transform: [null, null],
      validate: [null, null],
      minLength: [null, null],
      maxLength: [null, null]
    });
  },

};
