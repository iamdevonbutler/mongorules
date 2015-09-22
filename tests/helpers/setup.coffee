'use strict'

require('babel/register')

#Module dependencies.
MongoClient = require('mongodb').MongoClient
db = require('../../lib')

dbInit = false

beforeEach (done) ->
  if !dbInit
    db.initDatabase(MongoClient, 'mongodb://localhost/mongorules').then (_db) =>
      db.addDatabase('mongorules', _db);
      dbInit = true
      done()
  else
    done()


# Remove collection users if it exists.
afterEach (done) ->
  db.users.remove({}).then((res)->
    done()
  , (err) ->
    # catch error thrown if collection does not exist.
    done(err)
  )
