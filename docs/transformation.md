## Document transformation

The following properties can be set in your schemas for document transformation purposes:

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


### The 'filterNulls' property
Removes `null` values from arrays, both inner and outer, prior to validation.

### The 'sanitize' property

The 'sanitize' property passes values through Yahoo's [XSS Filters](https://github.com/yahoo/xss-filters) module.

For an *array of values*, each value, if of type `string`, will be evaluated.

### The 'trim', 'lowercase', and 'uppercase', properties
The 'trim', 'lowercase', and 'uppercase' properties accept a Boolean and can only be set on values of type `string`.

For an *array of values*, each value, if of type `string`, will be evaluated.

### The 'transform' property
The custom transform handler accepts two parameters, the field value, and the field schema, and should return the manipulated value.

```javascript
{
  fieldName: {
    transform: (value, schema) => value;
  }
}
```
**Array syntax:**

For array fields: if an array of transform handlers is provided, the first handler will evaluate array itself, and the second handler will evaluate each item in the array.
