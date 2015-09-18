'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schemaArrayOfObjects = require('../fixtures/schema.arrayofobjects')

describe 'insert(): array of objects:', ->

  beforeEach (done) ->
    models = { users: { schema: schemaArrayOfObjects } }
    db.addModels(models)
    done()

  it 'should throw an error given an object missing a required property', (done) ->
    doc = { account: { friends: [{}] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('required')
      done()

  it 'should transform a property on an object given a custom transform function', (done) ->
    doc = { account: { friends: [{ name: 'JAY' }] } }
    db.users.insert(doc).then (result) ->
      db.users.findOne({}).then (result) ->
        console.log(result);
        result.account.friends[0].name.should.eql('jay!')
        done()

  it 'should throw an error given a document w/ data in violation of the minLength property', (done) ->
    doc = { account: { friends: [{ name: '' }] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')

    doc = { account: { friends: [] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')
      done()


  it 'should throw an error given a document w/ data in violation of the maxLength property', (done) ->
    doc = { account: { friends: [{name: 'jay'},{name: 'jay'},{name: 'jay'}] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')
      done()

  it 'should throw an error given an invalid type constraint on a property on an object', (done) ->
    doc = { account: { friends: [{name: 1}] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('type')
      done()

  it 'should sanitize an object property', (done) ->
    doc = { account: { friends: [{name: '<script>jay</script>'}] } }
    db.users.insert(doc).then (result) ->
      db.users.findOne({}).then (result) ->
        result.account.friends[0].name.should.not.eql('<script>jay</script>')
        done()

  it 'should set default values', (done) ->
    doc = { account: { friends: [{name: 'jay'}] } }
    db.users.insert(doc).then (result) ->
      db.users.findOne({}).then (result) ->
        result.account.friends[0].nicknames.should.eql([{}])
        done()

  it 'should successfully insert a document given correct data', (done) ->
    doc = {
      account: {
        friends: [
          { name: 'jay', nicknames: [ {name: 'gus', giver: [ { name: 'flip' } ] } ] },
          { name: 'lou' }
        ]
      }
    }
    db.users.insert(doc).then (result) ->
      db.users.findOne({}).then (result) ->
        result.account.friends[1].should.be.ok
        result.account.friends[0].name.should.eql('jay!')
        result.account.friends[0].nicknames[0].name.should.eql('gus')
        result.account.friends[0].nicknames[0].giver[0].name.should.eql('flip')
        done()
