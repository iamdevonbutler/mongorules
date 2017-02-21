const {isType, isObjectId} = require('../utils');
const UpdatePreprocessor = require('./preprocessor.update');
const InsertPreprocessor = require('./preprocessor.insert');

class SaveByUpdatePreprocessor extends UpdatePreprocessor {
  constructor(schema) {
    super(schema);
  }

  /**
   * Parses the payload out of the args array.
   * @param {Array} args
   * @return {Object} payload.
   */
  parsePayloadFromArgs(args) {
    var payload;
    // Cast payload to array for data processing consistency.
    payload = [args[0]];
    payload = payload.map((item) => {
      return isType(item, 'object') && Object.keys(item).length ? item : null;
    }).filter(Boolean);
    return payload;
  }

  isUpsertOperation() {
    return true;
  }

  updateArgs(args) {
    args[0] = this.payloads[0].payload;
    return args;
  }
}

module.exports = class SavePreprocessor {

  /**
   * @param {Object} schema.
   * @param {Array} args.
   */
  constructor(schema, args) {
    var doc, id;
    doc = args[0];
    id = doc ? doc._id : null;
    id = id && isObjectId(id) ? id : null;
    if (id) {
      return new SaveByUpdatePreprocessor(schema);
    }
    else {
      return new InsertPreprocessor(schema);
    }
  }

}
