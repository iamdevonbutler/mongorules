const {Types} = require('../../lib');
const {isType} = require('../../lib/utils');

module.exports = {

  "account.name": {
    required: true,
    type: Types.string,
    trim: true,
    lowercase: true,
    denyXSS: true,
    minLength: 4,
    maxLength: 20,
    transform(value) {
      return value && isType(value, 'string') ? 'hey ' + value : value;
    },
    validate(value) {
      return value !== 'hey tim';
    }
  },

  "account.friends": {
    type: Types.array(Types.mixed(Types.string, Types.number)),
    notNull: true,
    default: []
  },

  "newsletter": {
    type: Types.boolean,
    default: true,
    notNull: true,
  },

  "age": {
    type: Types.mixed(Types.number, Types.null),
  },

  "created": {
    type: Types.mixed(Types.date, Types.timestamp),
  }

}
