module.exports = {

  "users.account.locations": [[{
    type: 'string',
    required: true,
    transform: function(values) {
      return values.map((value) => {
        return value.map((val) => {
          return val + ' deg';
        });
      });
    }
  }]],


};
