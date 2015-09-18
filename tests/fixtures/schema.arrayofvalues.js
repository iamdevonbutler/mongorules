module.exports = {

  "account.friends": [{
    type: 'string',
    required: true,
    notNull: true,
    lowercase: true,
    trim: true,
    denyXSS: true,
    filterNulls: true,
    minLength: [2, 1],
    maxLength: [3, 3],
    validate: [function(value) {
      return value === 'aaa' ? false : true;
    }],
    transform: [function(value) {
      return 'hey ' + value;
    }]
  }]

};
