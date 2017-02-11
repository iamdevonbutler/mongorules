const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

describe('Update(): array of values:', function() {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  beforeEach(function*() {
    var obj = {
      account: {
        friends: ['lrn', 'gus']
      }
    };
    yield db.users2.insert(obj);
  });

  describe('$set', function () {
    it('should throw an error when violating the minLength constraint', function* () {
      var payload = {
        '$set': {
          'account.friends': ['jay']
        }
      };
      try {
        yield db.users2.update({}, payload);
        exit();
      }
      catch (e) {
        e.errors[0].property.should.eql('minLength');
      }
    });

    it('should update the friends array', function* () {
      var payload = {
        '$set': {
          'account.friends': ['gus', 'jay']
        }
      };
      yield db.users2.update({}, payload);
      var result = yield db.users2.findOne({});
      result.account.friends.should.eql(['hey gus', 'hey jay']);
    });
  });

  describe('$addToSet', function() {
    it('should add an items to the friends array', function* () {
      var payload;
      payload = {
        '$addToSet': {
          'account.friends': {
            '$each': ['sam', 'new']
          }
        }
      };
      yield db.users2.update({}, payload);
      var result = yield db.users2.findOne({});
      result.account.friends.should.eql(['hey lrn', 'hey gus', 'hey sam', 'hey new']);
    });
  });
});
