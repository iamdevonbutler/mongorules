/**
 * @file creates a series of handlers for implementing proxied objects
 * and functions to create a fluent interface (e.g. db.users.find({}))
 * Exports `step1`, intented as a handler to proxy all object property
 * accessor requests (e.g. obj.iWantThisProperty). Depending on the ctx,
 * `step1` returns: proxied calls for mongodb database methods, a proxied accessor
 * to run `novalidate` queries, a proxied accessor to run collection methods (`step2`).
 */

const co = require('co');
const {isPromise} = require('./utils');
const {preprocessMain} = require('./preprocess');
const {DocumentValidationError} = require('./errors');
const {handleErrors} = require('./errors');

module.exports = step1;

/**
 * @doc: 1
 * If the user provides incorrect params to an operation
 * (e.g. missing param `document` for an update), the pushed callback
 * may assume that missing params position and our resolve/reject
 * callbacks may never be called - the process will hang open w/o
 * propogating errors. The mongodb driver usually returns
 * promises if a callback is not provided, and we can use it
 * to catch errors.
 */

/**
 * @param {String} methodName
 * @return {Boolean}
 */
function isDatabaseMethod(methodName) {
  if (!methodName) return false;
  return methodName[0] === '$';
}

/**
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {Object} database
 * @param {String} methodName
 */
function handleDatabaseMethod(connectionName, databaseName, db, methodName, globalErrorHandler) {
  var method;
  methodName = methodName.slice(1); // names are prefixed w/ a `$`.
  method = db[methodName];
  if (method) {
    let handler = step3(connectionName, databaseName, null, methodName, method, db, null, false, null, globalErrorHandler);
    return new Proxy(() => {}, handler);
  }
  throw new Error(`Database method "${methodName}" does not exist.`);
}

/**
 * @param {String} operation
 * @param {Boolean} validate
 * @param {Object} schema
 * @return {Boolean}
 */
function shouldpreprocessOperation(operation, validate, schema) {
  var supportedOperation;
  supportedOperation = ['insert', 'update', 'save', 'findAndModify'].indexOf(operation) > -1;
  return supportedOperation ? validate && !!schema : false;
};

/**
 * Proxies a model method call.
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {Object} db - database instance
 * @param {Function} getModel
 * @param {Function} modelMethod - generator or regular.
 * @param {Function} [globalErrorHandler]
 */
function step3ModelMethod(connectionName, databaseName, db, getModel, modelMethod, globalErrorHandler) {
  return {
    apply(func, that, payload) {
      var handler, ctx;
      handler = step1(connectionName, databaseName, db, getModel);
      ctx = new Proxy(db, handler);
      return co(modelMethod.bind(ctx, ...payload)).catch(globalErrorHandler);
    }
  };
}

/**
 * Proxies a collection method call.
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {String} collectionName
 * @param {String} methodName.
 * @param {Function} method - the method being called.
 * @param {Object} ctx - method ctx.
 * @param {Object} schema
 * @param {Boolean} validate
 * @param {Function} localErrorHandler
 * @param {Function} globalErrorHandler
 */
function step3(connectionName, databaseName, collectionName, methodName, method, ctx, schema, validate, localErrorHandler, globalErrorHandler) {
  return {
    apply(func, that, args) {
      if (validate) {
        let {errors, args: args2} = preprocessMain(connectionName, databaseName, collectionName, methodName,  args, schema);
        if (errors) {
          errors = handleErrors(errors, 'preprocess', localErrorHandler, globalErrorHandler, collectionName, methodName, databaseName, connectionName);
          return new Promise((resolve, reject) => { reject(errors); });
        }
        args = args2;
      }

      return new Promise((resolve, reject) => {
        var result;
        args.push((error, result) => {
          if (error) {
            error = handleErrors(error, null, localErrorHandler, globalErrorHandler, collectionName, methodName, databaseName, connectionName);
            reject(error);
          }
          resolve(result)
        });

        result = method.apply(ctx, args);

        // @doc: 1
        if (isPromise(result)) {
          result.then(resolve).catch(e => {
            var obj;
            obj = Object.assign({}, e, {
              method: `db.${collectionName}.${methodName}()`,
              stack: e.stack.split('\n').map(line => line.trim()),
            });
            reject(obj);
          });

        }
      });
    },
  };
}

/**
 * Proxied get handler for operations on collections.
 * e.g. db.collectionName.operation.
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {String} collectionName
 * @param {Object} db - database instance
 * @param {Function} getModel
 * @param {Boolean} [validate]
 * @param {Function} [globalErrorHandler]
 * @return {Proxied Function}
 */
function step2(connectionName, databaseName, collectionName, db, getModel, validate, globalErrorHandler) {
  return {
    get(obj, operation) {
      var handler, model, schema, modelMethod;
      model = getModel(connectionName, databaseName, collectionName);
      schema = model && model.schema;

      validate = shouldpreprocessOperation(operation, validate, schema);

      modelMethod = model && model.methods && model.methods[operation];
      if (modelMethod) {
        handler = step3ModelMethod(connectionName, databaseName, db, getModel, modelMethod, globalErrorHandler);
      }
      else {
        let collection = db.collection(collectionName);
        let localErrorHandler = model && model.onError;
        let collectionMethod = collection[operation];
        if (!collectionMethod) {
          throw new Error(`db.${collectionName}.${operation}() - method "${operation}" does not exist.`);
        }
        handler = step3(connectionName, databaseName, collectionName, operation, collectionMethod, collection, schema, validate, localErrorHandler, globalErrorHandler);
      }

      return new Proxy(() => {}, handler);
    }
  };
}

/**
 * Proxied get handler for novalidate/database methods/collection method/ getters.
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {Object} db - database instance
 * @param {function} getModel
 * @param {Boolean} [validate]
 * @param {Function} [globalErrorHandler]
 * @return {Proxied Object}
 */
function step1(connectionName, databaseName, db, getModel, validate = true, globalErrorHandler) {
  return {
    get(obj, property) {
      // e.g. db.novalidate.users.find().
      if (property === 'novalidate') {
        let handler = step1(connectionName, databaseName, db, getModel, false);
        return new Proxy({}, handler);
      }

      // Database methods are prefixed w/ a `$`.
      // e.g. db.$eval().
      if (isDatabaseMethod(property)) {
        // operation = property.
        return handleDatabaseMethod(connectionName, databaseName, db, property, globalErrorHandler.handler);
      }

      // Is a call on a collection method or model method...
      // e.g. db.users.find().
      // let collectionName = property.
      let handler = step2(connectionName, databaseName, property /*collectionName*/, db, getModel, validate, globalErrorHandler.handler);
      return new Proxy({}, handler);
    }
  };
};
