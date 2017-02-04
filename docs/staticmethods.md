## Static methods

You can attach static methods to each collection object:

```
var db, schema, result, user;
db = require('mongorules');
schema = require('./schema');

db.addModel('users', {
  schema: schema,
  methods: {
    // `this` == mongorules instance.
    // Generators can be passed if using Koa.
    getUserByEmail: function(email) {
      return this.users.findOne({ 'account.email': email });
    }
  }
});

user = yield* db.users.addUser('jay@example.com');
user = yield db.users.getByEmail('jay@example.com');
```
