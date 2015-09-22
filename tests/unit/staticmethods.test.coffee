'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.values')

addUserGen = (value) ->
  result = yield this.users.insert({ account: { name: value } })
  result = yield this.users.find({ 'account.name': 'hey '+value })
  return yield result.toArray()

addUser = (value) ->
  return this.users.insert({ account: { name: value } })

describe 'Static methods:', ->

  beforeEach (done) ->
    methods = { addUserGen: addUserGen, addUser: addUser }
    db.addModel('users', { schema: schema, methods: methods })
    done()

  it 'should execute a static method (generator function) on the users collection.', (done) ->
    db.users.addUserGen('gus').then (result) ->
      result[0].account.name.should.eql('hey gus')
      done()

  it 'should execute a static method on the users collection.', (done) ->
    db.users.addUser('gus').then (result) ->
      db.users.findOne({ 'account.name': 'hey gus' }).then (result) ->
        result.account.name.should.eql('hey gus')
        done()
