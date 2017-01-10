#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

utils = require('../../lib/utils')
func = (x) -> x * x

describe 'Utils:', ->

  describe '_isObjectId', ->
    it 'should return false given an invalid ID', ->
      result = utils._isObjectId('a')
      result.should.eql(false)

    it 'should return true given a valid ID', ->
      result = utils._isObjectId('560037cdfa952916b820528e')
      result.should.eql(true)

  describe '_filterNulls', ->
    it 'should filter null values from an array and array of arrays', ->
      result = utils._filterNulls([1, null, 'a', [1, null, 'a']])
      result.length.should.eql(3)
      result[2].length.should.eql(2)

  describe '_validateDate():', ->
    it 'should return true given a valid ISO 8601', ->
      utils._validateDate(new Date(), 'iso8601').should.be.true

    it 'should return false given a invalid ISO 8601', ->
      utils._validateDate('15-09-05T14:48:30Z', 'iso8601').should.be.false

    it 'should return true given a valid unix timestamp', ->
      utils._validateDate(Date.now(), 'timestamp').should.be.true

    it 'should return false given a invalid unix timestamp', ->
      utils._validateDate('11-12-2015', 'timestamp').should.be.false

    it 'should return true given a matching moment format', ->
      utils._validateDate('11-12-2015', 'MM-DD-YYYY').should.be.true

    it 'should return false given a non matching moment format', ->
      utils._validateDate('11-12-15', 'MM-DD-YYYY').should.be.false

  describe '_isType():', ->
    it 'should return true given NaN', ->
      utils._isType(NaN, 'NaN').should.be.true

    it 'should return true given a date object', ->
      utils._isType(new Date(), 'date').should.be.true

    it 'should return false given a object', ->
      utils._isType({}, 'date').should.be.false

    it 'should return true given a string', ->
      utils._isType('string', 'string').should.be.true

    it 'should return true given a boolean', ->
      utils._isType(true, 'boolean').should.be.true

    it 'should return true given a array', ->
      utils._isType([], 'array').should.be.true

    it 'should return true given a object', ->
      utils._isType({}, 'object').should.be.true

    it 'should return true given a null', ->
      utils._isType(null, 'null').should.be.true

    it 'should return true given a number', ->
      utils._isType(1, 'number').should.be.true

    it 'should return true given a undefined', ->
      utils._isType(undefined, 'undefined').should.be.true

    it 'should return true given a function', ->
      utils._isType(func, 'function').should.be.true

    it 'should return false given a array when checking for object', ->
      utils._isType([], 'object').should.be.false

    it 'should return false given a object when checking for array', ->
      utils._isType({}, 'array').should.be.false

    it 'should return false given a string when checking for object', ->
      utils._isType('string', 'object').should.be.false


  describe '_getType():', ->
    it 'should return NaN given NaN', ->
      utils._getType(NaN).should.eql('NaN')

    it 'should return date given a date', ->
      utils._getType(new Date()).should.eql('date')

    it 'should return string given a string', ->
      utils._getType('string').should.eql('string')

    it 'should return number given a number', ->
      utils._getType(1).should.eql('number')

    it 'should return object given a object', ->
      utils._getType({}).should.eql('object')

    it 'should return array given a array', ->
      utils._getType([]).should.eql('array')

    it 'should return boolean given a boolean', ->
      utils._getType(true).should.eql('boolean')

    it 'should return funciton given a funciton', ->
      utils._getType(func).should.eql('function')

    it 'should return null given a null', ->
      utils._getType(null).should.eql('null')
