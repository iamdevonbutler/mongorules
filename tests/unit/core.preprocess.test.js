const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const schemaArrayOfObjects = require('../fixtures/schema.arrayofobjects');
const schemaArrayOfValues = require('../fixtures/schema.arrayofvalues');
const PreprocessorCore = require('../../lib/preprocess/core.preprocess');

var obj;


// Payload invalids - null, [], [{}], {a:1}, [{a:1}], [{a: {b:1}}]
// Payload valids - {a:1, b:2}, [{a:1, b:2}], [{a: {b:1, c:1}}]

describe('Preprocess core:', () => {

  beforeEach(() => {
    obj = new PreprocessorCore();
  });

  describe('enforceRequiredFields()', () => {

    it('should return errors given an empty payload (schema == arrayofvalues)', () => {
      var result, _schema, _payload;
      _schema = schemaArrayOfValues;
      _payload = [];
      result = obj.enforceRequiredFields.call({_schema, _payload});
      expect(result && result.length).to.eql(1);
    });

    it ('', () => {

    });

  });

});
