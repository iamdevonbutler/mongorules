'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.arrayofobjects')

describe 'update(): array of objects:', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc = { account: { friends: [{ name: 'gab' }, { name: 'gus' }] } }
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

    it 'should update a single property on an object', (done) ->
      payload = { '$set': {'account.friends.0': { name: 'lou' } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          console.log(result.account.friends);
          result.account.friends.length.should.eql(2)
          result.account.friends[0].name.should.eql('lou!')
          result.account.friends[0].nicknames.should.eql([{}])
          result.account.friends[1].name.should.eql('gus!')
          result.account.friends[1].nicknames.should.eql([{}])
          done()

  describe '$addToSet', ->
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

    it 'should should throw an error given a missing object field', (done) ->
      _document = { name: 'jay', nicknames: [{ name: 'bird', giver: [{name:'gus'}] }] }
      output = { name: 'jay!', nicknames: [{ name: 'bird', giver: [{name:'gus'}] }] }
      payload = { '$addToSet': {'account.friends': { '$each': [_document] } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.length.should.eql(3)
          result.account.friends[2].should.eql(output)
          done()
