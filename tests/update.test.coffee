'use strict'

require('./helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../lib')
schema = require('./fixtures/schema.simple')



describe 'Insert integration tests:', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc =
      name: 'jay'
      newsletter: true
      age: 1
    db.users.insert(doc).then (result) ->
      done()

  describe '$set', ->
    # it 'should update a nested value', (done) ->
    # it 'should update a paticular element in an', (done) ->
    it 'should update a top level value', (done) ->
      db.addModel('users', { schema: schema })
      payload =
        "$set":
          name: 'jayy'
          newsletter: false
      db.users.findAndModify({}, [], payload, {new: true}).then (result) ->
        console.log(result);
        done()


  # describe 'update() failures:', ->
