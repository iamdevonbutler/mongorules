module.exports = {

  "account.locations": [[{
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 4,
    transform: function(values) {
      return values.map((value) => {
        return value.map((val) => {
          return val + ' deg';
        });
      });
    }
  }]],


};
