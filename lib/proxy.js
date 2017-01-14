const {isPromise} = require('./utils');

var step3 = function(collectionName, operation, method, collection) {
  return {

    apply(func, that, payload) {
      return new Promise((resolve, reject) => {
        var returnValue;
        payload.push((err, result) => {
          if (err) reject(err);
          resolve(result)
        });
        returnValue = method.apply(collection, payload);
        // If the user provides incorrect params to an operation
        // (e.g. missing param `document` for an update), the pushed callback
        // may assume that missing params position and our resolve/reject
        // callbacks may never be called - the process will hang open w/o
        // propogating errors. The mongodb driver usually returns
        // promises if a callback is not provided, and we can use those
        // to catch errors.
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

var step2 = function(collectionName, collection) {
  return {
    get(obj, operation, receiver) {
      var method;
      method = collection[operation];
      return new Proxy(() => {}, step3(collectionName, operation, method, collection));
    }
  };
}

module.exports = {

  get(database, collectionName, receiver) {
    var collection;
    collection = database.collection(collectionName);
    return new Proxy({}, step2(collectionName, collection));
    // Can get novalidate.
    // Can get collectionName
  },

};
