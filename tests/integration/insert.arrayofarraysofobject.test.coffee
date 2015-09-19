'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schemaArrayOfArraysOfObjects = require('../fixtures/schema.arrayofarraysofobjects')

describe 'insert(): array of arrays of objects:', ->

  beforeEach (done) ->
    models = { users: { schema: schemaArrayOfArraysOfObjects } }
    db.addModels(models)
    done()

  it 'should throw an error given a null or undefined value', (done) ->
    doc = { account: {friends: null} }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('required')

    doc = { account: {} }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('required')
      done()

  it 'should throw an error given an invalid types', (done) ->
    doc = { account: { friends: [ ['bos', 'nyc'] ] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(2)
      e.errors[0].property.should.eql('type')

    doc = { account: { friends: [ {} ] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('type')
      done()

  it 'should throw an error given a conflict w/ the custom validate function', (done) ->
    doc = { account: { friends: [ [{ name: 'jay', age: 16 }] ] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('validate')
      done()

  it 'should throw an error an error given a document in violation of the minLength constraint', (done) ->
    doc = { account: { friends: [] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')

    doc = { account: { friends: [[]] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')

    doc = { account: { friends: [[{ name: '', age: 26 }]] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')
      done()

  it 'should throw an error an error given a document in violation of the maxLength constraint', (done) ->
    doc = { account: { friends: [[{name: 'jay', age: 26}], [{name: 'jay', age: 26}], [{name: 'jay', age: 26}]] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')

    doc = { account: { friends: [[{name: 'jay', age: 26}, {name: 'jay', age: 26}, {name: 'jay', age: 26}]] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')

    doc = { account: { friends: [[{ name: 'abcdefghijklmnopqrstuvwxyz', age: 26 }]] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')
      done()

  it 'should throw an error when given an empty object w/ required fields', (done) ->
    doc = { account: { friends: [[{ age: 26 }]] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('required')
      done()

  it 'should filter null values, transform, and lowercase values on object properties', (done) ->
    doc = { account: { friends: [ null, [{ name: 'jay', age: 26 }], [{ name: 'jay', age: 26 }] ] } }
    db.users.insert(doc).then (result) ->
      db.users.findOne({}).then (result) ->
        result.account.friends.length.should.eql(2)
        result.account.friends[0].length.should.eql(1)
        result.account.friends[0][0].name.should.eql('jay!')
        result.account.friends[0][0].age.should.eql(26)
        Object.keys(result.account.friends[0][0]).length.should.eql(2)
        done()
