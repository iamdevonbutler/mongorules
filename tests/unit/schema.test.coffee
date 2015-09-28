'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

_ = require('lodash')
schema = require('../../lib/schema')
func = (x) -> x * x

schemaValues = null
schemaArrayOfValues = null
schemaArrayOfObjects = null
schemaArrayOfArrayOfValues = null
schemaArrayOfArrayOfObjects = null

describe 'Schema:', ->

  beforeEach (done) ->
    schemaValues = _.clone(require('../fixtures/schema.values'))
    schemaArrayOfValues = _.clone(require('../fixtures/schema.arrayofvalues'))
    schemaArrayOfObjects = _.clone(require('../fixtures/schema.arrayofobjects'))
    schemaArrayOfArrayOfValues = _.clone(require('../fixtures/schema.arrayofarraysofvalues'))
    schemaArrayOfArrayOfObjects = _.clone(require('../fixtures/schema.arrayofarraysofobjects'))
    done()

  describe '_addIdFieldToSchema', ->
    it 'should return false when executing the validate function given an invalid ID', ->
      result = schema._addIdFieldToSchema(schemaValues)._id.validate('a')
      result.should.eql(false)

    it 'should return true when executing the validate function given a valid ID', ->
      result = schema._addIdFieldToSchema(schemaValues)._id.validate('560037cdfa952916b820528e')
      result.should.eql(true)

    it 'should add an _id field to a schema when one does not already exist', ->
      result = schema._addIdFieldToSchema(schemaValues)
      expect(result._id).to.exist

    it 'should not add an _id field to a schema if one already exists', ->
        schemaValues._id = { type: 'string' }
        result = schema._addIdFieldToSchema(schemaValues)
        result._id.type.should.eql('string')

  describe '_arrayifySchemaValue()', ->
    it 'should transform a validate/transform function into an array containing a function', ->
      result = schema._arrayifySchemaValue({ transform: func, validate: func })
      result.transform[0].should.eql(func)
      result.validate[0].should.eql(func)
    it 'should transform a minLength/maxLength value into an array containing a minLength/maxLength value', ->
      result = schema._arrayifySchemaValue({ minLength: 1, maxLength: 1 })
      result.minLength[0].should.eql(1)
      result.maxLength[0].should.eql(1)

  describe '_sortByFieldKey():', ->
    it 'should reorder an object by key by splitting on `.`.', ->
      obj =
        'a.a': 1
        'a.b': 1
        'a': 1
      result = schema._sortByFieldKey(obj)
      keys = Object.keys(result)
      keys[0].should.eql('a')
      keys[1].should.eql('a.a')
      keys[2].should.eql('a.b')

  describe '_findSchemaArrayOfObjectsChildFields():', ->
    it 'should return a nested child object given a parent schema field key.', ->
      result = schema._findSchemaArrayOfObjectsChildFields(schemaArrayOfObjects, 'account.friends.nicknames');
      result['account.friends.nicknames.name'].should.be.ok
      result['account.friends.nicknames.giver'].should.be.ok
      result['account.friends.nicknames.giver.name'].should.be.ok

    it 'should return null if no child objects exist.', ->
      result = schema._findSchemaArrayOfObjectsChildFields(schemaArrayOfObjects, 'account.friends.eggs');
      expect(result).to.eql(null)

  describe '_preprocessSchema():', ->
    it 'should process a schema consisting of non-array values', ->
      result = schema._preprocessSchema(schemaValues)
      result.newsletter.should.be.ok
      result.age.should.be.ok
      result.birthday.should.be.ok
      result.updated.should.be.ok
      result['account.name'].should.be.ok
      result['account.friends'].should.be.ok
      result['account.friends']._type.should.eql('arrayofvalues')
      result._id.should.be.ok

    it 'should process a schema of values in arrays', ->
      result = schema._preprocessSchema(schemaArrayOfValues)
      result['account.friends'].should.be.ok
      result['account.friends']._type.should.eql('arrayofvalues')
      result._id.should.be.ok

    it 'should process a schema of objects in arrays', ->
      result = schema._preprocessSchema(schemaArrayOfObjects)
      result._id.should.be.ok
      result['account.friends'].should.be.ok
      result['account.friends']._type.should.eql('arrayofobjects')
      result['account.friends.nicknames'].should.be.ok
      result['account.friends.nicknames']._type.should.eql('arrayofobjects')
      result['account.friends.nicknames.name'].should.be.ok
      result['account.friends.nicknames.giver'].should.be.ok
      result['account.friends.nicknames.giver']._type.should.eql('arrayofobjects')
      result['account.friends.nicknames.giver.name'].should.be.ok

    it 'should process a schema of array of arrays of values', ->
      result = schema._preprocessSchema(schemaArrayOfArrayOfValues)
      result._id.should.be.ok
      result.locations.should.be.ok
      result.locations._type.should.eql('arrayofarraysofvalues')

    it 'should process a schema of array of arrays of objects', ->
      result = schema._preprocessSchema(schemaArrayOfArrayOfObjects)
      result._id.should.be.ok
      result['account.friends'].should.be.ok
      result['account.friends']._type.should.eql('arrayofarraysofobjects')
      result['account.friends.name'].should.be.ok
      result['account.friends.age'].should.be.ok


  describe '_setSchemaDefaults():', ->
    it 'should set default values for all schema properties', ->
      defaults = schema._setSchemaDefaults({})
      expect(defaults.required).to.not.be.undefined
      expect(defaults.notNull).to.not.be.undefined
      expect(defaults.default).to.be.undefined
      expect(defaults.type).to.not.be.undefined
      expect(defaults.trim).to.not.be.undefined
      expect(defaults.lowercase).to.not.be.undefined
      expect(defaults.uppercase).to.not.be.undefined
      expect(defaults.denyXSS).to.not.be.undefined
      expect(defaults.filterNulls).to.not.be.undefined
      expect(defaults.sanitize).to.not.be.undefined
      expect(defaults.transform).to.not.be.undefined
      expect(defaults.validate).to.not.be.undefined
      expect(defaults.dateFormat).to.not.be.undefined
      expect(defaults.minLength).to.not.be.undefined
      expect(defaults.maxLength).to.not.be.undefined
      Object.keys(defaults).length.should.eql(15)

  describe '_validateSchema():', ->

    it 'should throw if a field has a type of `object` or `array`', ->
      expect(-> schema._validateSchema(schema._setSchemaDefaults({type: 'array'}), 'users')).to.throw()
      expect(-> schema._validateSchema(schema._setSchemaDefaults({type: 'object'}), 'users')).to.throw()

    it 'should throw if given an invalid value for a schema property', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({required: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({required: true}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({notNull: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({notNull: true, required: true}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({type: Boolean}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({type: 'boolean'}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({dateFormat: true}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({dateFormat: 'timestamp'}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({trim: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({trim: true}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({uppercase: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({uppercase: true}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({lowercase: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({lowercase: true}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({sanitize: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({sanitize: true}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({denyXSS: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({denyXSS: true}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({validate: [true]}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({validate: func}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({transform: [true]}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({transform: func}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({filterNulls: 1}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({filterNulls: true}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({minLength: '1'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({minLength: 1}) , 'users')).to.not.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({minLength: [1]}) , 'users')).to.not.throw()

      expect(->schema._validateSchema( schema._setSchemaDefaults({maxLength: '1'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({maxLength: 1}) , 'users')).to.not.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({maxLength: [1]}) , 'users')).to.not.throw()

    it 'should throw if default is null and notNull is true', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({default: null, notNull: true}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({default: null, notNull: false}) , 'users')).to.not.throw()

    it 'should throw if given both sanitize and denyXSS', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({sanitize: true, denyXSS: true}) , 'users')).to.throw()

    it 'should throw if given both default and required', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({default: true, required: true}) , 'users')).to.throw()

    it 'should throw if type is date and dateFormat is not specified', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({type: 'date'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({type: 'string', dateFormat: 'unix'}) , 'users')).to.throw()

    it 'should throw if type is not a string and the string transformation methods are true', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({type: 'boolean', trim: true}) , 'users')).to.throw()
