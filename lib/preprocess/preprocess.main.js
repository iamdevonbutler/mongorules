'use strict';

/**
 * @file entry file for preprocessing (transforming and validating)
 * insert/update/save/findAndModify operations.
 */

const cache = require('./cache');
const InsertPreprocessor = require('./preprocessor.insert');
const UpdatePreprocessor = require('./preprocessor.update');
const FindAndModifyPreprocessor = require('./preprocessor.findandmodify');
const SavePreprocessor = require('./preprocessor.save');

const self = module.exports;

/**
 * @param {String} connectionName
 * @param {String} databaseName
 * @param {String} collectionName
 * @param {String} methodName
 * @param {Array} args
 * @param {Object} schema
 * @return {Object}
 */
self.preprocessMain = (connectionName, databaseName, collectionName, methodName, args, schema) => {
  var argsString, cacheKey, cached, isCacheOp, errors;

  if (!args || !schema) {
    return {args, errors: ['Required params "args" and "schema" do not exist.']};
  }

  argsString = cache.getArgsString(args);
  cacheKey = [connectionName, databaseName, collectionName, methodName, argsString].join(':');
  isCacheOp = argsString[0] !== '$' || argsString.slice(0, 4) === '$set'; // Don't cache $inc, ..., operations.
  cached = cache.get(cacheKey);

  if (cached && isCacheOp) {
   ({errors, args} = cached.preprocessFromCache(args));
    cache.close();
  }
  else {
    let obj, payload, isUpsert;
    obj = self._getPreprocessor(methodName, schema, args);
    isUpsert = obj.isUpsertOperation(args);
    if (isUpsert) {
      let isValid = obj.validateQuery(args[0], schema);
      if (!isValid) return {errors: ['Query fields do not exist in schema.'], args};
    }

    payload = obj.parsePayloadFromArgs(args);
    if (!payload || !payload.length) return {errors: ['Empty payload'], args};
    obj.addPayload(payload, isUpsert);
    errors = obj.preprocess();
    if (errors) return {errors, args};
    args = obj.updateArgs(args);
    obj.resetPayload();
    if (isCacheOp) cache.set(cacheKey, obj);
  }

  return {
    errors,
    args,
  };

};

/**
 * Returns a preprocessor object.
 * @param {String} methodName
 * @param {Object} schema
 * @param {Array} args
 * @return {Object}
 */
self._getPreprocessor = (methodName, schema, args) => {
  switch (methodName) {
    case 'insert':
      return new InsertPreprocessor(schema);
    case 'update':
      return new UpdatePreprocessor(schema);
    case 'save':
      return new SavePreprocessor(schema, args);
    case 'findAndModify':
      return new FindAndModifyPreprocessor(schema);
  }
}
