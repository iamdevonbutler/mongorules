const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const schemaArrayOfObjects = require('../fixtures/schema.arrayofobjects');

const {
  getPayloadKeys,
  deconstructPayload,
  getSubdocumentSchema,
} = require('../../lib/preprocess/utils.preprocess');

describe('Preprocess utils:', () => {

  describe('getSubdocumentSchema()', () => {
    it('should return a partial schema', () => {
      var result, keys;
      result = getSubdocumentSchema('account.friends.nicknames', schemaArrayOfObjects);
      keys = Object.keys(result);
      keys.length.should.eql(3);
      keys.should.eql([
        'account.friends.nicknames.name',
        'account.friends.nicknames.giver',
        'account.friends.nicknames.giver.name',
      ]);
    });
  });

  describe('getPayloadKeys()', () => {
    it('should return an array w/ all payload keys', () => {
      var payload, result;
      payload = {
        a: 1,
        b: 2,
        c: [1,2,3],
        d: [
          { e:1, f:[1,2,3], g: [{h:1}] }
        ]
      };
      result = getPayloadKeys(payload);
      result.should.eql(['a', 'b', 'c', 'd', 'd.e', 'd.f', 'd.g', 'd.g.h'])
    });
  });


  describe('deconstructPayload():', () => {
    it('should deconstruct an item in array update payload', () => {
      var parsedPayload, payload, result;
      payload = {
        'account.friends.0': {
          name: 1
        }
      };
      parsedPayload = {
        'account.friends': {
          value: {
            name: 1
          },
          payloadPath: ['account.friends.0'],
          fieldInSubdocument: false,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: true
        }
      };
      result = deconstructPayload(payload);
      result.should.eql(parsedPayload);
    });

    it('should deconstruct an insert payload', () => {
      var parsedPayload, payload, result;
      payload = {
        account: {
          name: 'jay',
          email: 'j@j.com',
          friends: [
            {
              name: 'lrn'
            }, {
              name: 'lou'
            }
          ]
        },
        notifications: [1, 2, 3]
      };
      parsedPayload = {
        'account.name': {
          value: 'jay',
          payloadPath: ['account', 'name'],
          fieldInSubdocument: true,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        },
        'account.email': {
          value: 'j@j.com',
          payloadPath: ['account', 'email'],
          fieldInSubdocument: true,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        },
        'account.friends': {
          value: [
            {
              name: 'lrn'
            }, {
              name: 'lou'
            }
          ],
          payloadPath: ['account', 'friends'],
          fieldInSubdocument: true,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        },
        'notifications': {
          value: [1, 2, 3],
          payloadPath: ['notifications'],
          fieldInSubdocument: false,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        }
      };
      result = deconstructPayload(payload);
      result.should.eql(parsedPayload);
    });

    it('should deconstruct a $set payload', () => {
      var parsedPayload, payload, result;
      payload = {
        "tags.1": "rain gear",
        "ratings.0.rating": 2,
        "account": {
          name: 'jay',
          location: {
            name: 'home'
          }
        }
      };
      parsedPayload = {
        'tags': {
          value: 'rain gear',
          payloadPath: ['tags.1'],
          fieldInSubdocument: false,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: true
        },
        'ratings.rating': {
          value: 2,
          payloadPath: ['ratings.0.rating'],
          fieldInSubdocument: false,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: true
        },
        'account.name': {
          value: 'jay',
          payloadPath: ['account', 'name'],
          fieldInSubdocument: true,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        },
        'account.location.name': {
          value: 'home',
          payloadPath: ['account', 'location', 'name'],
          fieldInSubdocument: true,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        }
      };
      result = deconstructPayload(payload);
      result.should.eql(parsedPayload);
    });

    it('should deconstruct a $addToSet payload', () => {
      var parsedPayload, payload, result;
      payload = {
        'account.notifications': 1
      };
      parsedPayload = {
        'account.notifications': {
          value: 1,
          payloadPath: ['account.notifications'],
          fieldInSubdocument: false,
          isEach: false,
          modifiers: null,
          itemInArrayUpdate: false
        }
      };
      result = deconstructPayload(payload);
      result.should.eql(parsedPayload);
    });

    it('should deconstruct a $addToSet w/ $each payload', () => {
      var parsedPayload, payload, result;
      payload = {
        'account.notifications': {
          $each: [1, 2, 3],
          $slice: -5,
          $position: 0
        }
      };
      parsedPayload = {
        'account.notifications': {
          value: [1, 2, 3],
          payloadPath: ['account.notifications', '$each'],
          modifiers: [
            {
              $slice: -5
            }, {
              $position: 0
            }
          ],
          fieldInSubdocument: false,
          isEach: true,
          itemInArrayUpdate: false
        }
      };
      result = deconstructPayload(payload);
      result.should.eql(parsedPayload);
    });
  });



});
