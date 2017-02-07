const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;
const sinon = require('sinon');

const {
  validateRequired,
  validateNotNull,
  validateType,
  validateDenyXSS,
  validateMinLength,
  validateMaxLength,
  validateFunction,
} = require('../../lib/validate');

const fieldKey = 'field.key';
var next;

describe('Validate:', () => {

  beforeEach(() => {
    next = sinon.spy();
  });

  describe('validateRequired()', () => {

    it('should return an error given an undefined value', () => {
      var error = validateRequired(next)(void 0, fieldKey, {required: true});
      error.length.should.eql(1);
      assert(next.notCalled);
    });

    it('should not return an error given "false" when required = true', () => {
      var error = validateRequired(next)(false, fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not return an error given "0" when required = true', () => {
      var error = validateRequired(next)(0, fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not return an error given "\'\'" when required = true', () => {
      var error = validateRequired(next)('', fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not return an error given a "[]" when required = true', () => {
      var error = validateRequired(next)([], fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not return an error given a "{}" when required = true', () => {
      var error = validateRequired(next)({}, fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not return an error given an undefined value when required = false', () => {
      var error = validateRequired(next)(void 0, fieldKey, {required: false});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

  });

  describe('validateNotNull()', () => {
    it('should return an error given a null value when notNull = true', () => {
      var error = validateNotNull(next)(null, fieldKey, {notNull: true});
      error.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should not return an error given a null with notNull = false ', () => {
      var error = validateNotNull(next)(null, fieldKey, {notNull: false});
      expect(error).to.be.undefiend;
      assert(next.called);
    });
  });

  // describe('validateType()', () => {
  //   it('should not return an error if type is null', () => {
  //     var errors;
  //     errors = new Validator('', '', {
  //       type: null
  //     }).validateType().getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should not return an error give a string when expecting a string', () => {
  //     var errors;
  //     errors = new Validator('', '', {
  //       type: 'string'
  //     }).validateType().getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should not return an error given a number when expecting a number', () => {
  //     var errors;
  //     errors = new Validator(0, '', {
  //       type: 'number'
  //     }).validateType().getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should not return an error given a boolean when expecting a boolean', () => {
  //     var errors;
  //     errors = new Validator(false, '', {
  //       type: 'boolean'
  //     }).validateType().getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should not return an error given a date when expecting a date', () => {
  //     var errors;
  //     errors = new Validator('1111', '', {
  //       type: 'date'
  //     }).validateType().getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should return an error given a string when expecting a number', () => {
  //     return new Validator('string', '', {
  //       type: 'number'
  //     }).validateType().getErrors().length.should.eql(1);
  //   });
  //   it('should return an error given a number when expecting a string', () => {
  //     return new Validator(0, '', {
  //       type: 'string'
  //     }).validateType().getErrors().length.should.eql(1);
  //   });
  //   it('should return an error given a boolean when expecting a string', () => {
  //     return new Validator(false, '', {
  //       type: 'string'
  //     }).validateType().getErrors().length.should.eql(1);
  //   });
  //   return it('should return an error given a boolean when expecting a date', () => {
  //     return new Validator(false, '', {
  //       type: 'date'
  //     }).validateType().getErrors().length.should.eql(1);
  //   });
  // });
  // describe('validateDenyXSS()', () => {
  //   it('should return an error if given a string contianing XSS and denyXSS = true', () => {
  //     return new Validator('<script>aaa</script>', '', {
  //       denyXSS: true
  //     }).validateDenyXSS().getErrors().length.should.eql(1);
  //   });
  //   it('should return true if given a string not contianing XSS and denyXSS = true', () => {
  //     var errors;
  //     errors = new Validator('string', '', {
  //       denyXSS: true
  //     }).validateDenyXSS().getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   return it('should return true if given a string contianing XSS and denyXSS = false', () => {
  //     var errors;
  //     errors = new Validator('<script>aaa</script>', '', {
  //       denyXSS: false
  //     }).validateDenyXSS().getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  // });
  // describe('validateMinLength()', () => {
  //   it('should not return an error given a non-string or non-array', () => {
  //     var errors;
  //     errors = new Validator(true, '', {
  //       minLength: [1]
  //     }).validateMinLength(0).getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should not return an error given an array of required length', () => {
  //     var errors;
  //     errors = new Validator([1], '', {
  //       minLength: [1]
  //     }).validateMinLength(0).getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should not return an error given an string of required length', () => {
  //     var errors;
  //     errors = new Validator('a', '', {
  //       minLength: [1]
  //     }).validateMinLength(0).getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should return an error given an array of less than required length', () => {
  //     return new Validator([], '', {
  //       minLength: [1]
  //     }).validateMinLength(0).getErrors().length.should.eql(1);
  //   });
  //   return it('should return an error given an string of less than required length', () => {
  //     return new Validator('', '', {
  //       minLength: [1]
  //     }).validateMinLength(0).getErrors().length.should.eql(1);
  //   });
  // });
  // describe('validateMaxLength()', () => {
  //   it('should not return an error given a non-string or non-array', () => {
  //     var errors;
  //     errors = new Validator(true, '', {
  //       maxLength: [1]
  //     }).validateMaxLength(0).getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should not return an error given an array of required length', () => {
  //     var errors;
  //     errors = new Validator([1], '', {
  //       maxLength: [1]
  //     }).validateMaxLength(0).getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should not return an error given an string of required length', () => {
  //     var errors;
  //     errors = new Validator('a', '', {
  //       maxLength: [1]
  //     }).validateMaxLength(0).getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   it('should return an error given an array of more than required length', () => {
  //     return new Validator([1, 2], '', {
  //       maxLength: [1]
  //     }).validateMaxLength(0).getErrors().length.should.eql(1);
  //   });
  //   return it('should return an error given an string of more than required length', () => {
  //     return new Validator('ab', '', {
  //       maxLength: [1]
  //     }).validateMaxLength(0).getErrors().length.should.eql(1);
  //   });
  // });
  // return describe('validateFunction()', () => {
  //   var schema;
  //   schema = {
  //     validate: [
  //       function(val) {
  //         return val + 1;
  //       }, function(val) {
  //         return val - 1;
  //       }
  //     ]
  //   };
  //   it('should not return an error if the custom function returns true', () => {
  //     var errors;
  //     errors = new Validator(1, '', schema).validateFunction(0).getErrors();
  //     return expect(errors).to.be["null"];
  //   });
  //   return it('should return an error if the custom function returns false', () => {
  //     return new Validator(1, '', schema).validateFunction(1).getErrors().length.should.eql(1);
  //   });
  // });
});
