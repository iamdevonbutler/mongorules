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
    notNull: true,
    lowercase: true,
    sanitize: true,
    minLength: 1,
    transform: function(value) {
      return value + '!';
    }
  },

  // Array item w/ an array of objects as it's value.
  "account.friends.nicknames": [{
    default: [{}],
  }],

  "account.friends.nicknames.name": {
    type: 'string',
    required: true
  },

  // Array item w/ an array of objects as it's value.
  "account.friends.nicknames.giver": [{
    type: 'string',
    required: true
  }],

  "account.friends.nicknames.giver.name": {
    type: 'string',
    required: true
  }

};
