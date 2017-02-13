const {deepSet} = require('lodash-deep');

var obj = {};
deepSet(obj, ['account.name'], 1);
deepSet(obj, ['account.friends'], 1);
console.log(obj);
