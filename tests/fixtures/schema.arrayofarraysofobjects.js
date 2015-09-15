module.exports = {

  "account.friends": [[{
    default: [[{}]],
    required: false,
    minLength: 1,
    maxLength: 2
  }]],

  "account.friends.name": {
    type: 'string',
    required: true,
    lowercase: true
  },

  "account.friends.age": {
    type: 'number',
    required: true
  }

};
