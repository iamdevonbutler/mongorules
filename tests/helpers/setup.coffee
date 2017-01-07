'use strict'

require 'babel/register'

# Module dependencies.
mongodb = require('mongodb')
db = require('../../lib')
initDb = true


beforeEach (done) ->
  if initDb
    db.connect('mongodb://localhost/mongorules', mongodb).then ((_db) ->
      db.addDatabase 'mongorules', _db
      initDb = false
      done()
      return
    ), (err) ->
      console.log '>>> Must run a "mongod" process in the background to use the mongodb client'
      process.exit()
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
