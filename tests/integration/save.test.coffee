#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.values')

_id = null

describe 'save():', ->

  beforeEach (done) ->
    db.users.insert({ account: { name: 'jay' } }).then (result) ->
      db.users.findOne().then (result) ->
        _id = result._id
        done()

  it 'should insert a document when the payload does not contain an _id field.', (done) ->
    payload = { account: { name: 'jay'} }
    db.users.save(payload).then (result) ->
      db.users.find().then (result) ->
        result.toArray().then (result) ->
          result.length.should.eql(2)
          result[1].account.name.should.eql('hey jay')
          done()

  it 'should update a document that contains a matching _id field.', (done) ->
    payload = { _id: _id, account: { name: 'gab'} }
    db.users.save(payload).then (result) ->
      db.users.find().then (result) ->
        result.toArray().then (result) ->
          result.length.should.eql(1)
          result[0].account.name.should.eql('hey gab')
          done()

  it 'should insert a document that contains a non matching _id field.', (done) ->
    payload = { _id: '560037c4fa952916b820528d', account: { name: 'gab'} }
    db.users.save(payload).then (result) ->
      db.users.find().then (result) ->
        result.toArray().then (result) ->
          result.length.should.eql(2)
          done()
