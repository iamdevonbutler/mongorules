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
const {preprocessQuery} = require('./preprocess');
const {DocumentValidationError} = require('./errors');
const {handleErrors} = require('./errors');

module.exports = step1;

/**
  @doc: 1
  If the user provides incorrect params to an operation
  (e.g. missing param `document` for an update), the pushed callback
  may assume that missing params position and our resolve/reject
  callbacks may never be called - the process will hang open w/o
  propogating errors. The mongodb driver usually returns
  promises if a callback is not provided, and we can use it
  to catch errors.
**/

/**
 * @param {String} methodName
 */
function isDatabaseMethod(methodName) {
  if (!methodName) return false;
  return methodName[0] === '$';
}

/**
 * @param {Object} database
 * @param {String} operation
 */
function handleDatabaseMethod(db, operation) {
  var methodName, method;
  methodName = operation.slice(1);
  method = db[methodName];
  if (method) {
    let handler = step3(null, method, methodName, db, null, null, false);
    return new Proxy(() => {}, handler);
  }
  throw new Error(`Database method "${methodName}" does not exist.`);
}

/**
 * @param {String} operation
 * @param {Boolean} validate
 * @param {Object} schema
 */
function shouldPreprocessQuery(operation, validate, schema) {
  var supportedOperation;
  supportedOperation = ['insert', 'update', 'save', 'findAndModify'].indexOf(operation) > -1;
  return supportedOperation ? validate && !!schema : false;
};

/**
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {Object} db - database instance
 * @param {Function} getModel
 * @param {Function} staticFunction - static model function (generatoror regular).
 * @param {Object} info
 */
function step3Static(connectionName, databaseName, db, getModel, staticFunction) {
  return {
    apply(func, that, payload) {
      var handler, ctx;
      handler = step1(connectionName, databaseName, db, getModel);
      ctx = new Proxy(db, handler);
      return co(staticFunction.bind(ctx, ...payload));
    }
  };
}

/**
 * @param {String} collectionName
 * @param {Function} collectionMethod
 * @param {String} operation
 * @param {Object} ctx
 * @param {Object} schema
 * @param {Function} localErrorHandler
 * @param {Function} globalErrorHandler
 */
function step3(collectionName, collectionMethod, operation, ctx, schema, localErrorHandler, validate) {
  return {
    apply(func, that, args) {

      if (validate) {
        let {errors, args: _args} = preprocessQuery(args, schema, operation);
        if (errors) {
          handleErrors(errors, 'preprocess', collectionName, operation, localErrorHandler);
          return new Promise((resolve, reject) => { reject(errors); });
        }
        args = _args;
      }

      return new Promise((resolve, reject) => {
        var result;
        args.push((err, result) => {
          if (err) {
            handleErrors(err, null, collectionName, operation, localErrorHandler, globalErrorHandler);
            reject(err);
          }
          resolve(result)
        });

        result = collectionMethod.apply(ctx, args);

        // @doc: 1
        if (isPromise(result)) {
          result.then(resolve).catch(e => {
            var obj;
            obj = Object.assign({}, e, {
              method: `db.${collectionName}.${operation}()`,
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
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {String} collectionName
 * @param {Object} db - database instance
 * @param {Function} getModel
 * @param {Boolean} [validate]
 */
function step2(connectionName, databaseName, collectionName, db, getModel, validate) {
  return {
    get(obj, operation) {
      var handler, model, schema, modelMethod;
      model = getModel(connectionName, databaseName, collectionName);
      schema = model && model.schema;
      validate = shouldPreprocessQuery(operation, validate, schema);

      if (!model && validate) {
        throw new Error(`Missing model for collection "${collectionName}" (${databaseName})`);
      }

      modelMethod = model && model.methods && model.methods[operation];
      if (modelMethod) {
        handler = step3Static(connectionName, databaseName, db, getModel, modelMethod);
      }
      else {
        let collection = db.collection(collectionName);
        let localErrorHandler = model && model.orError;
        let collectionMethod = collection[operation];
        if (!collectionMethod) {
          throw new Error(`db.${collectionName}.${operation}() - method "${operation}" does not exist.`);
        }
        handler = step3(collectionName, collectionMethod, operation, collection, schema, localErrorHandler, validate);
      }

      return new Proxy(() => {}, handler);
    }
  };
}

/**
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {Object} db - database instance
 * @param {function} getModel
 * @param {Boolean} [validate]
 */
function step1(connectionName, databaseName, db, getModel, validate = true) {
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
        return handleDatabaseMethod(db, property);
      }

      // Is a call on a collection method or static method...
      // e.g. db.users.find().
      // let collectionName = property.
      let handler = step2(connectionName, databaseName, property, db, getModel, validate);
      return new Proxy({}, handler);
    }
  };
};
