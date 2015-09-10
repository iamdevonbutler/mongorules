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

  // Mongo database instances.
  _dbs: {},

  // Mongo current database.
  _db: {},
  _dbName: '',

  // Data models.
  _models: {},

  // Error handlers.
  _errorHandlers: {},

  /**
   * Init database instance.
   * @param {String} mongoUrl
   * @return mongodb db instance.
   * @api public.
   */
  initDatabase(MongoClient, mongoUrl) {
    return initDb(MongoClient, mongoUrl);
  },

  /**
   * Add mongo database instance.
   * @param {String} databaseName.
   * @param {mongodb instance} mongoInstance.
   * @api public.
   */
  addDatabase(databaseName, mongoInstance) {
    var db = mongoInstance.db(databaseName);
    this._dbs[databaseName] = db;
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
   */
  addErrorHandler(databaseName, handler) {
    this._errorHandlers[databaseName] = handler;
    return this;
  },

  /**
   * Add a error handler for schema validation errors per database.
   * @return {Function}.
   * @api private.
   */
  _getCurrentErrorHandler() {
    return this._errorHandlers[this._dbName];
  },

  /**
   * @return current database instance.
   * @api public.
   */
  getCurrentDatabase() {
    return this._db;
  },

  /**
   * Use a different database instance.
   * @param {String} databaseName.
   * @return `this`
   * @api public.
   */
  use(databaseName) {
    var db = this._dbs[databaseName];
    if (db) {
      this._db = db;
      this._dbName = databaseName;
      return this;
    }
    throw new Error('mongoproxy - database "'+databaseName+'" not found.');
  },

  /**
   * Add a data models to the _models object.
   * @param {String} databaseName.
   * @param {Object} models - { schema: {}, methods: {}, onError: function() {} }.
   * @return `this`
   * @api public.
   */
  addModels(databaseName, models) {
    this._models[databaseName] = {};
    var keys = Object.keys(models);
    keys.forEach((modelName) => {
      this._addModel(databaseName, modelName, models[modelName]);
    });
    return this;
  },

  /**
   * Add a data model to the _models object.
   * @param {String} databaseName.
   * @param {String} modelName.
   * @param {Object} models - data models.
   * @return `this`
   * @api public.
   */
  _addModel(databaseName, modelName, model) {
    this._models[databaseName][modelName] = {
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
   */
  _getModel(modelName) {
    if (!_.isEmpty(this._models)) {
      return this._models[this._dbName][modelName];
    }
    return null;
  },

  /**
   * Get a static method on a data model.
   * @param {String} modelName.
   * @param {String} methodName.
   * @return {Function}
   * @api private.
   */
  _getStaticMethod(modelName, methodName) {
    var model = this._getModel(modelName);
    if (model) {
      return model.methodName;
    }
  }

};
