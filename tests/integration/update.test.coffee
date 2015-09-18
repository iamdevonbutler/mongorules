'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.values')



describe 'Insert integration tests:', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc = { account: { name: 'jay' }, newsletter: true, age: 1 }
    db.users.insert(doc).then (result) ->
      done()

  describe '$set', ->
    # it 'should update a nested value', (done) ->
    # it 'should update a paticular element in an', (done) ->
    it 'should update a top level value', (done) ->
      payload = { '$set': { newsletter: false } }
      db.users.findAndModify({}, [], payload, { new: true }).then (result) ->
        expect(result.value.newsletter).to.eql(false)
        done()
