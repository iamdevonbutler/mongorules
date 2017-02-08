const {
  compose,
  validateRequired,
  validateNotNull,
  validateType,
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
  validateType,
  validateMinLength(0),
  validateMaxLength(0),
  validateFunction(0)
);

const validatorArrayOfValues2 = compose(
  validateNotNull,
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

module.exports = {
  validatorValues,
  validatorArrayOfValues1,
  validatorArrayOfValues2,
  validatorArrayOfObjects1,
};
