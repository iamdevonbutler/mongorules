const co = require('co');
const {isPromise} = require('./utils');
const preprocess = require('./preprocess');

const preprocessWhitelist = ['insert', 'update', 'save', 'findAndModify'];
function isDatabaseMethod(methodName) {
  if (!methodName) return false;
  return !!methodName[0] === '$';
}

function handleDatabaseMethod(database, operation) {
  var methodName;
  methodName = operation.slice(1);
  if (database[methodName]) {
    // return new Proxy
  }
  throw new Error(`Database method "${methodName}" does not exist.`);
}

/**
 * Handle errors using custom callbacks and default behavior.
 * @param {Mixed} err
 * @param {String} type - type of error, e.g. DocumentValidationError
 * @param {String} collectionName
 * @param {String} operation
 * @param {Function} locaHandler - local error handler.
 * @param {Function} globalHandler - global error handler.
 * @api private
 * @tests none
 */
var handleErrors = function(err, type, collectionName, operation, localHandler, globalHandler) {
  debug(`Errors: collection "${collectionName}", operation "${operation}"` , JSON.stringify(err, null, 2));
  if (localHandler) {
    localHandler.onError.call(null, collectionName, operation, err);
  }
  if (globalHandler) {
    globalHandler.call(null, collectionName, operation, err, !!localHandler);
  }
  // Default handler.
  if (!localHandler && !globalHandler) {
    if (type === 'DocumentValidationError') {
      throw new DocumentValidationError(collectionName, operation, err);
    }
    throw new Error(err);
  }
};

var step3Collection = function(collectionName, collectionMethod, operation, ctx, schema, localErrorHandler, validate) {
  return {

    apply(func, that, args) {
      var preprocessOperation;

      preprocessOperation = preprocessWhitelist.indexOf(operation) > -1;
      if (validate && schema && preprocessOperation) {
        let {errors, argumentsList} = preprocess._preprocessQuery(args, schema, operation);
        if (errors) {
          handleErrors(errors, 'DocumentValidationError', collectionName, operation, localErrorHandler);
          return new Promise((resolve, reject) => { reject(errors); });
        }
        args = argumentsList;
      }

      return new Promise((resolve, reject) => {
        var returnValue;
        args.push((err, result) => {
          if (err) reject(err);
          resolve(result)
        });
        returnValue = collectionMethod.apply(ctx, args);
        // @doc: 1
        if (isPromise(returnValue)) {
          returnValue.then(resolve).catch(e => {
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

var step3Static = function(generatorFunc, database, getModel, info) {
  return {
    apply(func, that, payload) {
      var handler, ctx;
      handler = step1(database, getModel, info);
      ctx = new Proxy(database, handler);
      return co(generatorFunc.bind(ctx, ...payload));
    }
  };
}

var step2 = function(database, collectionName, getModel, info, validate) {
  return {
    get(obj, operation) {
      var handler, model, staticMethodCall;
      var {connectionName, databaseName} = info;

      model = getModel(connectionName, databaseName, collectionName);
      if (!model) {
        throw new Error(`Missing model for collection "${collectionName}" (${databaseName})`);
      }

      staticMethodCall = model.methods && model.methods[operation];
      if (staticMethodCall) {
        // @todo add checking to make sure we are given a generator.
        handler = step3Static(staticMethodCall, database, getModel, info);
      }
      else {
        let collection = database.collection(collectionName);
        let collectionMethod = collection[operation];
        if (!collectionMethod) {
          throw new Error(`db.${collectionName}.${operation}() - method "${operation}" does not exist.`);
        }
        handler = step3Collection(collectionName, collectionMethod, operation, collection, model.schema, model.onError, validate);
      }

      return new Proxy(() => {}, handler);
    }
  };
}

/**
 * @param {Object} database
 * @param {function} getModel
 * @param {Object} info
 * @param {Boolean} [validate]
 */
var step1 = function(database, getModel, info, validate = true) {
  return {
    get(obj, input) {
      var model, collectionName;

      // e.g. db.novalidate.users.find().
      if (input === 'novalidate') {
        let handler = step1(database, getModel, info, false);
        return new Proxy({}, handler);
      }

      // e.g. db.$addUser().
      // Database methods have a `$` prefix.
      if (isDatabaseMethod(input)) {
        let operation = input;
        handleDatabaseMethod(database, operation);
      }

      // Is a call on a collection method or static method...
      // e.g. db.users.find().
      collectionName = input;
      let handler = step2(database, collectionName, getModel, info, validate);
      return new Proxy({}, handler);
    }
  };
};


module.exports = step1;


/**
 * Doc: 1
If the user provides incorrect params to an operation
(e.g. missing param `document` for an update), the pushed callback
may assume that missing params position and our resolve/reject
callbacks may never be called - the process will hang open w/o
propogating errors. The mongodb driver usually returns
promises if a callback is not provided, and we can use those
to catch errors.
**/
