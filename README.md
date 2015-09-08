# node-mongo-proxy (beta)

A small but fierce wrapper (not a ORM) around the native mongodb driver leveraging ES6 proxy black magic.

# Intro

Abiding by the the LOTR philosophy (one API to rule them all), node-mongo-proxy adds a little extra sauce on top of the node-mongodb-native driver. Using the same syntax that you would w/ the native driver, all collection methods (find, insert...) are wrapped in promises, and thus become yieldable (check out [Koa](https://github.com/koajs/koa) to take advantage of this awesomeness)! Cursor methods, resulting from a find operation, by default, return a yieldable symbol iterator. Custom schemas enforce consistency to `insert()`, `update()`, and `save()` operations, and static methods can be attached to collection models.

## Legend
- Requirements
- Supported operations
- Getting started
- Schemas
- Static methods
- Error handling

## Requirements
- ES6
- ES6 proxies (enabled via [Harmony Reflect](https://github.com/tvcutsem/harmony-reflect) and the `--harmony_proxies` flag)
- Mongo DB (version 3)

## Supported operations

All mongoodb native operations are supported. Collection methods will be wrapped in promises.

The following operations will enforce schema validation:

- update()
- insert()
- save()

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

*Note: when models are added, schema validation will occur to ensure formatting is up to snuff. Validation errors will throw. If you are wrapping your init code with [co](https://github.com/tj/co) to allow yieldables, be sure use manually catch and rethrow all errors using the `co` catch method; otherwise, your code will fail w/o any errors logged in the console.*

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
A schema can validate and transform data for `insert`, `update`, and `save` operations.

Schemas are optional, and are not required for each collection.

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
- `required` {Boolean} default `false`
- `default` {String|Number|Object|Boolean|Array} default `null`
- `type` {String|Number|Boolean|Object - if inside array} default `null`
- `trim` {Boolean} default `false`
- `lowercase` {Boolean} default `false`
- `denyXSS` {Boolean} default `false`
- `sanitize` {Boolean} default `false`
- `minLength` {Number} default `null`
- `maxLength` {Number} default `null`
- `validate` {Function} default `null`
- `transform` {Function} default `null`
- `dateFormat` {String - used in conjunction w/ type: 'date'} default `null`

## Field validation
Field validation will occur on `insert()`, `update()`, and `save()` operations and enforce the rules declared in your schemas. As w/ mongodb query errors, field validation failures will throw field validation errors.

*See the [Error handling](#) section to learn more about handling field validation errors.*

### novalidate

In instances where you want to run a query w/o schema validation you may prefix your query w/ the `novalidate` property:

```
var result = db.users.novalidate.insert({...});
```

### The 'required' property
- If required is `true`, `null` and `undefined` values will fail validation.
- If required is `true`, an array of values must have a length > 1.
- If required is `true`, an array of objects must have a length > 1.
- If required is `true`, an array of arrays of values must have a outer array with length > 1 and an inner array w/ a length > 1.
- If required is `true`, an array of arrays of objects must have a outer array with length > 1 and an inner array w/ a length > 1.

### The 'default' property
If `required` is false, the `default` property may be set.

- Arrays of values: the default value will be set if the array is empty or undefined. The default should include the array and its value. e.g. default: `['value']` and NOT `'value'`.

- Arrays of objects: the default value will be set if the array is empty or undefined. If the contained object is missing require fields, a validation error will be thrown. The default should be include the array and its value. e.g. default `[{name: 'value'}]` and NOT `{name:'value'}`.

- Array of arrays of values: same as *arrays of values*; however, the default value should include both arrays. e.g. `[ ['value'] ]` and NOT `['value']`

- Array of arrays of objects: same as *arrays of objects*; however, the default value should include both arrays. e.g. `[ [{name:'value'}] ]` and NOT `[{name: 'value'}]`.

*Note: custom default value behavior can be accomplished using the `transform()` property.*

### The 'type' and `dateFormat` properties

Allowed types include:

- 'string'
- 'number'
- 'boolean'
- 'date'

If `type` is set to 'date', the `dateFormat` property must be set to enforce date specific validation. Allowed `dateFormat` values include:

- 'iso8601'
- 'unix' (timestamp)
- custom: e.g. 'MM-DD-YYYY' ([moment.js](http://momentjs.com/docs/#/parsing/string-format/) custom date format in strict mode)

Mongoproxy also supports arrays of values, arrays of objects, and arrays in arrays; however, there is no need to explicitly specify the type. See [supported data structures](#).

### The 'sanitize' and 'denyXSS' properties

The `sanitize` property passes values through Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters)

The `denyXSS` property will fail validation if given a string contains XSS.

These properties, along with `trim`, and `lowercase`, can only be set on Strings.

### The 'minLength' and 'maxLength' properties

Enforces min and max length values on arrays.

- Array of values: checks number of values.
- Array of objects: checks number of objects.
- Array of arrays of values: checks number of nested arrays.
- Array of arrays of object: checks number of nested arrays.

*Note: to validate the number of values in the inner arrays, use the custom `validate` function.*

### The 'validation' property
The custom validation handler accepts one parameter, the field value, and should return either `true` or `false`. The function is executed after the standard validation properties.

- Array of values: passes each value to the validation function.
- Array of objects: passes each object to the validation function.
- Array of arrays of values: passes each inner array to the validation function.
- Array of arrays of objects: passes each inner array to the validation function.

*Note: for arrays containing objects, the `validate` function can be set on each object property.*

### The 'transform' property
The custom transform handler accepts one parameter, the field value, and should return the manupliated value. The function is executed after the standard transformation properties.

The values passed to the `transform` function for each data structure mimic the values passed to the `validation` function.

*Note: for arrays containing objects, the `transform` function can be set on each object property.*

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

#todos
- what to do if inserting/updating and the value is empty? right now we are running the query. probably shouldn't but what to return.
- Custom properties
- multiple databases
