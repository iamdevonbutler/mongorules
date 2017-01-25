const cache = require('./cache');

const self = module.exports;

self.preprocessQuery = (connectionName, databaseName, collectionName, methodName, args, schema) => {
  var cached;

  cached = cache.get(connectionName, databaseName, collectionName, methodName, args);
  if (cached) {

  }

  // do a bunch of stuff.
  cache.set(connectionName, databaseName, collectionName, methodName, /*preprocessObj*/);
  // return


  process.exit();
};


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
