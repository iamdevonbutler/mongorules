const {Types} = require('../../lib/schema');

module.exports = {

  "account.name": {
    required: true,
    type: Types.string,
    trim: true,
    lowercase: true,
    denyXSS: true,
    minLength: 1,
    maxLength: 20,
    transform: function(value) {
      return 'hey ' + value;
    },
    validate: function(value) {
      return value !== 'tim';
    }
  },

  "account.friends": {
    type: Types.array(Types.string),
    notNull: true,
    default: []
  },

  "newsletter": {
    type: Types.boolean,
    default: true
  },

  "age": {
    type: Types.number,
  },

  "birthday": {
    type: Types.date,
  },

  "updated": {
    type: Types.date,
  },

  "created": {
    type: Types.date,
  }

}
