#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = null
mongorules = require('../../lib')
schema = require('../fixtures/schema.arrayofvalues')

describe 'insert(): array of values:', ->

  beforeEach (done) ->
    mongorules.removeModel('test', 'mongorules-testing', 'users')
    models = { users: {schema: schema} }
    mongorules.addModels('test','mongorules-testing', models)
    db = mongorules.getDatabase('test', 'mongorules-testing')
    done()

  it 'should throw an error when violating the minLength constraint', (done) ->
    doc = { account: { friends: ['jay'] } }
    try
      db.users.insert([doc]).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')

    doc = { account: { friends: ['jay', ''] } }
    try
      db.users.insert([doc]).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('minLength')
      done()

  it 'should throw an error when violating the maxLength constraint', (done) ->
    doc = { account: { friends: ['lrn', 'gus', 'jay', 'tim'] } }
    try
      db.users.insert([doc]).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')

    doc = { account: { friends: ['lrn', 'gus', 'jayy'] } }
    try
      db.users.insert([doc]).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('maxLength')
      done()

  it 'should filter null values, transform, lowercase & trim', (done) ->
    doc = { account: { friends: ['LRN', 'el ', null] } }
    db.users.insert([doc]).then (result) ->
      db.users.findOne({}).then (res) ->
        res.account.friends.length.should.eql(2)
        res.account.friends[0].should.eql('hey lrn')
        res.account.friends[1].should.eql('hey el')
        done()

  it 'should validate using the custom validate function', (done) ->
    doc = { account: { friends: ['aaa', 'gus', 'jay'] } }
    try
      db.users.insert([doc]).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('validate')
      done()

  it 'should throw given a null value when notNull is true', (done) ->
    doc = { account: { friends: null } }
    try
      db.users.insert([doc]).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('notNull')
      done()

  it 'should ensure all values are of type `string`', (done) ->
    doc = { account: { friends: [['a'], 'gus', 'jay'] } }
    try
      db.users.insert(doc).then (result) ->
        done(result)
    catch e
      e.errors.length.should.eql(1)
      e.errors[0].property.should.eql('type')
      done()
