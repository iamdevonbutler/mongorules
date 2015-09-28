'use strict'

require('babel/register')

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.values')

addUser = (value) ->
  return this.users.insert({ account: { name: value } })

addOne = (value) ->
  return value+1

describe 'Static methods:', ->

  beforeEach (done) ->
    methods = { addOne: addOne, addUser: addUser }
    db.addModel('users', { schema: schema, methods: methods })
    done()

  # it 'should add a user using a static methods.', (done) ->
  #   db.users.addUser('gus').then (result) ->
  #     db.users.findOne({ 'account.name': 'hey gus' }).then (result) ->
  #       result.account.name.should.eql('hey gus')
  #       done()

  it 'should return a value from a static method.', (done) ->
    db.users.addOne(1).should.eql(2)
    done()
