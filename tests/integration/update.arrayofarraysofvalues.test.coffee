'use strict'

require('../helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../../lib')
schema = require('../fixtures/schema.arrayofarraysofvalues')

describe 'update(): array of arrays of values:', ->

  beforeEach (done) ->
    db.addModel('users', { schema: schema })
    doc = { locations: [ ['jay', 'lou'], ['gab'] ] }
    db.users.insert(doc).then (result) ->
      done()

  describe '$set', ->
    it 'should update a specifc item in the locations array', (done) ->
      payload = { '$set': { 'locations.0': ['sam'] } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne().then (result) ->
          result.locations.length.should.eql(2)
          result.locations[0].should.eql(['sam!'])
          done()

  describe '$addToSet', ->
    it 'should throw an error given an invalid type when expecting an inner array', (done) ->
      payload = { '$addToSet': {'locations': { '$each': [ {a:1} ] } } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('type')
        done()

    it 'should throw an error given an invalid type for inner array value', (done) ->
      payload = { '$addToSet': {'locations': { '$each': [ [1] ] } } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('type')
        done()

    it 'should throw an error when violating the maxLength constraint', (done) ->
      payload = { '$addToSet': {'locations': { '$each': [ ['jay', 'gab', 'lou'] ] } } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('maxLength')
        done()

    it 'should throw an error when violating the minLength constraint', (done) ->
      payload = { '$addToSet': {'locations': { '$each': [ ['jay', ''] ] } } }
      try
        db.users.update({}, payload).then (result) ->
          done(result)
      catch e
        e.errors[0].property.should.eql('minLength')
        done()

    it 'should add an item to the locations array using $each', (done) ->
      payload = { '$addToSet': {'locations': { '$each': [ ['sam'] ] } } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne().then (result) ->
          result.locations.length.should.eql(3)
          result.locations[2].should.eql(['sam!'])
          done()

    it 'should add an item to the locations array', (done) ->
      payload = { '$addToSet': { 'locations': ['sam'] } }
      db.users.update({}, payload).then (result) ->
        db.users.findOne().then (result) ->
          result.locations.length.should.eql(3)
          result.locations[2].should.eql(['sam!'])
          done()
