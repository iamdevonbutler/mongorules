'use strict';

require('babel/register');

/**
 * Module dependencies.
 */

const _ = require('lodash');
const debug = require('debug')('mongorules');
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
    keys.forEach((collectionName) => {
      this.addModel(collectionName, models[collectionName]);
    });
    return this;
  },

  /**
   * Add a data model to the _models object.
   * @param {String} collectionName.
   * @param {Object} models - data models.
   * @return `this`
   * @api public.
   * @tests none.
   */
  addModel(collectionName, model) {
    var indexes, promises = [];
    this._models[collectionName] = {
      // _.clone for testing isolation.
      schema: schema._preprocessSchema(_.clone(model.schema)),
      methods: model.methods,
      onError: model.onError || null
    };
    debug('Added model "%s"', collectionName);
    return this;
  },

  /**
   * Get a data model.
   * @param {String} collectionName.
   * @return {Object}
   * @api private.
   * @tests none.
   */
  _getModel(collectionName) {
    if (!_.isEmpty(this._models)) {
      return this._models[collectionName];
    }
    return null;
  },

  /**
   * Get a static method on a data model.
   * @param {String} collectionName.
   * @param {String} methodName.
   * @return {Function}
   * @api private.
   * @tests none.
   */
  _getStaticMethod(collectionName, methodName) {
    var model = this._getModel(collectionName);
    if (model) {
      return model.methodName;
    }
  }

};
