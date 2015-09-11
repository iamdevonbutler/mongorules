'use strict'

require('./setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../lib')
schemaArrayOfObjects = require('./fixtures/schema.arrayofobjects')
schemaArrayOfValues = require('./fixtures/schema.arrayofvalues')

describe 'Integration tests:', ->


  describe 'insert():', ->
    it 'should validate a document and successfully insert', ->
      # models =
      #   users:
      #     schema: schemaArrayOfObjects
      # doc =
      #   account:
      #     friends: [{
      #       name: 'jay',
      #       nicknames: [
      #         {
      #           name: 'el pesh',
      #           giver: [{
      #             name: 'flip',
      #             school: 'bu'
      #           }]
      #         }
      #       ],
      #     }]

      models =
        users:
          schema: schemaArrayOfValues
      doc =
        account:
          friends: ['a', 'b', 'c', 1]

      db.addModels('mongoproxy', models)
      db.users.insert(doc).then (result) ->
        console.log(result);

  #   it 'should insert documents into multiple databases.', (done) ->
  #   it 'should insert an array of documents.', (done) ->
  #   it 'should insert a document if a schema for collection does not exist.', (done) ->
  #     db.users.insert({ a:1 }).then (result) ->
  #       console.log();
  #       expect(result.insertedCount).to.be.eql(1)
  #       done()
