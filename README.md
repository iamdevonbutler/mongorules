# Mongorules (alpha)

[![Build Status](https://travis-ci.org/iamdevonbutler/mongorules.svg?branch=master)](https://travis-ci.org/iamdevonbutler/mongorules)

A small but fierce wrapper around the native mongodb driver - leveraging schemas - a syntactic mirror of the mongo shell interface.

# Intro

Abiding by the the LOTR philosophy (one API to rule them all), mongorules adds a little extra sauce on top of the [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver:

**Schemas** enforce consistency to operations:

- `insert()`
- `update()`
- `save()`
- `findAndModify()`

**Transforms** easily modify the payload.

**Promises** wrap all mongodb native methods and thus become yieldable.

**Model methods** can be attached to collection models.


## Requirements
- Node >= v6.0.0
- Mongodb >= 2.6


## Getting started

First, install mongorules and mongodb:

```javascript
npm install --save mongorules mongodb
```

Second, init mongodb:

```javascript

const mongorules = require('mongorules');
const mongodb = require('mongodb');
const url = process.env.MONGO_URL;

const connection = yield mongorules.connect('local', url, mongodb);
const db = mongorules.addDatabase('local', 'api-development', connection);
```

Third, add models:

```javascript
const mongorules = require('mongorules');
const schema = require('./schemas/users.js');
const methods = require('./methods/users.js');

mongorules.addModels('local', 'api-development', {
  users: {
    schema,
    methods,
    onError: function(errors, info) {}
  }
});
```
Add default db (optional).

```javascript
const mongorules = require('mongorules');
mongorules.setDefaultDb('local', 'api-development');
```

Now, write queries:

```javascript
var result, users;
const {db} = require('mongorules'); // This works because we setDefaultDb().

result = yield db.users.insert({ name: 'jay' });
result = yield db.users.find({ name: 'jay' });
users = yield result.toArray();  
```

If we did not call `setDefaultDb()` we would retrieve the db instance via:

```javascript
const mongorules = require('mongorules');
const db = mongorules.getDatabase('local', 'api-development');
// .addDatabase() returns a db instance as well.

// db.users.insert({...})

```



## Supported operations

All mongodb native operations are supported and are wrapped in promises.

The following operations will enforce schema validation:

- `insert()`
- `update()`
- `save()`
- `findAndModify()`

### Update operations

Mongorules supports validation for the following mongodb update operators:

- `$inc`
- `$mul`
- `$set`
- `$min`
- `$max`
- `$addToSet`
- `$push`

Upsert operations are supported as well (validated as an insert).


## Docs

- [API](https://github.com/iamdevonbutler/mongorules/blob/master/docs/api.md)
- [Schemas](https://github.com/iamdevonbutler/mongorules/blob/master/docs/schemas.md)
- [Document Transformation](https://github.com/iamdevonbutler/mongorules/blob/master/docs/transformation.md)
- [Document Validation](https://github.com/iamdevonbutler/mongorules/blob/master/docs/validation.md)
- [Model methods](https://github.com/iamdevonbutler/mongorules/blob/master/docs/model-methods.md)
- [Error handling](https://github.com/iamdevonbutler/mongorules/blob/master/docs/error-handling.md)
- [Misc](https://github.com/iamdevonbutler/mongorules/blob/master/docs/misc.md)


## Performance
See performance tests against the native mongodb driver and mongoose at the [mongorules-performance-analysis ](https://github.com/iamdevonbutler/mongorules-performance-analysis) repo.


## License
MIT
