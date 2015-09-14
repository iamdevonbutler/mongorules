'use strict'

require('./helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../lib')
schemaArrayOfObjects = require('./fixtures/schema.arrayofobjects')
schemaArrayOfValues = require('./fixtures/schema.arrayofvalues')
schemaArrayOfArraysOfValues = require('./fixtures/schema.arrayofarraysofvalues')
schemaArrayOfArraysOfObjects = require('./fixtures/schema.arrayofarraysofobjects')

describe 'Integration tests:', ->


  describe 'insert():', ->
    it 'should insert an array of values', (done) ->
      models =
        users:
          schema: schemaArrayOfValues
      doc =
        account:
          friends: ['jay', 'bag', 'gus']

      db.addModels('mongoproxy', models)
      db.users.insert(doc).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends.length.should.eql(3)
          done()

    it 'should insert an array of objects', (done) ->
      models =
        users:
          schema: schemaArrayOfObjects
      doc =
        account:
          friends: [{
            name: 'jay',
            nicknames: [
              {
                name: 'el pesh',
                giver: [{
                  name: 'flip',
                  school: 'bu'
                }]
              }
            ],
          }]

      db.addModels('mongoproxy', models)
      db.users.insert(doc).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.friends[0].name.should.eql('jay')
          result.account.friends[0].nicknames[0].name.should.eql('el pesh')
          result.account.friends[0].nicknames[0].giver[0].name.should.eql('flip')
          result.account.friends[0].nicknames[0].giver[0].school.should.eql('bu')
          done()

    it 'should insert an array of arrays of values', (done) ->
      models =
        users:
          schema: schemaArrayOfArraysOfValues
      doc =
        account:
          locations: [ ['sf', 'bos'], ['nyc', 'mia'] ]

      db.addModels('mongoproxy', models)
      db.users.insert(doc).then (result) ->
        db.users.findOne({}).then (result) ->
          result.account.locations.length.should.eql(2)
          result.account.locations[0].length.should.eql(2)
          result.account.locations[0][0].should.eql('sf')
          result.account.locations[0][1].should.eql('bos')
          result.account.locations[1].length.should.eql(2)
          result.account.locations[1][0].should.eql('nyc')
          result.account.locations[1][1].should.eql('mia')
          done()

  #   it 'should insert documents into multiple databases.', (done) ->
  #   it 'should insert an array of documents.', (done) ->
  #   it 'should insert a document if a schema for collection does not exist.', (done) ->
  #     db.users.insert({ a:1 }).then (result) ->
  #       console.log();
  #       expect(result.insertedCount).to.be.eql(1)
  #       done()
