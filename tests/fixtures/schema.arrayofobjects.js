module.exports = {

  "account.friends": [{
    default: [{}],
    minLength: 2,
    maxLength: 4
  }],

  "account.friends.name": {
    type: 'string',
    required: true,
    lowercase: true,
  },

  // Array item w/ an array of objects as it's value.
  "account.friends.age": [{
    default: [{}],
    minLength: 2,
    maxLength: 4
  }],

  "account.friends.age.thing": {
    type: 'string',
    required: true,
    lowercase: true,
  },

};
