'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.values')

describe 'Static methods:', ->

  beforeEach (done) ->
    methods = {
      addUser: (value) ->
        return this.users.insert({ account: { name: value } })
    }
    db.addModel('users', { schema: schema, methods: methods })
    done()

  it 'should execute a static method on the users collection.', (done) ->
    db.users.addUser('gus').then (result) ->
      db.users.findOne().then (result) ->
        result.account.name.should.eql('hey gus')
        done()
