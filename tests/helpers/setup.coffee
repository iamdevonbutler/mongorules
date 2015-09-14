'use strict'

require('babel/register')

#Module dependencies.
MongoClient = require('mongodb').MongoClient
db = require('../../lib')
Router = require('koa-router')
handlers = require('./handlers')
koa = require('koa')

app = null
dbInstance = null

beforeEach (done) ->
  if !app
    db.initDatabase(MongoClient, 'mongodb://localhost/mongoproxy').then (_db) =>
      db.addDatabase('mongoproxy', _db);
      dbInstance = db
      app = koa()
      router = new Router()
      router.get('/users/get', handlers.add)
      app.use(router.routes())
      app.listen(3001)
      done()
  else
    done()


# Remove collection users if it exists.
afterEach (done) ->
  dbInstance.users.remove({}).then((res)->
    done()
  , (err) ->
    # catch error thrown if collection does not exist.
    done(err)
  )
