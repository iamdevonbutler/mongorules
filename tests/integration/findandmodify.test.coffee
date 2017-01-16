#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = null
mongorules = require('../../lib')
schema = require('../fixtures/schema.values')

describe 'findAndModify():', ->

  beforeEach (done) ->
    mongorules.addModel('test','mongorules-testing', 'users', { schema: schema })
    db = mongorules.getDatabase('test', 'mongorules-testing')
    doc = { account: { friends: ['lrn'], name: 'jay' }, newsletter: true, age: 1 }
    db.users.insert(doc).then (result) ->
      done()

  it 'should return an updated document', (done) ->
    payload = { '$set': {'account.name': 'gus'} }
    db.users.findAndModify({}, [], payload, { new: true }).then (result) ->
      result = result.value
      result.account.name.should.eql('hey gus')
      result.account.friends.should.eql(['lrn'])
      result.newsletter.should.eql(true)
      result.age.should.eql(1)
      Object.keys(result).length.should.eql(4) # _id field adds a field.
      done()
