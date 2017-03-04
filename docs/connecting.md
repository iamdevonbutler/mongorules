## Connecting

Connecting to mongodb involves invoking the `.connect()` method and passing the connection to the `.addDatabase()` method.

```javascript
const mongorules = require('mongorules');
const mongodb = require('mongodb');

const url = process.env.MONGO_URL;
const connection = yield mongorules.connect('local', url, mongodb);
const db = mongorules.addDatabase('local', 'api-development', connection);
```

### Multiple connections

Mongorules supoorts simultaneous connections to multiple databases and database servers.

You can connect to multiple connections and multiple databases under a single connection.

Multiple connections:
```javascript
const mongorules = require('mongorules');
const mongodb = require('mongodb');

const url = process.env.MONGO_URL;

const connection1 = yield mongorules.connect('local-1', url, mongodb);
const connection2 = yield mongorules.connect('local-2', url, mongodb);
const db1 = mongorules.addDatabase('local-1', 'api-development', connection1);
const db2 = mongorules.addDatabase('local-2', 'api-development', connection2);
```

Multiple databases:
```javascript
const mongorules = require('mongorules');
const mongodb = require('mongodb');

const url = process.env.MONGO_URL;

const connection = yield mongorules.connect('local', url, mongodb);
const db1 = mongorules.addDatabase('local', 'api-development-1', connection);
const db2 = mongorules.addDatabase('local', 'api-development-2', connection);
```

### Connection retrieval
The `.setDefaultDb()` method streamlines retrieval of your database objects.

If you add the following to your database init code:
```javascript
const mongorules = require('mongorules');
mongorules.setDefaultDb(connectionName, databaseName);
```

You will be able to access the api-development via:

```javascript
const {db} = require('mongorules');
```

Which is nicer than the standard method:

```javascript
const mongorules = require('mongorules');
const db = mongorules.getDatbase(connectionName, databaseName);
```
