module.exports = class PreprocessorCore {

  constructor() {

  }

  preprocess() {
    console.log('core preprocess hit');
    var payload, fieldKeys, errors = [];
    payload = this._payload;
    payload.forEach((payload2) => {
      var set;
      set = payload2._payloadSet;
      set.forEach(item => {
        var error;
        error = item.validate();
        if (error) {
          errors.push(error)
        }
        else {
          item.transform();
        }
      });
    });
  }

  resetPayload() {
    this._payload.forEach(payload => payload.clearValues());
  }


}
