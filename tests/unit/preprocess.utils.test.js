const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const schemaArrayOfObjects = require('../fixtures/schema.arrayofobjects');

const {
  getPayloadKeys,
  deconstructPayload,
  getSubdocumentSchema,
  getQueryFields,
} = require('../../lib/utils/preprocess.utils');

describe('Preprocess utils:', () => {

  describe('getSubdocumentSchema()', () => {
    it('should return a partial schema', () => {
      var result, keys;
      result = getSubdocumentSchema('account.friends.nicknames', schemaArrayOfObjects);
      keys = Object.keys(result);
      keys.length.should.eql(3);
      keys.should.eql([
        'account.friends.nicknames.name',
        'account.friends.nicknames.giver',
        'account.friends.nicknames.giver.name',
      ]);
    });
  });

  describe('getPayloadKeys()', () => {
    it('should return an array w/ all payload keys', () => {
      var payload, result;
      payload = {
        a: 1,
        b: 2,
        c: [1,2,3],
        d: [
          { e:1, f:[1,2,3], g: [{h:1}] }
        ]
      };
      result = getPayloadKeys(payload);
      result.should.eql(['a', 'b', 'c', 'd', 'd.e', 'd.f', 'd.g', 'd.g.h'])
    });
  });

  describe('getQueryFields():', () => {
    it('should return an array of query fields present in an $elemMatch query', () => {
      var query = {
        name: 4,
        grades: {
          $elemMatch: {
            grade: {
              $lte: 90
            },
            mean: {
              $gt: 80
            }
          }
        }
      };
      var result = getQueryFields(query);
      result.length.should.eql(3);
      result.should.contain('name');
      result.should.contain('grades.grade');
      result.should.contain('grades.mean');
    });

    it('should return an array of query fields present in an $and query.', () => {
      var query = {
        $and: [
          {
            price: {
              $ne: 1.99
            }
          }, {
            price: {
              $exists: true
            }
          }
        ]
      };
      var result = getQueryFields(query);
      result.should.eql(['price']);
    });

    it('should return an array of query fields present in an $all query.', () => {
      var query = {
        tags: {
          $all: ["ssl", "security"]
        }
      };
      var result = getQueryFields(query);
      result.should.eql(['tags']);
    });

    it('should return an array of query fields present in an $or query.', () => {
      var query = {
        $or: [
          {
            quantity: {
              $lt: 20
            }
          }, {
            price: 10
          }
        ]
      };
      var result = getQueryFields(query);
      result.should.eql(['quantity', 'price']);
    });

    it('should return an array of query fields present in a $not query.', () => {
      var query = {
        price: {
          $not: {
            $gt: 1.99
          }
        },
        location: {
          $eq: 'usa'
        }
      };
      var result = getQueryFields(query);
      result.should.eql(['price', 'location']);
    });

    it('should return an array of query fields present in a $nor query.', () => {
      var query = {
        $nor: [
          {
            price: 1.99
          }, {
            sale: true
          }
        ]
      };
      var result = getQueryFields(query);
      result.should.eql(['price', 'sale']);
    });

    it('should return an array of query fields present in a $exists query.', () => {
      var query = {
        qty: {
          $exists: true,
          $nin: [5, 15]
        }
      };
      var result = getQueryFields(query);
      result.should.eql(['qty']);
    });

    it('should return an array of query fields present in a query using $eq.', () => {
      var query = {
        "item.name": {
          $eq: "ab"
        }
      };
      var result = getQueryFields(query);
      result.should.eql(['item.name']);
      query = {
        "item.name.0": {
          $eq: "ab"
        },
        friends: ['lrn']
      };
      var result = getQueryFields(query);
      result.should.eql(['item.name', 'friends']);
    });
  });


});
