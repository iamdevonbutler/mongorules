#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert
_ = require('lodash')

preprocess = require('../../lib/preprocess')
schema = require('../../lib/schema')

schemaValues = require('../fixtures/schema.values')
schemaArrayOfObjects = require('../fixtures/schema.arrayofobjects')
schemaArrayOfObjects = schema.preprocessSchema(_.clone(schemaArrayOfObjects))

describe 'Preprocess:', ->

  # describe '_reconstructPayload', ->

  describe '_getQueryFields():', ->
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

      query = { "item.name.0": { $eq: "ab" }, friends: ['lrn'] }
      result = preprocess._getQueryFields(query)
      result.should.eql(['item.name', 'friends'])
