## Error handling
There are three types of errors:

- Schema validation errors
- Document validation errors
- Mongodb errors

**Schema validation errors** are *thrown* to ensure the schemas you create are up to snuff.

**Document validation errors** and **mongodb errors**, execute the operation's *promise reject callback*.

*Note: document validation errors will prevent a query from executing. To skip validation altogether, despite potential errors, prepend your query with `novalidate` property.*


### Custom error handling
Custom error handling can be established locally to each collection, via the model's `onError()` property, and globally using the `addGlobalErrorHandler()` method.

If both local and global error handlers exist, the local error handler will be called first. If falsy values are returned from both error handlers, the data from the errors arg, will be passed to the operations's promise reject callback. If both local and global error handlers return truthy value from their callbacks, the local error handler's result will be passed to the operation's reject callback.

*The global error handler receives a third parameter `{Boolean} localHandlerExists` to provide potentially useful information regarding the handling of your programs' errors.*

```javascript
/**
 * @param {Function} handler:
 * @param {Array} error.
 * @param {Object} info.
 *   @param {String} collectionName
 *   @param {String} methodName
 *   @param {String} databaseName
 *   @param {String} connectionName
 * @param {Boolean} localHandlerExists.
 */
mongorules.addGlobalErrorHandler((error, info, localHandlerExists) => {
   // e.g. log to database
});

model.onError((error, info) => {
   // e.g. log to database
});
```
