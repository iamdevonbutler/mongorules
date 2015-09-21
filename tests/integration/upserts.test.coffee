# 'use strict'
#
# require('../helpers/setup')
#
# #Module dependencies.
# should = require('chai').should()
# expect = require('chai').expect
# assert = require('chai').assert
#
# db = require('../../lib')
# schema = require('../fixtures/schema.values')
#
# describe 'Upserts:', ->
#
#   beforeEach (done) ->
#     db.addModel('users', { schema: schema })
#     doc = { account: { friends: ['gab'], name: 'jay' }, newsletter: true, age: 1 }
#     db.users.insert(doc).then (result) ->
#       done()
#
#
#     describe 'update()', ->
#
#       describe '$set', ->
#         # This prevents adding fields to the document from the query.
#         it 'should throw an error when there are missing fields in the query', ->
#
#         it 'should throw an error when the query uses fields that are not in schema', ->
#
#         it 'should update a document given a matching query', ->
#
#         it 'should insert a document given a non matching query', ->
#
#       describe '$setOnInsert', ->
#
#
#
#     describe 'findAndModify()', ->
