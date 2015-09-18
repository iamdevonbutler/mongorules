'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schemaValues = require('../fixtures/schema.values')

# describe 'insert(): values:', ->
#
#   beforeEach (done) ->
#     models = { users: {schema: schemaValues} }
#     db.addModels(models)
#     done()
#
#   it 'should throw an error when violating the minLength constraint', ->
#     doc = { account: { friends: [''] } }
#     try
#       db.users.insert([doc]).then (result) ->
#         done()
#     catch e
#       e.errors.length.should.eql(2)
#       e.errors[0].property.should.eql('minLength')
#       e.errors[1].property.should.eql('minLength')
