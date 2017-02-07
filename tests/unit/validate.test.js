const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const Validator = require('../../lib/validate');

describe('Validate:', function() {

  describe('validateNotNull', function() {
    it('should return an error given a null value when notNull = true', function() {
      new Validator(null, '', {
        notNull: true
      }, false).validateNotNull().getErrors().length.should.eql(1);
    });
    it('should not return an error given a null with notNull = false ', function() {
      var errors;
      errors = new Validator(null, '', {
        required: true,
        notNull: false
      }, false).validateNotNull().getErrors();
      expect(errors).to.be.null;;
    });
  });



  describe('validateRequired()', function() {
    it('should return an error given an undefined value when required = true', function() {
      return new Validator(void 0, '', {
        required: true
      }, false).validateRequired().getErrors().length.should.eql(1);
    });
    it('should not return an error given "false" when required = true', function() {
      var errors;
      errors = new Validator(false, '', {
        required: true
      }, false).validateRequired().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given "0" when required = true', function() {
      var errors;
      errors = new Validator(0, '', {
        required: true
      }, false).validateRequired().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given "\'\'" when required = true', function() {
      var errors;
      errors = new Validator('', '', {
        required: true
      }, false).validateRequired().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given a "[]" when required = true', function() {
      var errors;
      errors = new Validator([], '', {
        required: true
      }, false).validateRequired().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given a "{}" when required = true', function() {
      var errors;
      errors = new Validator({}, '', {
        required: true
      }, false).validateRequired().getErrors();
      return expect(errors).to.be["null"];
    });
    return it('should not return an error given an undefined value when required = false', function() {
      var errors;
      errors = new Validator(void 0, '', {
        required: false
      }, false).validateRequired().getErrors();
      return expect(errors).to.be["null"];
    });
  });
  describe('validateType()', function() {
    it('should not return an error if type is null', function() {
      var errors;
      errors = new Validator('', '', {
        type: null
      }).validateType().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error give a string when expecting a string', function() {
      var errors;
      errors = new Validator('', '', {
        type: 'string'
      }).validateType().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given a number when expecting a number', function() {
      var errors;
      errors = new Validator(0, '', {
        type: 'number'
      }).validateType().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given a boolean when expecting a boolean', function() {
      var errors;
      errors = new Validator(false, '', {
        type: 'boolean'
      }).validateType().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given a date when expecting a date', function() {
      var errors;
      errors = new Validator('1111', '', {
        type: 'date'
      }).validateType().getErrors();
      return expect(errors).to.be["null"];
    });
    it('should return an error given a string when expecting a number', function() {
      return new Validator('string', '', {
        type: 'number'
      }).validateType().getErrors().length.should.eql(1);
    });
    it('should return an error given a number when expecting a string', function() {
      return new Validator(0, '', {
        type: 'string'
      }).validateType().getErrors().length.should.eql(1);
    });
    it('should return an error given a boolean when expecting a string', function() {
      return new Validator(false, '', {
        type: 'string'
      }).validateType().getErrors().length.should.eql(1);
    });
    return it('should return an error given a boolean when expecting a date', function() {
      return new Validator(false, '', {
        type: 'date'
      }).validateType().getErrors().length.should.eql(1);
    });
  });
  describe('validateDenyXSS()', function() {
    it('should return an error if given a string contianing XSS and denyXSS = true', function() {
      return new Validator('<script>aaa</script>', '', {
        denyXSS: true
      }).validateDenyXSS().getErrors().length.should.eql(1);
    });
    it('should return true if given a string not contianing XSS and denyXSS = true', function() {
      var errors;
      errors = new Validator('string', '', {
        denyXSS: true
      }).validateDenyXSS().getErrors();
      return expect(errors).to.be["null"];
    });
    return it('should return true if given a string contianing XSS and denyXSS = false', function() {
      var errors;
      errors = new Validator('<script>aaa</script>', '', {
        denyXSS: false
      }).validateDenyXSS().getErrors();
      return expect(errors).to.be["null"];
    });
  });
  describe('validateMinLength()', function() {
    it('should not return an error given a non-string or non-array', function() {
      var errors;
      errors = new Validator(true, '', {
        minLength: [1]
      }).validateMinLength(0).getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given an array of required length', function() {
      var errors;
      errors = new Validator([1], '', {
        minLength: [1]
      }).validateMinLength(0).getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given an string of required length', function() {
      var errors;
      errors = new Validator('a', '', {
        minLength: [1]
      }).validateMinLength(0).getErrors();
      return expect(errors).to.be["null"];
    });
    it('should return an error given an array of less than required length', function() {
      return new Validator([], '', {
        minLength: [1]
      }).validateMinLength(0).getErrors().length.should.eql(1);
    });
    return it('should return an error given an string of less than required length', function() {
      return new Validator('', '', {
        minLength: [1]
      }).validateMinLength(0).getErrors().length.should.eql(1);
    });
  });
  describe('validateMaxLength()', function() {
    it('should not return an error given a non-string or non-array', function() {
      var errors;
      errors = new Validator(true, '', {
        maxLength: [1]
      }).validateMaxLength(0).getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given an array of required length', function() {
      var errors;
      errors = new Validator([1], '', {
        maxLength: [1]
      }).validateMaxLength(0).getErrors();
      return expect(errors).to.be["null"];
    });
    it('should not return an error given an string of required length', function() {
      var errors;
      errors = new Validator('a', '', {
        maxLength: [1]
      }).validateMaxLength(0).getErrors();
      return expect(errors).to.be["null"];
    });
    it('should return an error given an array of more than required length', function() {
      return new Validator([1, 2], '', {
        maxLength: [1]
      }).validateMaxLength(0).getErrors().length.should.eql(1);
    });
    return it('should return an error given an string of more than required length', function() {
      return new Validator('ab', '', {
        maxLength: [1]
      }).validateMaxLength(0).getErrors().length.should.eql(1);
    });
  });
  return describe('validateFunction()', function() {
    var schema;
    schema = {
      validate: [
        function(val) {
          return val + 1;
        }, function(val) {
          return val - 1;
        }
      ]
    };
    it('should not return an error if the custom function returns true', function() {
      var errors;
      errors = new Validator(1, '', schema).validateFunction(0).getErrors();
      return expect(errors).to.be["null"];
    });
    return it('should return an error if the custom function returns false', function() {
      return new Validator(1, '', schema).validateFunction(1).getErrors().length.should.eql(1);
    });
  });
});
