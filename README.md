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

}


```

## Schemas
A schema can validate and transform data for `insert`, `update`, and `save` operations.

Schemas are optional, and are not required for each collection.

### Supported data structures

Use the dot notation to delineate the collection name from the field names.

e.g. "users.account.name" will query the name field, nested inside the account object, inside the users collection.

- simple values

```
"users.name": { type: 'string', required: true };

```

- nested values

```
"users.account.name": { type: 'string',  required: true },
"users.account.email": { type: 'string',  required: true  }

```



- arrays of values

```
// Note square brackets.
"users.friends": [{ type: 'string' }];

```

- arrays of objects

```
// Note property type:'object' and square brackets.
"users.account.friends": [{ type: 'object', required: true, default: {} }];
"users.account.friends.name": { type: 'string' };
"users.account.friends.email": { type: 'string' };

```

- arrays of arrays of values

```
// Note the double square brackets.
"users.friends": [[{ type: 'string', required: true, default: [[]] }]];

```

- arrays of arrays of objects

```
// Note property type: 'object' and double square brackets.
"users.friends": [[{ required: true, default: [[{}]] }]];
"users.friends.name": { type: 'string' };

```

### Schema properties
- `required` (Boolean)
- `default` (String|Number|Object|Boolean|Array)
- `type` (String|Number|Boolean|Object - if inside array)
- `trim` (Boolean)
- `lowercase` (Boolean)
- `denyXSS` (Boolean)
- `sanitize` (Boolean)
- `validate` (Function)
- `transform` (Function)
- `dateFormat` (String - used in conjunction w/ type: 'date')

#### The 'required' property
- If required is `true`, `null` and `undefined` values will fail validation.
- If required is `true`, an array of values must have a length > 1.
- If required is `true`, an array of objects must have a length > 1.
- If required is `true`, an array of arrays of values must have a outer array with length > 1 and an inner array w/ a length > 1.
- If required is `true`, an array of arrays of objects must have a outer array with length > 1 and an inner array w/ a length > 1.

#### The 'default' property
If `required` is false, the `default` property may be set.

For arrays, the defaults are set on the outermost array. e.g. a default value for an array of values can be '[]' or '['value']'.

Note: custom default value behavior can be accomplished using the `transform()` property.

#### The 'type' and `dateFormat` properties

Allowed types include:

- 'string'
- 'number'
- 'boolean'
- 'date'

If `type` is set to 'date', the `dateFormat` property must be set to enforce date specific validation. Allowed `dateFormat` values include:

- 'iso8601'
- 'unix' (timestamp)
- custom: e.g. 'MM-DD-YYYY' ([moment.js](http://momentjs.com/docs/#/parsing/string-format/) custom date format in strict mode)


#### The 'sanitize' and 'denyXSS' properties

The 'sanitize' property passes values through Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters)

The 'denyXSS' property will fail validation if given a string contains XSS.

#### The 'validation' property
Custom validation handler to return `true` or `false`.

Accepts one param, the field value. For arrays of values, arrays of objects, arrays of arrays of values, and arrays of arrays of objects, the passed param will be the full array, not the individual values.

Executed after other validation.

#### The 'transform' property
Custom transform handler to return the transformed value.

Accepts one param, the field value. For arrays of values, arrays of objects, arrays of arrays of values, and arrays of arrays of objects, the passed param will be the full array, not the individual values.

Executed after other transformations.


### novalidate

In instances where you want to run a query w/o schema validation you may prefix your query w/ the `novalidate` property:

```
var result = db.users.novalidate.insert({});

```

## Schema Examples
### Normal schema
### Nested schema
### Mixed schema
### Array of arrays schema
### Array of objects schema

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
  // log
  // ...
}

```

## Phase II
- add custom schema properties

#todos
- what to do if inserting/updating and the value is empty? right now we are running the query. probably shouldn't but what to return.
- Custom properties
