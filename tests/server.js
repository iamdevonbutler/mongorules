'use strict';

/**
 * Enable ES6.
 */

require('babel/register');

/**
 * Module dependencies.
 */

const co = require('co');
const mongoproxy = require('../lib');
const MongoClient = require('mongodb').MongoClient;
const Router = require('koa-router');
const handlers = require('./handlers');
const koa = require('koa');

/**
 * Bootstrap app.
 */

module.exports = co(function* () {

  /**
   * Bootstrap database.
   */
  // const db = yield mongoproxy.initDatabase(MongoClient, 'mongodb://localhost/node-mongo-proxy');
  MongoClient.connect('mongodb://localhost/node-mongo-proxy', function(err, db) {
    mongoproxy.addDatabase('debatable-api-development', db);
    mongoproxy.addModels('debatable-api-development', models);
    /**
     * Bootstrap koa.
     */
    const app = koa();

    /**
     * Bootstrap routes.
     */
    var router = new Router();
    router.post('/users/add', handlers.add);

    app.use(router.routes());

    /**
     * Listen please.
     */
    app.listen(process.env.PORT, process.env.HOST, ~~process.env.BACKLOG_SIZE);
    console.log('Listening on %s:%s',process.env.HOST, process.env.PORT);

    return app;
  });

}).catch(function(err) {
  console.error(err);
  process.exit(1);
});
