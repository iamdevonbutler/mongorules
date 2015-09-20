module.exports = {

  "account.name": {
    required: true,
    type: 'string',
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

  "account.friends": [{
    type: 'string',
    notNull: true,
    default: []
  }],

  "newsletter": {
    type: 'boolean',
    default: true
  },

  "age": {
    type: 'number'
  },

  "birthday": {
    type: 'date',
    dateFormat: 'MM-DD-YYYY'
  },

  "updated": {
    type: 'date',
    dateFormat: 'timestamp'
  },

  "created": {
    type: 'date',
    dateFormat: 'iso8601'
  }

}
