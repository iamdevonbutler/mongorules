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
      test: (value) -> value+1
    }
    db.addModel('users', { schema: schema, methods: methods })
    done()

  it 'should execute a static method on the users collection.', ->
    db.users.test(1).should.eql(2)
