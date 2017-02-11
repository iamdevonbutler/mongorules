const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db, _id;

describe('Save():', function() {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  beforeEach(function* () {
    yield db.users.insert({
      account: {
        name: 'jay'
      }
    });
    var result = yield db.users.findOne();
    _id = result._id;
  });


  it('should insert a document when the payload does not contain an _id field.', function*() {
    var payload = {
      account: {
        name: 'jay'
      }
    };
    yield db.users.save(payload);
    var result = yield db.users.find();
    result = yield result.toArray();
    result.length.should.eql(2);
    result[1].account.name.should.eql('hey jay');
  });

  it('should update a document that contains a matching _id field.', function*() {
    var payload = {
      _id: _id,
      account: {
        name: 'lrn'
      }
    };
    yield db.users.save(payload);
    var result = yield db.users.find();
    result = yield result.toArray();
    result.length.should.eql(1);
    result[0].account.name.should.eql('hey lrn');
  });

  it('should insert a document that contains a non matching _id field.', function*() {
    var payload = {
      _id: '560037c4fa952916b820528d',
      account: {
        name: 'lrn'
      }
    };
    yield db.users.save(payload);
    var result = yield db.users.find();
    result = yield result.toArray();
    result.length.should.eql(2);
  });

});
