'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const debug = require('debug')('mongorules');
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
   * Connects to mongodb.
   * @param {String} mongoUrl - mongodb database url.
   * @param {Object} mongodb
   * @return {Promise} yieldable, resolves a mongodb
   * database instance.
   * @api public.
   * @tests none.
   */
  connect(mongoUrl, mongodb) {
    return new Promise((resolve, reject) => {
      mongodb.MongoClient.connect(mongoUrl, (err, db) => {
        if (err) {
          debug('Error connecting to mongo');
          reject(err);
        }
        debug('Connected correctly to mongo');
        resolve(db);
      });
    });
  },

  /**
   * Adds a mongodb database instance to mongorules.
   * @param {String} databaseName.
   * @param {Object} mongodbInstance.
   * @return `this`
   * @api public.
   * @tests none.
   */
  addDatabase(databaseName, mongodbInstance) {
    var db = mongodbInstance.db(databaseName);
    this._db = db;
    this._dbName = databaseName;
    return this;
  },

  /**
   * Adds a global error handler for schema validation and mongodb errors.
   * @param {Function} handler:
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
   * @return {Function}
   * @api private.
   * @tests none.
   */
  _getGlobalErrorHandler() {
    return this._globalErrorHandler;
  },

  /**
   * Retrieves a database instance.
   * @return {Object} current database instance.
   * @api private.
   * @tests none.
   */
  _getDatabase() {
    return this._db;
  },

  /**
   * Adds a data models to the _models object.
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
      return model[methodName];
    }
    return null;
  }

};
