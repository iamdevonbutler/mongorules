'use strict';

/**
 * Module dependencies.
 */
const debug = require('debug')('mongorules');
const _ = require('lodash');
const mongorules = require('./instance');
const preprocess = require('./preprocess');
const DocumentValidationError = require('./errors').DocumentValidationError;

var proxy = {

  action: '',
  collectionName: '',
  novalidate: false,

  /**
   * Clear state after mongo method call for future calls.
   * @api private
   * @tests intergration
   */
  _clearState() {
    this.action = this.collectionName = '';
    this.novalidate = false;
    return this;
  },

  /**
   * Clone state before validation which might throw.
   * @api private
   * @tests intergration
   */
  _cloneState() {
    return {
      action: this.action,
      collectionName: this.collectionName,
      novalidate: this.novalidate,
    };
  },

  /**
   * Handle errors using custom callbacks and default behavior.
   * @param {Mixed} err
   * @param {String} type - type of error, e.g. DocumentValidationError
   * @param {String} collectionName
   * @param {String} action
   * @param {Function} locaHandler - local error handler.
   * @param {Function} globalHandler - global error handler.
   * @api private
   * @tests none
   */
  _handleErrors(err, type, collectionName, action, localHandler, globalHandler) {
    debug(`Errors: collection "${collectionName}", action "${action}"` , JSON.stringify(err, null, 2));
    if (localHandler) {
      localHandler.onError.call(null, collectionName, action, err);
    }
    if (globalHandler) {
      globalHandler.call(null, collectionName, action, err, !!localHandler);
    }
    // Default handler.
    if (!localHandler && !globalHandler) {
      if (type === 'DocumentValidationError') {
        throw new DocumentValidationError(collectionName, action, err);
      }
      throw new Error(err);
    }
  },

  /**
   * Proxied handler for all method calls on mongo native methods.
   * @return {Promise|Error} - promise to be yielded or error
   * if schema validation fails.
   * @api private
   * @tests intergration
   */
  _mongodbApplyHandler: {
    apply(target, thisArgument, argumentsList) {
      var state, _this, collection, model, preprocessOperation,
        globalErrorHandler, localErrorHandler;

      _this = proxy;

      // Clear state before validation (it throws).
      state = _this._cloneState();
      _this._clearState();

      // Get data model.
      model = mongorules._getModel(state.collectionName);

      // Perhaps a developer mistakenly forgot to add/spell a model.
      if (!model) {
        debug('There is not a model for collection "%s". Validation will not occur', state.collectionName);
      }

      // Get global error handler.
      globalErrorHandler = mongorules._getGlobalErrorHandler();
      localErrorHandler = model ? model.onError : null;

      // If we are preprocessing a insert, update, save, or findAndModify operation...
      preprocessOperation = ['insert', 'update', 'save', 'findAndModify'].indexOf(state.action) > -1;
      if (model && model.schema && !state.novalidate && preprocessOperation) {
        let result;
        result = preprocess._preprocessQuery(argumentsList, model, state.action);
        // Handle errors.
        if (result.errors) {
          _this._handleErrors(result.errors, 'DocumentValidationError', state.collectionName, state.action, localErrorHandler, globalErrorHandler);
          return new Promise((resolve, reject) => { reject(result.errors); });
        }
        argumentsList = result.argumentsList;
      }

      // Get mongo native function.
      collection = mongorules._getDatabase().collection(state.collectionName);
      var fn = collection[state.action];
      // Call collection method wrapped in a promise.
      return new Promise((resolve, reject) => {
        // Add callback to argumentList.
        argumentsList.push((err, result) => {
          if (err) {
            _this._handleErrors(err, 'MongoError', state.collectionName, state.action, localErrorHandler, globalErrorHandler);
            reject(err);
          }
          resolve(result);
        });
        // Call mongo native function in the context of db.collection.
        fn.apply(collection, argumentsList);
      });

    }
  },

  /**
   * Proxied handler for all property gets. Includes both
   * gets on properties and gets on methods prior to method calls.
   * @return {Mixed} - mongorules method call, proxied object, proxied function,
   * static method on data model.
   * @api private
   * @tests intergration
   */
  _getHandler: {
    get(target, propertyKey, receiver) {
      var _this = proxy;
      // If we are accessing a property on the mongorules object.
      if (mongorules[propertyKey]) {
        return mongorules[propertyKey];
      }
      // If we are getting a collection instance.
      // e.g. db.users will get the users collection.
      if (!_this.collectionName) {
        _this.collectionName = propertyKey;
        // Proxy next method call.
        return new Proxy({}, _this._getHandler);
      }
      else if (propertyKey === 'novalidate') {
        _this.novalidate = true;
        return new Proxy({}, _this._getHandler);
      }
      // If we have a collection instance, the user is calling eiher
      // a mongo query method or static model method..
      else {
        _this.action = propertyKey;
        let model = mongorules._getModel(_this.collectionName);
        // If we are accessing a static method on the data model.
        if (model && model.methods && model.methods[propertyKey]) {
          let state, fn, ctx;
          state = _this._cloneState();
          _this._clearState();
          ctx = new Proxy(mongorules, proxy._getHandler);
          fn = model.methods[state.action].bind(ctx);
          return fn;
        }
        return new Proxy(function() {}, _this._mongodbApplyHandler);
      }
    }
  }

};


module.exports = new Proxy(mongorules, proxy._getHandler);
