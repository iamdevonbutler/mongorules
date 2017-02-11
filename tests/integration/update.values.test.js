const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;


describe('Update(): values:', () => {
  before(() => {
    ({db} = require('../../lib'));
  });

  beforeEach(function* (){
    const payload = {
      account: {
        friends: ['lrn'],
        name: 'jay'
      },
      newsletter: true,
      age: 1
    };
    yield db.users.insert(payload);
  });


  it('should error when given a field that does not exist in schema', function* () {
    var payload = {
      $set: {
        doesnotexist: true
      }
    };
    try {
      yield db.users.update({}, payload);
      exit();
    } catch (e) {
      e.should.be.ok;
    }
  });

  it('should error given an update w/o an operator that\'s missing required fields', function*() {
    var payload = {
      newsletter: false
    };
    try {
      yield db.users.update({}, payload);
      exit();
    } catch (e) {
      e.should.be.ok;
    }
  });

  it('should preform an update w/o an operator that contains required fields', function*() {
    var payload = {
      account: {
        name: 'jay'
      },
      newsletter: false
    };
    yield db.users.update({}, payload);
    var result = yield db.users.findOne({});
    result.account.should.eql({
      name: 'hey jay',
      friends: []
    });
    result.newsletter.should.eql(false);
  });

  it('should error when given fields that do not exist in schema during an $addToSet w/ $each update', function*() {
    var payload = {
      $addToSet: {
        'account.doesnotexist': {
          $each: ['jay', 'lrn']
        },
        'account.friends': {
          $each: ['jay', 'lou']
        }
      }
    };
    try {
      yield db.users.update({}, payload);
      exit();
    }
    catch (e) {
      e.errors.length.should.eql(1);
    }
  });

  it('should complete an $addToSet w/ $each update', function*() {
    var payload = {
      $addToSet: {
        'account.friends': {
          $each: ['jay', 'lou']
        }
      }
    };
    yield db.users.update({}, payload);
    var result = yield db.users.findOne({});
    result.newsletter.should.eql(true);
    result.age.should.eql(1);
    result.account.name.should.eql('hey jay');
    result.account.friends.should.eql(['lrn', 'jay', 'lou']);
  });

  describe('$inc', function() {
    it('should error (mongodb error) given an invalid type', function*() {
      var payload = {
        '$inc': {
          age: '1'
        }
      };
      try {
        yield db.users.update({}, payload);
        exit();
      } catch (e) {
        e.should.be.ok;
      }
    });
    it('should increment the age field', function*() {
      var payload = {
        '$inc': {
          age: -1
        }
      };
      yield db.users.update({}, payload);
      var result = yield db.users.findOne({});
      result.age.should.eql(0);
    });
  });

  describe('$mul', function() {
    it('should double the age field', function*() {
      var payload = {
        '$mul': {
          age: 2
        }
      };
      yield db.users.update({}, payload);
      var result = yield db.users.findOne({});
      result.age.should.eql(2);
    });
  });

  describe('$min', function() {
    it('should update the age field given a value less than the original', function*() {
      var payload = {
        '$min': {
          age: -1
        }
      };
      yield db.users.update({}, payload);
      var result = yield db.users.findOne({});
      result.age.should.eql(-1);
    });
  });

  describe('$max', function() {
    it('should update the age field given a value greater than the original', function*() {
      var payload = {
        '$max': {
          age: 2
        }
      };
      yield db.users.update({}, payload);
      var result = yield db.users.findOne({});
      result.age.should.eql(2);
    });
  });

  describe('$set', function() {
    it('should error given an invalid type', function*() {
      try {
        yield db.users.update({}, {
          '$set': {
            'account.name': 1
          }
        });
        exit();
      }
      catch (e) {
        e.errors.length.should.eql(1);
        e.errors[0].property.should.eql('type');
      }
    });
    it('should error when violating the minLength constraint', function*() {
      try {
        yield db.users.update({}, {
          '$set': {
            'account.name': ''
          }
        });
        exit();
      }
      catch (e) {
        e.errors[0].property.should.eql('minLength');
      }
    });

    it('should error when violating the maxLength constraint', function*() {
      try {
        yield db.users.update({}, {
          '$set': {
            'account.name': 'abcdefghijklmnopqrstuvqxyz'
          }
        });
        exit();
      }
      catch (e) {
        e.errors[0].property.should.eql('maxLength');
      }
    });

    it('should not update a field that is not in the payload w/ the schemas default value', function*() {
      yield db.users.update({}, {
        '$set': {
          'account.name': 'lou'
        }
      });
      var result = yield db.users.findOne({});
      result.account.name.should.eql('hey lou');
      result.account.friends.should.eql(['lrn']);
    });

    it('should update a field w/ null if notNull is false', function*() {
      yield db.users.update({}, {
        '$set': {
          age: null
        }
      })
      .catch(console.log);
      var result = yield db.users.findOne({});
      expect(result.age).to.eql(null);
    });

  //   it('should update a nested field and not add extra fields', function*() {
  //     yield db.users.update({}, {
  //       '$set': {
  //         'account.name': 'gus'
  //       }
  //     });
//       var result = yield db.users.findOne({});
  //         result.account.name.should.eql('hey gus');
  //         result.account.friends.should.eql(['lrn']);
  //         result.newsletter.should.eql(true);
  //         result.age.should.eql(1);
  //         Object.keys(result).length.should.eql(4);
  //       });
  //     });
  //   });
  });

  // describe('$addToSet', function() {
  //   it('should add an item to the friends array', function*() {
  //     yield db.users.update({}, {
  //       '$addToSet': {
  //         'account.friends': 'gus'
  //       }
  //     });
//       var result = yield db.users.findOne({});
  //         result.account.friends.should.eql(['lrn', 'gus']);
  //       });
  //     });
  //   });
  //   it('should add multiple items using $each to an array', function*() {
  //     var payload;
  //     payload = {
  //       '$addToSet': {
  //         'account.friends': {
  //           '$each': ['lou', 'gus']
  //         }
  //       }
  //     };
  //     yield db.users.update({}, payload);
//       var result = yield db.users.findOne({});
  //         result.account.friends.should.eql(['lrn', 'lou', 'gus']);
  //       });
  //     });
  //   });
  // });
  //
  // describe('$push', function() {
  //   it('should add an item to the friends array', function*() {
  //     yield db.users.update({}, {
  //       '$push': {
  //         'account.friends': 'gus'
  //       }
  //     });
//       var result = yield db.users.findOne({});
  //         result.account.friends.should.eql(['lrn', 'gus']);
  //       });
  //     });
  //   });
  //   it('should add multiple items using $each to an array and apply the $slice operator', function*() {
  //     var payload;
  //     payload = {
  //       '$push': {
  //         'account.friends': {
  //           '$each': ['lou', 'gus', 'sam'],
  //           '$slice': 2
  //         }
  //       }
  //     };
  //     yield db.users.update({}, payload);
//       var result = yield db.users.findOne({});
  //         result.account.friends.should.eql(['lrn', 'lou']);
  //       });
  //     });
  //   });
  // });
});
