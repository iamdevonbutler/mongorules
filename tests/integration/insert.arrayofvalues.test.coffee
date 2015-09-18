'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schemaArrayOfValues = require('../fixtures/schema.arrayofvalues')

describe 'Insert integration tests:', ->


  describe 'insert():', ->
    # describe 'values', ->
    describe 'Array of values:', ->
    models = { users: {schema: schemaArrayOfValues} }
    db.addModels(models)

    it 'should throw an error when violating the minLength constraint', ->
      doc = { account: { friends: [''] } }
      try
        db.users.insert([doc])
      catch e
        e.errors.length.should.eql(2)
        e.errors[0].property.should.eql('minLength')
        e.errors[1].property.should.eql('minLength')

    it 'should throw an error when violating the maxLength constraint', ->
      doc = { account: { friends: ['gab', 'gus', 'jay', 'pete'] } }
      try
        db.users.insert([doc])
      catch e
        e.errors.length.should.eql(2)
        e.errors[0].property.should.eql('maxLength')
        e.errors[1].property.should.eql('maxLength')

    it 'should filter null values from array & transform, lowercase & trim', (done) ->
      doc = { account: { friends: ['GAB', 'el ', null] } }
      db.users.insert([doc]).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.length.should.eql(2)
          result.account.friends[0].should.eql('hey gab')
          result.account.friends[1].should.eql('hey el')
          done()

    it 'should validate using the custom validate function', ->
      doc = { account: { friends: ['aaa', 'gus', 'jay'] } }
      try
        db.users.insert([doc])
      catch e
        console.log(e);
        e.errors.length.should.eql(1)
        e.errors[0].property.should.eql('validate')

    it 'should enforce required field validation', ->
      doc = null
      try
        db.users.insert([doc])
      catch e
        e.errors.length.should.eql(1)
        e.errors[0].property.should.eql('required')

    it 'should ensure all values are of type `string`', ->
      doc = { account: { friends: [['a'], 'gus', 'jay'] } }
      try
        db.users.insert(doc)
      catch e
        e.errors.length.should.eql(1)
        e.errors[0].property.should.eql('type')
