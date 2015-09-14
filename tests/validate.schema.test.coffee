'use strict'

# require('./helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

validate = require('../lib/validate')
Validator = validate.Validator

describe 'Validate:', ->

  describe 'validateRequired()', ->

    it 'should return false for an undefined value when required is true', ->
      Validator.validateRequired(undefined, { required: true, notNull: true }).should.be.false

    it 'should return true for an null value when notNull is false when required is true', ->
      Validator.validateRequired(null, { required: true, notNull: false }).should.be.true

    it 'should return false for an null value when notNull is true when required is true', ->
      Validator.validateRequired(null, { required: true, notNull: true }).should.be.false

    it 'should return true for "false" when required is true', ->
      Validator.validateRequired(false, { required: true, notNull: false }).should.be.true

    it 'should return true for "0" when required is true', ->
      Validator.validateRequired(0, { required: true, notNull: false }).should.be.true

    it 'should return true for "\'\'" when required is true', ->
      Validator.validateRequired('', { required: true, notNull: false }).should.be.true

    it 'should return true for "string" when required is true', ->
      Validator.validateRequired('string', { required: true, notNull: false }).should.be.true

    it 'should return true for "number" when required is true', ->
      Validator.validateRequired(1, { required: true, notNull: false }).should.be.true

    it 'should return true for "[]" when required is true', ->
      Validator.validateRequired([], { required: true, notNull: false }).should.be.true

    it 'should return true for "{}" when required is true', ->
      Validator.validateRequired({}, { required: true, notNull: false }).should.be.true

    it 'should return true for an undefined value when required is false', ->
      Validator.validateRequired(undefined, { required: false, notNull: false }).should.be.true

    it 'should return true for an null value when required is false', ->
      Validator.validateRequired(null, { required: false, notNull: false }).should.be.true


  describe 'validateType()', ->

    it 'should return true if no type is null', ->
      Validator.validateType('', { type: null }).should.be.true

    it 'should return true given a string when expecting a string', ->
      Validator.validateType('', {type: 'string'}).should.be.true

    it 'should return true given a number when expecting a number', ->
      Validator.validateType(1, {type: 'number'}).should.be.true

    it 'should return true given a boolean when expecting a boolean', ->
      Validator.validateType(true, {type: 'boolean'}).should.be.true

    it 'should return true given a date when expecting a date', ->
      Validator.validateType('111111', {type: 'date', dateFormat: 'unix'}).should.be.true

    it 'should return false given a string when expecting a number', ->
      Validator.validateType('', {type: 'number'}).should.be.false

    it 'should return false given a number when expecting a string', ->
      Validator.validateType(1, {type: 'string'}).should.be.false
      ''
    it 'should return false given a boolean when expecting a string', ->
      Validator.validateType(true, {type: 'string'}).should.be.false


  describe 'validateDenyXSS()', ->

    it 'should return false if given a string contianing XSS and denyXSS is true', ->
      Validator.validateDenyXSS('<script>aaa</script>', {denyXSS: true}).should.be.false

    it 'should return true if given a string not contianing XSS and denyXSS is true', ->
      Validator.validateDenyXSS('aaa', {denyXSS: true}).should.be.true

    it 'should return true if given a string contianing XSS and denyXSS is false', ->
      Validator.validateDenyXSS('<script>aaa</script>', {denyXSS: false}).should.be.true


  describe 'validateMinLength()', ->

    it 'should return true given a non-string or non-array', ->
      Validator.validateMinLength(true, { minLength: [1] }, 0).should.be.true

    it 'should return true given an array of required length', ->
      Validator.validateMinLength([1], { minLength: [1, 1] }, 1).should.be.true

    it 'should return true given an string of required length', ->
      Validator.validateMinLength('a', { minLength: [1] }, 0).should.be.true

    it 'should return false given an array of less than required length', ->
      Validator.validateMinLength([], { minLength: [1, 1] }, 1).should.be.false

    it 'should return false given an string of less than required length', ->
      Validator.validateMinLength('', { minLength: [1] }, 0).should.be.false


  describe 'validateMaxLength()', ->

    it 'should return true given a non-string or non-array', ->
      Validator.validateMaxLength(true, { maxLength: [2] }, 0).should.be.true

    it 'should return true given an array of required length', ->
      Validator.validateMaxLength([1], { maxLength: [2, 2] }, 1).should.be.true

    it 'should return true given an string of required length', ->
      Validator.validateMaxLength('a', { maxLength: [2] }, 0).should.be.true

    it 'should return false given an array of less than required length', ->
      Validator.validateMaxLength([1,2,3], { maxLength: [2, 2] }, 1).should.be.false

    it 'should return false given an string of less than required length', ->
      Validator.validateMaxLength('aaa', { maxLength: [2] }, 0).should.be.false

  describe 'validateFunction()', ->
    schema =
      validate: [
        () -> true,
        () -> false
      ]
    it 'should return true if the custom function returns true', ->
      Validator.validateFunction(1, schema, 0).should.be.true;

    it 'should return false if the custom function returns false', ->
      Validator.validateFunction(1, schema, 1).should.be.false;
