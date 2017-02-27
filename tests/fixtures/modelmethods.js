module.exports.addUser = function(value) {
  return this.users.insert({
    account: {
      name: value
    }
  });
};

module.exports.addUsers = function* (value) {
  yield this.users.insert({
    account: {
      name: value
    }
  });
  yield this.users.insert({
    account: {
      name: value
    }
  });
}
