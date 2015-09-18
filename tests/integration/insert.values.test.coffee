'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schemaValues = require('../fixtures/schema.values')

describe 'insert(): values:', ->

  beforeEach (done) ->
    models = { users: { schema: schemaValues } }
    db.addModels(models)
    done()

  it 'should throw an error when violating the minLength constraint', (done) ->
    doc = { account: { name: '' } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')
      done()

  it 'should throw an error when violating the maxLength constraint', (done) ->
    doc = { account: { name: 'asbcdefghijklmnopqrstuvwxyz' } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')
      done()

  it 'should throw an error when inserting XSS', (done) ->
    doc = { account: { name: '<script>hey</script>' } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('denyXSS')
      done()

  it 'should validate using the custom validate function', (done) ->
    doc = { account: { name: 'tim' } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('validate')
      done()

  it 'should throw an error when violating the type constraint', (done) ->
    doc = { newsletter: 1, age: 'twenty', account: { name: ['jay'] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(3)
      e.errors[0].property.should.eql('type')
      e.errors[1].property.should.eql('type')
      e.errors[2].property.should.eql('type')
      done()

  it 'should throw an error given an invalid date', (done) ->
    doc = { account: { name: 'jay' }, birthday: '123', updated: '01-01-2000', created: '222' }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(3)
      e.errors[0].property.should.eql('type')
      e.errors[1].property.should.eql('type')
      e.errors[2].property.should.eql('type')
      done()

  it 'should insert a document given valid dates', (done) ->
    doc = { account: { name: 'jay' }, birthday: '01-01-2000', updated: '12345', created: '2015-09-14T17:51:31+00:00' }
    db.users.insert(doc).then (result) ->
      db.users.findOne({}).then (result) ->
        result.birthday.should.eql('01-01-2000')
        result.updated.should.eql('12345')
        result.created.should.eql('2015-09-14T17:51:31+00:00')
        done()

  it 'should throw an error when violating the required field constraint', (done) ->
    doc = { account: {} }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('required')
      done()

  it 'should not throw an error when given a null value and notNull is false', (done) ->
    doc = { account: { name: null } }
    db.users.insert([doc]).then (result) ->
      result.should.be.ok
      done()

  it 'should transform, lowercase and trim a value and set a default values', (done) ->
    doc = { account: { name: 'JA ' } }
    db.users.insert(doc).then (result) ->
      db.users.findOne({}).then (result) ->
        result.account.name.should.eql('hey ja')
        result.newsletter.should.eql(true)
        done()
