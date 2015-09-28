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

describe 'Static methods:', ->

  beforeEach (done) ->
    methods = { addOne: addOne, addUser: addUser }
    db.addModel('users', { schema: schema, methods: methods })
    done()

  it 'should add a user using a static methods.', (done) ->
    db.users.addUser('gus').then (result) ->
      db.users.findOne({ 'account.name': 'hey gus' }).then (result) ->
        result.account.name.should.eql('hey gus')
        done()
