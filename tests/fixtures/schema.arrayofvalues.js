const {Types} = require('../../lib');

module.exports = {

  "account.friends": {
    type: Types.array(Types.string, Types.number),
    required: true,
    notNull: true,
    lowercase: true,
    trim: true,
    denyXSS: true,
    filterNulls: true,
    minLength: [2, 1],
    maxLength: [3, 3],
    validate: [
      value => {
      return value !== ['reject me'];
    }, value => {
      return value !== 'reject me';
    }],
    transform: [
      value => {
        console.log(value);
      // return 'hey ' + value;
    }, value => {
      return 'hey ' + value;
    }]
  }

};
