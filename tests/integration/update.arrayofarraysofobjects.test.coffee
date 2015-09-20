'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.arrayofarraysofobjects')

describe 'update(): array of arrays of objects:', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc = { account: { friends: [ [{ name: 'gab', age: 26 }] ] } }
    db.users.insert(doc).then (result) ->
      done()

  describe '$set', ->
    it 'should throw an error when trying to update an invalid type', (done) ->
      payload = { '$set': { 'account.friends.0': { name: 'lou', age: 19 } } }
      try
        db.users.update({}, payload).then (result) ->
          db.users.findOne().then (res) ->
            done(result)
      catch e
        e.errors[0].property.should.eql('type')
        done()

    it 'should update a specifc item in the friends array', (done) ->
      payload = { '$set': { 'account.friends.0': [{ name: 'lou', age: 19 }] } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne().then (result) ->
          result.account.friends.length.should.eql(1)
          result.account.friends[0].should.eql([{ name: 'lou!', age: 19 }])
          done()

  describe '$addToSet', ->
    it 'should throw and error when adding an inner array containing an object violating the minLength constraint', (done) ->
      payload = { '$addToSet': { 'account.friends': [{ name: '', age: 19 }] } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('minLength')
        done()

    it 'should add an inner array containing an object', (done) ->
      payload = { '$addToSet': { 'account.friends': [{ name: 'gus', age: 19 }] } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne().then (result) ->
          result.account.friends.length.should.eql(2)
          result.account.friends[1].should.eql([{ name: 'gus!', age: 19 }])
          done()

    it 'should add an inner array containing an object using $each', (done) ->
      payload = { '$addToSet': { 'account.friends': '$each': [ [{ name: 'gus', age: 19 }] ] } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne().then (result) ->
          result.account.friends.length.should.eql(2)
          result.account.friends[1].should.eql([{ name: 'gus!', age: 19 }])
          done()
