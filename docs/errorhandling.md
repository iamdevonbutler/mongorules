## Error handling
There are three types of errors:
- schema validation errors
- document validation errors
- mongodb errors

Schema validation errors are always thrown to ensure that the schemas you create are up to snuff.

Mongodb errors (errors that occur, for instance, when inserting a document w/ a duplicate \_id field), and document validation errors, are throw by default. You may modify this behavior by creating custom error handlers.

*Note: all document validation errors will prevent a query from executing. To skip validation altogether, despite potential errors, prepend your query with 'novalidate' property.*

*Note: If you are wrapping your mongorules initialization code with [co](https://github.com/tj/co) to allow yieldables, be sure use manually catch and rethrow all errors using the `co` catch method; otherwise, your code will fail w/o any errors logged to the console.*

### Custom error handling
Custom error handling can be established locally to each collection, via the `onError()` property set on each model, and globally using the `addGlobalErrorHandler()` method. If either a local error handler or a global error handler is provided, the default behavior of throwing an error will not occur.

The execution order of custom error handlers begins w/ the local error handler, after which, the global error handler is called. The local error handler and global error handler receive the same arguments w/ the exception of the additional "localHandler" Boolean - passed to the global handler to indicate if a local handler has already been executed. After your handlers executed, if no errors are manually thrown, the promises's reject callback will be executed.

```
/**
 * Adds a global error handler for schema validation and mongodb errors.
 * @param {Function} handler:
 *    @param {String} collectionName.
 *    @param {String} action.
 *    @param {Array} errors.
 * @return `this`.
 */
mongorules.addGlobalErrorHandler((collectionName, action, errors, localHandler) => {
   // log to database
   // throw '';
});
```
