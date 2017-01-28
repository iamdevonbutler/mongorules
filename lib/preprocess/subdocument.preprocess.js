const PreprocessorCore = require('./core.preprocess');

const {isType} = require('../utils');
const {
  deconstructPayload,
  reconstructPayload,
} = require('./utils.preprocess');

module.exports = class SubdocumentPreprocessor extends PreprocessorCore {

  constructor(schema) {
    super();
    this._payload;
    this._schema = schema;
  }

  addPayload(payload, parentKey) {
    payload = isType(payload, 'array') ? payload : [payload];
    payload = payload.map((item) => {
      return Object.keys(item).length ? item : null;
    }).filter(Boolean).map((item) => deconstructPayload(item, parentKey));
    this._payload = payload;
  }

  getPayload() {
    var payload;
    payload = this._payload;
    payload = payload.map(reconstructPayload);
    return payload;
  }

  // enforceRequiredFields(parentKey = '') {
  //   var schema, schemaKeys, payload, errors = [], containerArrays = [];
  //   schema = this._schema;
  //   schemaKeys = Object.keys(schema);
  //   payload = this._payload;
  //   payload.forEach((payload2, documentNumber) => {
  //     schemaKeys.forEach((key) => {
  //       var fieldSchema = schema[key];
  //       if (fieldSchema._type === 'arrayofobjects') {
  //         containerArrays.push(key);
  //       }
  //       if (fieldSchema.required) {
  //         if (!payload2[key] || payload2[key].value === undefined) {
  //           let subdocumentInArray = containerArrays.some(key2 => key.startsWith(key2));
  //           if (!subdocumentInArray) {
  //             errors.push({
  //               field: key,
  //               property: 'required',
  //               value: payload2[key] ? payload2[key].value : undefined,
  //               documentNumber,
  //             });
  //           }
  //         }
  //       }
  //     });
  //   });
  //   return errors && errors.length ? errors : null;
  // }

}
