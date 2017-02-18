const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

describe('Update(): array of objects:', function() {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  beforeEach(function* () {
    var obj = {
      account: {
        friends: [
          {name: 'lrn'},
          {name: 'gus'}
        ]
      }
    };
    yield db.users3.insert(obj);
  });

  describe('$set', function() {
    it ('should error given invalid types and unknown fields in subdocuments', function* () {
      var payload = {
        '$set': {
          'account.friends.0.nicknames': {
            name: 1,
            giver: [{notafield: 1}]
          }
        }
      };
      try {
        yield db.users3.update({}, payload);
        exit();
      }
      catch (e) {
        e.errors.length.should.eql(2);
        e.errors[0].property.should.eql('type');
        e.errors[0].field.should.eql('account.friends.nicknames.name');
        e.errors[1].field.should.eql('account.friends.nicknames.giver.notafield');
      }
    });

    it ('should not error given a valid payload', function* () {
      var payload = {
        '$set': {
          'account.friends.0.nicknames': {
            name: 'name',
            giver: [{name: 'name'}]
          }
        }
      };
      try {
        yield db.users3.update({}, payload);
        var result = db.users3.findOne();
        console.log(result);
        result.should.be.ok;
      }
      catch (e) {
        console.log(e);
        e.should.not.be.ok
      }
    });

    it('should error when given an invalid type', function* () {
      var payload = {
        '$set': {
          'account.friends.0': {
            name: 1
          }
        }
      };
      try {
        yield db.users3.update({}, payload);
        exit();
      }
      catch (e) {
        e.errors[0].property.should.eql('type');
        e.errors[0].expected[0].should.eql('string');
      }
    });

    it('should update a item in an array using the item in array syntax', function* () {
      var payload = {
        '$set': {
          'account.friends.0': {
            name: 'lou'
          }
        }
      };
      yield db.users3.update({}, payload);
      var result = yield db.users3.findOne({});
      result.account.friends.should.eql([
        {
          name: 'lou!',
          nicknames: []
        }, {
          name: 'gus!',
          nicknames: []
        }
      ]);
    });

    it('should update a single property on an object using the item in array syntax', function* () {
      var payload = {
        '$set': {
          'account.friends.0.name': 'lou'
        }
      };
      yield db.users3.update({}, payload);
      var result = yield db.users3.findOne({});
      result.account.friends.should.eql([
        {
          name: 'lou!',
          nicknames: []
        }, {
          name: 'gus!',
          nicknames: []
        }
      ]);
    });
  });

  describe('$addToSet', function() {
    it('should add a single item to the nicknames array using the item in array syntax', function* () {
      var payload = {
        '$addToSet': {
          'account.friends.0.nicknames': {
            name: 'lou',
            giver: []
          }
        }
      };
      yield db.users3.update({}, payload);
      var result = yield db.users3.findOne({});
      result.account.friends.should.eql([
        {
          name: 'lrn!',
          nicknames: [{name: 'lou', giver: []}]
        }, {
          name: 'gus!',
          nicknames: []
        }
      ]);
    });
  //
    it('should should throw an error given an incorrect type for an object property', function* () {
      var payload = {
        '$addToSet': {
          'account.friends': {
            '$each': [{
              name: 'jay',
              nicknames: 1
            }]
          }
        }
      };
      try {
        yield db.users3.update({}, payload);
        exit();
      }
      catch (e) {
        e.errors[0].property.should.eql('type');
      }
    });

    it('should should throw an error given a missing object field', function* () {
      var payload = {
        '$addToSet': {
          'account.friends': {
            '$each': [{
               name: 'jay',
               nicknames: [{name: 'bird'}]
             }]
          }
        }
      };
      try {
        yield db.users3.update({}, payload);
        exit();
      }
      catch (e) {
        e.errors[0].property.should.eql('required');
      }
    });

    it('should add an item to set using $each', function* () {
      var _document = {
        name: 'jay',
        nicknames: [{
          name: 'bird',
          giver: [{name: 'gus'}]
        }]
      };
      var output = {
        name: 'jay!',
        nicknames: [{
            name: 'bird',
            giver: [{
              name: 'gus'
            }]
          }
        ]
      };
      var payload = {
        '$addToSet': {
          'account.friends': {
            '$each': [_document]
          }
        }
      };
      yield db.users3.update({}, payload);
      var result = yield db.users3.findOne({});
      result.account.friends.length.should.eql(3);
      result.account.friends[2].should.eql(output);
    });
  });

});
