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

  it 'should throw an error when violating type', (done) ->
    doc = { account: { name: ['jay'] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('type')
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

  it 'should transform, lowercase and trim a value', (done) ->
    doc = { account: { name: 'JA ' } }
    db.users.insert(doc).then (result) ->
      db.users.findOne({}).then (result) ->
        console.log(result);
        result.account.name.should.eql('hey ja')
        done()
