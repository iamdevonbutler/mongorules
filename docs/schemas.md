## Schemas

Schemas are optional, and are not required for each collection in your database.

### Supported data structures

The following illustrates how you go about creating schemas for different data structures:

Schemas for subdocuments are created using the dot notation.

```
{
  "account.email": {
    required: true,
    notNull: true,
    type: 'string',
    minLength: 3,
    lowercase: true,
    trim: true,
    validate: function(value) {...}
  },
  "account.name": {
    type: 'string',
    lowercase: true,
    trim: true
  },
  "created": {
    type: 'date',
    dateFormat: 'iso8601',
    default: new Date()
  }
}
```

Resolves to:

```
{
  created: 'value',
  account: {
    name: 'value',
    email: 'value'
  }
}
```
Check out [/tests/fixtures](https://github.com/iamdevonbutler/node-mongorules/tree/master/tests/fixtures) for examples on how to create schemas.

**Array of values**

```
// Note the square brackets.
{
  "friends": [{
    type: 'string'
  }];
}
```

Resolves to:

```
{
  friends: ['value']
}
```

**Array of objects**

```
// Note the square brackets.
{  
  "account.friends": [{
    required: true,
    default: []
  }],
  "account.friends.name": {
    type: 'string'
  },
  "account.friends.email": {
    type: 'string'
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

### Schema properties
*Validation properties*
- `required` {Boolean} default `false`
- `notNull` {Boolean} default `false`
- `default` {Mixed} default `undefined`
- `type` {string|number|boolean|date} default `null` *(array and object types are implicit)*
- `dateFormat` {String} default `null` *(used in conjunction w/ type: 'date')*
- `denyXSS` {Boolean} default `false`
- `minLength` {Number | Array} default `null`
- `maxLength` {Number | Array} default `null`
- `validate` {Function} default `null`
  - *@param {Mixed} value*
  - *@param {Object} schema*
  - *@return {Boolean} - you should return a `Boolean`.*

*Transformation properties*
- `trim` {Boolean} default `false`
- `lowercase` {Boolean} default `false`
- `uppercase` {Boolean} default `false`
- `filterNulls` {Boolean} default `false`
- `sanitize` {Boolean} default `false`
- `transform` {Function} default `null`
  - *@param {Mixed} value*
  - *@param {Object} schema*
  - *@return {Mixed} - you should return the transformed value.*

## Document validation
Document validation will occur on `insert()`, `update()`, `save()`, and `findAndModify()` operations, and enforce the rules declared in your schemas. As w/ mongodb query errors, document validation failures will throw errors if custom error handlers are not provided (see [Error handling](#error-handling)).

### novalidate

In instances where you want to run a query w/o schema validation you may prefix your query w/ the 'novalidate' property:

```
var result = db.novalidate.users.insert({...});
```

### The 'required' and 'notNull' properties

If 'required' is `true`, `undefined` values will fail validation.

If 'notNull' is `true`, `null` values will fail validation.

*An empty string or empty array that is 'required' will pass validation. If this is not the intended behavior, set a minLength value.*

### The 'default' property
If 'required' is `false`, the 'default' property may be set. The default value will take effect during an insert/upsert when a value is `undefined`.

### The 'type' and 'dateFormat' properties

Allowed types include:

- 'string'
- 'number'
- 'boolean'
- 'date'

Type checking will be enforced on each value in an *arrays of values*.

*Mongorules supports types for arrays of values, arrays of objects; however, there is no need to explicitly specify the type - the type is implied from your schema. See [supported data structures](#supported-data-structures).*

#### Date formats

If 'type' is set to 'date', the 'dateFormat' property must be set to enforce date specific validation. Allowed 'dateFormat' values include:

- 'iso8601'
- 'timestamp'
- [Custom moment.js format](http://momentjs.com/docs/#/parsing/string-format/) (in strict mode) - e.g. 'MM-DD-YYYY'

To insert an iso8601 date into your database: use `new Date()` and mongodb will store it as a BSON 'ISODate' type. To insert a timestamp into your database, use `Date.now()` (@todo store as timestamp BSON type).

### The 'denyXSS' property

The 'denyXSS' property will fail validation if given a string containing XSS as identified by Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters) module.

For an *array of values*, each value, if of type `string`, will be evaluated.

### The 'minLength' and 'maxLength' properties

Enforces min and max length values on arrays and strings.

**For arrays:**

If a single value is provided, the number of items in array will be evaluated.

If an array is provided, the first value will evaluate the number of items in the array, and the second value will evaluate the length of each item.

```
{
  fieldName: [{
    minLength: [1, 1]  
  }]
}
```

*Note: if using the array syntax, pass `null` to skip a particular validation*

### The 'validate' property
The custom validation handler accepts two parameters, the field value, and field schema, and should return either `true` or `false`. The function is executed after the standard validation properties.

```
{
  fieldName: [{
    validate:
      function(value, schema) {
        return true;
      }
  }]
}
```

*Note: when processing an array of values/objects, each value/object will be passed to the validate handler.*

## Document transformation

### The 'filterNulls' property
Removes `null` values from arrays, both inner and outer, prior to validation.

### The 'sanitize' property

The 'sanitize' property passes values through Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters) module.

For an *array of values*, each value, if of type `string`, will be evaluated.

### The 'trim', 'lowercase', and 'uppercase', properties
The 'trim', 'lowercase', and 'uppercase' properties accept a Boolean and can only be set on values of type `string`.

For an *array of values*, each value, if of type `string`, will be evaluated.

### The 'transform' property
The custom transform handler accepts two parameters, the field value, and the field schema, and should return the manipulated value. The function is executed after the standard transformation properties.

```
{
  fieldName: [{
    transform:
      function(value, schema) {
        return value;
      }
  }]
}
```

*Note: when processing an array of values/objects, each value/object will be passed to the transform handler.*
