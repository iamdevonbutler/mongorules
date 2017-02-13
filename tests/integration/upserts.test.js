const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

describe('Upserts:', function() {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  beforeEach(function*() {
    var obj = {
      _id: '507f1f77bcf86cd799439011',
      account: {
        friends: ['lrn'],
        name: 'jay'
      }
    };
    yield db.users.insert(obj);
  });

  describe('$set', function() {
    it('should error when the query contains fields that are not in schema', function*() {
      var query = {
        'account.name': 'jay',
        'account.email': 'bob@bob.com'
      };
      var payload = {
        $set: {
          'account.name': 'lrn'
        }
      };
      try {
        yield db.users.update(query, payload, {upsert: true});
        exit();
      }
      catch (e) {
        e.errors.should.be.ok;
      }
    });

    it('should update a document given a matching query', function*() {
      var query = {
        _id: '507f1f77bcf86cd799439011'
      };
      var payload = {
        $set: {
          account: {
            name: 'lrn'
          }
        }
      };
      yield db.users.update(query, payload, {upsert: true});
      var result = yield db.users.find();
      result = yield result.toArray();
      result.length.should.eql(1);
      result[0].account.name.should.eql('hey lrn');
      result[0].account.friends.should.eql([]);
      result[0].newsletter.should.eql(true);
    });

    it('should insert a document, and set defaults, given a non matching query', function*() {
      var query = {
        'account.name': 'hey gus'
      };
      var payload = {
        $set: {
          'account.name': 'lrn'
        }
      };
      yield db.users.update(query, payload, {upsert: true});
      var result = yield db.users.find();
      result = yield result.toArray();
      result.length.should.eql(2);
      result[1].account.name.should.eql('hey lrn');
      result[1].newsletter.should.eql(true);
      result[1].account.friends.should.eql([]);
    });
  });

  describe('findAndModify()', function() {
    it('should update a document given a matching query', function*() {
      var query = {
        'account.name': 'hey jay'
      };
      var payload = {
        $set: {
          'account.name': 'lrn'
        }
      };
      var result = yield db.users.findAndModify(query, null, payload, {upsert: true, "new": true});
      result.value.account.name.should.eql('hey lrn');
      result.value.account.friends.should.eql([]);
      result.value.newsletter.should.eql(true);
    });

    it('should insert a document given a non matching query', function*() {
      var query = {
        'account.name': 'hey gus'
      };
      var payload = {
        $set: {
          'account.name': 'lrn'
        }
      };
      var result = db.users.findAndModify(query, null, payload, {upsert: true, "new": true});
      var result = yield db.users.find();
      result = yield result.toArray();
      result.length.should.eql(2);
    });
  });
});
