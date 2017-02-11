const {Types} = require('../../lib');
const {isType} = require('../../lib/utils');

module.exports = {

  "account.friends": {
    type: Types.array(Types.string),
    required: true,
    notNull: true,
    lowercase: true,
    trim: true,
    denyXSS: true,
    filterNulls: true,
    minLength: [2, 5],
    maxLength: [3, 10],
    validate: [
      value => {
      return value.indexOf('hey reject') === -1;
    }, value => {
      return value !== 'hey rej';
    }],
    transform: [
      value => {
        return value;
    }, value => {
      return isType(value, 'string') ? 'hey ' + value : value;
    }]
  }

};
