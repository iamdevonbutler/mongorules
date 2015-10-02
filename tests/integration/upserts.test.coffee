'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.values')

describe 'Upserts:', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc = { _id: '507f1f77bcf86cd799439011', account: { friends: ['gab'], name: 'jay' } }
    db.users.insert(doc).then (result) ->
      done()

  describe '$set', ->
    # This prevents adding fields to the document from the query.
    it 'should throw an error when the query contains fields that are not in schema', (done) ->
      query = { 'account.name': 'jay', 'account.email': 'bob@bob.com' }
      payload = { $set: { 'account.name': 'gab' } }
      try
        db.users.update(query, payload, { upsert: true }).then (result) ->
          done(result)
      catch e
        e.errors.should.be.ok
        done()

    it 'should update a document given a matching query', (done) ->
      query = { _id: '507f1f77bcf86cd799439011' }
      payload = { $set: { account: { name: 'gab' } } }
      db.users.update(query, payload, { upsert: true }).then (result) ->
        db.users.find().then (result) ->
          result.toArray().then (result) ->
            result.length.should.eql(1)
            result[0].account.name.should.eql('hey gab')
            result[0].account.friends.should.eql([])
            result[0].newsletter.should.eql(true)
            done()

    it 'should insert a document, and set defaults, given a non matching query', (done) ->
      query = { 'account.name': 'hey gus' }
      payload = { $set: { 'account.name': 'gab' } }
      db.users.update(query, payload, { upsert: true }).then (result) ->
        db.users.find().then (result) ->
          result.toArray().then (result) ->
            result.length.should.eql(2)
            result[1].account.name.should.eql('hey gab')
            result[1].account.friends.should.eql([])
            result[1].newsletter.should.eql(true)
            done()

  describe 'findAndModify()', ->
    it 'should update a document given a matching query', (done) ->
      query = { 'account.name': 'hey jay' }
      payload = { $set: { 'account.name': 'gab'}  }
      db.users.findAndModify(query, null, payload, { upsert: true, new: true }).then (result) ->
        result.value.account.name.should.eql('hey gab')
        result.value.account.friends.should.eql([])
        result.value.newsletter.should.eql(true)
        done()

    it 'should insert a document given a non matching query', (done) ->
      query = { 'account.name': 'hey gus' }
      payload = { $set: { 'account.name': 'gab'}  }
      db.users.findAndModify(query, null, payload, { upsert: true, new: true }).then (result) ->
        db.users.find().then (result) ->
          result.toArray().then (result) ->
            console.log(result);
            result.length.should.eql(2)
            done()
