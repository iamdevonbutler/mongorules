'use strict'

# Module dependencies.
mongodb = require('mongodb')
mongorules = require('../../lib')
initDb = true
db = null

beforeEach (done) ->
  if initDb
    mongorules.connect('test','mongodb://localhost/mongorules-testing', mongodb).then ((_db) ->
      db = mongorules.addDatabase 'test', 'mongorules-testing', _db
      initDb = false
      done()
      return
    ), (err) ->
      console.log '>>> Must run a "mongod" process in the background to use the mongodb client'
      process.exit();
      return
  else
    done()
  return

afterEach (done) ->
  # Remove collection users if it exists.
  db.users.remove({}).then ((res) ->
    done()
    return
  ), (err) ->
    # catch error thrown if collection does not exist.
    done err
    return
  return
