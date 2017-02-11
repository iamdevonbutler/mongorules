const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

describe('Insert(): array of objects:', () => {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  it('should error given a payload w/ fields not in schema', function* () {
    try {
      yield db.users3.insert({account: {}});
      exit();
    }
    catch (e) {
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users3.insert({notInSchema: {a:1}});
      exit();
    }
    catch (e) {
      e.errors.length.should.eql(1);
    }
  });

  it ('should error given an object violating minLength', function*() {
    try {
      yield db.users3.insert({account: {friends:[]}});
      exit();
    }
    catch (e) {
      console.log(e);
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('minLength');
    }
  });


  it('should error given a payload missing a required property', function* () {
    var obj = {
      account: {
        friends: [{
          name: 'jay',
          nicknames: [{
            giver: [{name: 'jay'}]
          }]
        }]
      }
    };
    try {
      yield db.users3.insert(obj);
      exit();
    }
    catch (e) {
    // missing account.friends.nicknames.name
      e.errors.length.should.eql(1);
    }
  });

  it('should transform a property given a custom transform function', function* () {
    var obj = {
      account: {
        friends: [{
          name: 'JAY'
        }]
      }
    };
    yield db.users3.insert(obj);
    var result = yield db.users3.findOne();
    result.account.friends[0].name.should.eql('jay!');
    result.account.friends[0].nicknames.should.eql([]);
  });



  it('should error given a document w/ data in violation of the minLength property', function* () {
    var obj = {
      account: {
        friends: [{
          name: '' // minLength error.
        }]
      }
    };
    try {
      var result = yield db.users3.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('minLength');
    }

    obj = {
      account: {
        friends: []
      }
    };
    try {
      yield db.users3.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('minLength');
    }
  });

  it('should error given a document w/ data in violation of the maxLength property', function* () {
    var obj = {
      account: {
        friends: [
          {name: 'jay'},
          {name: 'jay'},
          {name: 'jay'},
        ]
      }
    };
    try {
      yield db.users3.insert(obj);
      exit();
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('maxLength');
    }
  });

  it('should error given an invalid type constraint on a property on an object', function* () {
    var obj = {
      account: {
        friends: [{
          name: 1 // expecting a string
        }]
      }
    };
    try {
      yield db.users3.insert(obj);
      exit()
    } catch (e) {
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('type');
    }
  });

  it('should sanitize an object property', function* () {
    var obj = {
      account: {
        friends: [{
          name: '<script>jay</script>'
        }]
      }
    };
    yield db.users3.insert(obj);
    var result = yield db.users3.findOne({});
    result.account.friends[0].name.should.not.eql('<script>jay</script>');
  });

  it('should set default values', function* () {
    var obj = {
      account: {
        friends: [{
          name: 'jay'
        }]
      }
    };
    yield db.users3.insert(obj);
    var result = yield db.users3.findOne({});
    result.account.friends.should.eql([{
      name: 'jay!',
      nicknames: []
    }]);
  });


  it('should successfully insert a document given correct data', function* () {
    var obj = {
      account: {
        friends: [{
          name: 'jay',
          nicknames: [{
            name: 'gus',
            giver: [{
              name: 'flip'
            }]
          }]
        },
        {
          name: 'lou'
        }]
      }
    };
    yield db.users3.insert(obj);
    var result = yield db.users3.findOne({});
    obj = {
      friends: [{
          name: 'jay!',
          nicknames: [{
            name: 'gus',
            giver: [{
              name: 'flip'
            }]
          }]
        },
        {
          name: 'lou!'
        }
      ]
    };
    result.account.should.eql(obj);
  });
});
