const {isType} = require('../utils');
const {getSubdocumentSchema} = require('./utils.preprocess');

const self = module.exports;

class Payload {
  constructor() {}
}

class InsertPayload extends Payload {

  constructor(payload, schema) {
    super();
    this.payload = this.deconstructPayload(payload);
  }

  deconstructPayload(payload) {

  }

  setDefaults() {}

  validate() {}

  transform() {}
}

class UpdatePayload extends Payload {

  constructor(payload, schema, isUpsert) {
    super();
    if (isUpsert) {
      //
    }
    else {
      this.payload = this.deconstructPayload(payload, schema);
    }
  }

  // Requirements - hydrate new playloads, enforce required, set defaults,
  // return an itterable preprocess obj.
  deconstructPayload(payload, schema) {
    var payloadKeys, operation, preprocessList = [];
    payloadKeys = Object.keys(payload);
    payloadKeys.forEach((payloadKey) => {
      var payloadItem, operation, result;
      payloadItem = payload[payloadKey];
      operation = payloadKey.slice(0,1) === '$' ? payloadKey : null;
      if (operation) {
        switch (operation) {
          case '$set':
            result = this.deconstructSet(payloadItem, schema);
            console.log(result);
            process.exit();
            break;
          case '$addToSet':
            break;
        }
      }
      else {
        obj = this.deconstructInsert(payloadItem);
      }
      preprocessList = preprocessList.concat(result);

    });

    return preprocessList;
  }

  // at the start nothing is required.
  // then as we pick out fields, we reference schema, and pull back
  // required fields. same w/ defaults.
  /*
  [
    {payloadPath, value, validate, transform, setDefaults},
  ]
  don't forget about object in array fields.
  */
  deconstructSet(payload, schema) {
    var fieldKeys, preprocessList = [], errors = [];
    fieldKeys = Object.keys(payload);
    fieldKeys.forEach((fieldKey) => {
      var fieldValue, fieldSchema, valueIsObject, payloadItem;
      fieldValue = payload[fieldKey];
      fieldSchema = schema[fieldKey];
      if (!fieldSchema)  {
        errors.push(`Field "${fieldKey}" does not exist in schema.`);
        return;
      }

      payloadItem = new PayloadItem(fieldKey, fieldValue, fieldSchema);
      preprocessList.push(payloadItem);

      valueIsObject = isType(fieldValue, 'object') && !isType(fieldValue, 'date');
      if (valueIsObject) {
        let subdocSchema, subdocKeys, fieldValueKeys;
        subdocSchema = getSubdocumentSchema(fieldKey, schema, 1);
        subdocKeys = Object.keys(subdocSchema);
        subdocKeys.forEach((subdocKey) => {
          var subdocFieldSchema, subdocFieldValue, relativeSubdocKey;
          subdocFieldSchema = subdocSchema[subdocKey];

          relativeSubdocKey = subdocKey.split('.').slice(-1);
          subdocFieldValue = fieldValue[relativeSubdocKey];

          if (subdocFieldValue === undefined) {
            let isRequired = subdocFieldSchema.required;
            if (isRequired) {
              errors.push(`Required Field "${subdocKey}" does not exist in payload.`);
            }
            if (subdocFieldSchema.default !== undefined) {
              subdocFieldValue = subdocFieldSchema.default;
            }
          }
          payloadItem = new PayloadItem(subdocKey, subdocFieldValue, subdocFieldSchema);
          preprocessList.push(payloadItem);
        });

        fieldValueKeys = Object.keys(fieldValue);
        fieldValueKeys.forEach((key) => {
          var nestedSubdocument;
          nestedSubdocument = isType(fieldValue[key], 'object')  && !isType(fieldValue[key], 'date');
          if (nestedSubdocument) {
            let result;
            result = this.deconstructSet(fieldValue[key], getSubdocumentSchema(fieldKey, schema));
            if (result.errors) errors = errors.concat(result.errors);
            if (result.preprocessList) preprocessList = preprocessList.concat(result.preprocessList);
          }
        });
      }

    });
    return {
      errors: errors && errors.length ? errors : null,
      preprocessList: preprocessList && preprocessList.length ? preprocessList : null,
    };
  }


}

class PayloadItem {

  constructor(payloadPath, value, fieldSchema) {
    this.payloadPath = payloadPath;
    this.value = value;
    this.fieldSchema = fieldSchema;
  }

  setDefaults() {
    var value, fieldSchema;
    value = this.value;
    fieldSchema = this.fieldSchema;
    if (value === undefined && fieldSchema.default !== undefined) {
      this.value = fieldSchema.default;
    }
  }

  validate() {}

  transform() {}

};

self.Payload = Payload;
self.PayloadItem = PayloadItem;
self.InsertPayload = InsertPayload;
self.UpdatePayload = UpdatePayload;
