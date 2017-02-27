## Model methods

You can attach methods to each model:

```javascript
var db, schema, result, user;
const mongorules = require('mongorules');
const schema = require('./schema');

mongorules.addModel('local', 'users', {
  schema,
  methods: {
    // Accepts generator functions.
    // `this` == database instance.
    getUserByEmail: function* (email) {
      return yield this.users.findOne({'account.email': email});
    }
  }
});

db = mongorules.getDatabase('local', 'api-development');
user = yield db.users.getByEmail('jay@example.com');
```
