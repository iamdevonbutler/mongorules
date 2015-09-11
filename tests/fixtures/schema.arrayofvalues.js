module.exports = {

  "account.friends": [{
    type: 'string',
    required: true,
    lowercase: true,
    trim: true,
    minLength: 1,
    maxLength: 10,
    validate: null,
    transform: null
  }]

};
