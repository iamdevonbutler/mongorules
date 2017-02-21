const {deepGet} = require('lodash-deep');

module.exports = class Preprocessor {

  constructor(schema, isSetOperation = false, isUpsert = false) {
    this.payloads;
    this.schema = schema;
    this.isSetOperation = isSetOperation;
    this.isUpsert = isUpsert;
  }

  preprocess(cacheKey, rootKey = '') {
    var payloads, errors = [];
    payloads = this.payloads;
    payloads.forEach(payload => {
      var errors2;
      errors2 = payload.preprocess(cacheKey, rootKey);
      if (errors2 && errors2.length) {
        errors = errors.concat(errors2);
      }
    });
    return errors && errors.length ? errors : null;
  }

  /**
   * Is upsert = true;
   * @param {Array} args
   * @return {Boolean - true}
   */
  isUpsertOperation(args) {
    return;
  }

  /**
   * Using a cached data structures, transform and validate a payload.
   * @param {Array} args - args in db.users.insert({}, {})
   * @param {String} cacheKey - prefix to SubdocumentPreprocessor obj caching.
   * @return {Object} - errors and updated/transformed args.
   */
  preprocessFromCache(args, cacheKey) {
    var payload, schema, errors = [];
    schema = this.schema;
    payload = this.parsePayloadFromArgs(args);
    this.hydratePreprocessSet(payload);

    // var paylaods = this.payloads;
    // for (let payload of payloads) {
    //   var payloadSet = payload.set;
    //   for (let payloadItem of payloadSet) {
    //     payloadItem.transform();
    //     errors = payloadItem.validate(cacheKey);
    //     if (errors && errors.length) {
    //       return {errors, args};
    //     }
    //   }
    // }

    errors = this.preprocess(cacheKey);




    if (errors && errors.length) return {errors, args};
    args = this.updateArgs(args);
    this.resetPayload();

    return {
      errors: errors && errors.length ? errors : null,
      args,
    };
  }

  /**
   * Given a new payload, add values to the cached payload object.
   * @param {Array|Object} payload
   */
  hydratePreprocessSet(obj) {
    var payloads, len;
    payloads = this.payloads;
    payloads.forEach((payload, i) => {
      this.payloads[i].payload = obj[i];
      var sets = payload.set;
      sets.forEach((set, ii) => {
        var {payloadPath} = set;
        var value = deepGet(obj[i], payloadPath);
        if (value === undefined) {
          let defaultValue = this.payloads[i].set[ii].fieldSchema.default;
          value = defaultValue !== undefined ? defaultValue : value;
        }
        this.payloads[i].set[ii].value = value;
      });
    });
  }

  /**
   * Remove the values from our payload objects but keep the other meta info.
   */
  resetPayload() {
    this.payloads.forEach(payload => payload.resetPayload());
  }


}
