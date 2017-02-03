const Payload = require('./payload');

module.exports = class UpdatePayload extends Payload {

  constructor(payload, schema, isUpsert) {
    super(payload, schema, isUpsert);
  }

  preprocess(cacheKey) {
    var keys, errors = [], payload, schema;
    schema = this._schema;
    payload = this._payload;
    keys = Object.keys(payload);
    keys.forEach((operation) => {
      var errors2, set;
      switch (operation) {
        case '$set':
          payload = this.deconstructPayload(payload[operation]);
          errors2 = this.buildPayloadSet(payload, schema);
          errors = errors2 && errors2.length ? errors.concat(errors2) : errors;
          if (!errors || !errors.length) {
            let errors3;
            errors3 = super.preprocess(cacheKey);
            errors = errors3 && errors3.length ? errors.concat(errors3) : errors;
            if (!errors || !errors.length) {
              this._payload[operation] = this.reconstructPayload();
            }
          }
          break;
        // case '$inc':
        //   break;
        // case '$mul':
        //   break;
        // case '$rename':
        //   break;
        // case '$setOnInsert':
        //   break;
        // case '$unset':
        //   break;
        // case '$min':
        //   break;
        // case '$max':
        //   break;
        // case '$currentDate':
        //   break;
        // case '$addToSet':
        //   break;
        // case '$pop':
        //   break;
        // case '$pullAll':
        //   break;
        // case '$pull':
        //   break;
        // case '$push':
        //   break;
        default:
          throw new Error(`Operation "${operation}" not supported. Use the 'novalidate' prefix to continue operation w/o validation.`);
          break;
      }
    });
    return errors && errors.length ? errors : null;
  }


}
