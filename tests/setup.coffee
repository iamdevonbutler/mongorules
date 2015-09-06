'use strict'

require('babel/register')

#Module dependencies.
MongoClient = require('mongodb').MongoClient
db = require('../lib')
Router = require('koa-router')
handlers = require('./handlers')
koa = require('koa')

app = null
dbInstance = null

beforeEach (done) ->
  if !app
    db.initDatabase(MongoClient, 'mongodb://localhost/node-mongo-proxy').then (_db) =>
      db.addDatabase('node-mongo-proxy', _db);
      dbInstance = _db
      app = koa()
      router = new Router()
      router.get('/users/get', handlers.add)
      app.use(router.routes())
      app.listen(3001)
      done()
  else
    done()


afterEach (done) ->
  db.users.drop().then ->
    done()
