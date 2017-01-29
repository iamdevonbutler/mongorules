const {sortBy} = require('lodash');
const {isType, isObjectId, isSubdocumentInArray} = require('./utils');
const {SchemaValidationError} = require('./errors');

const self = module.exports;

// @todo test to see if we can change it's value.
self.Types = Object.freeze({
  string: {value: 'string'},
  number: {value: 'number'},
  date: {value: 'date'},
  timestamp: {value: 'timestamp'},
  boolean: {value: 'boolean'},
  object: {value: 'object'},
  objectId: {value: 'objectId'},
  null: {value: 'null'},
  array: (...type) => {
    return {
      value: 'array',
      children: type,
    }
  },
  mixed: (...types) => {value: types},
});

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
  var validationObject, arrayOfObjectFields = [];

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

    if (fieldValue.type && fieldValue.type.value === 'array') {
      let childObjectsInArray;
      childObjectsInArray = self._findSchemaArrayOfObjectsChildFields(schema, fieldKey);
      type = childObjectsInArray ? 'arrayofobjects' : 'arrayofvalues';
      if (type === 'arrayofobjects') {
        arrayOfObjectFields.push(fieldKey);
      }
    }

    fieldValue._isSubdocumentInArray = isSubdocumentInArray(fieldKey, arrayOfObjectFields);
    fieldValue._type = type; // validation object type (value, arrayofobjects, arrayofvalues).
    fieldValue = self._setSchemaFieldDefaults(fieldValue);
    fieldValue = self._arrayifySchemaField(fieldValue);
    self._validateSchemaField(fieldValue, fieldKey);
    validationObject[fieldKey] = fieldValue;
  } // end for loop.

  return validationObject;
};

/**
 * Ensure user has properly configured his database schemas.
 * @param {Object} field - field from schema e.g. {'account.name': {...field}}
 * @param {String} fieldName.
 * @return `this` - throw error if invaild.
 * @api private.
 */
self._validateSchemaField = (field, fieldName) => {
  // Type check values.
  if (!isType(field.required, 'boolean'))
    throw new SchemaValidationError(fieldName, '`required` must be a boolean.');

  if (!isType(field.notNull, 'boolean'))
    throw new SchemaValidationError(fieldName, '`notNull` must be a boolean.');

  if (!isType(field.trim, 'boolean'))
    throw new SchemaValidationError(fieldName, '`trim` must be a boolean.');

  if (!isType(field.lowercase, 'boolean'))
    throw new SchemaValidationError(fieldName, '`lowercase` must be a boolean.');

  if (!isType(field.uppercase, 'boolean'))
    throw new SchemaValidationError(fieldName, '`uppercase` must be a boolean.');

  if (!isType(field.sanitize, 'boolean'))
    throw new SchemaValidationError(fieldName, '`sanitize` must be a boolean.');

  if (!isType(field.denyXSS, 'boolean'))
    throw new SchemaValidationError(fieldName, '`denyXSS` must be a boolean.');

  if ( (field.validate[0] && !isType(field.validate[0], 'function')) || (field.validate[1] && !isType(field.validate[1], 'function')) )
    throw new SchemaValidationError(fieldName, '`validate` must be a function or array containing a function(s).');

  if ( (field.transform[0] && !isType(field.transform[0], 'function')) || (field.transform[1] && !isType(field.transform[1], 'function')) )
    throw new SchemaValidationError(fieldName, '`transform` must be a function or array containing a function(s).');

  if (field.filterNulls !== null && !isType(field.filterNulls, 'boolean'))
    throw new SchemaValidationError(fieldName, '`filterNulls` must be a boolean.');

  if (!isType(field.minLength, 'number') && !isType(field.minLength, 'array'))
    throw new SchemaValidationError(fieldName, '`minLength` must be a number or an array of numbers.');

  if (!isType(field.maxLength, 'number') && !isType(field.maxLength, 'array'))
    throw new SchemaValidationError(fieldName, '`maxLength` must be a number or an array of numbers.');

  // Type field - returns an object w/ a value property.
  if (field.type && !isType(field.type, 'object'))
    throw new SchemaValidationError(fieldName, `You must use the "Types" object from mongorules/schema to define field types. See docs.`);

  // Contradictory properties.
  if (field.denyXSS && field.sanitize)
    throw new SchemaValidationError(fieldName, '`denyXSS` and `sanitize` cannot both be true.');

  if (field.required && field.default !== undefined)
    throw new SchemaValidationError(fieldName, '`required` and `default` cannot both be set.');

  // If trim, lowercase, uppercase, sanitize or denyXSS, are true, make sure the type is a string or an array of strings..
  if (field.type && field.type.value !== 'string' && field.type.value !== undefined) {
    if (field.trim || field.lowercase || field.uppercase || field.sanitize || field.denyXSS) {
      if (field.type.value === 'array' && field.type.children.every(item => item.value !== 'string')) {
        throw new SchemaValidationError(fieldName, 'Properties `trim`, `lowercase`, `uppercase`, `sanitize`, and `denyXSS` can only be set on strings.');
      }
    }
  }

  // If notNull is true, then the user does not want null values, and shouldn't set a null value as a default.
  if (field.default === null && field.notNull)
    throw new SchemaValidationError(fieldName, 'If `notNull` is `true`, setting a default value of `null` is a violation.');

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
    type: {value: undefined},
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
