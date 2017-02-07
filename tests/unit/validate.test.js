const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;
const sinon = require('sinon');
const {Types} = require('../../lib/schema');

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

    it('should error given an undefined value', () => {
      var error = validateRequired(next)(void 0, fieldKey, {required: true});
      error.length.should.eql(1);
      assert(next.notCalled);
    });

    it('should not error given "false" when required = true', () => {
      var error = validateRequired(next)(false, fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not error given "0" when required = true', () => {
      var error = validateRequired(next)(0, fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not error given "\'\'" when required = true', () => {
      var error = validateRequired(next)('', fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not error given a "[]" when required = true', () => {
      var error = validateRequired(next)([], fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not error given a "{}" when required = true', () => {
      var error = validateRequired(next)({}, fieldKey, {required: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not error given an undefined value when required = false', () => {
      var error = validateRequired(next)(void 0, fieldKey, {required: false});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

  });

  describe('validateNotNull()', () => {
    it('should error given a null value when notNull = true', () => {
      var error = validateNotNull(next)(null, fieldKey, {notNull: true});
      error.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should not error given a null with notNull = false ', () => {
      var error = validateNotNull(next)(null, fieldKey, {notNull: false});
      expect(error).to.be.undefiend;
      assert(next.called);
    });
  });

  describe('validateType()', () => {
    it('should not error if type is null', () => {
      var error = validateType(next)('', fieldKey, {type: null});
      expect(error).to.be.undefiend;
      assert(next.called);
    });
    it('should not error given a string when expecting a string', () => {
      var error = validateType(next)('string', fieldKey, {type: Types.string});
      expect(error).to.be.undefiend;
      assert(next.called);
    });
    it('should not error given a number when expecting a number', () => {
      var error = validateType(next)(1111, fieldKey, {type: Types.number});
      expect(error).to.be.undefiend;
      assert(next.called);
    });
    it('should not error given a boolean when expecting a boolean', () => {
      var error = validateType(next)(true, fieldKey, {type: Types.boolean});
      expect(error).to.be.undefiend;
      assert(next.called);
    });
    it('should not error given a date when expecting a date', () => {
      var error = validateType(next)(new Date(), fieldKey, {type: Types.date});
      expect(error).to.be.undefiend;
      assert(next.called);
    });
    it('should error given a string when expecting a number', () => {
      var error = validateType(next)('string', fieldKey, {type: Types.number});
      error.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should error given a number when expecting a string', () => {
      var error = validateType(next)(1111, fieldKey, {type: Types.string});
      error.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should error given a boolean when expecting a string', () => {
      var error = validateType(next)(false, fieldKey, {type: Types.string});
      error.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should error given a boolean when expecting a date', () => {
      var error = validateType(next)(false, fieldKey, {type: Types.date});
      error.length.should.eql(1);
      assert(next.notCalled);
    });

    it('should not error given a mixed array w/ valid types', () => {
      var obj  = [1,2,'3','4'];
      var type = Types.array(Types.string, Types.number)
      var error = validateType(next)(obj, fieldKey, {type});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not error given a mixed array w/ valid types using `mixed` incorrectly', () => {
      var obj  = [1,2,'3','4'];
      var type = Types.array(Types.mixed(Types.string, Types.number))
      var error = validateType(next)(obj, fieldKey, {type});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should error given a mixed array w/ and invalid type', () => {
      var obj  = [1,2,'3','4', false];
      var type = Types.array(Types.string, Types.number)
      var error = validateType(next)(obj, fieldKey, {type});
      error.length.should.eql(1);
      assert(next.notCalled);
    });

    it('should accept all types given an empty array', () => {
      var obj  = [1,2,'3','4', false];
      var type = Types.array();
      var error = validateType(next)(obj, fieldKey, {type});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should accept a number when allowing multiple types', () => {
      var type = Types.mixed(Types.number, Types.string)
      var error = validateType(next)(1, fieldKey, {type});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should accept a string when allowing multiple types', () => {
      var type = Types.mixed(Types.number, Types.string)
      var error = validateType(next)('1', fieldKey, {type});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should error when allowing multiple types provided an invlaid type', () => {
      var type = Types.mixed(Types.number, Types.string)
      var error = validateType(next)({}, fieldKey, {type});
      error.length.should.eql(1);
      assert(next.notCalled);
    });

  });

  describe('validateDenyXSS()', () => {
    it('should error if given a string contianing XSS and denyXSS = true', () => {
      var error = validateDenyXSS(next)('<script>aaa</script>', fieldKey, {denyXSS: true});
      error.length.should.eql(1);
      assert(next.notCalled);
    });

    it('should not error return if given a string not contianing XSS and denyXSS = true', () => {
      var error = validateDenyXSS(next)('aaa', fieldKey, {denyXSS: true});
      expect(error).to.be.undefiend;
      assert(next.called);
    });

    it('should not error if given a string contianing XSS and denyXSS = false', () => {
      var error = validateDenyXSS(next)('<script>aaa</script>', fieldKey, {denyXSS: false});
      expect(error).to.be.undefiend;
      assert(next.called);
    });
  });

  describe('validateMinLength()', () => {
    it('should not error given a non-string or non-array', () => {
      var errors = validateMinLength(0)(next)({}, fieldKey, {minLength: [2]});
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
    it('should not error given an array of required length', () => {
      var errors = validateMinLength(0)(next)([1,2,3], fieldKey, {minLength: [2]});
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
    it('should not error given an string of required length', () => {
      var errors = validateMinLength(0)(next)('abc', fieldKey, {minLength: [2]});
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
    it('should error given an array of less than required length', () => {
      var errors = validateMinLength(0)(next)([1], fieldKey, {minLength: [2]});
      errors.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should error given an string of less than required length', () => {
      var errors = validateMinLength(0)(next)('a', fieldKey, {minLength: [2]});
      errors.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should error given an invalid value using pos 1', () => {
      var errors = validateMinLength(1)(next)('a', fieldKey, {minLength: [0,2]});
      errors.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should not error given an array of required length using pos 1', () => {
      var errors = validateMinLength(1)(next)([1,2,3], fieldKey, {minLength: [0,2]});
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
  });

  describe('validateMaxLength()', () => {
    it('should not error given a non-string or non-array', () => {
      var errors = validateMaxLength(0)(next)({}, fieldKey, {maxLength: [2]});
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
    it('should not error given an array of required length', () => {
      var errors = validateMaxLength(0)(next)([1,2], fieldKey, {maxLength: [2]});
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
    it('should not error given an string of required length', () => {
      var errors = validateMaxLength(0)(next)('12', fieldKey, {maxLength: [2]});
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
    it('should error given an array of more than required length', () => {
      var errors = validateMaxLength(0)(next)([1,2,3], fieldKey, {maxLength: [2]});
      errors.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should error given an string of more than required length', () => {
      var errors = validateMaxLength(0)(next)('123', fieldKey, {maxLength: [2]});
      errors.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should error given an string of more than required length in pos 1', () => {
      var errors = validateMaxLength(1)(next)('123', fieldKey, {maxLength: [0,2]});
      errors.length.should.eql(1);
      assert(next.notCalled);
    });
    it('should not error given an string of required length in pos 1', () => {
      var errors = validateMaxLength(1)(next)('12', fieldKey, {maxLength: [0,2]});
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
  });

  return describe('validateFunction()', () => {
    var schema = {
      validate: [
        function(val) {
          return true;
        }, function(val) {
          return false;
        }
      ]
    };
    it('should not error if the custom function returns true', () => {
      var errors = validateFunction(0)(next)(1, fieldKey, schema);
      expect(errors).to.be.undefiend;
      assert(next.called);
    });
    it('should error if the custom function returns false', () => {
      var errors = validateFunction(1)(next)(1, fieldKey, schema);
      errors.length.should.eql(1);
      assert(next.notCalled);
    });
  });
});
