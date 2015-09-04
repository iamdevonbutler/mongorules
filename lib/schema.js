'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const __ = require('lodash-deep');
const validateUtils = require('./validate');
const utils = require('./utils');
const transformUtils = require('./transform');
const SchemaValidationError = require('./errors').SchemaValidationError;

module.exports = {

  /**
   * Validate data against schema for `insert`, `update`, and `save` method calls.
   * @param {String} methodName.
   * @param {Array} argumentsList.
   * @param {Object} schema.
   * @return {Object} w/ `errors` and transformed `argumentsList` properties.
   * @api private.
   */
  _applySchema(methodName, argumentsList, schema) {
    var data, errors = [];
    if (methodName === 'save') {
      data = argumentsList[0];
      errors = validateUtils._validateSave(data, schema);
      if (!errors) {
        data = transformUtils._transformData(data, schema);
        argumentsList[0] = data;
      }
    }
    if (methodName === 'insert') {
      data = argumentsList[0];
      errors = validateUtils._validateInsert(data, schema);
      if (!errors) {
        data = transformUtils._transformData(data, schema);
        argumentsList[0] = data;
      }
    }
    if (methodName === 'update') {
      data = argumentsList[1];
      errors = validateUtils._validateUpdate(data, schema);
      if (!errors) {
        data = transformUtils._transformData(data, schema);
        argumentsList[1] = data;
      }
    }
    return {
      errors: (errors && errors.length) ? errors : null,
      argumentsList: argumentsList
    };
  },

  /**
   * Given a nested model tree, flatten the keys,
   * set default values, and validate.
   * Flatten - e.g. { account: { email: {...} } } -> { "account.email": {...} }.
   * @param {Object} schema.
   * @param {Array} paths - nested object path to be joined w/ a `.`.
   * @return {Object}
   * @api public.
   */
  _normalizeSchema(schema, paths = []) {
    var keys, map = {};
     for (let key in schema) {
      let result, obj;
      if (utils._isType(schema[key], 'object')) {
        paths.push(key);
        result = this._normalizeSchema(schema[key], paths);
        map = _.merge(map, result);
        paths.pop();
      }
      else {
        let path = paths.join('.');
        obj = _.clone(schema);
        this._setSchemaDefaults(obj);
        this._validateSchema(obj, path);
        map[path] = obj;
        break;
      }
    }
    return map;
  },

  /**
   * Ensure user has properly configured his database schemas.
   * @param {Object} schema.
   * @param {String} schemaName.
   * @return {Mixed} - throw error if invaild.
   * @api private.
   */
  _validateSchema(schema, schemaName) {
     var isArray, allowedTypes;

    // Type validation.
    allowedTypes = ['string', 'number', 'boolean', 'object', 'array', 'date'];
    if (allowedTypes.indexOf(schema.type) === -1)
      throw new SchemaValidationError(schemaName, 'Allowed schema types include: String, Number, Object, Booolean. '+schema.type+' given.');
    // If type === Object, it must be nested in an array.
    if (schema.type === 'object' && !schema.isArray)
      throw new SchemaValidationError(schemaName, 'Objects can only be nested inside arrays. If type == Object set `isArray` to true. For objects inside of objects, nest the object in the schema. See docs.');
    // To make an array, the isArray property must be true. If type is also Array, then we will have an array of arrays.
    if (schema.type === 'array' && !schema.isArray)
      throw new SchemaValidationError(schemaName, 'To create an array, set `isArray` to true, and the `type` property to the type of value contained in the array. For an array of arrays, set `isArray` to true and `type` to Array. See docs.');
    // Contradictory properties.
    if (schema.denyXSS && schema.sanitize)
      throw new SchemaValidationError(schemaName, 'denyXSS and sanitize cannot both be true.');

    if (!_.isBoolean(schema.required))
      throw new SchemaValidationError(schemaName, 'schema.required must be a boolean.');
    if (!_.isBoolean(schema.isArray))
      throw new SchemaValidationError(schemaName, 'schema.isArray must be a boolean.');
    if (!_.isBoolean(schema.trim))
      throw new SchemaValidationError(schemaName, 'schema.trim must be a boolean.');
    if (!_.isBoolean(schema.lowercase))
      throw new SchemaValidationError(schemaName, 'schema.lowercase must be a boolean.');
    if (!_.isBoolean(schema.sanitize))
      throw new SchemaValidationError(schemaName, 'schema.sanitize must be a boolean.');
    if (!_.isBoolean(schema.denyXSS))
      throw new SchemaValidationError(schemaName, 'schema.denyXSS must be a boolean.');

    // Make sure top level arrays of values only exist once. e.g. tags: { type: Object, isArray: true }
    // is OK but adding name: { type: String, isArray: true } is bad because user input can only provide one array.
    Object.keys(schema).forEach((field) => {
      if (isArray && field.isArray) throw new SchemaValidationError('Only one top level schema field can be an array.');
      if (field.isArray) isArray = true;
    });

    // If trim, lowercase, sanitize or denyXSS, are true, make sure the type is a string in an array.
    if (schema.isArray && schema.type !== 'string') {
      if (schema.trim || schema.lowercase || schema.sanitize || schema.denyXSS) {
        throw new SchemaValidationError(schemaName, 'Properties for an non-strings inside an array cannot include: `trim`, `lowercase`, `sanitize`, and `denyXSS`.');
      }
    }
    // If trim, lowercase, sanitize or denyXSS, are true, make sure the type is a string.
    if (schema.type !== 'string' && (schema.trim || schema.lowercase || schema.sanitize || schema.denyXSS)) {
      throw new SchemaValidationError(schemaName, 'Properties `trim`, `lowercase`, `sanitize`, and `denyXSS` can only be set on strings.');
    }

    // If type is not `date` a user should not set the `dateFormat` field.
    if (schema.type !== 'date' && schema.dateFormat !== null) {
      throw new SchemaValidationError(schemaName, 'Property `dateFormat` can only be set when `type` === `date`');
    }

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
      type: null,
      required: false,
      default: null,
      isArray: false,
      trim: false,
      lowercase: false,
      sanitize: false,
      denyXSS: false,
      transform: null,
      validate: null,
      dateFormat: null
    });
  }



};
