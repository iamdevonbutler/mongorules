const {sortBy} = require('lodash');
const {isType, isObjectId} = require('./utils');
const {SchemaValidationError} = require('./errors');

const self = module.exports;

// @todo test to see if we can change it's value.
const types = {
  string: {type: 'string'},
  number: {type: 'number'},
  date: {type: 'date'},
  timestamp: {type: 'timestamp'},
  boolean: {type: 'boolean'},
  subdocument: {type: 'subdocument'},
  objectId: {type: 'objectId'},
  null: {type: 'null'},
  array: (types) => {
    return {
      type: array,
      children: types,
    }
  },
  mixed: (...types) => {type: types},
};

self.Types = Object.freeze(types);

/**
 * Searches schema to determine if a field array contains objects as
 * opposed to values, and returns the child objects, w/ parent key prepended
 * to nested child key, or `null` if there are none.
 * @param {Object} schema
 * @param {String} fieldKey
 * @return {Object|null}
 * @api private
 */
self._findSchemaArrayOfObjectsChildFields = (schema, fieldKey) => {
  var arrayObjects = {};
  for (let schemaKey in schema) {
    if (schemaKey.indexOf(fieldKey + '.') > -1) {
      arrayObjects[schemaKey] = schema[schemaKey];
    }
  }

  return Object.keys(arrayObjects).length ? arrayObjects : null;
};

/**
 * Sorts schema by key, splitting on `.`.
 * e.g. 'a.b' will be above 'a.b.c'
 * @param {Object} schema
 * @return {Object}
 * @api private
 * @tests unit.
 */
self._sortByFieldKey = (schema) => {
  var keys, sortedKeys, sortedSchema = {};
  keys = Object.keys(schema);
  sortedKeys = sortBy(keys, (fieldKey) => {
    return fieldKey.split('.').length;
  });
  sortedKeys.forEach((key) => {
    sortedSchema[key] = schema[key];
  });
  return sortedSchema;
};

/**
 * Add _id field to schema, if it does not exist.
 * @param {Object} schema.
 * @return {Object}
 * @api private.
 * @tests unit.
 */
self._addIdFieldToSchema = (schema) => {
  return Object.assign({}, {
    _id: {
      validate: function(value) {
        return isObjectId(value);
      }
    }
  }, schema);
};

/**
 * Normalize, validate and transform schema into a 'validation object'.
 * @param {Object} schema.
 * @return {Object} validation object.
 * @api private.
 */
self.preprocessSchema = (schema) => {
  var validationObject;

  validationObject = {};
  schema = Object.assign({}, schema);

  // Sort schema by field key nesting in asc order.
  schema = self._sortByFieldKey(schema);

  // Add _id field w/ validate function to schema.
  schema = self._addIdFieldToSchema(schema);

  // Itterate over each field in the schema.
  for (let fieldKey in schema) {
    let fieldValue, type;
    fieldValue = schema[fieldKey];

    type = 'value';

    if (isType(fieldValue, 'array')) {
      let childObjectsInArray;
      // Get nested objects in array, if any exist.
      childObjectsInArray = self._findSchemaArrayOfObjectsChildFields(schema, fieldKey);
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

    fieldValue._type = type; // validation object type (value, arrayofobjects, arrayofvalues).
    fieldValue = self._setSchemaFieldDefaults(fieldValue);
    fieldValue = self._arrayifySchemaField(fieldValue);
    self._validateSchemaField(fieldValue, fieldKey);
    validationObject[fieldKey] = fieldValue;
  } // end for loop.
  console.log(validationObject);
  return validationObject;
};

/**
 * Ensure user has properly configured his database schemas.
 * @param {Object} field - schema field e.g. {'account.name': {...field}}
 * @param {String} schemaName.
 * @return `this` - throw error if invaild.
 * @api private.
 */
self._validateSchemaField = (field, schemaName) => {
   var allowedTypes;

  // Type check values.
  if (!isType(field.required, 'boolean'))
    throw new SchemaValidationError(schemaName, '`required` must be a boolean.');

  if (!isType(field.notNull, 'boolean'))
    throw new SchemaValidationError(schemaName, '`notNull` must be a boolean.');

  if (field.type && !isType(field.type, 'string'))
    throw new SchemaValidationError(schemaName, '`type` must be a string.');

  if (!isType(field.trim, 'boolean'))
    throw new SchemaValidationError(schemaName, '`trim` must be a boolean.');

  if (!isType(field.lowercase, 'boolean'))
    throw new SchemaValidationError(schemaName, '`lowercase` must be a boolean.');

  if (!isType(field.uppercase, 'boolean'))
    throw new SchemaValidationError(schemaName, '`uppercase` must be a boolean.');

  if (!isType(field.sanitize, 'boolean'))
    throw new SchemaValidationError(schemaName, '`sanitize` must be a boolean.');

  if (!isType(field.denyXSS, 'boolean'))
    throw new SchemaValidationError(schemaName, '`denyXSS` must be a boolean.');

  if ( (field.validate[0] && !isType(field.validate[0], 'function')) || (field.validate[1] && !isType(field.validate[1], 'function')) )
    throw new SchemaValidationError(schemaName, '`validate` must be a function or array containing a function(s).');

  if ( (field.transform[0] && !isType(field.transform[0], 'function')) || (field.transform[1] && !isType(field.transform[1], 'function')) )
    throw new SchemaValidationError(schemaName, '`transform` must be a function or array containing a function(s).');

  if (field.filterNulls !== null && !isType(field.filterNulls, 'boolean'))
    throw new SchemaValidationError(schemaName, '`filterNulls` must be a boolean.');

  if (!isType(field.minLength, 'number') && !isType(field.minLength, 'array'))
    throw new SchemaValidationError(schemaName, '`minLength` must be a number or an array of numbers.');

  if (!isType(field.maxLength, 'number') && !isType(field.maxLength, 'array'))
    throw new SchemaValidationError(schemaName, '`maxLength` must be a number or an array of numbers.');


  // Type field.
  allowedTypes = ['string', 'number', 'boolean', 'date'];
  if (field.type && allowedTypes.indexOf(field.type) === -1)
    throw new SchemaValidationError(schemaName, 'Allowed schema types include: `string`, `number`, `boolean`, and `date`. "'+field.type+'" given. Objects and arrays are implied via field. See docs...');

  // Contradictory properties.
  if (field.denyXSS && field.sanitize)
    throw new SchemaValidationError(schemaName, '`denyXSS` and `sanitize` cannot both be true.');

  if (field.required && field.default)
    throw new SchemaValidationError(schemaName, '`required` and `default` cannot both be set.');

  // If trim, lowercase, uppercase, sanitize or denyXSS, are true, make sure the type is a string in an array.
  if (field.type && field.type !== 'string' && (field.trim || field.lowercase || field.uppercase || field.sanitize || field.denyXSS))
    throw new SchemaValidationError(schemaName, 'Properties `trim`, `lowercase`, `uppercase`, `sanitize`, and `denyXSS` can only be set on strings.');

  // If notNull is true, then the user does not want null values, and shouldn't set a null value as a default.
  if (field.default === null && field.notNull)
    throw new SchemaValidationError(schemaName, 'If `notNull` is `true`, setting a default value of `null` is a violation.');

   return this;
};

/**
 * Transform particular schema properties from basic values
 * into an array & set defaults for missing array fields.
 * Call after setting defaults.
 * @param {Object} schemaField
 * @return {Object} schemaField
 * @api private.
 * @tests unit.
 */
self._arrayifySchemaField = (field) => {
  if (!isType(field.minLength, 'array')) {
    field.minLength = [field.minLength, null];
  }

  if (!isType(field.maxLength, 'array')) {
    field.maxLength = [field.maxLength, null];
  }

  if (!isType(field.validate, 'array')) {
    field.validate = [field.validate, null];
  }

  if (!isType(field.transform, 'array')) {
    field.transform = [field.transform, null];
  }

  return field;
};


/**
 * Set default values for a schema field.
 * @param {Object} schema.
 * @return {object} schema field object.
 * @api private.
 */
self._setSchemaFieldDefaults = (field) => {
  return Object.assign({}, {
    required: false,
    notNull: false,
    default: undefined,
    type: null,
    trim: false,
    lowercase: false,
    uppercase: false,
    sanitize: false,
    denyXSS: false,
    filterNulls: false,
    transform: [null, null],
    validate: [null, null],
    minLength: [null, null],
    maxLength: [null, null],
  }, field);
};
