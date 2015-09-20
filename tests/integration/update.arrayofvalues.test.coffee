'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.arrayofvalues')

describe 'update(): array of values:', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc = { account: { friends: ['gab', 'gus'] } }
    db.users.insert(doc).then (result) ->
      done()

  describe '$set', ->
    it 'should throw an error when violating the minLength constraint', (done) ->
      payload = { '$set': {'account.friends': ['jay']} }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('minLength')
        done()

    it 'should update the friends array', (done) ->
      payload = { '$set': {'account.friends': ['gus', 'jay']} }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql(['hey gus', 'hey jay'])
          done()

  describe '$addToSet', ->
    it 'should add an items to the friends array', (done) ->
      payload  = { '$addToSet': {'account.friends': { '$each': ['sam', 'new'] } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql(['hey gab', 'hey gus', 'hey sam', 'hey new'])
          done()
