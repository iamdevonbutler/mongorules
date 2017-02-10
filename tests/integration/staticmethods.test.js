const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

var db;

describe('static methods:', function() {

  before(() => {
    ({db} = require('../../lib'));
  });

  it('should add a user using a static methods', function* () {
    yield db.users.addUser('gus');
    var result = yield db.users.findOne({});
    result.account.should.eql({ name: 'hey gus', friends: [] });
    result.newsletter.should.eql(true);
  });

  it('should allow yielding given a generator function', function* () {
    yield db.users.addUsers('lou');
    var result = yield db.users.find({});
    result = yield result.toArray();
    result.length.should.eql(2);
  });

});
