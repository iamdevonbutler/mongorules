const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

describe('FindAndModify():', function() {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  beforeEach(function* () {
    var obj = {
      account: {
        friends: ['lrn'],
        name: 'jay'
      },
      newsletter: true,
      age: 1
    };
    yield db.users.insert(obj);
  });

  it('should return an updated document', function* () {
    var payload = {
      '$set': {
        'account.name': 'gus'
      }
    };
    var result = yield db.users.findAndModify({}, [], payload, {"new": true});
    result = result.value;
    result.account.name.should.eql('hey gus');
    result.account.friends.should.eql(['lrn']);
    result.newsletter.should.eql(true);
    result.age.should.eql(1);
    Object.keys(result).length.should.eql(4);
  });

  // @todo upsert

});
