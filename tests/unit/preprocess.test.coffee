# 'use strict'
#
# require('babel/register')
#
# #Module dependencies.
# should = require('chai').should()
# expect = require('chai').expect
# assert = require('chai').assert
#
# preprocess = require('../../lib/preprocess')
#
# describe 'Preprocess:', ->
#
#   describe '_preprocessPayload', ->
#     it 'should parse an insert payload', ->
#       payload = {
#         account: {
#           name: 'jay',
#           friends: [{ name: 'gab', age: 26 }],
#           tags: [[1], [2]]
#         }
#       }
#       result = preprocess._preprocessPayload(payload)
#       console.log(result);
#       result.account.name.should.eql({payloadKey: 'account.name', value: 'jay', isEmbeddedField: false})
#       result.account.friends.should.eql({payloadKey: 'account.friends', value: [{name: 'gab', age: 26}], isEmbeddedField: false})
#       result.account.tags.should.eql({payloadKey: 'account.tags', value: [[1], [2]], isEmbeddedField: false})
#
#     it 'should parse a $set payload w/ embedded fields', ->
#     it 'should parse a $set payload w/ array item update fields', ->
#       payload = {
#         $set: {
#           "tags.1": "rain gear",
#           "ratings.0.rating": 2
#         }
#       }
#
#      result = {
#        'tags': {
#          value: 'rain gear',
#          payloadPath: ['$set', 'tags.1'],
#          isEmbeddedField: true,
#          isEach: false,
#          isArrayItemUpdate: true,
#        },
#        'ratings.rating': {
#          value: 2,
#          payloadPath: ['$set', 'ratings.0.rating'],
#          isEmbeddedField: true,
#          isEach: false,
#        }
#      }
#
#     it 'should parse a $addToSet payload', ->
#       payload = {
#         $addToSet: {
#           tags: "camera"
#         }
#       }
#
#     it 'should parse a $addToSet w/ $each payload', ->
#       payload = {
#         $addToSet: {
#           tags: {
#             $each: [ "camera", "electronics", "accessories" ]
#           }
#         }
#       }
#
#   describe '_queryFieldsExistInSchema', ->
#     it 'should return true given a nested query with fields that are present in schema', ->
#       query = { account: { name: 'hey gab', friends: { name: { nickname: 'lou' } } } }
#       schemaFields = ['account.name', 'account.friends.name.nickname']
#       result = preprocess._queryFieldsExistInSchema(query, schemaFields)
#       result.should.eql(true)
#
#     it 'should return false given a field in the query not present in schema.', ->
#       query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
#       schemaFields = ['quantity']
#       result = preprocess._queryFieldsExistInSchema(query, schemaFields)
#       result.should.eql(false)
#
#       query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
#       schemaFields = ['quantity']
#       result = preprocess._queryFieldsExistInSchema(query, schemaFields)
#       result.should.eql(false)
#
#     it 'should return true given a fields in the query that are present in schema.', ->
#       query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
#       schemaFields = ['price']
#       result = preprocess._queryFieldsExistInSchema(query, schemaFields)
#       result.should.eql(true)
#
#       query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
#       schemaFields = ['quantity', 'price']
#       result = preprocess._queryFieldsExistInSchema(query, schemaFields)
#       result.should.eql(true)
#
#   describe '_getQueryFields()', ->
#     it 'should return an array of query fields present in an $elemMatch query', ->
#       query = {name: 4, grades: { $elemMatch: { grade: { $lte: 90 }, mean: { $gt: 80 } } } }
#       result = preprocess._getQueryFields(query)
#       result.length.should.eql(3)
#       result.should.contain('name')
#       result.should.contain('grades.grade')
#       result.should.contain('grades.mean')
#
#     it 'should return an array of query fields present in an $and query.', ->
#       query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
#       result = preprocess._getQueryFields(query)
#       result.should.eql(['price'])
#
#     it 'should return an array of query fields present in an $all query.', ->
#       query = { tags: { $all: [ "ssl" , "security" ] } }
#       result = preprocess._getQueryFields(query)
#       result.should.eql(['tags'])
#
#     it 'should return an array of query fields present in an $or query.', ->
#       query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
#       result = preprocess._getQueryFields(query)
#       result.should.eql(['quantity', 'price'])
#
#     it 'should return an array of query fields present in a $not query.', ->
#       query = { price: { $not: { $gt: 1.99 } }, location: { $eq: 'usa' } }
#       result = preprocess._getQueryFields(query)
#       result.should.eql(['price', 'location'])
#
#     it 'should return an array of query fields present in a $nor query.', ->
#       query = { $nor: [ { price: 1.99 }, { sale: true } ]  }
#       result = preprocess._getQueryFields(query)
#       result.should.eql(['price', 'sale'])
#
#     it 'should return an array of query fields present in a $exists query.', ->
#       query = { qty: { $exists: true, $nin: [ 5, 15 ] } }
#       result = preprocess._getQueryFields(query)
#       result.should.eql(['qty'])
#
#     it 'should return an array of query fields present in a query using $eq.', ->
#       query = { "item.name": { $eq: "ab" } }
#       result = preprocess._getQueryFields(query)
#       result.should.eql(['item.name'])
#
#       query = { "item.name.0": { $eq: "ab" }, friends: ['gab'] }
#       result = preprocess._getQueryFields(query)
#       result.should.eql(['item.name', 'friends'])
#
#
#   describe '_replaceDocumentInPayload()', ->
#     it 'should eat poo', ->
#       obj =
#         account:
#           name: 'jay'
#         'friendCount.$.relatives':
#           $each: [1,2,3]
#       doc =
#         account:
#           name: 'gus'
#         friendCount:
#           relatives: [2,3,4]
#
#       result = preprocess._replaceDocumentInPayload(obj, doc)
