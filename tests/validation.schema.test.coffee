'use strict'

require('babel/register')

# Start server.
MongoClient = require('mongodb').MongoClient
db = require('../lib')
Router = require('koa-router')
handlers = require('./handlers')
koa = require('koa')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

supertest = require('supertest')

describe 'Schema validation:', ->

  beforeEach (done) ->
    db.initDatabase(MongoClient, 'mongodb://localhost/node-mongo-proxy').then (_db) =>
      db.addDatabase('node-mongo-proxy', _db);
      app = koa()
      router = new Router()
      router.post('/users/add', handlers.add)
      app.use(router.routes())
      app.listen(3001)
      done()
      # db.addModels('node-mongo-proxy', models);

  describe 'this', ->

    it 'should work', (done) ->
      db.users.insert({ a:1 }).then (err, result) ->
        console.log(err, result);
        done()



  # describe 'database interactions:', ->

      # mongoproxy.users.find {}, (err, result) ->
        # console.log(111);
        # done()
      # mongoproxy.users.insert { name: 'jay', email: 'j@j.com' }, (err, result) ->
        # done err

    # afterEach (done) ->
      # mongoproxy.users.remove {}, (err, result) ->
        # done err

    # describe 'User.updateUser()', ->
    #   it 'should update a user field when given proper information', (done) =>
    #     postdata =
    #       account:
    #         email: 'jpescione2@gmail.com'
    #         displayName: 'jay2'
    #     setTimeout ( ->
    #       done()
    #     ), 1500
        # Users.updateUser(id, postdata, true).then (user) =>
        #   try
        #     user.should.be.ok
        #     user.account.email.should.equal 'jpescione2@gmail.com'
        #     user.account.displayName.should.equal 'jay2'
        #   catch e
        #     return done e
        #   done()
