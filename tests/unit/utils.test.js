const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const mongo = require('mongodb');
const utils = require('../../lib/utils/mainUtils');

const func = (x) => x * x;

describe('Utils:', () => {

  describe('isObjectId', () => {
    it('should return false given an invalid ID', () => {
      result = utils.isObjectId('5888d77b3910d717882d70b1d'); // has extra character.
      result.should.eql(false)
    });
    it('should return true given a valid ID', () => {
      result = utils.isObjectId('5888d77b3910d717882d70b1')
      result.should.eql(true)
    });
    it('should return true given a valid ID', () => {
      result = utils.isObjectId(mongo.ObjectID())
      result.should.eql(true)
    });
  });

  describe('filterNulls', () => {
    it('should filter null values from an array and array of arrays', () => {
      result = utils.filterNulls([1, null, 'a', [1, null, 'a']])
      result.length.should.eql(3)
      result[2].length.should.eql(2)
    });
  });

  describe('validateDate():', () => {

    it('should return true given a valid ISO 8601', () => {
      utils.validateDate(new Date(), 'iso8601').should.be.true
    });

    it('should return false given a invalid ISO 8601', () => {
      utils.validateDate('15-09-05T14:48:30Z', 'iso8601').should.be.false
    });

    it('should return true given a valid unix timestamp', () => {
      utils.validateDate(Date.now(), 'timestamp').should.be.true
    });

    it('should return false given a invalid unix timestamp', () => {
      utils.validateDate('11-12-2015', 'timestamp').should.be.false
    });

    it('should return true given a matching moment format', () => {
      utils.validateDate('11-12-2015', 'MM-DD-YYYY').should.be.true
    });

    it('should return false given a non matching moment format', () => {
      utils.validateDate('11-12-15', 'MM-DD-YYYY').should.be.false
    });
  });

  describe('isType():', () => {
    it('should return true given NaN', () => {
      utils.isType(NaN, 'NaN').should.be.true
    });

    it('should return true given a date object', () => {
      utils.isType(new Date(), 'date').should.be.true
    });

    it('should return false given a object', () => {
      utils.isType({}, 'date').should.be.false
    });

    it('should return true given a string', () => {
      utils.isType('string', 'string').should.be.true
    });

    it('should return true given a boolean', () => {
      utils.isType(true, 'boolean').should.be.true
    });

    it('should return true given a array', () => {
      utils.isType([], 'array').should.be.true
    });

    it('should return true given a object', () => {
      utils.isType({}, 'object').should.be.true
    });

    it('should return true given a null', () => {
      utils.isType(null, 'null').should.be.true
    });

    it('should return true given a number', () => {
      utils.isType(1, 'number').should.be.true
    });

    it('should return true given a undefined', () => {
      utils.isType(undefined, 'undefined').should.be.true
    });

    it('should return true given a function', () => {
      utils.isType(func, 'function').should.be.true
    });

    it('should return false given an array when checking for object', () => {
      utils.isType([], 'object').should.be.false
    });

    it('should return false given a null when checking for object', () => {
      utils.isType(null, 'object').should.be.false
    });

  });


  describe('getType():', () => {
    it('should return NaN given NaN', () => {
      utils.getType(NaN).should.eql('NaN')
    });

    it('should return date given a date', () => {
      utils.getType(new Date()).should.eql('date')
    });

    it('should return string given a string', () => {
      utils.getType('string').should.eql('string')
    });

    it('should return number given a number', () => {
      utils.getType(1).should.eql('number')
    });

    it('should return object given a object', () => {
      utils.getType({}).should.eql('object')
    });

    it('should return array given a array', () => {
      utils.getType([]).should.eql('array')
    });

    it('should return boolean given a boolean', () => {
      utils.getType(true).should.eql('boolean')
    });

    it('should return function given a function', () => {
      utils.getType(func).should.eql('function')
    });

    it('should return null given a null', () => {
      utils.getType(null).should.eql('null')
    });
  });

});
