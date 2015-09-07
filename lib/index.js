'use strict';

/**
 * Module dependencies.
 */

const Reflect = require('harmony-reflect');
const debug = require('debug')('mongoproxy');
const _ = require('lodash');
const mongoproxy = require('./instance');
const mongoschema = require('./schema');
const FieldValidationError = require('./errors').FieldValidationError;

var proxy = {

  action: '',
  collectionName: '',
  novalidate: false,

  /**
   * Clear state after mongo method call for future calls.
   * @api private
   */
  _clearState() {
    this.action = this.collectionName = '';
    return this;
  },

  /**
   * Clone state before validation which might throw.
   * @api private
   */
  _cloneState() {
    return {
      action: this.action,
      collectionName: this.collectionName,
      novalidate: this.novalidate,
    };
  },

  /**
   * Validate data against schema for insert/update/save calls.
   * Transform data if schema mandates.
   * @param {Array} argumentsList
   * @param {Object} model
   * @param {String} collectionName
   * @param {String} action
   * @return {Array|throw Error} - potentially transformed arguments for method call.
   * @api private
   */
  _preprocessCall(argumentsList, model, collectionName, action) {
    var result, globalErrorHandler;
    result = mongoschema._applySchema(action, argumentsList, model.schema);
    if (result.errors) {
      globalErrorHandler = mongoproxy._getCurrentErrorHandler();
      if (model.onError) {
        model.onError.call(null, collectionName, action, result.errors);
      }
      else if (globalErrorHandler) {
        globalErrorHandler.call(mongoproxy, collectionName, action, result.errors);
      }
      else {
        throw new FieldValidationError(collectionName, action, result.errors);
      }
    }
    return result.errors ? false : result.argumentsList;
  },

  /**
   * Proxied handler for all property gets. Includes both
   * gets on properties and gets on methods prior to method calls.
   * @return {Mixed} - mongoproxy method call, proxied object, proxied function,
   * static method on data model.
   * @api private
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
        return new Proxy(function() {}, _this._mongodbCallHandler);
      }
    }
  },

  /**
   * Proxied handler for all method calls on mongo native methods.
   * @return {Promise|Error} - promise to be yielded or error
   * if schema validation fails.
   * @api private
   */
  _mongodbCallHandler: {
    apply(target, thisArg, argumentsList) {

      var state, _this, collection, model;
      _this = proxy;

      // Clear state before validation (it throws).
      state = _this._cloneState();
      _this._clearState();

      // Get data model.
      model = mongoproxy._getModel(state.collectionName);
      if (model && !state.novalidate) {
        argumentsList = _this._preprocessCall(argumentsList, model, state.collectionName, state.action);
        if (argumentsList === false) {
          // returning false/null/undefined is not yieldable.
          return {};
        }
      }

      // Perhaps a developer mistakenly forgot to add/spell a model.
      if (!model) {
        debug('There is not a model for collection "%s". Validation will not occur', state.collectionName);
      }

      // Get mongo native function.
      collection = mongoproxy.getCurrentDatabase().collection(state.collectionName);
      var fn = collection[state.action];

      // Return promise.
      return new Promise((resolve, reject) => {
        var callback = function(err, result) {
          if (err) {
            reject(err);
          }
          resolve(result);
        };
        argumentsList.push(callback);
        // Call mongo native function in the context
        // of the db.collection result.
        fn.apply(collection, argumentsList);
      });
    }
  },

};


module.exports = new Proxy(mongoproxy, proxy._getHandler);