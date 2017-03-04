## Document validation

The following properties can be set in your schemas for document validation purposes:

- `required` {Boolean} default `false`
- `notNull` {Boolean} default `false`
- `default` {Mixed} default `undefined` *(can pass function)*
- `type` {Use Types object} default `all types allowed`
- `denyXSS` {Boolean} default `false`
- `minLength` {Number|Array} default `null`
- `maxLength` {Number|Array} default `null`
- `validate` {Function|Array} default `null`
  - *@param {Mixed} value*
  - *@param {Object} fieldSchema*
  - *@return {Boolean} - you should return a `Boolean`.*

Document validation will occur on `insert()`, `update()`, `save()`, and `findAndModify()` operations, and enforce the rules declared in your schemas. The following update operators will be validated: `$set`, `$addToSet`, `$push`, `$inc`, `$mul`, `$min`, `$max`.

See [Error handling](https://github.com/iamdevonbutler/mongorules/blob/master/docs/error-handling.md) to learn how to properly handle validation errors.

### novalidate

In instances where you want to run a query w/o schema validation you may prefix your query w/ the 'novalidate' property:

```javascript
var result = db.novalidate.users.insert({...});
```

### The 'required' and 'notNull' properties

If 'required' is `true`, `undefined` values will fail validation.

If 'notNull' is `true`, `null` and `undefined` values will fail validation.

*An empty string or empty array that is 'required' will pass validation. If this is not the intended behavior, set a minLength value.*

### The 'default' property
If 'required' is `false`, the 'default' property may be set. The default value will take effect during an insert/upsert when a value is `undefined`.

If a `function` is provided, it will be evaluated at runtime - useful for setting default dates.

### The 'type' property

To set the type property you must first import the `Types` object from mongorules.

```javascript
const {Types} = require('mongorules');
```

Allowed types include:

- Types.string
- Types.number
- Types.date
- Types.timestamp
- Types.boolean
- Types.null
- Types.objectId
- Types.object
- Types.array
- Types.mixed

You can require multiple types:

```javascript
{
  type: Types.mixed(Types.string, Types.number)
}
```

Type setting for an array of values:

```javascript
{
  type: Types.array(Types.string, Types.number)
}
```

Type setting for an array of objects:
```javascript
{
  type: Types.array(Types.object)
}
```

### The 'denyXSS' property

The 'denyXSS' property will fail validation if given a string containing XSS as identified by Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters) module.

For an *array of values*, each value, if of type `string`, will be evaluated.

### The 'minLength' and 'maxLength' properties

Enforces min and max length values on arrays and strings.

**Array syntax:**

If a single value is provided, the number of items in array will be evaluated.

For array fields: If an array is provided, the first value will evaluate the number of items in the array, and the second value will evaluate the length of each item.

```
{
  arrayField: {
    minLength: [1, 1]  
  }
}
```

*Note: if using the array syntax, pass `null` to skip a particular validation*

### The 'validate' property
The custom validation handler accepts two parameters, the field value, and field schema, and should return either `true` or `false`.

```javascript
{
  fieldName: {
    validate: (value, schema) => true,
  }
}
```

**Array syntax:**

For array fields: if an array of validate handlers is provided, the first handler will evaluate array itself, and the second handler will evaluate each item in the array.
