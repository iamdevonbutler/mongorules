'use strict'

# require('./setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

db = require('../lib')

# supertest = require('supertest')


describe 'Integration tests:', ->
  # 
  # describe 'insert():', ->
  #   it 'should validate a document and successfully insert', ->
  #     users = {
  #       schema: {
  #         name: { required: true, type: 'string' },
  #         friends: [{ required: true }],
  #         "friends.name": { required: true, type: 'string' }
  #       }
  #     }
  #     db.addModels('mongoproxy-api', users)
  #
  #     db.users.insert({ name: 'name', friends: {name:'name'} }).then (result) ->
  #   it 'should insert documents into multiple databases.', (done) ->
  #   it 'should insert an array of documents.', (done) ->
  #   it 'should insert a document if a schema for collection does not exist.', (done) ->
  #     db.users.insert({ a:1 }).then (result) ->
  #       console.log();
  #       expect(result.insertedCount).to.be.eql(1)
  #       done()
