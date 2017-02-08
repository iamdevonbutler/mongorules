const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

describe('insert(): array of values:', () => {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
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
        friends: ['lrn', 'gus', 'jayy']
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

    try {
      yield db.users2.insert([obj]);
    }
    catch (e) {
      console.log(e);
    }
    var result = yield db.users2.findOne({});
    console.log(result);
    res.account.friends.length.should.eql(2);
    res.account.friends[0].should.eql('hey lrn');
    res.account.friends[1].should.eql('hey el');
  });

//   it('should validate using the custom validate function', function(done) {
//     var doc, e;
//     doc = {
//       account: {
//         friends: ['aaa', 'gus', 'jay']
//       }
//     };
//     try {
//       return db.users2.insert([doc]).then(function(result) {
//         return done(result);
//       });
//     } catch (_error) {
//       e = _error;
//       e.errors.length.should.eql(1);
//       e.errors[0].property.should.eql('validate');
//       return done();
//     }
//   });
//   it('should throw given a null value when notNull is true', function(done) {
//     var doc, e;
//     doc = {
//       account: {
//         friends: null
//       }
//     };
//     try {
//       return db.users2.insert([doc]).then(function(result) {
//         return done(result);
//       });
//     } catch (_error) {
//       e = _error;
//       e.errors.length.should.eql(1);
//       e.errors[0].property.should.eql('notNull');
//       return done();
//     }
//   });
//   return it('should ensure all values are of type `string`', function(done) {
//     var doc, e;
//     doc = {
//       account: {
//         friends: [['a'], 'gus', 'jay']
//       }
//     };
//     try {
//       return db.users2.insert(doc).then(function(result) {
//         return done(result);
//       });
//     } catch (_error) {
//       e = _error;
//       e.errors.length.should.eql(1);
//       e.errors[0].property.should.eql('type');
//       return done();
//     }
//   });
});
