#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = null
mongorules = require('../../lib')
schema = require('../fixtures/schema.arrayofobjects')

describe 'update(): array of objects:', ->

  beforeEach (done) ->
    mongorules.removeModel('test', 'mongorules-testing', 'users')
    mongorules.addModel('test','mongorules-testing', 'users', { schema: schema })
    db = mongorules.getDatabase('test', 'mongorules-testing')
    doc = { account: {
      friends: [{ name: 'lrn' }, { name: 'gus' }]
    } }
    db.users.insert(doc).then (result) ->
      done()

  describe '$set', ->
    it 'should throw an error when given an invalid type', (done) ->
      payload = { '$set': {'account.friends.0': { name: 1 } } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('type')
        done()

    it 'should update a item in an array using the item in array syntax', (done) ->
      payload = { '$set': {'account.friends.0': { name: 'lou' } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql([
            { name: 'lou!', nicknames: [] },
            { name: 'gus!', nicknames: [] }
          ]);
          done()

    it 'should update a single property on an object using the item in array syntax', (done) ->
      payload = { '$set': {'account.friends.0.name': 'lou' } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql([
            { name: 'lou!', nicknames: [] },
            { name: 'gus!', nicknames: [] }
          ]);
          done()

  describe '$addToSet', ->
    it 'should add a single item to the nicknames array using the item in array syntax', (done) ->
      payload = { '$addToSet': {'account.friends.0.nicknames': { name: 'lou', giver: [] } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql([
            { name: 'lrn!', nicknames: [{name: 'lou', giver: [] }] },
            { name: 'gus!', nicknames: [] }
          ])
          done()

    it 'should should throw an error given an incorrect type for an object property', (done) ->
      payload = { '$addToSet': {'account.friends': { '$each': [{ name: 'jay', nicknames: 1 }] } } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('type')
        done()

    it 'should should throw an error given a missing object field', (done) ->
      payload = { '$addToSet': {'account.friends': { '$each': [{ name: 'jay', nicknames: [{ name: 'bird' }] }] } } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('required')
        done()

    it 'should add an item to set using $each', (done) ->
      _document = { name: 'jay', nicknames: [{ name: 'bird', giver: [{name:'gus'}] }] }
      output    = { name: 'jay!', nicknames: [{ name: 'bird', giver: [{name:'gus'}] }] }
      payload   = { '$addToSet': {'account.friends': { '$each': [_document] } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.length.should.eql(3)
          result.account.friends[2].should.eql(output)
          done()
