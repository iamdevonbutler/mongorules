'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

schema = require('../lib/schema')
schemaSimple = require('./fixtures/schema.simple')
schemaArrayOfValues = require('./fixtures/schema.arrayofvalues')
schemaArrayOfObjects = require('./fixtures/schema.arrayofobjects')
schemaArrayOfArrayOfValues= require('./fixtures/schema.arrayofarraysofvalues')
schemaArrayOfArrayOfObjects = require('./fixtures/schema.arrayofarraysofobjects')


describe 'Schema:', ->

  describe '_normalizeSchema():', ->
    it 'should process a schema consisting of non-array values', ->
      result = schema._normalizeSchema(schemaSimple)
      Object.keys(result.values).length.should.be.ok
      Object.keys(result.arrays).length.should.not.be.ok

    it 'should process a schema of values in arrays', ->
      result = schema._normalizeSchema(schemaArrayOfValues)
      Object.keys(result.values).length.should.not.be.ok
      Object.keys(result.arrays).length.should.be.ok

    it 'should process a schema of objects in arrays', ->
      result = schema._normalizeSchema(schemaArrayOfObjects)
      Object.keys(result.values).length.should.eql(3)
      Object.keys(result.arrays).length.should.eql(2)

    it 'should process a schema of array of arrays of values', ->
      result = schema._normalizeSchema(schemaArrayOfArrayOfValues)
      Object.keys(result.values).length.should.eql(0)
      Object.keys(result.arrays).length.should.eql(1)

    it 'should process a schema of array of arrays of objects', ->
      result = schema._normalizeSchema(schemaArrayOfArrayOfObjects)
      Object.keys(result.values).length.should.eql(2)
      Object.keys(result.arrays).length.should.eql(1)

  describe '_setSchemaDefaults():', ->
    it 'should set default values for all schema properties', ->
      defaults = schema._setSchemaDefaults({})
      expect(defaults.required).to.not.be.undefined
      expect(defaults.notNull).to.not.be.undefined
      expect(defaults.default).to.not.be.undefined
      expect(defaults.type).to.not.be.undefined
      expect(defaults.trim).to.not.be.undefined
      expect(defaults.lowercase).to.not.be.undefined
      expect(defaults.denyXSS).to.not.be.undefined
      expect(defaults.sanitize).to.not.be.undefined
      expect(defaults.transform).to.not.be.undefined
      expect(defaults.validate).to.not.be.undefined
      expect(defaults.dateFormat).to.not.be.undefined
      expect(defaults.minLength).to.not.be.undefined
      expect(defaults.maxLength).to.not.be.undefined
      Object.keys(defaults).length.should.eql(13)

  describe '_validateSchema():', ->

    it 'should throw if a field has a type of `object` or `array`', ->
      expect(-> schema._validateSchema(schema._setSchemaDefaults({type: 'array'}), 'users')).to.throw()
      expect(-> schema._validateSchema(schema._setSchemaDefaults({type: 'object'}), 'users')).to.throw()

    it 'should throw if given an invalid value for a schema property', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({required: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({type: Boolean}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({trim: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({lowercase: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({sanitize: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({denyXSS: 'true'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({validate: true}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({transform: true}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({dateFormat: true}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({minLength: true}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({maxLength: true}) , 'users')).to.throw()

    it 'should throw if given both sanitize and denyXSS', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({sanitize: true, denyXSS: true}) , 'users')).to.throw()

    it 'should throw if given both default and required', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({default: true, required: true}) , 'users')).to.throw()

    it 'should throw if notNull is true and required is false', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({required: false, notNull: true}) , 'users')).to.throw()

    it 'should throw if type is date and dateFormat is not specified', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({type: 'date'}) , 'users')).to.throw()
      expect(->schema._validateSchema( schema._setSchemaDefaults({type: 'string', dateFormat: 'unix'}) , 'users')).to.throw()

    it 'should throw if type is not a string and the string transformation methods are true', ->
      expect(->schema._validateSchema( schema._setSchemaDefaults({type: 'boolean', trim: true}) , 'users')).to.throw()
