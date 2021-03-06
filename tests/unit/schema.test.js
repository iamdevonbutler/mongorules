const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const  _ = require('lodash');
const schema = require('../../lib/schema');
const Types = schema.Types;

const func = (x) => x * x;

const _schemaValues = require('../fixtures/schema.values');
const _schemaArrayOfValues = require('../fixtures/schema.arrayofvalues');
const _schemaArrayOfObjects = require('../fixtures/schema.arrayofobjects');

describe('Schema:', () => {

  beforeEach(function(done) {
    schemaValues = Object.assign({}, _schemaValues);
    schemaArrayOfValues = Object.assign({}, _schemaArrayOfValues);
    schemaArrayOfObjects = Object.assign({}, _schemaArrayOfObjects);
    done();
  });

  describe('_addIdFieldToSchema', () => {
    it('should return false when executing the validate function given an invalid ID', () => {
      var result;
      result = schema._addIdFieldToSchema(schemaValues)._id.validate('a');
      return result.should.eql(false);
    });
    it('should return true when executing the validate function given a valid ID', () => {
      var result;
      result = schema._addIdFieldToSchema(schemaValues)._id.validate('560037cdfa952916b820528e');
      return result.should.eql(true);
    });
    it('should add an _id field to a schema when one does not already exist', () => {
      var result;
      result = schema._addIdFieldToSchema(schemaValues);
      expect(result._id).to.exist;
    });
    return it('should not add an _id field to a schema if one already exists', () => {
      var result;
      schemaValues._id = {
        type: 'string'
      };
      result = schema._addIdFieldToSchema(schemaValues);
      return result._id.type.should.eql('string');
    });
  });

  describe('_arrayifySchemaField()', () => {
    it('should transform a validate/transform function into an array containing a function', () => {
      var result;
      result = schema._arrayifySchemaField({
        transform: func,
        validate: func
      });
      result.transform[0].should.eql(func);
      return result.validate[0].should.eql(func);
    });
    return it('should transform a minLength/maxLength value into an array containing a minLength/maxLength value', () => {
      var result;
      result = schema._arrayifySchemaField({
        minLength: 1,
        maxLength: 1
      });
      result.minLength[0].should.eql(1);
      return result.maxLength[0].should.eql(1);
    });
  });

  describe('_sortByFieldKey():', () => {
    return it('should reorder an object by key by splitting on `.`.', () => {
      var keys, obj, result;
      obj = {
        'a.a': 1,
        'a.b': 1,
        'a': 1
      };
      result = schema._sortByFieldKey(obj);
      keys = Object.keys(result);
      keys[0].should.eql('a');
      keys[1].should.eql('a.a');
      return keys[2].should.eql('a.b');
    });
  });

  describe('generateSchema():', () => {
    it('should process a values schema', () => {
      var result;
      result = schema.generateSchema(schemaValues);
      result['account.name'].should.be.ok;
      result['account.friends'].should.be.ok;
      result['account.friends']._type.should.eql('arrayofvalues');
      result.newsletter.should.be.ok;
      result.age.should.be.ok;
      result.created.should.be.ok;
      result._id.should.be.ok;
    });

    it('should process a array of values schema', () => {
      var result;
      result = schema.generateSchema(schemaArrayOfValues);
      result['account.friends'].type.value.should.eql(['array']);
      result['account.friends'].type.children.should.eql(['string']);
      result['account.friends'].should.be.ok;
      result['account.friends']._type.should.eql('arrayofvalues');
      result._id.should.be.ok;
    });

    it('should process a schema with objects in arrays', () => {
      var result;
      result = schema.generateSchema(schemaArrayOfObjects);
      result._id.should.be.ok;
      result['account.friends'].should.be.ok;
      result['account.friends']._type.should.eql('arrayofobjects');
      result['account.friends.nicknames'].should.be.ok;
      result['account.friends.nicknames']._type.should.eql('arrayofobjects');
      result['account.friends.nicknames.name'].should.be.ok;
      result['account.friends.nicknames.giver'].should.be.ok;
      result['account.friends.nicknames.giver']._type.should.eql('arrayofobjects');
      result['account.friends.nicknames.giver.name'].should.be.ok;
    });
  });

  describe('_setSchemaFieldDefaults():', () => {
    return it('should set default values for all schema fields', () => {
      var defaults;
      defaults = schema._setSchemaFieldDefaults({});
      expect(defaults.required).to.not.be.undefined;
      expect(defaults.notNull).to.not.be.undefined;
      expect(defaults["default"]).to.be.undefined;
      expect(defaults.type).to.not.be.undefined;
      expect(defaults.trim).to.not.be.undefined;
      expect(defaults.lowercase).to.not.be.undefined;
      expect(defaults.uppercase).to.not.be.undefined;
      expect(defaults.denyXSS).to.not.be.undefined;
      expect(defaults.filterNulls).to.not.be.undefined;
      expect(defaults.sanitize).to.not.be.undefined;
      expect(defaults.transform).to.not.be.undefined;
      expect(defaults.validate).to.not.be.undefined;
      expect(defaults.minLength).to.not.be.undefined;
      expect(defaults.maxLength).to.not.be.undefined;
      return Object.keys(defaults).length.should.eql(14);
    });
  });

  describe('validateSchemaField():', () => {

    it('should throw if a field type is created w/o using the `.Types` object.', () => {
      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          type: 'string',
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          type: 'object'
        }), 'users');
      }).to.throw();
    });

    it('should throw if given an invalid value for a schema property', () => {
      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          required: 'true'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          required: true
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          notNull: 'true'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          notNull: true,
          required: true
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          type: Boolean
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          type: Types.boolean,
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          type: Types.array(Types.mixed(Types.string, Types.number)),
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          trim: 'true'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          trim: true
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          uppercase: 'true'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          uppercase: true
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          lowercase: 'true'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          lowercase: true
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          sanitize: 'true'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          sanitize: true
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          denyXSS: 'true'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          denyXSS: true
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          validate: [true]
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          validate: func
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          validate: [func]
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          transform: [true]
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          transform: func
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          transform: [func]
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          filterNulls: 1
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          filterNulls: true
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          minLength: '1'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          minLength: 1
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          minLength: [1]
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          maxLength: '1'
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          maxLength: 1
        }), 'users');
      }).to.not.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          maxLength: [1]
        }), 'users');
      }).to.not.throw();

    });

    it('should throw if default is null and notNull is true', () => {
      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          "default": null,
          notNull: true
        }), 'users');
      }).to.throw();

      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          "default": null,
          notNull: false
        }), 'users');
      }).to.not.throw();
    });

    it('should throw if given both sanitize and denyXSS', () => {
      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          sanitize: true,
          denyXSS: true
        }), 'users');
      }).to.throw();
    });

    it('should throw if given both default and required', () => {
      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          "default": true,
          required: true
        }), 'users');
      }).to.throw();
    });

    it('should throw if type is not a string and the string transformation methods are true', () => {
      expect(() => {
        schema.validateSchemaField(schema._setSchemaFieldDefaults({
          type: 'boolean',
          trim: true
        }), 'users');
      }).to.throw();
    });

  });
});
