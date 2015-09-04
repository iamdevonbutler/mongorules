'use strict';

/**
 * Module dependencies.
 */

const debug = require('debug')('mongoproxy');

/**
 * Connect to mongodb.
 * @param {String} mongoUrl - mongodb database url.
 * @return {Promise} to be yielded that retuns a mongodb
 * database instance.
 * @api public.
 */
module.exports = function(MongoClient, mongoUrl) {
  return new Promise((resolve, reject) => {
    // Use connect method to connect to the Server
    MongoClient.connect(mongoUrl, function(err, db) {
      if (err) {
        debug("Error connecting to mongo");
        reject(err);
      }
      debug("Connected correctly to mongo");
      resolve(db);
    });
  });
};
