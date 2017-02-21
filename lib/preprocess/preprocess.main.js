const cache = require('./cache');
const InsertPreprocessor = require('./preprocessor.insert');
const UpdatePreprocessor = require('./preprocessor.update');
const FindAndModifyPreprocessor = require('./preprocessor.findandmodify');
const SavePreprocessor = require('./preprocessor.save');

const self = module.exports;

self.preprocessMain = (connectionName, databaseName, collectionName, methodName, args, schema) => {
  var argsString, cacheKey, cached, errors;

  if (!args || !schema) {
    return {args, errors: ['Required params "args" and "schema" do not exist.']};
  }

  argsString = cache.getArgsString(args);
  cacheKey = [connectionName, databaseName, collectionName, methodName, argsString].join(':');
  cached = cache.get(cacheKey);

  if (cached) {
   ({errors, args} = cached.preprocessFromCache(args, cacheKey));
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
    errors = obj.preprocess(cacheKey);
    if (errors) return {errors, args};
    args = obj.updateArgs(args);
    obj.resetPayload();
    cache.set(cacheKey, obj);
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
 * @tests none.
 * @api private.
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


/**



db.products.insert( { _id: 10, item: "box", qty: 20 } )

db.products.insert(
   [
     { _id: 11, item: "pencil", qty: 50, type: "no.2" },
     { item: "pen", qty: 20 },
     { item: "eraser", qty: 25 }
   ]
)

db.people.update(
   { name: "Andy" },
   {
      name: "Andy",
      rating: 1,
      score: 1
   },
   { upsert: true }
)

db.collection.update( { "_id.name": "Robert Frost", "_id.uid": 0 },
   { "categories": ["poet", "playwright"] },
   { upsert: true } )

db.books.update(
   { _id: 1 },
   {
     $inc: { stock: 5 },
     $set: {
       item: "ABC123",
       "info.publisher": "2222",
       tags: [ "software" ],
       "ratings.1": { by: "xyz", rating: 3 }
     }
   }
)

db.books.update( { _id: 1 }, { $unset: { tags: 1 } } )

// replaces exsiting documewnt.
db.books.update(
   { item: "XYZ123" },
   {
     item: "XYZ123",
     stock: 10,
     info: { publisher: "2255", pages: 150 },
     tags: [ "baking", "cooking" ]
   }
)

**/
