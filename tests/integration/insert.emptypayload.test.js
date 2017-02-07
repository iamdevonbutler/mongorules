const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

var db;

describe('insert(): empty payload:', () => {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  it ('should error given an empty payload', function* () {
    try {
      yield db.users.insert();
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.insert(null);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.insert({});
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.insert([]);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.insert([null]);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users.insert([{}]);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users3.insert(1);
    }
    catch (e) {
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users3.insert([1]);
    }
    catch (e) {
      e.errors.length.should.eql(1);
    }

  });

});
