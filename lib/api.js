/**
 * @file function dock and state container for mongodb connections,
 * database instances, and models. Private method/vars have underscore
 * prefix.
 */

const debug = require('debug')('mongorules');
const proxyHandler = require('./proxy');
const schema = require('./schema');

class Api {

  constructor() {
    /**
     * connectionName: connection,
     */
    this._connections = {};

    /**
     * connectionName: {
     *   databaseName: database,
     */
    this._databases = {};

    /**
     * connectionName: {
     *   databaseName: {
     *     modelName: model
     */
    this._models = {};

    // Error handler.
    this._globalErrorHandler = null;
  }

  /**
   * Connects to mongodb.
   * @param {String} connectionName - for connection retrieval purposes.
   * @param {String} mongoUrl - mongodb database url.
   * @param {Object} mongodb - result from require('mongodb')
   * @return {Promise}
   * @api public.
   * @tests none.
   */
  connect(connectionName, mongoUrl, mongodb) {
    var addConnection;
    addConnection = this.addConnection.bind(this);
    if (!connectionName || !mongoUrl || !mongodb) {
      throw new Error(`.connect() - params "connectionName", "mongoUrl", and "mongodb" are required`);
    }
    return new Promise((resolve, reject) => {
      mongodb.MongoClient.connect(mongoUrl, (err, connection) => {
        if (err) {
          debug(`Error connecting to mongodb (${mongoUrl}).`);
          reject(err);
        }
        debug(`Connected to mongodb (${mongoUrl}).`);
        addConnection(connectionName, connection);
        resolve(connection);
      });
    });
  }

  /**
   * Closes connection to mongodb.
   * @param {String} connectionName
   * @return {Promise}
   * @api public.
   * @tests none.
   */
  close(connectionName) {
    var connection;
    if (!connectionName) {
      throw new Error(`.close() - param "connectionName" is required.`);
    }
    connection = this.getConnection(connectionName);
    return new Promise((resolve, reject) => {
      connection.close((err, result) => {
        if (err) {
          debug(`Error closing connnection "${connectionName}".`);
          reject(err);
        }
        debug(`Connection "${connectionName} closed."`);
        resolve(result);
      });
    });
  }

  /**
   * Caches a mongodb connection.
   * @param {String} connectionName
   * @param {Object} connection
   * @return `this`
   * @api public.
   * @tests none.
   */
  addConnection(connectionName, connection) {
    var existingConnection;
    if (!connectionName || !connection) {
      throw new Error(`.addConnection() - params "connectionName", and "connection" are required.`);
    }
    existingConnection = this._connections[connectionName];
    if (existingConnection) {
      throw new Error(`.addConnection() - a connection named "${connectionName} already exists."`);
    }
    this._connections[connectionName] = connection;
    return this;
  }

  /**
   * Returns a mongodb connection object.
   * @param {String} connectionName
   * @return {Object}
   * @api public.
   * @tests none.
   */
  getConnection(connectionName) {
    var connection;
    if (!connectionName) {
      throw new Error(`.getConnection() - param "connectionName", is required.`);
    }
    connection = this._connections[connectionName];
    if (!connection) {
      throw new Error(`.getConnection() - connection "${connectionName}" does not exist.`);
    }
    return connection;
  }

  /**
   * Caches a mongodb database instance
   * @param {String} connectionName
   * @param {String} databaseName
   * @return {Object} proxied database instance
   * @api public
   * @tests none
   */
  addDatabase(connectionName, databaseName) {
    var connection, existingDatabase, database;
    // Validate func call.
    if (!connectionName || !databaseName) {
      throw new Error(`.addDatabase() - params "connectionName", and "databaseName" are required.`);
    }
    // Get connection.
    connection = this._connections[connectionName];
    if (!connection) {
      throw new Error(`.addDatabase() - connection "${connectionName}" does not exist.`);
    }
    // Init namespace.
    if (!this._databases[connectionName]) {
      this._databases[connectionName] = {};
    }
    // Don't overwrite existing databases.
    existingDatabase = !!this._databases[connectionName][databaseName];
    if (existingDatabase) {
      throw new Error(`.addDatabase() - database "${databaseName}" already exists.`);
    }
    // Point connection to a particular database.
    database = connection.db(databaseName);
    // Cache reference.
    this._databases[connectionName][databaseName] = database;
    // Return database instance.
    return this.getDatabase(connectionName, databaseName);
  }

  /**
   * Returns a proxied mongodb database instance.
   * @param {String} connectionName
   * @param {String} databaseName
   * @return {Object|null} current database instance
   * @api private
   * @tests none
   */
  getDatabase(connectionName, databaseName) {
    var database, handler, getModel;
    // Validate func call.
    if (!connectionName || !databaseName) {
      throw new Error(`.getDatabase() - params "connectionName", and "databaseName" are required.`);
    }
    if (!this._databases[connectionName]) {
      throw new Error(`.getDatabase() - database "${databaseName}" does not exist.`);
    }
    database = this._databases[connectionName][databaseName];
    if (!database) {
      throw new Error(`.getDatabase() - database "${databaseName}" does not exist.`);
    }
    handler = proxyHandler(database, this._getModel.bind(this), {
      databaseName,
      connectionName,
    });
    return new Proxy({}, handler);
  }

  /**
   * Caches data models.
   * @param {String} connectionName
   * @param {String} databaseName
   * @param {Object} models - { collectionName: { schema: {}, methods: {}, onError: function() {} } }
   * @return `this`
   * @api public.
   * @tests none.
   */
  addModels(connectionName, databaseName, models) {
    var keys;
    keys = Object.keys(models);
    keys.forEach((collectionName) => {
      let model = models[collectionName];
      this.addModel(connectionName, databaseName, collectionName, model);
    });
    return this;
  }

  /**
   * Caches data model.
   * @param {String} connectionName
   * @param {String} databaseName
   * @param {String} collectionName
   * @param {Object} model
   * @return `this`
   * @api public.
   * @tests none.
   */
  addModel(connectionName, databaseName, collectionName, model) {
    var models;
    models = this._models;
    if (!connectionName || !databaseName || !collectionName || !model) {
      throw new Error(`.addModel() - params "connectionName", "databaseName", "collectionName", and "model" are required.`);
    }
    if (!models[connectionName]) {
      models[connectionName] = {};
    }
    if (!models[connectionName][databaseName]) {
      models[connectionName][databaseName] = {};
    }
    if (models[connectionName][databaseName][collectionName]) {
      throw new Error(`.addModel() - model "${collectionName}" already exists.`);
    }
    if (!model.schema) {
      debug(`Model "${collectionName}" does not have a schema.`);
    }
    models[connectionName][databaseName][collectionName] = {
      schema: model.schema ? schema._preprocessSchema(model.schema) : null,
      methods: model.methods || null,
      onError: model.onError || null,
    };
    debug(`Added model "${collectionName}".`);
    return this;
  }

  /**
   * Returns a collection data model.
   * @param {String} connectionName
   * @param {String} databaseName
   * @param {String} collectionName
   * @return {Object|null}
   * @api public.
   * @tests none.
   */
  _getModel(connectionName, databaseName, collectionName) {
    var models;
    models = this._models;
    if (!connectionName || !databaseName || !collectionName) {
      return null;
    }
    if (!models[connectionName]) {
      return null;
    }
    if (!models[connectionName][databaseName]) {
      return null;
    }
    return models[connectionName][databaseName][collectionName] || null;
  }

  /**
   * Get a static method on a data model.
   * @param {String} connectionName.
   * @param {String} databaseName.
   * @param {String} collectionName.
   * @param {String} methodName.
   * @return {Function}
   * @api private.
   * @tests none.
   */
  _getStaticMethod(connectionName, databaseName, collectionName, methodName) {
    var method, model;

    if (!connectionName || !databaseName || !collectionName || !methodName) {
      throw new Error(`._getStaticMethod() - params "connectionName", "databaseName", "collectionName", and "methodName" are required.`);
    }

    model = this._getModel(connectionName, databaseName, collectionName);
    if (!model) {
      throw new Error(`._getStaticMethod() - model "${collectionName}" does not exist.`);
    }

    method = model[methodName];
    if (!method) {
      throw new Error(`._getStaticMethod() - method "${methodName}" does not exist on the "${collectionName}" model.`);
    }

    return method;
  }

  /**
   * Adds a global error handler for schema validation and mongodb errors.
   * @param {Function} handler:
   *  @param {String} collectionName.
   *  @param {String} action.
   *  @param {Array} errors.
   * @return `this`.
   * @api public.
   * @tests none.
   */
  addGlobalErrorHandler(handler) {
    this._globalErrorHandler = handler;
    return this;
  }

  /**
   * Add a error handler for schema validation errors per database.
   * @return {Function}
   * @api private.
   * @tests none.
   */
  _getGlobalErrorHandler() {
    return this._globalErrorHandler;
  }

};

module.exports = new Api();
