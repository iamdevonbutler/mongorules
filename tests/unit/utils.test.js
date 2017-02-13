const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const mongo = require('mongodb');
const utils = require('../../lib/utils/utils.main');

const func = (x) => x * x;

describe('Utils:', () => {

  describe('isChild', () => {
    it ('should return true given a child of depth 1', () => {
      utils.isChild('a.b', 'a.b.c').should.eql(true);
    });
    it ('should return true given a child of depth 2', () => {
      utils.isChild('a.b.c', 'a.b.c.d').should.eql(true);
    });
    it ('should return false given a non child field', () => {
      utils.isChild('a.b', 'a.c').should.eql(false);
      utils.isChild('a.b', 'a.c.e').should.eql(false);
    });
    it ('should return true given a child of depth 1 and depth === 1', () => {
      utils.isChild('a.b', 'a.b.c', 1).should.eql(true);
    });
    it ('should return false given a child of depth 2 and depth === 1', () => {
      utils.isChild('a.b', 'a.b.c.d', 1).should.eql(false);
    });
    it ('should return false given a child as the parent param', () => {
      utils.isChild('a.b.c.d', 'a.b').should.eql(false);
      utils.isChild('a.b.c.d', 'a.b', 1).should.eql(false);
      utils.isChild('a.b.c.d', 'a.b', 2).should.eql(false);
    });
    it ('should return false given a matching key', () => {
      utils.isChild('a.b', 'a.b').should.eql(false);
    });
  });

  describe('isSibling', () => {
    it ('should return true given a sibling', () => {
      utils.isSibling('a.b.c', 'a.b.e').should.eql(true);
    });
    it ('should return false given a non sibling field', () => {
      utils.isSibling('a.b.c', 'b.c.d').should.eql(false);
    });
    it ('should return false given a matching key', () => {
      utils.isSibling('a.b', 'a.b').should.eql(false);
    });
  });

  describe('isObjectId', () => {
    it('should return false given an invalid ID', () => {
      result = utils.isObjectId('5888d77b3910d717882d70b1d'); // has extra character.
      result.should.eql(false)
      result = utils.isType('5888d77b3910d717882d70b1d', 'objectId');
      result.should.eql(false)
    });
    it('should return true given a valid ID', () => {
      result = utils.isObjectId('5888d77b3910d717882d70b1')
      result.should.eql(true)
      result = utils.isType('5888d77b3910d717882d70b1', 'objectId');
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


  describe('isType():', () => {
    it('should return true given unix timestamp', () => {
      utils.isType(Date.now(), 'timestamp').should.be.true;
    });
    it('should return true given NaN', () => {
      utils.isType(NaN, 'NaN').should.be.true;
    });
    it('should return true given a date object', () => {
      utils.isType(new Date(), 'date').should.be.true;
    });

    it('should return false given a object', () => {
      utils.isType({}, 'date').should.be.false;
    });

    it('should return true given a string', () => {
      utils.isType('string', 'string').should.be.true;
    });

    it('should return true given a boolean', () => {
      utils.isType(true, 'boolean').should.be.true;
    });

    it('should return true given a array', () => {
      utils.isType([], 'array').should.be.true;
    });

    it('should return true given a object', () => {
      utils.isType({}, 'object').should.be.true;
    });

    it('should return true given a null', () => {
      utils.isType(null, 'null').should.be.true;
    });

    it('should return true given a number', () => {
      utils.isType(1, 'number').should.be.true;
    });

    it('should return true given a undefined', () => {
      utils.isType(undefined, 'undefined').should.be.true;
    });

    it('should return true given a function', () => {
      utils.isType(func, 'function').should.be.true;
    });

    it('should return false given an array when checking for object', () => {
      utils.isType([], 'object').should.be.false;
    });

    it('should return false given a null when checking for object', () => {
      utils.isType(null, 'object').should.be.false;
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
