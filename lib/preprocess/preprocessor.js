const {deepGet} = require('lodash-deep');

module.exports = class Preprocessor {

  constructor(schema, isSetOperation = false, isUpsert = false) {
    var obj;
    this.payloads;
    this.schema = schema;
    this.isSetOperation = isSetOperation;
    this.isUpsert = isUpsert;

    // @todo hack
    obj = require('./payload/payload.update');
    this._preprocessFieldUpdate = obj.prototype.preprocessFieldUpdate;
    this._preprocessArrayUpdate = obj.prototype.preprocessArrayUpdate;
  }

  preprocess(rootKey = '') {
    var payloads, errors = [];
    payloads = this.payloads;
    payloads.forEach(payload => {
      var errors2;
      errors2 = payload.preprocess(rootKey);
      if (errors2 && errors2.length) {
        errors = errors.concat(errors2);
      }
    });
    return errors && errors.length ? errors : null;
  }

  /**
   * Using a cached data structures, transform and validate a payload.
   * @param {Array} args - args in db.users.insert({}, {})
   * @return {Object} - errors and updated/transformed args.
   */
  preprocessFromCache(args) {
    var parsedPayload, payloads, errors, obj;

    parsedPayload = this.parsePayloadFromArgs(args);
    this.hydratePreprocessSet(parsedPayload);

    payloads = this.payloads;
    for (let key in payloads) {
      let payload, payloadSet;
      payload = payloads[key];
      payloadSet = payload.set;
      for (let payloadItem of payloadSet) {
        payloadItem.transform();
        errors = payloadItem.validate();
        if (errors && errors.length) {
          this.resetPayload();
          return {errors, args};
        }
      }
      this.payloads[key].payload = payload.reconstructPayload();
    }

    // @todo hack
    ({errors, obj} = this.preprocessUncachedUpdateOperations(parsedPayload[0]));
    if (errors && errors.length) {
      return {errors, args};
    }
    else if (obj) {
      this.payloads[0].payload = Object.assign({}, obj, this.payloads[0].payload);
    }

    args = this.updateArgs(args);
    this.resetPayload();

    return {
      errors: errors && errors.length ? errors : null,
      args,
    };
  }

  // @todo hackish
  preprocessUncachedUpdateOperations(payload) {
    var obj = {}, keys, schema, ops1, ops2, errors = [];
    schema = this.schema;
    ops1 = ['$inc', '$mul', '$min', '$max'];
    ops2 = ['$push', '$addToSet'];
    keys = Object.keys(payload);
    keys
      .filter(key => key[0] === '$' && key !== '$set')
      .forEach(key => {
        var e, payload2;
        if (ops1.indexOf(key) > -1) {
          ({errors: e, payload: payload2} = this._preprocessFieldUpdate(payload[key], schema));
        }
        if (ops2.indexOf(key) > -1) {
          ({errors: e, payload: payload2} = this._preprocessArrayUpdate(payload[key], schema));
        }
        if (e) {
          errors = errors.concat(e);
        }
        else {
          obj[key] = payload2;
        }
      });
      return {
        errors: errors && errors.length ? errors : null,
        obj: Object.keys(obj).length ? obj : null,
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
        if (obj[i].$set && payloadPath[0] !== '$set') {
          payloadPath.unshift('$set');
        }
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
   * Is upsert = true;
   * @param {Array} args
   * @return {Boolean - true}
   */
  isUpsertOperation(args) {
    return;
  }

  /**
   * Remove the values from our payload objects but keep the other meta info.
   */
  resetPayload() {
    this.payloads.forEach(payload => payload.resetPayload());
  }


}
