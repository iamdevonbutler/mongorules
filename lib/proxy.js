module.exports = {

  apply(...args) {
    console.log('>>> apply');
    console.log(args);
  },

  get(target, propertyKey, receiver) {
    console.log('>>> get');
    console.log();
    // Can get novalidate.
    // Can get collectionName
    // can get.
  },

};
