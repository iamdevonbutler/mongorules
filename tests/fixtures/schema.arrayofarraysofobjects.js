module.exports = {

  "account.friends": [[{
    type: 'object',
    default: [{}]
  }]],

  "account.friends.name": {
    type: 'string',
    required: true,
    lowercase: true
  },

  "account.friends.age": {
    type: 'nuber',
    required: true
  }

};
