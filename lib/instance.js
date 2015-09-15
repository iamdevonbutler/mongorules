'use strict';

require('babel/register');

/**
 * Module dependencies.
 */

const _ = require('lodash');
const debug = require('debug')('mongoproxy');
const initDb = require('./init');
const schema = require('./schema');

module.exports = {

  // Mongo current database.
  _db: {},
  _dbName: '',

  // Data models.
  _models: {},

  // Error handler.
  _globalErrorHandler: null,

  /**
   * Init database instance.
   * @param {String} mongoUrl
   * @return mongodb db instance.
   * @api public.
   * @tests none.
   */
  initDatabase(MongoClient, mongoUrl) {
    return initDb(MongoClient, mongoUrl);
  },

  /**
   * Add mongo database instance.
   * @param {String} databaseName.
   * @param {mongodb instance} mongoInstance.
   * @api public.
   * @tests none.
   */
  addDatabase(databaseName, mongoInstance) {
    var db = mongoInstance.db(databaseName);
    this._db = db;
    this._dbName = databaseName;
    return this;
  },

  /**
   * Add a error handler for schema validation errors per database.
   * @param {String} databaseName.
   * @param {Function} handler -
   *    @param {String} collectionName.
   *    @param {String} action.
   *    @param {Array} errors.
   * @return `this`.
   * @api public.
   * @tests none.
   */
  addGlobalErrorHandler(handler) {
    this._globalErrorHandler = handler;
    return this;
  },

  /**
   * Add a error handler for schema validation errors per database.
   * @return {Function}.
   * @api private.
   * @tests none.
   */
  _getGlobalErrorHandler() {
    return this._globalErrorHandler;
  },

  /**
   * @return current database instance.
   * @api public.
   * @tests none.
   */
  getCurrentDatabase() {
    return this._db;
  },

  /**
   * Add a data models to the _models object.
   * @param {Object} models - { collectionName: { schema: {}, methods: {}, onError: function() {} } }
   * @return `this`
   * @api public.
   * @tests none.
   */
  addModels(models) {
    var keys = Object.keys(models);
    keys.forEach((modelName) => {
      this.addModel(modelName, models[modelName]);
    });
    return this;
  },

  /**
   * Add a data model to the _models object.
   * @param {String} modelName.
   * @param {Object} models - data models.
   * @return `this`
   * @api public.
   * @tests none.
   */
  addModel(modelName, model) {
    this._models[modelName] = {
      schema: schema._normalizeSchema(model.schema),
      methods: model.methods,
      onError: model.onError || null,
    };
    debug('Added model "%s"', modelName)
    return this;
  },

  /**
   * Get a data model.
   * @param {String} modelName.
   * @return {Object}
   * @api private.
   * @tests none.
   */
  _getModel(modelName) {
    if (!_.isEmpty(this._models)) {
      return this._models[modelName];
    }
    return null;
  },

  /**
   * Get a static method on a data model.
   * @param {String} modelName.
   * @param {String} methodName.
   * @return {Function}
   * @api private.
   * @tests none.
   */
  _getStaticMethod(modelName, methodName) {
    var model = this._getModel(modelName);
    if (model) {
      return model.methodName;
    }
  }

};
