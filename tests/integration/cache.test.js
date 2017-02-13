const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

var db;

const sinon = require('sinon');
const Preprocessor = require('../../lib/preprocess/preprocessor');
const SubPreprocessor = require('../../lib/preprocess/preprocessor.subdocument');

const func = Preprocessor.prototype.preprocessFromCache;
const func2 = SubPreprocessor.prototype.preprocessFromCache;

describe('Cache testing', function() {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  beforeEach(() => {
    Preprocessor.prototype.preprocessFromCache = func;
    SubPreprocessor.prototype.preprocessFromCache = func2;
  });

  it ('should not call preprocessFromCache', function* () {
    var cacheFunc = sinon.spy();
    Preprocessor.prototype.preprocessFromCache = cacheFunc;
    yield db.users.insert({account: {name: 'sam'}});
    assert(cacheFunc.notCalled);
  });

  it ('should call preprocessFromCache', function* () {
    var cacheFunc = sinon.spy();
    Preprocessor.prototype.preprocessFromCache = cacheFunc;
    try {
      yield db.users.insert({account: {name: 'sam'}});
      yield db.users.insert({account: {name: 'sam2'}});
      exit();
    }
    catch (e) {
      assert(cacheFunc.called);
    }
  });

  it ('should call preprocessFromCache for subdocument', function* () {
    var cacheFunc = sinon.spy();
    SubPreprocessor.prototype.preprocessFromCache = cacheFunc;
    var obj = {account: {friends: [{name: 'jay', nicknames:[]}]}}
    var obj2 = {account: {friends: [{name: 'sam', nicknames:[]}]}}
    try {
      yield db.users3.insert(obj);
      yield db.users3.insert(obj2);
      exit();
    }
    catch (e) {
      assert(cacheFunc.called);
    }
  });

  it ('should process unique updates from cache', function* () {
    yield db.users3.insert({account: {friends: [{name: 'jay', nicknames:[]}]}});
    for (let i=0, len=10; i<len; i++) {
      yield db.users3.update({'account.friends.name': `jay${i ? i - 1 : ''}!`}, {
        $set: {
          'account.friends.$.name': 'jay'+i
        }
      });
    }
    var result = yield db.users3.find({});
    result = yield result.toArray();
    result.length.should.eql(1);
    result[0].account.friends.length.should.eql(1)
    result[0].account.friends[0].name.should.eql('jay9!')
    result[0].account.friends[0].nicknames.should.eql([])
  });

});
