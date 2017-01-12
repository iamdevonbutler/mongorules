#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert
_ = require('lodash')

preprocess = require('../../lib/preprocess')
schema = require('../../lib/schema')

schemaValues = require('../fixtures/schema.values')
schemaArrayOfObjects = require('../fixtures/schema.arrayofobjects')
schemaArrayOfObjects = schema._preprocessSchema(_.clone(schemaArrayOfObjects))

describe 'Preprocess:', ->

  # describe '_reconstructPayload', ->

  describe '_validateRequiredFields():', ->
    it 'should return an errors array given a missing field for an insert operation', ->
      payload = {name: 'jay'}
      payload = preprocess._deconstructPayload(payload, 'account.friends.nicknames')
      filteredSchema = preprocess._filterSchema(payload, schemaArrayOfObjects, null, null, 'account.friends.nicknames')
      errors = preprocess._validateRequiredFields(payload, filteredSchema, null, null, 'account.friends.nicknames')
      errors.length.should.eql(1)

    it 'should not return an errors array given a proper fields for an insert operation', ->
      payload = {name: 'jay', giver: [{name: 'jay'}]}
      payload = preprocess._deconstructPayload(payload, 'account.friends.nicknames')
      filteredSchema = preprocess._filterSchema(payload, schemaArrayOfObjects, null, null, 'account.friends.nicknames')
      errors = preprocess._validateRequiredFields(payload, filteredSchema, null, null, 'account.friends.nicknames')
      expect(errors).to.be.null

    it 'should return an errors array given a missing field for an subdocument update operation', ->
      payload = {name: 'jay'}
      payload = preprocess._deconstructPayload(payload, 'account.friends.nicknames')
      filteredSchema = preprocess._filterSchema(payload, schemaArrayOfObjects, null, null, 'account.friends.nicknames')
      errors = preprocess._validateRequiredFields(payload, filteredSchema, '$set', null, 'account.friends.nicknames')
      errors.length.should.eql(1)

    it 'should not return an errors array given a proper fields for an subdocument update operation', ->
      payload = {name: 'jay', giver: [{name: 'jay'}]}
      payload = preprocess._deconstructPayload(payload, 'account.friends.nicknames')
      filteredSchema = preprocess._filterSchema(payload, schemaArrayOfObjects, null, null, 'account.friends.nicknames')
      errors = preprocess._validateRequiredFields(payload, filteredSchema, '$set', null, 'account.friends.nicknames')
      expect(errors).to.be.null

    it 'should not return an errors array for an embedded field update operation', ->
      payload = { 'account.friends.nicknames.0.name': 'jay' }
      payload = preprocess._deconstructPayload(payload)
      filteredSchema = preprocess._filterSchema(payload, schemaArrayOfObjects)
      errors = preprocess._validateRequiredFields(payload, filteredSchema, '$set')
      expect(errors).to.be.null

  describe '_setDefaultValues():', ->
    it 'should set default values for an insert given the array of objects schema', ->
      payload = {}
      payload = preprocess._deconstructPayload(payload)
      filteredSchema = preprocess._filterSchema(payload, schemaArrayOfObjects)
      result = preprocess._setDefaultValues(payload, filteredSchema, null)
      Object.keys(result).length.should.eql(1)
      result['account.friends'].value.should.eql([])

    it 'should set default values for a subdocument update', ->
      payload = { name: 'jay' }
      payload = preprocess._deconstructPayload(payload, 'account.friends')
      filteredSchema = preprocess._filterSchema(payload, schemaArrayOfObjects, null, null, 'account.friends')
      result = preprocess._setDefaultValues(payload, filteredSchema, '$set', null, 'account.friends')
      Object.keys(result).length.should.eql(2)
      result.name.value.should.eql('jay')
      result.nicknames.value.should.eql([])

    it 'should not set default values for a embedded field update', ->
      payload = { 'account.friends.0.name': 'jay' }
      payload = preprocess._deconstructPayload(payload)
      filteredSchema = preprocess._filterSchema(payload, schemaArrayOfObjects, '$set')
      result = preprocess._setDefaultValues(payload, filteredSchema, '$set')
      Object.keys(result).length.should.eql(1)
      result['account.friends.name'].value.should.eql('jay')

  describe '_filterSchema():', ->
    it 'should filter out nested schemas (schemas in arrays)', ->
      result = preprocess._filterSchema({}, schemaArrayOfObjects)
      Object.keys(result).should.eql(['account.friends', '_id'])

    it 'should filter out nested schemas and parent schemas given a parent key', ->
      result = preprocess._filterSchema({}, schemaArrayOfObjects, null, null, 'account.friends')
      Object.keys(result).should.eql(['account.friends.name', 'account.friends.nicknames'])

      result = preprocess._filterSchema({}, schemaArrayOfObjects, null, null, 'account.friends.nicknames')
      Object.keys(result).should.eql(['account.friends.nicknames.name', 'account.friends.nicknames.giver'])

    it 'should filter a subdocument given a payload w/ an embedded field', ->
      payload = { 'account.friends.0.name': 'jay' }
      payload = preprocess._deconstructPayload(payload)
      result = preprocess._filterSchema(payload, schemaArrayOfObjects, '$set')
      Object.keys(result).should.eql([])

  describe '_preprocessPayload():', ->

    describe 'update:', ->
      it 'should validate, and transform a payload given the array of objects schema', ->
        schemaArrayOfObjects = _.clone(schemaArrayOfObjects)
        payload = {
          account: {
            friends: [
              { name: 'jay', nicknames: [ {name: 'gus', giver: [{name: 'flip'}, {name: 'gus'}] } ] },
              { name: 'lou' }
            ]
          }
        }
        result = preprocess._preprocessPayload(payload, schemaArrayOfObjects, '$set')
        result.payload.should.eql({
          account: {
            friends: [
              { name: 'jay!', nicknames: [ {name: 'gus', giver: [{name: 'flip'}, {name: 'gus'}] } ] },
              { name: 'lou!', nicknames: [] }
            ]
          }
        });

    describe 'insert:', ->
      it 'should validate, and transform a payload given the array of objects schema', ->
        schemaArrayOfObjects = _.clone(schemaArrayOfObjects)
        payload = {
          account: {
            friends: [
              { name: 'jay', nicknames: [ {name: 'gus', giver: [{name: 'flip'}, {name: 'gus'}] } ] },
              { name: 'lou' }
            ]
          }
        }
        result = preprocess._preprocessPayload(payload, schemaArrayOfObjects)
        result.payload.should.eql({
          account: {
            friends: [
              { name: 'jay!', nicknames: [ {name: 'gus', giver: [{name: 'flip'}, {name: 'gus'}] } ] },
              { name: 'lou!', nicknames: [] }
            ]
          }
        });

  describe '_deconstructPayload():', ->
    it 'should deconstruct an item in array update payload', ->
      payload = { 'account.friends.0': { name: 1 } }
      parsedPayload = {'account.friends': {
        value: {name: 1},
        payloadPath: ['account.friends.0'],
        fieldInSubdocument: false,
        isEach: false,
        modifiers: null,
        itemInArrayUpdate: true
      }}
      result = preprocess._deconstructPayload(payload)
      result.should.eql(parsedPayload)

    it 'should deconstruct an insert payload', ->
      payload = {
        account: {
          name: 'jay',
          email: 'j@j.com',
          friends: [{ name: 'lrn' },  {name: 'lou'}]
        },
        notifications: [1,2,3]
      }

      parsedPayload = {
        'account.name': {
          value: 'jay',
          payloadPath: ['account', 'name'],
          fieldInSubdocument: true,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        },
        'account.email': {
          value: 'j@j.com',
          payloadPath: ['account', 'email'],
          fieldInSubdocument: true,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        },
        'account.friends': {
          value: [{ name: 'lrn' },  {name: 'lou'}],
          payloadPath: ['account', 'friends'],
          fieldInSubdocument: true,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        },
        'notifications': {
          value: [1,2,3],
          payloadPath: ['notifications'],
          fieldInSubdocument: false,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        },
      }

      result = preprocess._deconstructPayload(payload)
      result.should.eql(parsedPayload)

    it 'should deconstruct a $set payload', ->
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
         modifiers: null,
         itemInArrayUpdate: true,
        },
        'ratings.rating': {
         value: 2,
         payloadPath: ['ratings.0.rating'],
         fieldInSubdocument: false,
         isEach: false,
         modifiers: null,
         itemInArrayUpdate: true
        }
        'account.name': {
         value: 'jay',
         payloadPath: ['account', 'name'],
         fieldInSubdocument: true,
         isEach: false,
         modifiers: null,
         itemInArrayUpdate: false
        },
        'account.location.name': {
         value: 'home',
         payloadPath: ['account', 'location', 'name'],
         fieldInSubdocument: true,
         isEach: false,
         modifiers: null,
         itemInArrayUpdate: false
        }
      }

      result = preprocess._deconstructPayload(payload)
      result.should.eql(parsedPayload)

    it 'should deconstruct a $addToSet payload', ->
      payload = {
        'account.notifications': 1
      }
      parsedPayload = {
        'account.notifications': {
           value: 1,
           payloadPath: ['account.notifications'],
           fieldInSubdocument: false,
           isEach: false,
           modifiers: null,
           itemInArrayUpdate: false
        }
      }
      result = preprocess._deconstructPayload(payload)
      result.should.eql(parsedPayload)

    it 'should deconstruct a $addToSet w/ $each payload', ->
      payload = {
        'account.notifications': {
          $each: [1,2,3],
          $slice: -5,
          $position: 0
        }
      }
      parsedPayload = {
        'account.notifications': {
           value: [1,2,3],
           payloadPath: ['account.notifications', '$each'],
           modifiers: [{$slice: -5}, {$position: 0}]
           fieldInSubdocument: false,
           isEach: true,
           itemInArrayUpdate: false
        }
      }
      result = preprocess._deconstructPayload(payload)
      result.should.eql(parsedPayload)

  describe '_queryFieldsExistInSchema():', ->
    it 'should return true given a nested query with fields that are present in schema', ->
      query = { account: { name: 'hey lrn', friends: { name: { nickname: 'lou' } } } }
      schema = {'account.name':{}, 'account.friends.name.nickname': {}}
      result = preprocess._queryFieldsExistInSchema(query, schema)
      result.should.eql(true)

    it 'should return false given a field in the query not present in schema.', ->
      query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
      schema = {'quantity': {}}
      result = preprocess._queryFieldsExistInSchema(query, schema)
      result.should.eql(false)

      query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
      schema = {'quantity': {}}
      result = preprocess._queryFieldsExistInSchema(query, schema)
      result.should.eql(false)

    it 'should return true given a fields in the query that are present in schema.', ->
      query = { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] }
      schema = {'price': {}}
      result = preprocess._queryFieldsExistInSchema(query, schema)
      result.should.eql(true)

      query = { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
      schema = {'quantity': {}, 'price': {}}
      result = preprocess._queryFieldsExistInSchema(query, schema)
      result.should.eql(true)

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
