const mongorules = require('./instance');
const proxy = require('./proxy');

module.exports = new Proxy(mongorules, proxy._getHandler);
