'use strict';

/**
 * @file composed validators to be used in payload validation.
 */

const {
  compose,
  validateRequired,
  validateNotNull,
  validateType,
  validateTypeArrayUpdate,
  validateDenyXSS,
  validateMinLength,
  validateMaxLength,
  validateFunction,
} = require('../validate');

const validatorValues = compose(
  validateRequired,
  validateNotNull,
  validateType,
  validateDenyXSS,
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayOfValues1 = compose(
  validateRequired,
  validateNotNull,
  validateType, // validates types of individual items & container array.
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayOfValues2 = compose(
  validateNotNull,
  validateDenyXSS,
  validateMinLength(1),
  validateMaxLength(1),
  validateFunction(1)
);

const validatorArrayOfValuesArrayUpdate = compose(
  validateNotNull,
  validateDenyXSS,
  validateTypeArrayUpdate,
  validateMinLength(1),
  validateMaxLength(1),
  validateFunction(1)
);

const validatorArrayOfObjects1 = compose(
  validateRequired,
  validateNotNull,
  validateType,
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayUpdate1 = compose(
  validateNotNull,
  validateType,
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayUpdate2 = compose(
  validateNotNull,
  validateDenyXSS,
  validateMinLength(1),
  validateMaxLength(1),
  validateFunction(1)
);

module.exports = {
  validatorValues,
  validatorArrayOfValues1,
  validatorArrayOfValues2,
  validatorArrayOfValuesArrayUpdate,
  validatorArrayOfObjects1,
  validatorArrayUpdate1,
  validatorArrayUpdate2,
};
