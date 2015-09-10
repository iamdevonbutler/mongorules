module.exports = {

  "account.friends": [[{
    default: [[{}]],
    required: false,
    minLength: 2,
    maxLength: 4
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
