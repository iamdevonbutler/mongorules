'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schemaArrayOfValues = require('../fixtures/schema.arrayofvalues')

describe 'insert(): array of values:', ->

  beforeEach (done) ->
    models = { users: {schema: schemaArrayOfValues} }
    db.addModels(models)
    done()

  it 'should throw an error when violating the minLength constraint', ->
    doc = { account: { friends: ['jay'] } }
    try
      db.users.insert([doc])
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')

    doc = { account: { friends: ['jay', ''] } }
    try
      db.users.insert([doc])
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')

  it 'should throw an error when violating the maxLength constraint', ->
    doc = { account: { friends: ['gab', 'gus', 'jay', 'tim'] } }
    try
      db.users.insert([doc])
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')

    doc = { account: { friends: ['gab', 'gus', 'jayy'] } }
    try
      db.users.insert([doc])
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')

  it 'should filter null values, transform, lowercase & trim', (done) ->
    doc = { account: { friends: ['GAB', 'el ', null] } }
    db.users.insert([doc]).then (result) ->
      db.users.findOne({}).then (res) ->
        res.account.friends.length.should.eql(2)
        res.account.friends[0].should.eql('hey gab')
        res.account.friends[1].should.eql('hey el')
        done()

  it 'should validate using the custom validate function', ->
    doc = { account: { friends: ['aaa', 'gus', 'jay'] } }
    try
      db.users.insert([doc])
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('validate')

  it 'should enforce required field validation', ->
    doc = { account: { friends: null } }
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
      console.log(e);
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('type')
