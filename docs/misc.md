## Misc
There are some notes on the behavior of mongorules that may not be initially obvious:

- Mongodb methods `push()` and `addToSet()` add items to an array and thus mongorules cannot validate minLength & maxLength.
- Upsert and save, operations have the potential to preform an insert, and thus, must include all required fields.
- By default, the '\_id' field is validated using the `mongodb.ObjectID.isValid()` method. If this behavior is not desired, or, if you wish to add other schema requirements to the '\_id' field, you may add the '\_id' field to your schemas.
- findAndModify syntax differs from docs - pass in data as individual params rather than object.
- sanitize changes date from obj to string
- addDatabase and getDatabase return a proxy object, and u can get the (unproxied) connection obj from the .getConnection() method
