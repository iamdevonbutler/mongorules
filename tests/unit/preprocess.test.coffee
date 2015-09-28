'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert
_ = require('lodash')

preprocess = require('../../lib/preprocess')

schemaValues = require('../fixtures/schema.values')

describe 'Preprocess:', ->

  describe '_preprocessPayload', ->
    describe 'insert:', ->
      it 'should validate, transform, and reconstruct a payload for the values schema', ->
        schemaValues = _.clone(schemaValues)
        payload  = {
          account: {
            name: 'jay'
          }
          newsletter: false
        }
        parsedPayload = preprocess._parsePayload(payload)
        result = preprocess._preprocessPayload(parsedPayload, schemaValues)
        console.log(result);

  describe '_parsePayload', ->
    it 'should parse an insert payload', ->
      payload = {
        account: {
          name: 'jay',
          email: 'j@j.com',
          friends: [{ name: 'gab' },  {name: 'lou'}]
        },
        notifications: [1,2,3]
      }

      parsedPayload = {
        'account.name': {
          value: 'jay',
          payloadPath: ['account', 'name'],
          fieldInSubdocument: true,
          isEach: false,
          isArrayItemUpdate: false
        },
        'account.email': {
          value: 'j@j.com',
          payloadPath: ['account', 'email'],
          fieldInSubdocument: true,
          isEach: false,
          isArrayItemUpdate: false
        },
        'account.friends': {
          value: [{ name: 'gab' },  {name: 'lou'}],
          payloadPath: ['account', 'friends'],
          fieldInSubdocument: true,
          isEach: false,
          isArrayItemUpdate: false
        },
        'notifications': {
          value: [1,2,3],
          payloadPath: ['notifications'],
          fieldInSubdocument: false,
          isEach: false,
          isArrayItemUpdate: false
        },
      }

      result = preprocess._parsePayload(payload)
      result.should.eql(parsedPayload)

    it 'should parse a $set payload', ->
      payload = {
        "tags.1": "rain gear",
        "ratings.0.rating": 2,
        "account": {
          name: 'jay',
          location: {
            name: 'home'
          }
        }
      }

      parsedPayload = {
        'tags': {
         value: 'rain gear',
         payloadPath: ['tags.1'],
         fieldInSubdocument: false,
         isEach: false,
         isArrayItemUpdate: true,
        },
        'ratings.rating': {
         value: 2,
         payloadPath: ['ratings.0.rating'],
         fieldInSubdocument: false,
         isEach: false,
         isArrayItemUpdate: true
        }
        'account.name': {
         value: 'jay',
         payloadPath: ['account', 'name'],
         fieldInSubdocument: true,
         isEach: false,
         isArrayItemUpdate: false
        },
        'account.location.name': {
         value: 'home',
         payloadPath: ['account', 'location', 'name'],
         fieldInSubdocument: true,
         isEach: false,
         isArrayItemUpdate: false
        }
      }

      result = preprocess._parsePayload(payload, '$set')
      result.should.eql(parsedPayload)

    it 'should parse a $addToSet payload', ->
      payload = {
        'account.notifications': 1
      }
      parsedPayload = {
        'account.notifications': {
           value: 1,
           payloadPath: ['account.notifications'],
           fieldInSubdocument: false,
           isEach: false,
           isArrayItemUpdate: false
        }
      }
      result = preprocess._parsePayload(payload, '$addToSet')
      result.should.eql(parsedPayload)

    it 'should parse a $addToSet w/ $each payload', ->
      payload = {
        'account.notifications': {
          $each: [1,2,3]
        }
      }
      parsedPayload = {
        'account.notifications': {
           value: [1,2,3],
           payloadPath: ['account.notifications', '$each'],
           fieldInSubdocument: false,
           isEach: true,
           isArrayItemUpdate: false
        }
      }
      result = preprocess._parsePayload(payload, '$addToSet')
      result.should.eql(parsedPayload)

  describe '_queryFieldsExistInSchema', ->
    it 'should return true given a nested query with fields that are present in schema', ->
      query = { account: { name: 'hey gab', friends: { name: { nickname: 'lou' } } } }
      schemaFields = ['account.name', 'account.friends.name.nickname']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(true)

    it 'should return false given a field in the query not present in schema.', ->
      query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
      schemaFields = ['quantity']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(false)

      query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
      schemaFields = ['quantity']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(false)

    it 'should return true given a fields in the query that are present in schema.', ->
      query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
      schemaFields = ['price']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(true)

      query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
      schemaFields = ['quantity', 'price']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(true)

  describe '_getQueryFields()', ->
    it 'should return an array of query fields present in an $elemMatch query', ->
      query = {name: 4, grades: { $elemMatch: { grade: { $lte: 90 }, mean: { $gt: 80 } } } }
      result = preprocess._getQueryFields(query)
      result.length.should.eql(3)
      result.should.contain('name')
      result.should.contain('grades.grade')
      result.should.contain('grades.mean')

    it 'should return an array of query fields present in an $and query.', ->
      query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
      result = preprocess._getQueryFields(query)
      result.should.eql(['price'])

    it 'should return an array of query fields present in an $all query.', ->
      query = { tags: { $all: [ "ssl" , "security" ] } }
      result = preprocess._getQueryFields(query)
      result.should.eql(['tags'])

    it 'should return an array of query fields present in an $or query.', ->
      query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
      result = preprocess._getQueryFields(query)
      result.should.eql(['quantity', 'price'])

    it 'should return an array of query fields present in a $not query.', ->
      query = { price: { $not: { $gt: 1.99 } }, location: { $eq: 'usa' } }
      result = preprocess._getQueryFields(query)
      result.should.eql(['price', 'location'])

    it 'should return an array of query fields present in a $nor query.', ->
      query = { $nor: [ { price: 1.99 }, { sale: true } ]  }
      result = preprocess._getQueryFields(query)
      result.should.eql(['price', 'sale'])

    it 'should return an array of query fields present in a $exists query.', ->
      query = { qty: { $exists: true, $nin: [ 5, 15 ] } }
      result = preprocess._getQueryFields(query)
      result.should.eql(['qty'])

    it 'should return an array of query fields present in a query using $eq.', ->
      query = { "item.name": { $eq: "ab" } }
      result = preprocess._getQueryFields(query)
      result.should.eql(['item.name'])

      query = { "item.name.0": { $eq: "ab" }, friends: ['gab'] }
      result = preprocess._getQueryFields(query)
      result.should.eql(['item.name', 'friends'])
