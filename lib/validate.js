'use strict';

const _ = require('lodash');

module.exports = {

  /**
   * Given a field value, validate according to schema.
   * @param {Mixed} value
   * @param {String} fieldName
   * @param {Object} fieldSchema
   * @return {true|errors Array}
   */
  _validateValue(value, fieldName, fieldSchema) {
    var errors = [], result;

    // Required field.
    if (fieldSchema.required) {
      result = this._validateRequired(value, fieldSchema)
      if (!result) {
        errors.push({ field: fieldName, property: 'required', value: value });
      }
    }

    // If not required and value is undefined, do not continue validating.
    if (_.isUndefined(value)) {
      return errors.length ? errors : true;
    }

    // Validate type.
    if (schema.type) {
      result = this._validateType(value, fieldSchema);
      if (!result) {
        if (schema.dateFormat) {
          errors.push({ field: fieldName, property: 'type', value: value, expected: schema.type + ': ' + schema.dateFormat });
        }
        else {
          errors.push({ field: fieldName, property: 'type', value: value, expected: schema.type });
        }
      }
    }

    // Validate XSS for strings.
    if (schemaType === 'string' && schema.denyXSS) {
      result = this._validateDenyXSS(value, fieldSchema);
      if (!result) {
        errors.push({ field: fieldName, property: 'denyXSS', value: value });
      }
    }

    // Custom validation function.
    if (schema.validate) {
      result = this._validateFunction(value, fieldSchema)
      if (!result) {
         errors.push({ field: fieldName, property: 'validate', value: value });
      }
    }

    return errors.length ? errros : true;
  },

  /**
   * Validate that a field is required.
   */
  _validateRequired(value, schema) {
    if (schema.required && !_.isUndefined(schema.default) && (_.isNull(value) || _.isUndefined(value))) {
      return false;
    }
    return true;
  },

  /**
   * Validate that a field is of type defined in schema.
   */
  _validateType(value, schema) {
    if (schema.type === 'date' && !utils._validateDate(value, schema.dateFormat)) {
      return false;
    }
    if (schema.type !== 'date' && !utils._isType(value, schema.type)) {
      return false;
    }
    return true;
  },

  /**
   * Validate that a string field does not contain XSS.
   */
  _validateDenyXSS(value, schema) {
    if (schema.denyXSS && value !== sanitize.inHTMLData(value)) {
      return false;
    }
    return true;
  },

  /**
   * Run field through custom validate function that returns `true` or `false`.
   */
  _validateFunction(value, schema) {
    var valid = schema.validate.call(schema, value);
    if (!!valid === false) {
      return false;
    }
    return true;
  }


  // /**
  //  * Array validation object w/ validation methods.
  //  */
  // _arrayValidation: {
  //   required(value, schema, field) {
  //     if (schema.required && !_.isUndefined(schema.default) && !value.length) {
  //       return { field: field, property: 'required', value: value };
  //     }
  //   },
  //   type(value, schema, field) {
  //     if (schema.type && value.length) {
  //       for (let i=0, len=value.length; i<len; i++) {
  //         if (schema.type === 'date' && !utils._validateDate(value[i], schema.dateFormat)) {
  //           return { field: field, property: 'type', value: value, expected: schema.type + ': ' + schema.dateFormat };
  //         }
  //         if (schema.type !== 'date' && !utils._isType(value[i], schema.type)) {
  //           return { field: field, property: 'type', value: value, expected: schema.type };
  //         }
  //       }
  //     }
  //   },
  //   denyXSS(value, schema, field) {
  //     if (schema.denyXSS) {
  //       for (let i=0, len=value.length; i<len; i++) {
  //         if (value[i] !== sanitize.inHTMLData(value[i])) {
  //           return { field: field, property: 'denyXSS', value: value };
  //         }
  //       }
  //     }
  //   },
  //   validate(value, schema, field) {
  //     if (schema.validate) {
  //       for (let i=0, len=value.length; i<len; i++) {
  //         if (!schema.validate.call(schema, value[i])); {
  //           return { field: field, property: 'validate', value: value };
  //         }
  //       }
  //     }
  //   }
  // },
  //
  // /**
  //  * Non array value validation object w/ validation methods.
  //  */
  // _valueValidation: {
  //   required(value, schema, field) {
  //     if (schema.required && !_.isUndefined(schema.default) && (_.isNull(value) || _.isUndefined(value))) {
  //       return { field: field, property: 'required', value: value };
  //     }
  //   },
  //   type(value, schema, field) {
  //     if (schema.type === 'date' && !utils._validateDate(value, schema.dateFormat)) {
  //       return { field: field, property: 'type', value: value, expected: schema.type + ': ' + schema.dateFormat };
  //     }
  //     if (schema.type !== 'date' && !utils._isType(value, schema.type)) {
  //       return { field: field, property: 'type', value: value, expected: schema.type };
  //     }
  //   },
  //   denyXSS(value, schema, field) {
  //     if (schema.denyXSS && value !== sanitize.inHTMLData(value)) {
  //       return { field: field, property: 'denyXSS', value: value };
  //     }
  //   },
  //   validate(value, schema, field) {
  //     if (schema.validate) {
  //       var valid = schema.validate.call(schema, value);
  //       if (!valid) {
  //         return { field: field, property: 'validate', value: value };
  //       }
  //     }
  //   }
  // }


};
