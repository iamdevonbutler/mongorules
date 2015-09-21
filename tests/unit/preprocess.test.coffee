'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

preprocess = require('../../lib/preprocess')

describe 'Preprocess:', ->


  describe '_queryFieldsExistInSchema', ->
    it 'should return false given a field in a the query not present in schema.', ->
      query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
      schemaFields = ['quantity']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(false)

      query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
      schemaFields = ['quantity']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(false)

    it 'should return true given a fields in a the query that are present in schema.', ->
      query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
      schemaFields = ['price']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(false)

      query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
      schemaFields = ['quantity', 'price']
      result = preprocess._queryFieldsExistInSchema(query, schemaFields)
      result.should.eql(false)

  describe '_getQueryFields()', ->
    it 'should return an array of query fields present in an $elemMatch query', ->
      query = {name: 4, grades: { $elemMatch: { grade: { $lte: 90 }, mean: { $gt: 80 } } } }
      result = preprocess._getQueryFields(query)
      console.log(result);
      result.length.should.eql(4)
      result.should.contain('name')
      result.should.contain('grades')
      result.should.contain('grades.grade')
      result.should.contain('grades.mean')

    it 'should return an array of query fields present in an $and query.', ->
      query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
      result = preprocess._getQueryFields(query)
      console.log(result);
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


  describe '_replaceDocumentInPayload()', ->
    it 'should eat poo', ->
      obj =
        account:
          name: 'jay'
        'friendCount.$.relatives':
          $each: [1,2,3]
      doc =
        account:
          name: 'gus'
        friendCount:
          relatives: [2,3,4]

      result = preprocess._replaceDocumentInPayload(obj, doc)

  describe '_getDocumentFromPayload()', ->

    it 'should', ->
      obj =
        account:
          name: 'jay'
        'friendCount.$.relatives':
          $each: [1,2,3]
      result = preprocess._getDocumentFromPayload(obj)
