const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const Payload = require('../../lib/preprocess/payload/payload');
const deconstructPayload = Payload.prototype.deconstructPayload;
const ctx = new Payload();

describe('Payload:', () => {

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
          payloadPath: ['account.friends.0'],
          value: {name: 1},
          isArrayItemUpdate: true,
        }
      };
      result = deconstructPayload.call(ctx, payload);
      console.log(result);
      result.should.eql(parsedPayload);
    });

    it('should deconstruct an insert payload', () => {
      var parsedPayload, payload, result;
      payload = {
        account: {
          name: 'jay',
          email: 'j@j.com',
          friends: [
            {name: 'lrn'},
            {name: 'lou'}
          ]
        },
        notifications: [1, 2, 3]
      };
      parsedPayload = {
        'account.name': {
          value: 'jay',
          payloadPath: ['account', 'name'],
          isArrayItemUpdate: false,
        },
        'account.email': {
          value: 'j@j.com',
          payloadPath: ['account', 'email'],
          isArrayItemUpdate: false,
        },
        'account.friends': {
          value: [
            {name: 'lrn'},
            {name: 'lou'}
          ],
          payloadPath: ['account', 'friends'],
          isArrayItemUpdate: false,
        },
        'notifications': {
          value: [1, 2, 3],
          payloadPath: ['notifications'],
          isArrayItemUpdate: false,
        }
      };
      result = deconstructPayload.call(ctx, payload);
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
          payloadPath: ['tags.1'],
          value: 'rain gear',
          isArrayItemUpdate: true,
        },
        'ratings.rating': {
          value: 2,
          payloadPath: ['ratings.0.rating'],
          isArrayItemUpdate: true,
        },
        'account.name': {
          value: 'jay',
          payloadPath: ['account', 'name'],
          isArrayItemUpdate: false,
        },
        'account.location.name': {
          value: 'home',
          payloadPath: ['account', 'location', 'name'],
          isArrayItemUpdate: false,
        }
      };
      result = deconstructPayload.call(ctx, payload);
      result.should.eql(parsedPayload);
    });
  });

});
