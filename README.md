# node-mongo-proxy (in development - dont you dare download or look at this)

A small but fierce wrapper around the native mongodb driver leveraging ES6 proxy black magic.

# Intro

Abiding by the the LOTR philosophy (one API to rule them all), node-mongo-proxy adds a little extra sauce on top of the node-mongodb-native driver. Using the same syntax that you would w/ the native driver, all collection methods (find, insert...) are wrapped in promises, and thus become yieldable (check out [Koa](https://github.com/koajs/koa) for this awesomeness)! Cursor methods, resulting from a find operation, by default, return a yieldable symbol iterator. Custom schemas enforce consistency to `insert`, `update`, and `save` operations, and static methods can be attached to collection models.

## Requirements
- ES6
- ES6 proxies (enabled via [Harmony Reflect](https://github.com/tvcutsem/harmony-reflect) and the `--harmony_proxies` flag)
- Mongo DB (version 3)

## Readme Legend
@todo

## Supported operations

All mongoodb native operations are supported. Collection methods will be wrapped in promises.

The following operations will validate according to your schema:

- update()
- insert()
- save()

## Getting started

First, init mongodb.

```
const mongoproxy = require('mongoproxy');

// The initDatabase method is a optional convience that returns a promise.
// You can init mongodb any way you choose as long as you pass the instance to the `addDatabase()` method.
const db = yield mongoproxy.initDatabase(process.env.MONGO_URL);

mongoproxy.addDatabase('api-development', db);

```

Second, add models.

```
mongoproxy.addModels('api-development', {
    schema: schema,
    methods: methods,
    // Global error handler
    onError: function(collection, action, errors) {
      throw '';
    }
});

```

Note: when models are added, schema validation will occur to ensure formatting is up to snuff. Validation errors will throw. If you are wrapping your init code with [co](https://github.com/tj/co) to allow yieldables, be sure use manually catch and rethrow all errors using the `co` catch method; otherwise, your code will fail w/o any errors in the console.

## Schema
The following fields values can be set in your schema.
show default values for each property

### Supported types
- 'string'
- 'number'
- 'boolean'
- 'date'
  - 'iso8601'
  - 'unix' (timestamp)
  - custom: e.g. 'MM-DD-YYYY' ([moment.js](http://momentjs.com/docs/#/parsing/string-format/) custom date format)


### Custom properties
@todo

### Properties
- required (Boolean) - makes sure value is not undefined
- default (String|Number|Object|Boolean|Array)
- type (String|Number|Boolean) (not Array - see Array schema below)
- denyXSS (Boolean) - returns false if given a string containing XSS (uses https://github.com/yahoo/xss-filters)
- trim (Boolean)
- lowercase (Boolean)
- sanitize (Boolean)
- transform (Function)
- validate (Function)
- dateFormat (String - used in conjunction w/ type: 'date')

### Required properties
If required is `true` values of `null` will fail.
If required is `true` an array of values must contain at least one value.
If required is `true` an array of object must contain at least one object.
If required is `true` an array of arrays of values must contain at least one array with one value.
If required is `true` an array of arrays of objects must contain at least one array with one object.

### Arrays (to specify that a field is an Array of values)
- isArray (Boolean)

### Array and required properties
required will ensure that an array has a length of one ([null]) would pass.

### Array of Objects/Arrays and validation/transformation properties
Validation/transformaion of the interior arrays/objects can not occur (except for required - see above) using the cutom validate/transform methods.

### custom transformation/valdation method runs last.


### novalidate

In instances where you want to run a query w/o schema validation you may prefix your query w/ the `novalidate` property:

```
var result = db.users.novalidate.insert({});

```

### Schema Examples
#### Normal schema
#### Nested schema
#### Mixed schema
#### Array of arrays schema
#### Array of objects schema

## Static methods
@todo have `this` eql mongoproxy
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
There are two types of errors here: 1) schema validation errors (developer errors), and 2) field validation errors (bad data errors).
Both types of errors will throw.
Error handling is both local to each collection, via the `onError()` property passed to the `addModels()` method, and global using the following syntax.

```
mongoproxy.addErrorHandler('api-development', (collectionName, action, errors) => {
   throw '';
});

```

The global error handler will be called only if there is not a collection specific error handler.

You may, and probably should, catch all errors on a query level, and to prevent them from propagating:

```
try {
  var result = yield users.insert({});
}
catch (err) {
  this.log('error');
  ...
}

```

## Phase II
- add custom schema properties

## List supported data structures
- objects in arrays
- objects in objects
- strings in objects
- numbers in objects
- booleans in objects
- arrays of arrays (validation for values in array must be done custom)

#todos
- what to do if inserting/updating and the value is empty? right now we are running the query. probably shouldn't but what to return.


## date
- type  == date
- dateFormat - ('unix', '8601', custom - see moment isValid docs). if false, will match all moment formats.
- uses moment in strict parsing mode.

## Init database
convience method.
