const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

var db;

describe('insert(): array of objects:', () => {

  before(() => {
    ({db} = require('../../lib')); // tests setDefaultDb() method.
  });

  it('should error given a payload w/ fields not in schema', function* () {
    try {
      yield db.users3.insert({account: {}});
    }
    catch (e) {
      e.errors.length.should.eql(1);
    }

    try {
      yield db.users3.insert({notInSchema: {a:1}});
    }
    catch (e) {
      e.errors.length.should.eql(1);
    }
  });


  it('should error given a payload missing a required property', function* () {
    var obj = {
      account: {
        friends: [{
          name: 'jay',
          nicknames: [{
            giver: [{name: 'jay'}]
          }]
        }]
      }
    };
    try {
      yield db.users3.insert(obj);
    }
    catch (e) {
    // missing account.friends.nicknames.name
      e.errors.length.should.eql(1);
    }
  });

  it('should transform a property given a custom transform function', function* () {
    var obj = {
      account: {
        friends: [{
          name: 'JAY'
        }]
      }
    };
    yield db.users3.insert(obj);
    var result = yield db.users3.findOne();
    result.account.friends[0].name.should.eql('jay!');
    result.account.friends[0].nicknames.should.eql([]);
  });



  it('should error given a document w/ data in violation of the minLength property', function* () {
    var obj = {
      account: {
        friends: [{
          name: ''
        }]
      }
    };
    try {
      var result = yield db.users3.insert(obj);
      console.log(result);
    } catch (e) {
      console.log(e);
      e.errors.length.should.eql(1);
      e.errors[0].property.should.eql('minLength');
    }

    // doc = {
    //   account: {
    //     friends: []
    //   }
    // };
    // try {
    //   db.users.insert(doc).then(result => {
    //     done(result);
    //   });
    // } catch (e) {
    //   e.errors.length.should.eql(1);
    //   e.errors[0].property.should.eql('minLength');
    //   done();
    // }
  });
  //
  // it('should throw an error given a document w/ data in violation of the maxLength property', (done) => {
  //   var doc;
  //   doc = {
  //     account: {
  //       friends: [{
  //         name: 'jay'
  //       }, {
  //         name: 'jay'
  //       }, {
  //         name: 'jay'
  //       }]
  //     }
  //   };
  //   try {
  //     db.users.insert(doc).then(result => {
  //       done(result);
  //     });
  //   } catch (e) {
  //     e.errors.length.should.eql(1);
  //     e.errors[0].property.should.eql('maxLength');
  //     done();
  //   }
  // });
  //
  // it('should throw an error given an invalid type constraint on a property on an object', (done) => {
  //   var doc;
  //   doc = {
  //     account: {
  //       friends: [{
  //         name: 1
  //       }]
  //     }
  //   };
  //   try {
  //     db.users.insert(doc).then(result => {
  //       done(result);
  //     });
  //   } catch (e) {
  //     e.errors.length.should.eql(1);
  //     e.errors[0].property.should.eql('type');
  //     done();
  //   }
  // });
  //
  // it('should sanitize an object property', (done) => {
  //   var doc;
  //   doc = {
  //     account: {
  //       friends: [{
  //         name: '<script>jay</script>'
  //       }]
  //     }
  //   };
  //   db.users.insert(doc).then(result => {
  //     db.users.findOne({}).then(result => {
  //       result.account.friends[0].name.should.not.eql('<script>jay</script>');
  //       done();
  //     });
  //   });
  // });
  //
  // it('should set default values', (done) => {
  //   var doc;
  //   doc = {
  //     account: {
  //       friends: [{
  //         name: 'jay'
  //       }]
  //     }
  //   };
  //   db.users.insert(doc).then(result => {
  //     db.users.findOne({}).then(result => {
  //       result.account.friends.should.eql([
  //         {
  //           name: 'jay!',
  //           nicknames: []
  //         }
  //       ]);
  //       done();
  //     });
  //   });
  // });
  //
  // it('should successfully insert a document given correct data', (done) => {
  //   var doc;
  //   doc = {
  //     account: {
  //       friends: [{
  //         name: 'jay',
  //         nicknames: [{
  //           name: 'gus',
  //           giver: [{
  //             name: 'flip'
  //           }]
  //         }]
  //       },
  //       {
  //         name: 'lou'
  //       }]
  //     }
  //   };
  //   db.users.insert(doc).then(result => {
  //     db.users.findOne({}).then(result => {
  //       result.account.friends[1].should.be.ok;
  //       result.account.friends[0].name.should.eql('jay!');
  //       result.account.friends[0].nicknames[0].name.should.eql('gus');
  //       result.account.friends[0].nicknames[0].giver[0].name.should.eql('flip');
  //       done();
  //     });
  //   });
  // });
});
