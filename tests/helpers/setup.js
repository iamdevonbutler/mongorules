'use strict';

const mongodb = require('mongodb');
const mongorules = require('../../lib');

var db, initDb;
initDb = true;
db = null;


beforeEach((done) => {
  if (initDb) {
    mongorules.connect('test', 'mongodb://localhost/mongorules-testing', mongodb).then((_db) => {
      db = mongorules.addDatabase('test', 'mongorules-testing', _db);
      mongorules.setDefaultDb('test', 'mongorules-testing');
      initDb = false;
      db.users.remove({}).then(() => done()).catch(done);
    }, (err) => {
      console.error('>>> Connection error: be sure a "mongod" process is running.', err);
      process.exit();
    });
  }
  else {
    db.users.remove({}).then(() => done()).catch(done);
  }
});
