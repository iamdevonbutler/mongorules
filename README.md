# mongoproxy (beta) DO NOT USE RIGHT MEOW

A small but fierce wrapper (not a ORM) around the native mongodb driver leveraging ES6 proxy black magic.

# Intro

Abiding by the the LOTR philosophy (one API to rule them all), node-mongo-proxy adds a little extra sauce on top of the node-mongodb-native driver.

Using the same syntax that you would w/ the native driver, all collection methods (find, insert...) are wrapped in promises, and thus become yieldable (check out [Koa](https://github.com/koajs/koa) to take advantage of this awesomeness)! Cursor methods, resulting from a find operation, return a yieldable symbol iterator.

Custom schemas enforce consistency to `insert()`, `update()`, and `save()` operations, and static methods can be attached to collection models.

## Legend
- [Requirements](#requirements)
- [Supported operations](#supported-operations)
- [Getting started](#getting-started)
- [Schemas](#schemas)
- [Field Validation](#field-validation)
- [Static methods](#static-methods)
- [Error handling](#error-handling)
- [API](#api)

## Requirements
- node (versions 0.12, 4.0.0)
- ES6
- ES6 proxies (enabled via [Harmony Reflect](https://github.com/tvcutsem/harmony-reflect) and the `--harmony_proxies` flag)
- Mongodb (version 3)

## Supported operations

All mongoodb native operations are supported. All [collection methods](http://docs.mongodb.org/manual/reference/method/js-collection/) will be wrapped in promises.

The following operations will enforce schema validation:

- `update()`
- `insert()`
- `save()`

## Getting started

First, install mongoproxy:

```
npm install --save mongoproxy
```

Second, init mongodb:

```
const mongoproxy = require('mongoproxy');

// The initDatabase method is a convenience method that returns a promise.
// You can init mongodb any way you choose as long as you pass the instance to the `addDatabase()` method.
const db = yield mongoproxy.initDatabase(process.env.MONGO_URL);

mongoproxy.addDatabase('api-development', db);
```

Third, add models:

```
const mongoproxy = require('mongoproxy');
const schema = require('./schemas/users.js');
const methods = require('./methods/users.js');

mongoproxy.addModels('api-development', {
  users: {
    schema: schema,
    methods: methods,
    // Global error handler
    onError: function(collection, action, errors) {
      throw '';
    }
  }
});
```

*Note: when models are added, schema validation will occur to ensure formatting is up to snuff. Schema validation errors will throw. If you are wrapping your init code with [co](https://github.com/tj/co) to allow yieldables, be sure use manually catch and rethrow all errors using the `co` catch method; otherwise, your code will fail w/o any errors logged in the console.*

Third, write queries:

```
const db = require('mongoproxy');

try {
  var result = yield db.users.find({});
  var users = yield result.toArray();  
}
catch (err) {
  // Log.
}
```

## Schemas
A schema can validate and transform data for `insert()`, `update()`, and `save()` operations.

Schemas are optional, and are not required for each collection.

*Note: there will be much talk about array types, arrays in arrays and whatnot; admittedly, this can become overwhelming, and in most cases these data structures are not needed. If that's the case, your best bet is to ignore them altogether.*

### Supported data structures

The following illustrates how you go about creating schemas for different data structures:

#### Simple values

```
"name": { type: 'string', required: true };
```

#### Nested values

Use the dot notation to create nested objects. The dot syntax is intended to be less verbose than nesting objects in objects.

```
"account.name": { type: 'string',  required: true },
"account.email": { type: 'string',  required: true  }
```

Resolves to:

```
{
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
- `minLength` {Number} default `null` (Arrays & Strings)
- `maxLength` {Number} default `null` (Arrays & Strings)
- `validate` {Function} default `null`
  - @param {Mixed} value
  - @param {Object} schema
  - @return {Boolean} - you should return a `Boolean`.

*Transformation properties*
- `trim` {Boolean} default `false` (Strings only)
- `lowercase` {Boolean} default `false` (String only)
- `filterNulls` {Boolean} default `false` (Arrays only)
- `sanitize` {Boolean} default `false` (Strings only)
- `transform` {Function} default `null`
  - @param {Mixed} value
  - @param {Object} schema
  - @return {Mixed} - you should return the transformed value.

*Note: if setting properties on an array of objects or array of arrays of objects, the following properties will have no effect; they can, however, be set on an object's fields: 'notNull', 'type', 'trim', 'lowercase', 'sanitize', 'denyXSS', and 'dateFormat'.*

## Field validation
Field validation will occur on `insert()`, `update()`, and `save()` operations and enforce the rules declared in your schemas. As w/ mongodb query errors, field validation failures will throw field validation errors if custom error handlers are not provided.

*See the [Error handling](#error-handling) section to learn more about handling field validation errors.*

### novalidate

In instances where you want to run a query w/o schema validation you may prefix your query w/ the 'novalidate' property:

```
var result = db.users.novalidate.insert({...});
```

### The 'required' and 'notNull' properties

If 'required' is `true` and 'notNull' is `false`, ONLY `undefined` values will fail validation.

If 'required' is `true` and 'notNull' is `true`, `undefined` AND `null` values will fail validation.

*An empty string or empty array that is 'required' will pass validation. If this is not the intended behavior, set a minLength value.*

**For arrays:**

- Array of values/objects: if 'required' is `true`, `undefined` values will fail validation; BUT, empty arrays will pass validation (set minLength = 1 to change this behavior).

- Array of arrays of values/objects: Inherits behavior of *array of values/objects*, but also ensures the inner array is not `undefined`.

### The 'default' property
If 'required' is false, the 'default' property may be set. The default value will take effect if a value would fail 'required' validation for its respective data structure (see above).

**For arrays:**

- Arrays of values/objects: the default should include the array and its value. e.g. default: "['value']", "[{name: 'value'}]" or "[]".

- Array of arrays of values/objects: same as *array of values*; however, the default value should include both arrays. e.g. "[ ['value'] ]",  "[ [{name:'value'}] ]", or "[ [] ]"


### The 'type' and 'dateFormat' properties

Allowed types include:

- 'string'
- 'number'
- 'boolean'
- 'date'

If `type` is set to **'date'**, the `dateFormat` property must be set to enforce date specific validation. Allowed `dateFormat` values include:

- 'iso8601'
- 'unix' (timestamp)
- custom: e.g. 'MM-DD-YYYY' ([moment.js custom date formats](http://momentjs.com/docs/#/parsing/string-format/) in strict mode)

**For arrays:**
Types checking will be enforced on each value in *arrays of values* and *arrays of arrays of values*.

*Mongoproxy also supports types for arrays of values, arrays of objects, and arrays in arrays; however, there is no need to explicitly specify the type - the type is implied from your schema. See [supported data structures](#).*

### The 'denyXSS' property

The 'denyXSS' property will fail validation if given a string containing XSS as identified by Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters) module.

**For arrays:**
For an *array of values* & an *array of arrays of values*: each value, if of type `string`, will be evaluated.

### The 'minLength' and 'maxLength' properties

Enforces min and max length values on arrays and strings.

**For arrays:**
- Array of values: evaluates the number of values in array.
- Array of objects: evaluates the number of objects in array.
- Array of arrays of values: evaluates the number of nested arrays.
- Array of arrays of object: evaluates the number of nested arrays.

*Note: to validate the string length for an array or values, and to validate the number of values/objects in nested arrays, use the custom `validate` function.*

### The 'validation' property
The custom validation handler accepts two parameters, the field value, and field schema, and should return either `true` or `false`. The function is executed after the standard validation properties.

**For arrays:**

- Array of values: passes each value to the validation function.
- Array of objects: passes each object to the validation function (not incredibly useful).
- Array of arrays of values: passes each inner array to the validation function.
- Array of arrays of objects: passes each inner array to the validation function.

*Note: for arrays containing objects, the `validate` function can be set on each object property in addition to the field property.*

## Field transformations

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

The values passed to the 'transform' function, for each data structure, mimic the values passed to the 'validation' function.

*Note: to evaluate object properties nested in, the `transform` function can be set on each object property in addition to the parent array field.*

## Static methods
@todo have `this` eql mongoproxy (this.users.find({}))
@todo return promise always?

You can attach static methods to the collection object like so:

```
const mongoproxy = require('mongoproxy');
const db = yield mongoproxy.initDatabase(process.env.MONGO_URL);
mongoproxy.addDatabase('api-development', db);

mongoproxy.addModels('api-development', {
    schema: schema,
    methods: {
      users: {
        getByEmail: function() {}
      }
    }
});

var db = mongoproxy;
var result = yield db.users.getByEmail('jay@example.com');
```


## Error handling
There are two types of errors here: 1) schema validation errors (developer errors), and 2) field validation errors (bad data errors). Both types of errors will throw.

Custom error handlers can be provided to modify the behavior of field validation errors. All field validation errors will prevent a query from executing regardless of the return value from your custom error handler. To run a query in the presence of errors, prepend your query with novalidate property (see docs).

Error handling is both local to each collection, via the `onError()` property set on your model, and global using the following syntax.

```
mongoproxy.addErrorHandler('api-development', (collectionName, action, errors) => {
   throw '';
});
```

If a global error handler is provided, it will be called in the absence of a collection specific error handler.

You may, and probably should, catch all errors on a query level, and to prevent them from propagating:

```
try {
  var result = yield users.insert({});
}
catch (err) {
  // log
  // ...
}
```

## API
### initDatabase
### addDatabase
### addErrorHandler
### use
### addModels
### \_addModel

#todos
- run maxLength minLength validation after required, notNull validation becasue we dont want to be counting null values in array if notnull is true.
- addModel should be public
- what to do if inserting/updating and the value is empty? right now we are running the query. probably shouldn't but what to return.
- Custom properties
- multiple databases
- performance test
  - vs native vs mongoose
  - w/o transforming and validating at the same time w/ 50% validation failures.
