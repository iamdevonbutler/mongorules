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
      result.values.name.should.be.ok
      Object.keys(result.arrayValues).length.should.eql(0)
      Object.keys(result.arrayObjects).length.should.eql(0)
      Object.keys(result.arrayArrayValues).length.should.eql(0)
      Object.keys(result.arrayArrayObjects).length.should.eql(0)

    it 'should process a schema of values in arrays', ->
      result = schema._normalizeSchema(schemaArrayOfValues)
      result.arrayValues.should.be.ok
      Object.keys(result.values).length.should.eql(0)
      Object.keys(result.arrayObjects).length.should.eql(0)
      Object.keys(result.arrayArrayValues).length.should.eql(0)
      Object.keys(result.arrayArrayObjects).length.should.eql(0)

    it 'should process a schema of objects in arrays', ->
      result = schema._normalizeSchema(schemaArrayOfObjects)
      result.arrayObjects.should.be.ok
      Object.keys(result.values).length.should.eql(0)
      Object.keys(result.arrayValues).length.should.eql(0)
      Object.keys(result.arrayArrayValues).length.should.eql(0)
      Object.keys(result.arrayArrayObjects).length.should.eql(0)

    it 'should process a schema of values in arrays in arrays', ->
      result = schema._normalizeSchema(schemaArrayOfArrayOfValues)
      result.arrayArrayValues.should.be.ok
      Object.keys(result.values).length.should.eql(0)
      Object.keys(result.arrayValues).length.should.eql(0)
      Object.keys(result.arrayObjects).length.should.eql(0)
      Object.keys(result.arrayArrayObjects).length.should.eql(0)

    it 'should process a schema of objects in arrays in arrays', ->
      result = schema._normalizeSchema(schemaArrayOfArrayOfObjects)
      console.log(result);
      result.arrayArrayObjects.should.be.ok
      Object.keys(result.values).length.should.eql(0)
      Object.keys(result.arrayValues).length.should.eql(0)
      Object.keys(result.arrayObjects).length.should.eql(0)
      Object.keys(result.arrayArrayValues).length.should.eql(0)

  describe '_setSchemaDefaults():', ->
    it 'should set default values for all schema properties', ->
      defaults = schema._setSchemaDefaults({})
      expect(defaults.required).to.not.be.undefined
      expect(defaults.default).to.not.be.undefined
      expect(defaults.type).to.not.be.undefined
      expect(defaults.trim).to.not.be.undefined
      expect(defaults.lowercase).to.not.be.undefined
      expect(defaults.denyXSS).to.not.be.undefined
      expect(defaults.sanitize).to.not.be.undefined
      expect(defaults.transform).to.not.be.undefined
      expect(defaults.validate).to.not.be.undefined
      expect(defaults.dateFormat).to.not.be.undefined
      Object.keys(defaults).length.should.eql(10)

    describe '_setArraySchemaDefaults()', ->
      defaults = schema._setArraySchemaDefaults({})
      expect(defaults.required).to.not.be.undefined
      expect(defaults.default).to.not.be.undefined
      Object.keys(defaults).length.should.eql(2)

  describe '_validateSchema():', ->
