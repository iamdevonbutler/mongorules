# Mongorules (beta - don't use now)

A small but fierce wrapper around the native mongodb driver leveraging ES6 proxy black magic.

# Intro

Abiding by the the LOTR philosophy (one API to rule them all), node-mongorules adds a little extra sauce on top of the [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver.

Using the same syntax that you would w/ the native driver, all collection methods (find, insert...) are wrapped in promises, and thus become yieldable (check out [Koa](https://github.com/koajs/koa) to take advantage of this awesomeness)! Cursor methods, resulting from a find operation, return a promise, and can be yielded as well.

Custom schemas enforce consistency to `insert()`, `update()`, `save()`, and `findAndModify()` operations, and static methods can be attached to collection models.

## Legend
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Supported operations](#supported-operations)
- [Schemas](#schemas)
- [Document Validation](#document-validation)
- [Document Transformation](#document-transformation)
- [Static methods](#static-methods)
- [Error handling](#error-handling)
- [API](#api)
- [Quirks](#quirks)
- [License](#license)

## Requirements
- node >= 0.12.x
- ES6
- ES6 proxies (enabled via [Harmony Reflect](https://github.com/tvcutsem/harmony-reflect) and the `--harmony_proxies` flag)
- Mongodb >= 2.6

## Getting started

First, install mongorules:

```
npm install --save mongorules
```

Second, init mongodb:

```
var db, mongodb, dbInstance;

mongodb = require('mongodb');
db = require('mongorules');

dbInstance = yield db.connect(process.env.MONGO_URL, mongodb);
db.addDatabase('api-development', dbInstance);
```
*The connect method is a convenience method for `MongoClient.connect` that returns a promise (wrap code in [co](https://github.com/tj/co) to yield). You can init mongodb any way you choose as long as you pass the instance to the `addDatabase()` method.*

Third, add models:

```
var db, schema, methods;

db = require('mongorules');
schema = require('./schemas/users.js');
methods = require('./methods/users.js');

db.addModels({
  users: {
    schema: schema,
    methods: methods,
    onError: function(collectionName, action, errors) {}
  }
});
```

Now, write queries:

```
var db, result, users;

db = require('mongorules');

result = yield db.users.insert({ name: 'jay' });
result = yield db.users.find({ name: 'jay' });
users = yield result.toArray();  
```

## Supported operations

All mongoodb native operations are supported. All [collection methods](http://docs.mongodb.org/manual/reference/method/js-collection/) will be wrapped in promises.

The following operations will enforce schema validation:

- `insert()`
- `update()`
- `save()`
- `findAndModify()`

### Update operations

Mongoproxy supports validation for the following mongodb update operators:

- `$inc`
- `$mul`
- `$set`
- `$min`
- `$max`
- `$addToSet`
- `$push`

Upsert operations are supported as well.

## Schemas

Schemas are optional, and are not required for each collection in your database.

### Supported data structures

The following illustrates how you go about creating schemas for different data structures:

Schemas for subdocuments are created using the dot notation.

```
{
  "account.email": {
    required: true,
    notNull: true,
    type: 'string',
    minLength: 3,
    lowercase: true,
    trim: true,
    validate: function(value) {...}
  },
  "account.name": {
    type: 'string',
    lowercase: true,
    trim: true
  },
  "created": {
    type: 'date',
    dateFormat: 'iso8601',
    default: new Date()
  }
}
```

Resolves to:

```
{
  created: 'value',
  account: {
    name: 'value',
    email: 'value'
  }
}
```
Check out [/tests/fixtures](https://github.com/iamdevonbutler/node-mongorules/tree/master/tests/fixtures) for examples on how to create schemas.

*Note: the following will include much talk about array fields, arrays of values, arrays of objects, ..., and whatnot; admittedly, this can become overwhelming, and in most cases these data structures are not needed. If that's the case, your best bet is to ignore them altogether.*

**Array of values**

```
// Note the square brackets.
{
  "friends": [{
    type: 'string'
  }];
}
```

Resolves to:

```
{
  friends: ['value']
}
```

**Array of objects**

```
// Note the square brackets.
{  
  "account.friends": [{
    required: true,
    default: [{}]
  }],
  "account.friends.name": {
    type: 'string'
  },
  "account.friends.email": {
    type: 'string'
  },
}
```

Resolves to:

```
{
  account: {
    friends: [{ name: 'value', email: 'value' }]
  }
}
```

**Array of arrays of values**

```
// Note the double square brackets.
{  
  "friends": [[{
    type: 'string',
    required: true,
    default: [[]]
  }]];
}
```

Resolves to:

```
{
  friends: [ ['value'] ]
}
```

**Array of arrays of objects**

```
// Note the double square brackets.
{
  "friends": [[{
    required: true,
    default: [ [{}] ]
  }]],
  "friends.name": {
    type: 'string'
  },
  "friends.email": {
    type: 'string'
  },
}
```

Resolves to:

```
{
  friends: [ [{name: 'value', 'email: 'value'}] ]
}
```

### Schema properties
*Validation properties*
- `required` {Boolean} default `false`
- `notNull` {Boolean} default `false`
- `default` {Mixed} default `undefined`
- `type` {string|number|boolean|date} default `null` *(array and object types are implicit)*
- `dateFormat` {String} default `null` *(used in conjunction w/ type: 'date')*
- `denyXSS` {Boolean} default `false`
- `minLength` {Number | Array} default `null`
- `maxLength` {Number | Array} default `null`
- `validate` {Function | Array} default `null`
  - *@param {Mixed} value*
  - *@param {Object} schema*
  - *@return {Boolean} - you should return a `Boolean`.*

*Transformation properties*
- `trim` {Boolean} default `false`
- `lowercase` {Boolean} default `false`
- `uppercase` {Boolean} default `false`
- `filterNulls` {Boolean} default `false`
- `sanitize` {Boolean} default `false`
- `transform` {Function | Array} default `null`
  - *@param {Mixed} value*
  - *@param {Object} schema*
  - *@return {Mixed} - you should return the transformed value.*

## Document validation
Document validation will occur on `insert()`, `update()`, `save()`, and `findAndModify()` operations, and enforce the rules declared in your schemas. As w/ mongodb query errors, document validation failures will throw errors if custom error handlers are not provided (see [Error handling](#error-handling)).

### novalidate

In instances where you want to run a query w/o schema validation you may prefix your query w/ the 'novalidate' property:

```
var result = db.users.novalidate.insert({...});
```

### The 'required' and 'notNull' properties

If 'required' is `true` and 'notNull' is `false`, ONLY `undefined` values will fail validation.

If 'required' is `true` and 'notNull' is `true`, `undefined` AND `null` values will fail validation.

*An empty string or empty array that is 'required' will pass validation. If this is not the intended behavior, set a minLength value.*

### The 'default' property
If 'required' is `false`, the 'default' property may be set. The default value will take effect during an insert/upsert when a value is `undefined`.

### The 'type' and 'dateFormat' properties

Allowed types include:

- 'string'
- 'number'
- 'boolean'
- 'date'

**For arrays:**

Type checking will be enforced on each value in an *arrays of values* and a *arrays of arrays of values*.

*Mongorules also supports types for arrays of values, arrays of objects, and arrays in arrays; however, there is no need to explicitly specify the type - the type is implied from your schema. See [supported data structures](#supported-data-structures).*

#### Date formats

If 'type' is set to 'date', the 'dateFormat' property must be set to enforce date specific validation. Allowed 'dateFormat' values include:

- 'iso8601'
- 'timestamp'
- [Custom moment.js format](http://momentjs.com/docs/#/parsing/string-format/) (in strict mode) - e.g. 'MM-DD-YYYY'

To insert an iso8601 date into your database: use `new Date()` and mongodb will store it as a BSON 'ISODate' type. To insert a timestamp into your database, use `Date.now()` (@todo store as timestamp BSON type).

### The 'denyXSS' property

The 'denyXSS' property will fail validation if given a string containing XSS as identified by Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters) module.

**For arrays:**
For an *array of values* & an *array of arrays of values*: each value, if of type `string`, will be evaluated.

### The 'minLength' and 'maxLength' properties

Enforces min and max length values on arrays and strings.

If a single value is provided:

- Array of values/objects: evaluates the number of items in array.
- Array of arrays of values/objects: evaluates the number of inner arrays.

If an array of values is provided:

```
{
  fieldName: [[{
    minLength: [1, 3]  
  }]]
}
```

- *Array of values/objects*: ensures the array has a length of at least one. If the array items are of type `string`, the second value in the minLength property array ensures that each string has a length of at least three.

- *Array of arrays of values/objects*: ensures the outer array has a length of at least one and that the inner array has a length of at least three. If the inner array values are of type `string`, you may prepend a third value to the minLength array to enforce a string length on those values.

*Note: if using the array syntax, pass `null` to skip a particular validation*

### The 'validate' property
The custom validation handler accepts two parameters, the field value, and field schema, and should return either `true` or `false`. The function is executed after the standard validation properties.

If a single function is provided:

- *Array of values/objects*: passes each item to the validation function (not particularly useful for objects).
- *Array of arrays of values/objects*: passes each inner array to the validation function.

If an array of functions is provided:

```
{
  fieldName: [[{
    validate: [
      function() { ... },
      function() { ... }
    ]
  }]]
}
```
- Array of values/objects: passes each item to the validation function (the second function is ignored).
- Array of arrays of values/objects: executes the validation method on each inner array (the first function), and the items w/i each inner array (the second function).

*Note: if using the array syntax, pass `null` to skip a particular validation*

## Document transformation

### The 'filterNulls' property
Removes `null` values from arrays, both inner and outer, prior to validation.

### The 'sanitize' property

The 'sanitize' property passes values through Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters) module.

**For arrays:**
For an *array of values* & an *array of arrays of values*: each value, if of type `string`, will be evaluated.

### The 'trim', 'lowercase', and 'uppercase', properties
The 'trim', 'lowercase', and 'uppercase' properties accept a Boolean and can only be set on values of type `string`.

**For arrays:**
For an *array of values* & an *array of arrays of values*: each value, if of type `string`, will be evaluated.

### The 'transform' property
The custom transform handler accepts two parameters, the field value, and the field schema, and should return the manipulated value. The function is executed after the standard transformation properties.

The functionality of the 'transform' function, for each data structure, mimics the functionality of the ['validate' property](#the-validate-property).

## Static methods

You can attach static methods to each collection object:

```
var db, schema, result, user;
db = require('mongorules');
schema = require('./schema');

db.addModel('users', {
  schema: schema,
  methods: {
    // `this` == mongorules instance.
    getUserByEmail: function(email) {
      return this.users.findOne({ email: email });
    },
    // You can pass generator functions!
    addUser: function* (email) {
      yield this.users.insert({ email: email });
      return yield this.users.findOne({ email: email });
    }
  }
});

user = yield* db.users.addUser('jay@example.com');
user = yield db.users.getByEmail('jay@example.com');
```


## Error handling
There are three types of errors:
- schema validation errors
- document validation errors
- mongodb errors

Schema validation errors are always thrown to ensure that the schemas you create are up to snuff.

Mongodb errors (errors that occur, for instance, when inserting a document w/ a duplicate \_id field), and document validation errors, are throw by default. You may modify this behavior by creating custom error handlers.

*Note: all document validation errors will prevent a query from executing. To skip validation altogether, despite potential errors, prepend your query with 'novalidate' property.*

*Note: If you are wrapping your mongorules initialization code with [co](https://github.com/tj/co) to allow yieldables, be sure use manually catch and rethrow all errors using the `co` catch method; otherwise, your code will fail w/o any errors logged to the console.*

### Custom error handling
Custom error handling can be established locally to each collection, via the `onError()` property set on each model, and globally using the `addGlobalErrorHandler()` method. If either a local error handler or a global error handler is provided, the default behavior of throwing an error will not occur.

The execution order of custom error handlers begins w/ the local error handler, after which, the global error handler is called. The local error handler and global error handler receive the same arguments w/ the exception of the additional "localHandler" Boolean - passed to the global handler to indicate if a local handler has already been executed. After your handlers executed, if no errors are manually thrown, the promises's reject callback will be executed.

```
/**
 * Adds a global error handler for schema validation and mongodb errors.
 * @param {Function} handler:
 *    @param {String} collectionName.
 *    @param {String} action.
 *    @param {Array} errors.
 * @return `this`.
 */
mongorules.addGlobalErrorHandler((collectionName, action, errors, localHandler) => {
   // log to database
   // throw '';
});
```

## API
### connect()
Connects to mongodb using `MongoClient.connect()` (convenience method).

**Arguments**
- mongoUrl {String}
- mongodb {Object} - require('mongodb')

**Returns**
Mongodb instance to be passed to the `addDatabase()` method.

### addDatabase()

**Arguments**
- databaseName {String}
- mongodbInstance {Object}

### addModel()

**Arguments**
- collectionName {String}
- models {Object} - data models.

```
db = require('mongorules');
db.addModel('users', {
  schema: {},
  methods: {},
  onError: function() {...}
});
```
### addModels()

**Arguments**
- models {Object} - data models.

```
db = require('mongorules');
db.addModel({
  users: {
    schema: {},
    methods: {},
    onError: function() {...}
  }
});
```

### addGlobalErrorHandler()
Adds a global error handler for schema validation and mongodb errors.

**Arguments**
- handler {Function}
   - collectionName {String}
   - action {String} - e.g. 'insert', 'update'...
   - errors {Array}

## Quirks
There are some notes on the behavior of mongorules that may not be initially obvious:

- Mongodb methods `push()` and `addToSet()` add items to an array and thus cannot mongorules cannot validate maxLength.
- If preforming an `upsert`, all required fields must be present in the update payload (validated as an insert).
- If setting schema properties on an array of objects or an array of arrays of objects, the following properties will have no effect; they can, however, be set on an object's fields: 'notNull', 'type', 'dateFormat', 'trim', 'lowercase', 'uppercase', 'sanitize', and 'denyXSS'.
- You cannot add items to an array inside an array via push or addtoset; instead, you must update the entire inner array.

## License
MIT
