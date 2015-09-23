'use strict'

require('babel/register')

#Module dependencies.
mongodb = require('mongodb')
db = require('../../lib')

dbInit = false

beforeEach (done) ->
  if !dbInit
    db.connect('mongodb://localhost/mongorules', mongodb).then (_db) =>
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
