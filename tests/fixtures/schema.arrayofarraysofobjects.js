module.exports = {

  "account.friends": [[{
    default: [[{}]]
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
