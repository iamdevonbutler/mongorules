module.exports = {

  "users.name": {
    type: 'string',
    required: true,
    trim: true,
    lowercase: true,
    denyXSS: true
  },

  "users.newsletter": {
    type: 'boolean'
  },

  "users.age": {
    type: 'number',
    validate: function(value) {
      return value > 0
    }
  },

  "users.mood": {
    type: 'number',
    transform: function(value) {
      return 'good ' + value;
    }
  },

  "users.birthday": {
    type: 'date',
    dateFormat: 'MM-DD-YYYY'
  },

  "users.updated": {
    type: 'date',
    dateFormat: 'unix'
  },

  "users.created": {
    type: 'date',
    dateFormat: 'iso8601'
  },

}
