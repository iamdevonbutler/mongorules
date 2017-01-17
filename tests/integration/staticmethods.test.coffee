#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = null
mongorules = require('../../lib')
schema = require('../fixtures/schema.values')

addUser = (value) ->
  return this.users.insert({ account: { name: value } })

addUsers = ->
  yield this.users.insert({ account: { name: 'lrn' } })
  yield this.users.insert({ account: { name: 'lou' } })

describe 'Static methods:', ->

  beforeEach (done) ->
    methods = { addUser: addUser, addUsers: addUsers }
    mongorules.removeModel('test', 'mongorules-testing', 'users')
    mongorules.addModel('test', 'mongorules-testing', 'users', {
      schema: schema,
      methods: methods,
    })
    db = mongorules.getDatabase('test', 'mongorules-testing')
    done()


  it 'should add a user using a static methods', (done) ->
    db.users.addUser('gus').then (result) ->
      db.users.findOne({ 'account.name': 'hey gus' }).then (result) ->
        try
          result.account.name.should.eql('hey gus')
          done()
        catch e
          done e

  it 'should allow yielding given a generator function', (done) ->
    db.users.addUsers().then (result) ->
      db.users.find({}).then (cursor) ->
        cursor.toArray().then (users) ->
          try
            users.length.should.eql(2)
            done()
          catch e
            done e
