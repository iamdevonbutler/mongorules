const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const schemaArrayOfObjects = require('../fixtures/schema.arrayofobjects');

const {
  getPayloadKeys,
  deconstructPayload,
  getSubdocumentSchema,
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

});
