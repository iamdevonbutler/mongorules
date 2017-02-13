## Misc
There are some notes on the behavior of mongorules that may not be initially obvious:

- Mongodb methods `push()` and `addToSet()` add items to an array and thus mongorules cannot validate minLength & maxLength.
- Upsert and save, operations have the potential to preform an insert, and thus, must include all required fields.
- By default, the '\_id' field is validated using the `mongodb.ObjectID.isValid()` method. If this behavior is not desired, or, if you wish to add other schema requirements to the '\_id' field, you may add the '\_id' field to your schemas.
- During an insert/update, fields included in the payload that are not present in schema will be disregarded, and the operation will continue to execute.
 
