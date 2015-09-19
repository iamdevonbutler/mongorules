module.exports = {

  "account.friends": [[{
    required: true,
    notNull: true,
    filterNulls: true,
    minLength: [1, 1],
    maxLength: [2, 2],
    validate: [
      // Validates each array of objects.
      function(value) {
        return true;
      },
      // Validates each object in each array.
      function(value) {
        return true;
      },
    ],
    transform: [
      // Transforms each array of objects.
      function(value) {
        return value;
      },
      // Transforms each object in each array.
      function(value) {
        return value;
      },
    ]
  }]],

  "account.friends.name": {
    type: 'string',
    required: true,
    lowercase: true,
    minLength: 1,
    maxLength: 20,
    transform: function(value) {
      return value + '!';
    }
  },

  "account.friends.age": {
    type: 'number',
    required: true,
    validate: function(value) {
      return value > 18;
    }
  }

};
