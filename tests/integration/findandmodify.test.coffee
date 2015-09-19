'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.values')

describe 'findAndModify():', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc = { account: { friends: ['gab'], name: 'jay' }, newsletter: true, age: 1 }
    db.users.insert(doc).then (result) ->
      done()

  it 'should return an updated document', (done) ->
    payload = { '$set': {'account.name': 'gus'} }
    db.users.findAndModify({}, [], payload, { new: true }).then (result) ->
      result = result.value
      result.account.name.should.eql('hey gus')
      result.account.friends.should.eql(['gab'])
      result.newsletter.should.eql(true)
      result.age.should.eql(1)
      Object.keys(result).length.should.eql(4) # _id field adds a field.
      done()
