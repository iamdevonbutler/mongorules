module.exports = {

  "account.name": {
    required: true,
    type: 'string',
    trim: true,
    lowercase: true,
    denyXSS: true
  },

  "birthday": {
    type: 'date',
    dateFormat: 'MM-DD-YYYY'
  },

  "newsletter": {
    type: 'boolean'
  },

  "age": {
    type: 'number',
    validate: function(value) {
      return value > 0
    }
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
