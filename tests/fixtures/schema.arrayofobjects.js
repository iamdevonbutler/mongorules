module.exports = {

  // Array item w/ an array of objects as it's value.
  "account.friends": [{
    default: [{}],
    minLength: 1,
    maxLength: 2
  }],

  "account.friends.name": {
    type: 'string',
    required: true,
    lowercase: true
  },

  // Array item w/ an array of objects as it's value.
  "account.friends.nicknames": [{
    default: [{}],
  }],

  "account.friends.nicknames.name": {
    type: 'string',
    required: true,
    lowercase: true
  },

  // Array item w/ an array of objects as it's value.
  "account.friends.nicknames.giver": [{
    type: 'string',
    required: true,
    lowercase: true
  }],

  "account.friends.nicknames.giver.name": {
    type: 'string',
    required: true,
    lowercase: true
  },

  "account.friends.nicknames.giver.school": {
    type: 'string',
    required: true,
    lowercase: true
  },

};
