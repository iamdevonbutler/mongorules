/**
 * @file function dock and state container for mongodb connections,
 * database instances, and models. Private method/vars have underscore
 * prefix.
 */

const debug = require('debug')('mongorules');
const proxyHandler = require('./proxy');
const schema = require('./schema');

var self = module.exports;

/**
 * connectionName: connection,
 */
self._connections = {};

/**
 * connectionName: {
 *   databaseName: database,
 */
self._databases = {};

/**
 * connectionName: {
 *   databaseName: {
 *     modelName: model
 */
self._models = {};

// Error handler.
self._globalErrorHandler = null;

// Used to store config needed for access when requiring the 'db' property.
self._defaultDbConfig = null;

/**
 * Connects to mongodb.
 * @param {String} connectionName - for connection retrieval purposes.
 * @param {String} mongoUrl - mongodb database url.
 * @param {Object} mongodb - result from require('mongodb')
 * @return {Promise}
 * @api public.
 * @tests none.
 */
self.connect = (connectionName, mongoUrl, mongodb) => {
  var addConnection;
  addConnection = self.addConnection.bind(self);
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
 * Removes cached connection/db instances/models.
 * @param {String} connectionName
 * @param {Boolean} [removeModels]
 * @return {Promise}
 * @api public.
 * @tests none.
 */
self.close = (connectionName, removeModels = true) => {
  var connection;
  if (!connectionName) {
    throw new Error(`.close() - param "connectionName" is required.`);
  }
  connection = self.getConnection(connectionName);
  return new Promise((resolve, reject) => {
    connection.close((err, result) => {
      if (err) {
        debug(`Error closing connnection "${connectionName}".`);
        reject(err);
      }
      delete self._connections[connectionName];
      delete self._databases[connectionName];
      if (removeModels) {
        delete self._models[connectionName];
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
self.addConnection = (connectionName, connection) => {
  var existingConnection;
  if (!connectionName || !connection) {
    throw new Error(`.addConnection() - params "connectionName", and "connection" are required.`);
  }
  existingConnection = self._connections[connectionName];
  if (existingConnection) {
    throw new Error(`.addConnection() - a connection named "${connectionName} already exists."`);
  }
  self._connections[connectionName] = connection;
  return self;
}

/**
 * Returns a mongodb connection object.
 * @param {String} connectionName
 * @return {Object}
 * @api public.
 * @tests none.
 */
self.getConnection = (connectionName) => {
  var connection;
  if (!connectionName) {
    throw new Error(`.getConnection() - param "connectionName", is required.`);
  }
  connection = self._connections[connectionName];
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
self.addDatabase = (connectionName, databaseName) => {
  var connection, existingDatabase, database;
  // Validate func call.
  if (!connectionName || !databaseName) {
    throw new Error(`.addDatabase() - params "connectionName", and "databaseName" are required.`);
  }
  // Get connection.
  connection = self._connections[connectionName];
  if (!connection) {
    throw new Error(`.addDatabase() - connection "${connectionName}" does not exist.`);
  }
  // Init namespace.
  if (!self._databases[connectionName]) {
    self._databases[connectionName] = {};
  }
  // Don't overwrite existing databases.
  existingDatabase = !!self._databases[connectionName][databaseName];
  if (existingDatabase) {
    throw new Error(`.addDatabase() - database "${databaseName}" already exists.`);
  }
  // Point connection to a particular database.
  database = connection.db(databaseName);
  // Cache reference.
  self._databases[connectionName][databaseName] = database;
  // Return database instance.
  return self.getDatabase(connectionName, databaseName);
}

/**
 * Returns a proxied mongodb database instance.
 * @param {String} connectionName
 * @param {String} databaseName
 * @return {Object|null} current database instance
 * @api private
 * @tests none
 */
self.getDatabase = (connectionName, databaseName) => {
  var database, handler, getModel;
  // Validate func call.
  if (!connectionName || !databaseName) {
    throw new Error(`.getDatabase() - params "connectionName", and "databaseName" are required.`);
  }
  if (!self._databases[connectionName]) {
    throw new Error(`.getDatabase() - database "${databaseName}" does not exist.`);
  }
  database = self._databases[connectionName][databaseName];
  if (!database) {
    throw new Error(`.getDatabase() - database "${databaseName}" does not exist.`);
  }
  handler = proxyHandler(database, self._getModel.bind(this), {
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
self.addModels = (connectionName, databaseName, models) => {
  var keys;
  keys = Object.keys(models);
  keys.forEach((collectionName) => {
    let model = models[collectionName];
    self.addModel(connectionName, databaseName, collectionName, model);
  });
  return self;
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
self.addModel = (connectionName, databaseName, collectionName, model) => {
  var models;
  models = self._models;
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
  return self;
}

/**
 * Removes all models in a database.
 * @param {String} connectionName
 * @param {String} databaseName
 * @return `this`
 * tests none.
 * @api public.
 */
self.removeModels = (connectionName, databaseName) => {
  var models, modelsExist;
  models = self._models;
  modelsExist = models[connectionName]
    && models[connectionName][databaseName];
  if (modelsExist) {
    delete models[connectionName][databaseName];
  }
  return self;
}

/**
 * Removes a model from cache.
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {String} collectionName
 * @return `this`
 * tests none.
 * @api public.
 */
self.removeModel = (connectionName, databaseName, collectionName) => {
  var models, modelExists;
  models = self._models;
  modelExists = models[connectionName]
    && models[connectionName][databaseName]
    && models[connectionName][databaseName][collectionName];
  if (modelExists) {
    delete models[connectionName][databaseName][collectionName];
  }
  return self;
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
self._getModel = (connectionName, databaseName, collectionName) => {
  var models;
  models = self._models;
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
self._getStaticMethod = (connectionName, databaseName, collectionName, methodName) => {
  var method, model;

  if (!connectionName || !databaseName || !collectionName || !methodName) {
    throw new Error(`._getStaticMethod() - params "connectionName", "databaseName", "collectionName", and "methodName" are required.`);
  }

  model = self._getModel(connectionName, databaseName, collectionName);
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
self.addGlobalErrorHandler = (handler) => {
  self._globalErrorHandler = handler;
  return self;
}

/**
 * Add a error handler for schema validation errors per database.
 * @return {Function}
 * @api private.
 * @tests none.
 */
self._getGlobalErrorHandler = () => {
  return self._globalErrorHandler;
}

/**
 * Convience for accessing the database when importing the "db" obj via
 * destructuring assignment.
 * @param {String} connectionName
 * @param {String} databaseName
 * @return {Object}
 * @api private.
 * @tests none.
 */
self.setDefaultDb = (connectionName, databaseName) => {
  if (!connectionName || !databaseName) {
    throw new Error(`.defaultDb() - params "connectionName" and "databaseName" are required.`);
  }
  if (!self._connections[connectionName]) {
    throw new Error(`.defaultDb() - connection "connectionName" does not exist.`);
  }
  if (!self._databases[connectionName] && self._databases[connectionName][databaseName]) {
    throw new Error(`.defaultDb() - database "databaseName" does not exist.`);
  }
  self._defaultDbConfig = {
    connectionName,
    databaseName,
  };
  return self;
}

Object.defineProperty(self, 'db', {
  enumerable: false,
  configurable: false,
  get: () => {
    var connectionName, databaseName, config;
    config = self._defaultDbConfig;
    if (config) {
      connectionName = config.connectionName;
      databaseName = config.databaseName;
      return self.getDatabase(connectionName, databaseName);
    }
    throw new Error(`Database "${databaseName}" not found. Be sure to add defualt db config w/ .defaultDb() before importing the "db" object.`);
  },
});
