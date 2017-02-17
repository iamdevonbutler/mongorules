const {sortBy} = require('lodash');
const {isType, isObjectId} = require('../utils');
const {SchemaValidationError} = require('../errors');

const self = module.exports;

self.Types = Object.freeze({
  string: {value: ['string']},
  number: {value: ['number']},
  date: {value: ['date']},
  timestamp: {value: ['timestamp']},
  boolean: {value: ['boolean']},
  object: {value: ['object']},
  objectId: {value: ['objectId']},
  null: {value: ['null']},
  array: (...types) => {
    return {
      value: ['array'],
      children: types.reduce((prev, current) => {
        current.value.forEach(val => {
          if (isType(val, 'array')) {
            prev = prev.concat(val);
          }
          else {
            prev.push(val);
          }
        });
        return prev;
      }, []),
    }
  },
  mixed: (...types) => {
    return {
      value: types.map(item => item.value[0])
    };
  },
});

/**
 * Normalize, validate and transform schema into a 'validation object'.
 * @param {Object} schema.
 * @return {Object}
 * @api private.
 */
self.generateSchema = (schema) => {
  schema = self.normalizeSchema(schema);
  self.validateSchema(schema);
  schema = self.attachTypeToSchema(schema);
  schema = self.attachIsRootToSchema(schema);
  return schema;
};

/**
 * Identify a schema field as being a root field
 * as opposed to being a field nested inside an obj
 * in an array or nested w/i a subdocument.
 * @param {Object} schema
 * @return {Object}
 */
self.attachIsRootToSchema = (schema) => {
  var keys;
  keys = Object.keys(schema);
  keys.forEach(key => {
    var fieldSchema, parentKey, isRoot;
    fieldSchema = schema[key];
    parentKey = key.split('.').slice(0, -1).join('.');
    if (!parentKey || !parentKey.length) {
      isRoot = true;
    }
    else {
      isRoot = keys.every(key => key !== parentKey);
    }
    schema[key]._isRoot = isRoot;
  });
  return schema;
};

/**
 * Identify a field schema as being either
 * a basic 'value', an 'arrayofobjects', or
 * a 'arrayofvalues'.
 * @param {Object} schema
 * @return {Object}
 */
self.attachTypeToSchema = (schema) => {
  var keys;
  keys = Object.keys(schema);
  keys.forEach(key => {
    var fieldSchema, type;
    fieldSchema = schema[key];
    type = 'value';
    if (fieldSchema.type && fieldSchema.type.value.indexOf('array') > -1) {
      let children = fieldSchema.type.children;
      if (children && children.length) {
        type = children.indexOf('object') > -1 ? 'arrayofobjects' : 'arrayofvalues';
      }
    }
    schema[key]._type = type;
  });
  return schema;
};

/**
 * @param {Object} schema
 * @return {Object}
 */
self.normalizeSchema = (schema) => {
  var obj, keys;

  obj = {};
  schema = Object.assign({}, schema);

  // Sort schema by field key nesting in asc order.
  schema = self._sortByFieldKey(schema);

  // Add _id field w/ validate function to schema.
  schema = self._addIdFieldToSchema(schema);

  // Itterate over each field in the schema.
  keys = Object.keys(schema);
  keys.forEach(key => {
    let fieldSchema, type;
    fieldSchema = schema[key];
    fieldSchema = self._setSchemaFieldDefaults(fieldSchema);
    fieldSchema = self._arrayifySchemaField(fieldSchema);
    obj[key] = fieldSchema;
  });
  return obj;
};

self.validateSchema = (schema) => {
  var keys;
  keys = Object.keys(schema);
  keys.forEach(key => {
    var fieldSchema;
    fieldSchema = schema[key];
    self.validateSchemaField(fieldSchema, key);
  });
};

/**
 * Ensure user has properly configured his database schemas.
 * @param {Object} field - field from schema e.g. {'account.name': {...field}}
 * @param {String} fieldName.
 * @return `this` - throw error if invaild.
 * @api private.
 */
self.validateSchemaField = (field, fieldName) => {
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
      validate: value => isObjectId(value)
    }
  }, schema);
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
