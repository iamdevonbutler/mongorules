'use strict';

/**
 * Module dependencies.
 */

const Reflect = require('harmony-reflect');
const debug = require('debug')('mongoproxy');
const _ = require('lodash');
const mongoproxy = require('./instance');
const preprocess = require('./preprocess');
const FieldValidationError = require('./errors').FieldValidationError;

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
   * Wraps and returns sync calls to mongodb native api
   * in a promise.
   * @param {Function} fn - sync function to wrap
   * @param {Array} argumentsList
   * @param {Object} ctx - context
   * @api private
   * @tests intergration
   */
  _promisify(fn, argumentsList, ctx) {
    return new Promise((resolve, reject) => {
      var callback = function(err, result) {
        if (err) {
          reject(err);
        }
        resolve(result);
      };
      argumentsList.push(callback);
      // Call mongo native function in the context of db.collection.
      fn.apply(ctx, argumentsList);
    });
  },

  /**
   * Proxied handler for all property gets. Includes both
   * gets on properties and gets on methods prior to method calls.
   * @return {Mixed} - mongoproxy method call, proxied object, proxied function,
   * static method on data model.
   * @api private
   * @tests intergration
   */
  _getHandler: {
    get(target, propertyKey, receiver) {
      var _this = proxy;
      // If we are accessing a property on the mongoproxy object.
      if (mongoproxy[propertyKey]) {
        return Reflect.get(target, propertyKey, receiver);
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
        let model = mongoproxy._getModel(_this.collectionName);
        // If we are accessing a static method on the data model.
        if (model && model.methods && model.methods[propertyKey]) {
          return model.methods[_this.action];
        }
        return new Proxy(function() {}, _this._mongodbApplyHandler);
      }
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
      var state, _this, collection, model, preprocessOperation, globalErrorHandler;
      _this = proxy;

      // Get global error handler.
      globalErrorHandler = mongoproxy._getCurrentErrorHandler();

      // Clear state before validation (it throws).
      state = _this._cloneState();
      _this._clearState();

      // Get data model.
      model = mongoproxy._getModel(state.collectionName);

      // If we are preprocessing a insert, update, or save operation...
      preprocessOperation = ['insert', 'update', 'save'].indexOf(state.action) > -1;
      if (model && model.schema && !state.novalidate && preprocessOperation) {
        let result;

        result = preprocess._preprocessQuery(argumentsList, model, state.collectionName, state.action, globalErrorHandler);

        // If there were errors and the developer choose not to throw them,
        // do not execute the function.
        if (!result) {
          // returning false/null/undefined is not yieldable.
          return {};
        }

        argumentsList = result;
      }

      // Perhaps a developer mistakenly forgot to add/spell a model.
      if (!model) {
        debug('There is not a model for collection "%s". Validation will not occur', state.collectionName);
      }

      // Get mongo native function.
      collection = mongoproxy.getCurrentDatabase().collection(state.collectionName);
      var fn = collection[state.action];

      // Call collection method wrapped in a promise.
      return _this._promisify(fn, argumentsList, collection);
    }
  }

};


module.exports = new Proxy(mongoproxy, proxy._getHandler);
