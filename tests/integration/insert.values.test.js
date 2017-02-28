const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

describe('Insert(): values:', () => {

  before(() => {
    ({db} = require('../../lib'));
  });

  it ('should accept date types', function* () {
    yield db.users.insert({account: {name: 'jay'}, created: new Date()});
    yield db.users.insert({account: {name: 'jay'}, created: Date.now()});
    try {
      yield db.users.insert({account: {name: 'jay'}, created: 'error'});
      exit()
    }
    catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].field.should.eql('created')
      e.errors[0].property.should.eql('type')
    }
  });

  it('should error when inserting a document w/ an invalid ObjectID', function* () {
    try {
      yield db.users.insert({
        account: {
          name: 'name'
        },
        _id: '1'
      });
      exit();
    } catch (e) {
      e.should.be.ok;
      e.errors[0].property.should.eql('validate');
    }
  });

  it('should error given an field not in schema', function* () {
    try {
      yield db.users.insert({a: 1});
      exit();
    } catch (e) {
      e.should.be.ok;
    }
  });

  it('should error given an empty document', function* () {
    try {
      var s = yield db.users.insert({});
      exit();
    } catch (e) {
      e.should.be.ok;
    }
  });

  it('should error when violating the minLength constraint', function* () {
    var obj = {
      account: {
        name: ''
      }
    };
    try {
      yield db.users.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('minLength');
    }
  });

  it('should error when violating the maxLength constraint', function* () {
    var obj = {
      account: {
        name: 'asbcdefghijklmnopqrstuvwxyz'
      }
    };
    try {
      yield db.users.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('maxLength');
    }
  });

  it('should error when inserting XSS', function* () {
    var obj = {
      account: {
        name: '<script>hey</script>'
      }
    };
    try {
      yield db.users.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('denyXSS');
    }
  });

  it('should validate using the custom validate function', function* () {
    var obj = {
      account: {
        name: 'tim'
      }
    };
    try {
      yield db.users.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('validate');
    }
  });

  it('should error when violating the type constraint', function* () {
    obj = {
      newsletter: 1,
      age: 'twenty',
      account: {
        name: ['jay']
      }
    };
    try {
      yield db.users.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(3);
      e.errors[0].property.should.eql('type');
      e.errors[1].property.should.eql('type');
      e.errors[2].property.should.eql('type');
    }
  });

  it('should error given an invalid date', function* () {
    var obj = {
      account: {
        name: 'jay'
      },
      created: '222a'
    };
    try {
      yield db.users.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('type');
    }
  });

  it('should add mixed types to account.friends', function* () {
    var obj = {
      account: {
        name: 'jay',
        friends: [11, 'jimbob']
      }
    };
    yield db.users.insert(obj);
    var result = yield db.users.findOne();
    result.account.should.eql({
      name: 'hey jay',
      friends: [11, 'jimbob']
    })
  });

  it('should error given incorrect types when accepting mixed types', function* () {
    var obj = {
      account: {
        name: 'jay',
        friends: [11, 'jimbob', {}]
      }
    };
    try {
      yield db.users.insert(obj);
      exit();
    }
    catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('type');
    }
  });

  it('should insert a document given valid dates', function* () {
    var date = Date.now();
    var obj = {
      account: {
        name: 'jay'
      },
      created: date
    };
    yield db.users.insert(obj);
    var result = yield db.users.findOne({});
    result.created.should.eql(date);
  });

  it('should insert an invalid document using the novalidate prefix', function* () {
    var obj = {
      account: {}
    };
    yield db.novalidate.friends.insert(obj);
    var result = yield db.friends.findOne();
    result.account.should.eql({});
    yield db.friends.remove({});
  });

  it('should error when given a null value when null is not a valid type', function* () {
    var obj = {
      account: {
        name: null
      }
    };

    try {
      yield db.users.insert([obj]);
      exit();
    }
    catch (e) {
      e.errors.length.should.eql(1);
    }
  });

  it('should set a default for newsletter', function* () {
    var obj = {
      account: {
        name: 'jay'
      }
    };
    yield db.users.insert([obj]);
    var result = yield db.users.findOne({});
    result.account.name.should.be.ok;
    result.newsletter.should.be.ok;
  });

  it('should error when given a null value and not null is true', function* () {
    var obj = {
      account: {
        name: 'jay'
      },
      newsletter: null,
    };

    try {
      yield db.users.insert([obj]);
      exit();
    }
    catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('notNull');
    }
  });

  it('should transform, lowercase and trim a value and set a default values', function* () {
    var obj = {
      account: {
        name: 'JA '
      }
    };
    yield db.users.insert(obj);
    var result = yield db.users.findOne({});
    result.account.name.should.eql('hey ja');
    result.newsletter.should.eql(true);
  });

  it('should insert multiple documents', function* () {
    var obj = {
      account: {
        name: 'jay'
      }
    };
    yield db.users.insert([obj, obj, obj]);
    var result = yield db.users.find({});
    result = yield result.toArray();

    /// @todo test setting defaults more.
    result.length.should.eql(3);
    result[0].account.name.should.be.ok;
    result[0].newsletter.should.be.ok;

  });
});
