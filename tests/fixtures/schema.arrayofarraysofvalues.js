module.exports = {

  "locations": [[{
    type: 'string',
    required: true,
    minLength: [1, 1, 1],
    maxLength: [null, 2, 25],
    sanitize: true,
    trim: true,
    lowercase: true,
    filterNulls: true,
    validate: [null, function(value) {
      return value !== 'reject';
    }],
    transform: [
      function(value) {
        return value;
      },
      function(value) {
        return value + '!';
    }]
  }]],


};
