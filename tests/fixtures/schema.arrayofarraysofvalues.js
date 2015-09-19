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
    validate: [
      // Validates each array of values.
      function(value) {
        return true;
      },
      // Validates each value in each array.
      function(value) {
        return value !== 'reject';
      }
    ],
    transform: [
      // Transforms each array of values.
      function(value) {
        return value;
      },
      // Transforms each value in each array.
      function(value) {
        return value + '!';
      }
    ]
  }]],


};
