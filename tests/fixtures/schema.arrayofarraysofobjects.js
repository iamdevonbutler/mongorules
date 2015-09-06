module.exports = {

  "users.account.friends": [[{
    type: 'object',
    default: [{}]
  }]],

  "users.account.friends.name": {
    type: 'string',
    required: true,
    lowercase: true
  },

  "users.account.friends.age": {
    type: 'nuber',
    required: true
  }

};
