## API

[connect()](#connect)
<br>
[close()](#close)
<br>
[addDatabase()](#addDatabase)
<br>
[setDefaultDb()](#setDefaultDb)
<br>
[addModels()](#addModels)
<br>
[addModel()](#addModel)
<br>
[addGlobalErrorHandler()](#addGlobalErrorHandler)
<br>
[addConnection()](#addConnection)
<br>
[getConnection()](#getConnection)
<br>
[getDatabase()](#getDatabase)
<br>

### .connect()
Connects to mongodb using `MongoClient.connect()` (convenience method).

**Arguments**
- connectionName {String} - connection namespace
- mongoUrl {String}
- mongodb {Object} - require('mongodb')

**Returns**
{promise} Mongodb instance to be passed to the `addDatabase()` method.

---

### .close()
Closes a mongodb connection using `MongoClient.close()` (convenience method).

**Arguments**
- connectionName {String} - connection namespace
- [removeModels] {Boolean}

**Returns**
{promise} The first parameter will contain the Error object if an error occurred, or null otherwise. The second parameter will contain the results from the close method or null if an error occurred.

---

### .addDatabase()

Given a connection namespace and a database name returns a proxied mongodb database instance for querying your database.

**Arguments**
- connectionName {String}
- databaseName {String}

**Returns**
{Object proxy} database instance.

---

### .setDefaultDb()

Registers a default database to allow destructuring of database instance from mongorules. Recommended.

Allows you to do this...

```
const {db} = require('mongorules');

// yield db.users.insert({});
```

**Arguments**
- connectionName {String}
- databaseName {String}

---

### .addModels()

Adds one or more models to a database.

**Arguments**
- connectionName {String}
- databaseName {String}
- models {Object} - collection models.

```javascript
const monogorules = require('mongorules');

monogorules.addModels('local', 'database-name', {
  users: {
    schema: {},
    methods: {},
    onError: (errors, info) => {}
  }
});
```

---

### .addModel()

Adds one model to a database.

**Arguments**
- connectionName {String}
- databaseName {String}
- collectionName {String}
- models {Object} - collection models.

```javascript
const monogorules = require('mongorules');

monogorules.addModels('local', 'database-name', 'users', {
  schema: {},
  methods: {},
  onError: (errors, info) => {}
});
```

---

### .addGlobalErrorHandler()
Adds a global error handler to handle document validation and mongodb errors.

**Arguments**
- handler {Function}
   - errors {Array}
   - info {Object}
     - connectionName {String}
     - databaseName {String}
     - collectionName {String}
     - methodName {String}
   - localHandlerExists {Boolean} - if a model error handler was called first.

```javascript
const monogorules = require('mongorules');

mongorules.addGlobalErrorHandler((errors, info, localHandlerExists) => {
  // e.g. log to database.
});
```

---

### .addConnection()

Not needed to connect normally - called under the hood by `connect()` - but for those looking to connect to mongodb manually, call addConnection, and pass us the connection object.

**Arguments**
- connectionName {String} - connection namespace
- connection {Object}

---

### .getConnection()

Returns a monogdb connection object.

**Arguments**
- connectionName {String} - connection namespace

**Returns**
{Object} connection object.

---

### .getDatabase()

Returns a proxied mongodb database instance.

**Arguments**
- connectionName {String}
- databaseName {String}

**Returns**
{Object proxy} database instance.

---
