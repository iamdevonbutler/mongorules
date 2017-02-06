'use strict';

const mongodb = require('mongodb');
const mongorules = require('../../lib');

var db = null;

var models = {
  users: {
    schema: require('../fixtures/schema.values'),
  },
  users2: {
    schema: require('../fixtures/schema.arrayofvalues'),
  },
  users3: {
    schema: require('../fixtures/schema.arrayofobjects'),
  }
};

before(function* () {
    var db2;
    try {
      db2 = yield mongorules.connect('test', 'mongodb://localhost/mongorules-testing', mongodb);
    }
    catch (e) {
      console.error('>>> Connection error: be sure a "mongod" process is running.', e);
      process.exit();
    }
    db = mongorules.addDatabase('test', 'mongorules-testing', db2);
    mongorules.addModels('test', 'mongorules-testing', models);
    mongorules.setDefaultDb('test', 'mongorules-testing');
});

beforeEach(function*() {
  try {
    yield db.users.remove({});
    yield db.users2.remove({});
    yield db.users3.remove({});
  }
  catch (e) {
    console.log(e);
  }
});
