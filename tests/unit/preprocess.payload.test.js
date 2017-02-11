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
          value: {
            name: 1
          },
          payloadPath: ['account.friends.0'],
          isEach: false,
          itemInArray: true,
          embeddedFieldUpdate: true,
        }
      };
      result = deconstructPayload.call(ctx, payload);
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
          isEach: false,
          itemInArray: false,
          embeddedFieldUpdate: false,
        },
        'account.email': {
          value: 'j@j.com',
          payloadPath: ['account', 'email'],
          isEach: false,
          itemInArray: false,
          embeddedFieldUpdate: false,
        },
        'account.friends': {
          value: [
            {name: 'lrn'},
            {name: 'lou'}
          ],
          payloadPath: ['account', 'friends'],
          isEach: false,
          itemInArray: false,
          embeddedFieldUpdate: false,
        },
        'notifications': {
          value: [1, 2, 3],
          payloadPath: ['notifications'],
          isEach: false,
          itemInArray: false,
          embeddedFieldUpdate: false,
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
          isEach: false,
          itemInArray: true,
          embeddedFieldUpdate: true,
        },
        'ratings.rating': {
          value: 2,
          payloadPath: ['ratings.0.rating'],
          isEach: false,
          itemInArray: true,
          embeddedFieldUpdate: true,
        },
        'account.name': {
          value: 'jay',
          payloadPath: ['account', 'name'],
          isEach: false,
          itemInArray: false,
          embeddedFieldUpdate: false,
        },
        'account.location.name': {
          value: 'home',
          payloadPath: ['account', 'location', 'name'],
          isEach: false,
          itemInArray: false,
          embeddedFieldUpdate: false,
        }
      };
      result = deconstructPayload.call(ctx, payload);
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
          isEach: false,
          itemInArray: false,
          embeddedFieldUpdate: true,
        }
      };
      result = deconstructPayload.call(ctx, payload);
      result.should.eql(parsedPayload);
    });

    it('should deconstruct a $addToSet w/ $each payload', () => {
      var parsedPayload, payload, result;
      payload = {
        'account.notifications': {
          $each: [1, 2, 3],
          $slice: -5,
          $position: 0,
        }
      };
      parsedPayload = {
        'account.notifications': {
          value: [1, 2, 3],
          payloadPath: ['account.notifications', '$each'],
          isEach: true,
          itemInArray: false,
          embeddedFieldUpdate: true,
        }
      };
      result = deconstructPayload.call(ctx, payload);
      result.should.eql(parsedPayload);
    });
  });

});
