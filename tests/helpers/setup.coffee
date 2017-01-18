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
      db.users.remove({})
        .then(() -> done())
        .catch(done)
    ), (err) ->
      console.error '>>> Must run a "mongod" process in the background to use the mongodb client'
      process.exit();
  else
    try
      db.users.remove({})
        .then(() -> done())
        .catch(done)
    catch e
