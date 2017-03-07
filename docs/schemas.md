## Schemas

Schemas are optional, and are not required for each collection in your database.

### Supported data structures

The following illustrates how you go about creating schemas for different data structures:

*To learn more about the schema properties check out [document validation](https://github.com/iamdevonbutler/mongorules/blob/master/docs/validation.md) and [document transformation](https://github.com/iamdevonbutler/mongorules/blob/master/docs/transformation.md).*

```javascript
const {Types} = require('mongorules');

{
  // schemas for subdocuments are created using the dot notation.
  "account.email": {
    required: true,
    notNull: true,
    type: Types.string,
    minLength: 3,
    lowercase: true,
    trim: true,
    validate: (value) => true,
  },
  "account.name": {
    type: Types.string,
    lowercase: true,
    trim: true
  },
  "created": {
    type: Types.date,
    default: () => new Date(),
  }
}
```

Resolves to a database schema:

```
{
  account: {
    name: 'value',
    email: 'value'
  }
  created: 'value',
}
```
Check out [/tests/fixtures](https://github.com/iamdevonbutler/mongorules/tree/master/tests/fixtures) for examples on how to create schemas.

**Array of values**

```javascript
{
  "friends": {
    type: Types.array(Types.string, Types.number)
  };
}
```

Resolves to:

```
{
  friends: ['value', 11]
}
```

**Array of objects**

```javascript
{  
  "account.friends": {
    required: true,
    minLength: 1,
    type: Types.array(Types.object),
  },
  "account.friends.name": {
    type: Types.string,
  },
  "account.friends.email": {
    type: Types.string,
  },
}
```

Resolves to:

```
{
  account: {
    friends: [{ name: 'value', email: 'value' }]
  }
}
```
