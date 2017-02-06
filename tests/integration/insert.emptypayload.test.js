const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

var db;

describe('insert(): empty payload:', () => {

  beforeEach(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  it ('should error given an empty payload', function* () {
    try {
      var result = yield db.users.insert();
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      var result = yield db.users.insert(null);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      var result = yield db.users.insert({});
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      var result = yield db.users.insert([]);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      var result = yield db.users.insert([null]);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }

    try {
      var result = yield db.users.insert([{}]);
    }
    catch (e){
      e.errors.length.should.eql(1);
    }


  });

});
