module.exports = {

  "users.account.friends": [{
    type: 'string',
    required: true,
    lowercase: true,
    trim: true
  }],

  "users.account.family": [{
    type: 'string',
    default: []
  }]

};
