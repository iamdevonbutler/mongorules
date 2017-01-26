const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const transform = require('../../lib/transform');

describe('Transform:', () => {

  describe('transformFunction()', () => {
    var func, func2, schema;
    func = (value) => value + 1;;
    func2 = (value) => value + 2;
    schema = {
      transform: [func, func2]
    };

    it('should call the first transform function in a schema if given an array', function() {
      var result;
      result = transform.transformFunction(1, schema, 0);
      result.should.eql(2);
    });

    it('should call the second transform function in a schema if given an array', function() {
      var result;
      result = transform.transformFunction(1, schema, 1);
      result.should.eql(3);
    });

  });

  describe('transformString()', () => {
    var falseSchema, schema;
    schema = {
      trim: true,
      lowercase: true,
      sanitize: true
    };
    falseSchema = {
      trim: false,
      lowercase: false,
      sanitize: false
    };

    it('should lowercase and trim a string', () => {
      var result;
      result = transform.transformString(' STRING ', schema);
      result.should.eql('string');
      result = transform.transformString(' STRING ', falseSchema);
      result.should.eql(' STRING ');
    });

    it('should uppercase and trim a string', () => {
      var anotherSchema, result;
      anotherSchema = {
        trim: true,
        uppercase: true
      };
      result = transform.transformString(' string ', anotherSchema);
      result.should.eql('STRING');
    });

    it('should return a unmodified value if not given a string', () => {
      var result;
      result = transform.transformString([1], schema);
      result.should.eql([1]);
    });

    it('should sanitize XSS', () => {
      var result, xss;
      xss = '<script>string</script>';
      result = transform.transformString(xss, schema);
      result.should.not.eql(xss);
    });

  });
});
