module.exports = {
  connect,
  close,
  addConnection,
  getConnection,
  addDatabase,
  getDatabase,
  addModels,
  addModel,
  removeModel,
  removeModels,
  addGlobalErrorHandler,
} = require('./api');

/**
---

// initMongo.js
import mongo from 'mongodb';
import {logModels, analyticsModels} from './models';
import {addDatabase, addModels, connect, close} from 'mongorules';

// local:log
yield connect('mongodb://localhost', 'local', mongo);
addDatabase('local', 'log');
addModels('local', 'log', logModels);

// local:analytics
addDatabase('local', 'analytics');
addModels('local', 'analytics', analyticsModels);

// remote:log
yield connect('mongodb://pw@123.45.67.89', 'remote', mongo);
addDatabase('remote', 'log');
addModels('remote', 'log', logModels);

// close('local');
// close('remote');

---

// routerCallbackExampleFile.js
import {getDatabase} from 'mongorules';

const dbLog = getDatabase('local', 'log');
var logs = yield dbLog.logs.find({});

**/
