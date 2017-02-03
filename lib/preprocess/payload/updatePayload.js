const Payload = require('./payload');

module.exports = class UpdatePayload extends Payload {

  constructor(payload, schema, isUpsert) {
    super(payload, schema, isUpsert);
    var keys, errors = [];
    keys = Object.keys(payload);
    keys.forEach((operation) => {
      var error, set;
      switch (operation) {
        case '$inc':
          break;
        case '$mul':
          break;
        case '$rename':
          break;
        case '$setOnInsert':
          break;
        case '$set':
          payload = this.deconstructPayload(payload[operation]);
          error = this.buildPayloadSet(payload, schema);
          errors = error ? errors.concat(error) : errors;
          payload[operation] = this.reconstructPayload(set);
          break;
        case '$unset':
          break;
        case '$min':
          break;
        case '$max':
          break;
        case '$currentDate':
          break;
        case '$addToSet':
          break;
        case '$pop':
          break;
        case '$pullAll':
          break;
        case '$pull':
          break;
        case '$push':
          break;
        default:
          throw new Error(`Operation "${operation}" not supported. Use 'novalidate' to continue operation w/o validation.`);
          break;
      }
    });

  }


}
