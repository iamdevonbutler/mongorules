'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.values')

describe 'update(): values:', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc = { account: { friends: ['gab'], name: 'jay' }, newsletter: true, age: 1 }
    db.users.insert(doc).then (result) ->
      done()

  it 'should throw an error given an empty document', (done) ->
    try
      db.users.update({}, {}).then (result) ->
        done(result)
    catch e
      e.should.be.ok
      done()

  it 'should throw an error when only given a field that does not exist in schema', (done) ->
    payload = { doesnotexist: true }
    try
      db.users.update({}, payload).then (result) ->
        done(result)
    catch e
      e.should.be.ok
      done()

  it 'should update but ignore fields that do not exist in schema', (done) ->
    payload = { doesnotexist: true, newsletter: false }
    db.users.update({}, payload).then (result) ->
      db.users.findOne({}).then (result) ->
        expect(result.doesnotexist).to.be.undefined
        result.newsletter.should.eql(false)
        done()

  it 'should ignore fields that do not exist in schema during an $addToSet w/ $each update', (done) ->
    payload = {
      $addToSet: {
        'account.doesnotexist': { $each: ['jay', 'gab'] },
        'account.friends': { $each: ['jay', 'lou'] }
      }
    }
    db.users.update({}, payload).then (result) ->
      db.users.findOne({}).then (result) ->
        result.newsletter.should.eql(true)
        result.age.should.eql(1)
        result.account.name.should.eql('hey jay')
        result.account.friends.should.eql(['gab', 'jay', 'lou'])
        expect(result.account.friends.doesnotexist).to.be.undefined
        done()

  describe '$inc', ->
    it 'should throw an error given an invalid type', (done) ->
      payload = { '$inc': { age: '1' } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('type')
        done()

    it 'should increment the age field', (done) ->
      payload = { '$inc': { age: -1 } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.age.should.eql(0)
          done()

  describe '$mul', ->
    it 'should double the age field', (done) ->
      payload = { '$mul': { age: 2 } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.age.should.eql(2)
          done()

  describe '$min', ->
    it 'should update the age field given a value less than the original', (done) ->
      payload = { '$min': { age: -1 } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.age.should.eql(-1)
          done()

  describe '$max', ->
    it 'should update the age field given a value greater than the original', (done) ->
      payload = { '$max': { age: 2 } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.age.should.eql(2)
          done()

  describe '$set', ->
    it 'should throw an error given an invalid type', (done) ->
      try
        db.users.update({}, { '$set': {'account.name': 1} }).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('type')
        done()

    it 'should throw an error when violating the minLength constraint', (done) ->
      try
        db.users.update({}, { '$set': {'account.name': ''} }).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('minLength')
        done()

    it 'should throw an error when violating the maxLength constraint', (done) ->
      try
        db.users.update({}, { '$set': {'account.name': 'abcdefghijklmnopqrstuvqxyz'} }).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('maxLength')
        done()

    it 'should update using the default value if given null and notNull is true', (done) ->
      db.users.update({}, { '$set': {'account.friends': null} }).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql([])
          done()

    it 'should update a field w/ null if notNull is false', (done) ->
      db.users.update({}, { '$set': { age: null } }).then (result) ->
        db.users.findOne({}).then (result) ->
          expect(result.age).to.eql(null)
          done()

    it 'should update a nested field and not add extra fields', (done) ->
      db.users.update({}, { '$set': {'account.name': 'gus'} }).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.name.should.eql('hey gus')
          result.account.friends.should.eql(['gab'])
          result.newsletter.should.eql(true)
          result.age.should.eql(1)
          Object.keys(result).length.should.eql(4) # _id field adds a field.
          done()

  describe '$addToSet', ->
    it 'should add an item to the friends array', (done) ->
      db.users.update({}, { '$addToSet': {'account.friends': 'gus'} }).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql(['gab', 'gus'])
          done()

    it 'should add multiple items using $each to an array', (done) ->
      payload = { '$addToSet': { 'account.friends': { '$each': ['lou', 'gus'] } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql(['gab', 'lou', 'gus'])
          done()

  describe '$push', ->
    it 'should add an item to the friends array', (done) ->
      db.users.update({}, { '$push': {'account.friends': 'gus'} }).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql(['gab', 'gus'])
          done()

    it 'should add multiple items using $each to an array and apply the $slice operator', (done) ->
      payload = { '$push': { 'account.friends': { '$each': ['lou', 'gus', 'sam'], '$slice': 2 } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.should.eql(['gab', 'lou'])
          done()
