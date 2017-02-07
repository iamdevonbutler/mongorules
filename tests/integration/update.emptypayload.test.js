const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

var db;

describe('update(): empty payload:', () => {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  it ('should error given an empty payload', function* () {
    try {
      yield db.users.update({'account.name': 'jay'});
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.update({'account.name': 'jay'}, null);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.update({'account.name': 'jay'}, {});
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.update({'account.name': 'jay'}, 1);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.update({'account.name': 'jay'}, [1]);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

  });

});
