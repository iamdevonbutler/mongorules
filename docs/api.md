## API
### .connect()
Connects to mongodb using `MongoClient.connect()` (convenience method).

**Arguments**
- mongoUrl {String}
- mongodb {Object} - require('mongodb')

**Returns**
{promise} Mongodb instance to be passed to the `addDatabase()` method.

### .close()
Closes a mongodb connection using `MongoClient.close()` (convenience method).

**Returns**
{promise} The first parameter will contain the Error object if an error occured, or null otherwise. While the second parameter will contain the results from the close method or null if an error occured.


### .addDatabase()

**Arguments**
- databaseName {String}
- mongodbInstance {Object}

### .addModel()

**Arguments**
- collectionName {String}
- model {Object} - collection model.

```
db = require('mongorules');
db.addModel('users', {
  schema: {},
  methods: {},
  onError: function() {...}
});
```
### .addModels()

**Arguments**
- models {Object} - collection models.

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

### .addGlobalErrorHandler()
Adds a global error handler for schema validation and mongodb errors.

**Arguments**
- handler {Function}
   - collectionName {String}
   - action {String} - e.g. 'insert', 'update'...
   - errors {Array}
