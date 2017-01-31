const {isType} = require('../utils');

const self = module.exports;

class PayloadItem {

  constructor() {

  }

};

class InsertPayload extends PayloadItem {

  constructor() {
    super();
    this.payload = this.deconstructPayload(payload);
  }

  deconstructPayload(payload) {

  }

  setDefaults() {}

  validate() {}

  transform() {}
}

class UpdatePayload extends PayloadItem {

  constructor() {
    super();
    this.payload = this.deconstructPayload(payload);
  }

  deconstructPayload(payload) {
    console.log(99999);
    var payloadKeys;
    payloadKeys = Object.keys(payload);
    payloadKeys.forEach((payloadKey) => {
      var payloadItem;
      payloadItem = payload[payloadKey];
      // fieldKey = payloadKey.replace('$.', '').replace(/\.\d/g, '');
      // @todo - what data do we need about this thing.
      // we should get data and rather than attaching it, attach methods
      // for validating and transforming.
      // Don't array subdocuments, that process will be cached and independent
      // of this initial render.

    });
    // this.payloadPath;
    // this.value;
    // this.isEach;
    // this.modifiers;
    // this.schema;
    // this.validateFunc;
    // this.transformFunc;
    // this.errors = [];
  }

  setDefaults() {}

  validate() {}

  transform() {}

}

self.PayloadItem = PayloadItem;
self.InsertPayload = InsertPayload;
self.UpdatePayload = UpdatePayload;
