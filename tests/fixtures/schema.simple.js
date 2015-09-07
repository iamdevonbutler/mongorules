module.exports = {

  "name": {
    type: 'string',
    required: true,
    trim: true,
    lowercase: true,
    denyXSS: true
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

  "mood": {
    type: 'number',
    transform: function(value) {
      return 'good ' + value;
    }
  },

  "birthday": {
    type: 'date',
    dateFormat: 'MM-DD-YYYY'
  },

  "updated": {
    type: 'date',
    dateFormat: 'unix'
  },

  "created": {
    type: 'date',
    dateFormat: 'iso8601'
  },

}