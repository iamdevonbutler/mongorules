const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

describe('Insert(): array of values:', () => {

  before(() => {
    ({db} = require('../../lib'));
  });

  it('should error when violating the minLength constraint', function* () {
    var obj = {
      account: {
        friends: ['jay']
      }
    };
    try {
      yield db.users2.insert([obj]);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('minLength');
    }

    obj = {
      account: {
        friends: ['jay', ''] // '' fails minLength #2.
      }
    };
    try {
      yield db.users2.insert([obj]);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('minLength');
    }
  });


  it('should error when violating the maxLength constraint', function* () {
    obj = {
      account: {
        friends: ['lrn', 'gus', 'jay', 'tim']
      }
    };
    try {
      yield db.users2.insert([obj]);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('maxLength');
    }
    obj = {
      account: {
        friends: ['lrn', 'gus', 'jayyyyyyyyyyyyy']
      }
    };
    try {
      yield db.users2.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('maxLength');
    }
  });

  it('should filter null values, transform, lowercase & trim', function* () {
    var obj = {
      account: {
        friends: ['LRN', 'el ', null]
      }
    };
    yield db.users2.insert([obj]);
    var result = yield db.users2.findOne({});
    result.account.friends.length.should.eql(2);
    result.account.friends[0].should.eql('hey lrn');
    result.account.friends[1].should.eql('hey el');
  });

  it('should validate using the custom validate function', function*() {
    var obj = {
      account: {
        friends: ['reject', 'reject']
      }
    };
    try {
      yield db.users2.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('validate');
    }

    obj = {
      account: {
        friends: ['rej', 'rej']
      }
    };
    try {
      yield db.users2.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(2);
      e.errors[0].property.should.eql('validate');
      e.errors[1].property.should.eql('validate');
    }
  });

  it('should error given a null value when notNull is true', function* () {
    var obj = {
      account: {
        friends: null
      }
    };
    try {
      yield db.users2.insert([obj]);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('notNull');
    }
  });

  it('should error given an incorrect type', function*() {
    var obj = {
      account: {
        friends: 11,
      }
    };
    try {
      yield db.users2.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('type');
    }
  });


  it('should ensure all values are of type `string`', function*() {
    var obj = {
      account: {
        friends: [['a'], 'gus', 'jay']
      }
    };
    try {
      yield db.users2.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('type');
    }
  });

});
