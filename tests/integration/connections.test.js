const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

const mongodb = require('mongodb');
const mongorules = require('../../lib');

const models = {
  users: {
    schema: require('../fixtures/schema.values'),
    methods: require('../fixtures/modelmethods'),
  }
};

describe('Connections testing', function() {

  it ('should connect to multiple databases under the same connection', function* () {
    var db, db1, db2, result1, result2;
    db = yield mongorules.connect('test1', 'mongodb://localhost/mongorules-testing1', mongodb);

    db1 = mongorules.addDatabase('test1', 'mongorules-testing1', db);
    mongorules.addModels('test1', 'mongorules-testing1', models);

    db2 = mongorules.addDatabase('test1', 'mongorules-testing2', db);
    mongorules.addModels('test1', 'mongorules-testing2', models);

    yield db1.users.remove({});
    yield db1.users.insert({account: {name: 'jay'}});

    yield db2.users.remove({});
    yield db2.users.insert({account: {name: 'jay'}});

    result1 = yield db1.users.find({});
    result1 = yield result1.toArray();
    result2 = yield db2.users.find({});
    result2 = yield result2.toArray();

    result1.length.should.eql(1);
    result1[0].account.should.eql({ name: 'hey jay', friends: [] });
    result1[0].newsletter.should.eql(true);

    result2.length.should.eql(1);
    result2[0].account.should.eql({ name: 'hey jay', friends: [] });
    result2[0].newsletter.should.eql(true);

    yield mongorules.close('test1', true);

  });

  it ('should connect to multiple connections', function* () {
    var db, db2;
    db = yield mongorules.connect('test1', 'mongodb://localhost/mongorules-testing', mongodb);
    db2 = yield mongorules.connect('test2', 'mongodb://localhost/mongorules-testing', mongodb);

    db1 = mongorules.addDatabase('test1', 'mongorules-testing', db);
    db2 = mongorules.addDatabase('test2', 'mongorules-testing', db2);

    mongorules.addModels('test1', 'mongorules-testing', models);
    mongorules.addModels('test2', 'mongorules-testing', models);

    yield db1.users.remove({});
    yield db1.users.insert({account: {name: 'jay'}});

    yield db2.users.remove({});
    yield db2.users.insert({account: {name: 'jay'}});

    result1 = yield db1.users.find({});
    result1 = yield result1.toArray();
    result2 = yield db2.users.find({});
    result2 = yield result2.toArray();

    result1.length.should.eql(1);
    result1[0].account.should.eql({ name: 'hey jay', friends: [] });
    result1[0].newsletter.should.eql(true);

    result2.length.should.eql(1);
    result2[0].account.should.eql({ name: 'hey jay', friends: [] });
    result2[0].newsletter.should.eql(true);

    yield mongorules.close('test1', true);
    yield mongorules.close('test2', true);

  });

});
