const co = require('co');
const {isPromise} = require('./utils');
// @todo when we add schema validation, make sure things work w/o providing a schema.
// @todo dont pass database in as target, just use closure.
function isDatabaseMethod(methodName) {
  if (!methodName) return false;
  return !!methodName[0] === '$';
}

function handleDatabaseMethod(input, database) {
  var methodName;
  methodName = input.slice(1);
  if (database[methodName]) {
    // return new Proxy
  }
  throw new Error(`Database method "${methodName}" does not exist.`);
}

function handleNoValidate() {
  console.log('handle novalidate');
}

var handleCollectionMethodCall = function(collectionName, operation, method, ctx) {
  return {

    apply(func, that, payload) {
      return new Promise((resolve, reject) => {
        var returnValue;
        payload.push((err, result) => {
          if (err) reject(err);
          resolve(result)
        });
        returnValue = method.apply(ctx, payload);
        // @doc: 1
        if (isPromise(returnValue)) {
          returnValue.then(resolve).catch(e => {
            var obj;
            obj = Object.assign({}, e, {
              method: `${collectionName}.${operation}()`,
              stack: e.stack.split('\n').map(line => line.trim()),
            });
            reject(obj);
          });
        }
      });
    },

  };
}

var handleStaticMethodCall = function(generatorFunc, ctx, connectionName, databaseName, getModel, database) {
  return {
    apply(func, that, payload) {
      var hander;
      handler = step1(connectionName, databaseName, getModel);
      ctx = new Proxy(database, handler);
      return co(generatorFunc.bind(ctx, ...payload));
    }
  };
}

var step2 = function(database, collectionName, collection, model, connectionName, databaseName, getModel) {
  return {
    get(obj, operation) {
      var method, handler;

      // If the user is calling a static method...
      if (model.methods && model.methods[operation]) {
        method = model.methods[operation];
        handler = handleStaticMethodCall(method, database, connectionName, databaseName, getModel, database);
        return new Proxy(() => {}, handler);
      }

      // User is calling a collection method...
      method = collection[operation];
      if (!method) {
        throw new Error(`db.${collectionName}.${operation}() - method "${operation}" does not exist.`);
      }
      handler = handleCollectionMethodCall(collectionName, operation, method, collection);
      return new Proxy(() => {}, handler);
    }
  };
}

var step1 = function(connectionName, databaseName, getModel) {
  return {
    // novalidate
    // collectionName -> call a: collection method || static
    // databseMethod
    get(database, input) {
      var model, collectionName;

      // e.g. db.novalidate.users.find()
      if (input === 'novalidate') {
        handleNoValidate();
      }

      // e.g. db.$addUser()
      // Database methods have a `$` prefix.
      if (isDatabaseMethod(input)) {
        handleDatabaseMethod(input, database);
      }

      // e.g. db.users.find()
      collectionName = input;
      model = getModel(connectionName, databaseName, collectionName);
      if (model) {
        let collection = database.collection(collectionName);
        let handler = step2(database, collectionName, collection, model, connectionName, databaseName, getModel);
        return new Proxy({}, handler);
      }
      else {
        throw new Error(`db.${collectionName} - model for collection "${collectionName}" does not exist (${databaseName}).`);
      }

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
