# mongoproxy (beta) DO NOT USE RIGHT MEOW

A small but fierce wrapper (not a ORM) around the native mongodb driver leveraging ES6 proxy black magic.

# Intro

Abiding by the the LOTR philosophy (one API to rule them all), node-mongo-proxy adds a little extra sauce on top of the node-mongodb-native driver.

Using the same syntax that you would w/ the native driver, all collection methods (find, insert...) are wrapped in promises, and thus become yieldable (check out [Koa](https://github.com/koajs/koa) to take advantage of this awesomeness)! Cursor methods, resulting from a find operation, return a promise, and can be yielded as well.

Custom schemas enforce consistency to `insert()`, `update()`, and `findAndModify()` operations, and static methods can be attached to collection models.

## Legend
- [Requirements](#requirements)
- [Supported operations](#supported-operations)
- [Getting started](#getting-started)
- [Schemas](#schemas)
- [Document Validation](#document-validation)
- [Document Transformation](#document-transformation)
- [Indexes](#indexes)
- [Static methods](#static-methods)
- [Error handling](#error-handling)
- [API](#api)
- [Misc](#misc)
- [Todos](#todos)

## Requirements
- node (versions 0.12, 4.0.0)
- ES6
- ES6 proxies (enabled via [Harmony Reflect](https://github.com/tvcutsem/harmony-reflect) and the `--harmony_proxies` flag)
- Mongodb (version 3)

## Supported operations

All mongoodb native operations are supported. All [collection methods](http://docs.mongodb.org/manual/reference/method/js-collection/) will be wrapped in promises.

The following operations will enforce schema validation:

- `insert()`
- `update()`
- `findAndModify()`

### Other operations
All mongodb operations are supported; however, not all of operations are validated prior to execution. The `upsert: true` option, available on `update()` operations, cannot be supported - update validation does not ensure the presence of all fields required for an insert. For this same reason we cannot validate `save()` operations.

*Note: the mongodb node native driver [findAndModify()](http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#findandmodify) implementation is different from the mongodb shell implementation.*

## Getting started

First, install mongoproxy:

```
npm install --save mongoproxy
```

Second, init mongodb:

```
const mongoproxy = require('mongoproxy');
const MongoClient = require('mongodb').MongoCLient;

const db = yield mongoproxy.initDatabase(MongoClient, process.env.MONGO_URL);

mongoproxy.addDatabase('api-development', db);
```
*The initDatabase method is a convenience method that returns a promise (wrap code in `co` to yield). You can init mongodb any way you choose as long as you pass the instance to the `addDatabase()` method.*

Third, add models:

```
const mongoproxy = require('mongoproxy');
const schema = require('./schemas/users.js');
const methods = require('./methods/users.js');

mongoproxy.addModels({
  users: {
    schema: schema,
    methods: methods,
    onError: function(collection, action, errors) {}
  }
});
```

Third, write queries:

```
const db = require('mongoproxy');

try {
  var result = yield db.users.find({});
  var users = yield result.toArray();  
}
catch (err) {
  // @todo log.
}
```

## Schemas
A schema can validate and transform data for `insert()`, `update()`, and `findAndModify()` operations.

Schemas are optional, and are not required for each collection.

### Supported data structures

The following illustrates how you go about creating schemas for different data structures:

*Note: there will be much talk about array types, arrays in arrays and whatnot; admittedly, this can become overwhelming, and in most cases these data structures are not needed. If that's the case, your best bet is to ignore them altogether.*

#### Values

Use the dot notation to create nested objects. The dot syntax is intended to be less verbose than nesting objects in objects.

```
"created": { type: 'date', dateFormat: 'iso8601' required: true };
"account.name": { type: 'string',  required: true },
"account.email": { type: 'string',  required: true  }
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

#### Array of values

```
// Note the square brackets.
"friends": [{ type: 'string' }];
```

Resolves to:

```
{
  friends: ['value']
}
```

#### Array of objects

```
// Note the square brackets.
"account.friends": [{ required: true, default: [{}] }];
"account.friends.name": { type: 'string' };
"account.friends.email": { type: 'string' };
```

Resolves to:

```
{
  account: {
    friends: [{ name: 'value', email: 'value' }]
  }
}
```

#### Array of arrays of values

```
// Note the double square brackets.
"friends": [[{ type: 'string', required: true, default: [[]] }]];
```

Resolves to:

```
{
  friends: [ ['value'] ]
}
```

#### Array of arrays of objects

```
// Note the double square brackets.
"friends": [[{ required: true, default: [[{}]] }]];
"friends.name": { type: 'string' };
"friends.email": { type: 'string' };
```

Resolves to:

```
{
  friends: [ [{name: 'value', 'email: 'value'}] ]
}
```

*Check out [/tests/fixtures](https://github.com/iamdevonbutler/node-mongo-proxy/tree/master/tests/fixtures) to see how to create the different types of schemas.*

### Schema properties
*Validation properties*
- `required` {Boolean} default `false`
- `notNull` {Boolean} default `false`
- `default` {Mixed} default `null`
- `type` {string|number|boolean|date} default `null` (Array and Object types are implicit)
- `dateFormat` {String - used in conjunction w/ type: 'date'} default `null`
- `denyXSS` {Boolean} default `false` (Strings only)
- `minLength` {Number | Array} default `null` (Arrays & Strings)
- `maxLength` {Number | Array} default `null` (Arrays & Strings)
- `validate` {Function | Array} default `null`
  - *@param {Mixed} value*
  - *@param {Object} schema*
  - *@return {Boolean} - you should return a `Boolean`.*

*Transformation properties*
- `trim` {Boolean} default `false` (Strings only)
- `lowercase` {Boolean} default `false` (String only)
- `filterNulls` {Boolean} default `false` (Arrays only)
- `sanitize` {Boolean} default `false` (Strings only)
- `transform` {Function | Array} default `null`
  - *@param {Mixed} value*
  - *@param {Object} schema*
  - *@return {Mixed} - you should return the transformed value.*

*Note: if setting properties on an array of objects or an array of arrays of objects, the following properties will have no effect; they can, however, be set on an object's fields: 'notNull', 'type', 'dateFormat', 'trim', 'lowercase', 'sanitize', and 'denyXSS'.*

## Document validation
Document validation will occur on `insert()`, `update()`, and `findAndModify()` operations and enforce the rules declared in your schemas. As w/ mongodb query errors, document validation failures will throw document validation errors if custom error handlers are not provided (see [Error handling](#error-handling)).

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
If 'required' is `false`, the 'default' property may be set. The default value will take effect if a value would fail 'required' validation for its respective data structure.

**For arrays:**

- Arrays of values/objects: the default should include the array and its value. e.g. default: "['value']", "[{name: 'value'}]" or "[]".

- Array of arrays of values/objects: same as *array of values*; however, the default value should include both arrays. e.g. "[ ['value'] ]",  "[ [{name:'value'}] ]", or "[ [] ]"

*Edge case example: if the value = null, required = false, notNull = true - the default value will be set.*

### The 'type' and 'dateFormat' properties

Allowed types include:

- 'string'
- 'number'
- 'boolean'
- 'date'

If 'type' is set to 'date', the 'dateFormat' property must be set to enforce date specific validation. Allowed 'dateFormat' values include:

- 'iso8601'
- 'timestmap' (unix timestmap)
- custom: e.g. 'MM-DD-YYYY' ([moment.js custom date formats](http://momentjs.com/docs/#/parsing/string-format/) in strict mode)

**For arrays:**

Type checking will be enforced on each value in *arrays of values* and *arrays of arrays of values*.

*Mongoproxy also supports types for arrays of values, arrays of objects, and arrays in arrays; however, there is no need to explicitly specify the type - the type is implied from your schema. See [supported data structures](#).*

### The 'denyXSS' property

The 'denyXSS' property will fail validation if given a string containing XSS as identified by Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters) module.

**For arrays:**
For an *array of values* & an *array of arrays of values*: each value, if of type `string`, will be evaluated.

### The 'minLength' and 'maxLength' properties

Enforces min and max length values on arrays and strings.

**For arrays:**
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

- Array of values/objects: ensures the array has a length of at least one. If the array items are of type `string`, the second value in the minLength property array ensures that each string has a length of at least three.

- Array of arrays of values/objects: ensures the outer array has a length of at least one and that the inner array has a length of at least three. If the inner array values are of type `string`, you may prepend a third value to the minLength array to enforce a string length on those values.

*Note: if using the array syntax, pass `null` to skip a particular validation*

### The 'validation' property
The custom validation handler accepts two parameters, the field value, and field schema, and should return either `true` or `false`. The function is executed after the standard validation properties.

**For arrays:**

If a single function is provided:

- Array of values/objects: passes each item to the validation function (not particularly useful for objects).
- Array of arrays of values/objects: passes each inner array to the validation function.

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

### The 'trim' and 'lowercase' properties
The 'trim' and 'lowercase' properties accept a Boolean and can only be set on values of type `string`.

**For arrays:**
For an *array of values* & an *array of arrays of values*: each value, if of type `string`, will be evaluated.

### The 'transform' property
The custom transform handler accepts two parameters, the field value, and the field schema, and should return the manipulated value. The function is executed after the standard transformation properties.

The functionality of the 'transform' function, for each data structure, mimics the functionality of the ['validation' function](#).


## Indexes

## Static methods
@todo return promise always?

You can attach static methods to the collection object like so:

```
const mongoproxy = require('mongoproxy');
const db = yield mongoproxy.initDatabase(process.env.MONGO_URL);
mongoproxy.addDatabase('api-development', db);

mongoproxy.addModels({
  users: {
    schema: schema,
    methods: {
      getByEmail: function() {}
    }
  }
});

var db = mongoproxy;
var result = yield db.users.getByEmail('jay@example.com');
```


## Error handling
There are three types of errors:
- schema validation errors
- document validation errors
- mongodb errors

Schema validation errors are always thrown to ensure that the schemas you create are up to snuff.

Mongodb errors (errors that occur, for instance, when inserting a document w/ a duplicate \_\id field), and document validation errors, are throw by default. You may modify this behavior by creating custom error handlers.

*Note: all document validation errors will prevent a query from executing. To skip validation altogether, despite potential errors, prepend your query with [novalidate](#) property.*

*Note: If you are wrapping your mongoproxy initialization code with [co](https://github.com/tj/co) to allow yieldables, be sure use manually catch and rethrow all errors using the `co` catch method; otherwise, your code will fail w/o any errors logged in the console.*

### Custom error handling
Custom error handling can be established locally to each collection, via the `onError()` property set on your model, and globally using the `()` added w/ your initialization code. If either a local error handler or a global error handler is provided, the default behavior of throwing an error will not occur.

The execution order of custom error handlers begins w/ the local error handler (if provided), after which, the global error handler is called (if provided). The local error handler and global error handler receive the same arguments w/ the exception of the additional "localHandler" Boolean - passed to the global handler to indicate if a local handler has already been executed. After your handlers executed, if no errors are manually thrown, the promises's reject callback will be executed.

```
/**
 * @param {String} collectionName
 * @param {String} action - e.g. 'insert', 'find'...
 * @param {Array} errors
 * @param {Boolean} localHandler - will be 'true' a local error handler has been called.
 */
mongoproxy.addGlobalErrorHandler('api-development', (collectionName, action, errors, localHandler) => {
   // log to database
   // throw '';
   // return 'something to be passed to promise reject callback'
});
```

## API
### initDatabase
### addDatabase
### addGlobalErrorHandler
### use
### addModels
### \_addModel

## Misc

### Inserting undefined values
In an insert, if a value is `undefined`, and required = false, and there isn't a default value declared in your schema, the `undefined` value will be converted into a `null` value prior to insert.

## Todos
- expand date support
- support more mongodb methods in addition to collection methods.
- uppercase
- run maxLength minLength validation after required, notNull validation becasue we dont want to be counting null values in array if notnull is true.
- addModel should be public
- what to do if inserting/updating and the value is empty? right now we are running the query. probably shouldn't but what to return.
- Custom properties
- multiple databases
- performance test
  - vs native vs mongoose
  - w/o transforming and validating at the same time w/ 50% validation failures.
