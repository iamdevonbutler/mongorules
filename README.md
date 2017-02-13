# Mongorules (alpha)

[![Build Status](https://travis-ci.org/iamdevonbutler/node-mongorules.svg?branch=master)](https://travis-ci.org/iamdevonbutler/node-mongorules)

A small but fierce wrapper around the native mongodb driver - leveraging schemas - a syntactic mirror of the mongo shell interface.

# Intro

```javascript
const {db} = require('mongorules');

yield db.users.insert({ account: {name: 'jay', friends: ['11', 'will']} });

var will = yield.db.users.findOne({'account.name': 'will'});
var willsFriends = will.account.friends;

var updatePayload = {$addToSet: {'account.name.friends': {$each: willsFriends} }};
yield db.users.update({'account.name'; 'jay'}, updatePayload)


```

Abiding by the the LOTR philosophy (one API to rule them all), mongorules adds a little extra sauce on top of the [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver:

Custom **schemas** enforce consistency to operations:

- `insert()`
- `save()`
- `update()`
- `findAndModify()`

All method calls are wrapped in **promises** and thus become yieldable, keeping your codebase lean.

**Static methods** can be attached to collection models.


## Requirements
- Node >= v6.0.0
- Mongodb >= 2.6


## Getting started

First, install mongorules:

```javascript
npm install --save mongorules
```

Second, init mongodb:

```javascript
var db, mongodb, dbInstance;

mongodb = require('mongodb');
db = require('mongorules');

dbInstance = yield db.connect(process.env.MONGO_URL, mongodb);
db.addDatabase('api-development', dbInstance);
```
*The connect method is a convenience method for `MongoClient.connect` that returns a promise (wrap code in [co](https://github.com/tj/co) to yield). You can init mongodb any way you choose as long as you pass the instance to the `addDatabase()` method.*

Third, add models:

```javascript
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

```javascript
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

Mongorules supports validation for the following mongodb update operators:

- `$inc`
- `$mul`
- `$set`
- `$min`
- `$max`
- `$addToSet`
- `$push`

Upsert operations are supported as well.

## Performance
See performance tests against the native mongodb driver at the [node-mongorules-performance-analysis ](https://github.com/iamdevonbutler/node-mongorules-performance-analysis) repo.


## License
MIT
