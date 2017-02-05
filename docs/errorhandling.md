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

If both local and global error handlers exist, the local error handler will be called in place of the global error handler. The global error handler, if present, will be passed to the local error handler as a function parameter, and it may be called from w/i the local handler.

By default, the original error will be passed to the operation's promise reject callback. To modify this behavior, the return value from your local/global error handlers will replace the original error should the value be truthy.


```
/**
 * @param {Function} handler:
 * @param {Mixed} error.
 * @param {Object} info.
 *   @param {String} collectionName
 *   @param {String} methodName
 *   @param {String} databaseName
 *   @param {String} connectionName
 *  @param {Function} globalErrorHandler
 */
model.onError((error, info, globalErrorHandler) => {
   // e.g. log to database
   // globalErrorHandler(error, info);
});

mongorules.addGlobalErrorHandler((error, info) => {
   // e.g. log to database
});
```
