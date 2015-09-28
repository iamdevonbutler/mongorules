'use strict'

# require('./helpers/setup')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

Validator = require('../../lib/validate')

describe 'Validate:', ->

  describe '_validateNotNull', ->
    it 'should return an error given a null value when notNull = true', ->
      new Validator(null, '', { notNull: true }, false)
        ._validateNotNull()
        .getErrors()
        .length.should.eql(1)

    it 'should not return an error given a null with notNull = false ', ->
      errors = new Validator(null, '', { required: true, notNull: false }, false)
        ._validateNotNull()
        .getErrors()
      expect(errors).to.be.null

  describe '_validateRequired()', ->

    it 'should return an error given an undefined value when required = true', ->
        new Validator(undefined, '', { required: true }, false)
          ._validateRequired()
          .getErrors()
          .length.should.eql(1)

    it 'should not return an error given "false" when required = true', ->
      errors = new Validator(false, '', { required: true }, false)
        ._validateRequired()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given "0" when required = true', ->
      errors = new Validator(0, '', { required: true }, false)
        ._validateRequired()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given "\'\'" when required = true', ->
      errors = new Validator('', '', { required: true }, false)
        ._validateRequired()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given a "[]" when required = true', ->
      errors = new Validator([], '', { required: true }, false)
        ._validateRequired()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given a "{}" when required = true', ->
      errors = new Validator({}, '', { required: true }, false)
        ._validateRequired()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given an undefined value when required = false', ->
      errors = new Validator(undefined, '', { required: false }, false)
        ._validateRequired()
        .getErrors()
      expect(errors).to.be.null


  describe 'validateType()', ->

    it 'should not return an error if type is null', ->
      errors = new Validator('', '', { type: null })
        .validateType()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error give a string when expecting a string', ->
      errors = new Validator('', '', { type: 'string' })
        .validateType()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given a number when expecting a number', ->
      errors = new Validator(0, '', { type: 'number' })
        .validateType()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given a boolean when expecting a boolean', ->
      errors = new Validator(false, '', { type: 'boolean' })
        .validateType()
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given a date when expecting a date', ->
      errors = new Validator('1111', '', { type: 'date', dateFormat: 'timestamp' })
        .validateType()
        .getErrors()
      expect(errors).to.be.null

    it 'should return an error given a string when expecting a number', ->
      new Validator('string', '', { type: 'number' })
        .validateType()
        .getErrors()
        .length.should.eql(1)

    it 'should return an error given a number when expecting a string', ->
      new Validator(0, '', { type: 'string' })
        .validateType()
        .getErrors()
        .length.should.eql(1)

    it 'should return an error given a boolean when expecting a string', ->
      new Validator(false, '', { type: 'string' })
        .validateType()
        .getErrors()
        .length.should.eql(1)

    it 'should return an error given a boolean when expecting a date', ->
      new Validator(false, '', { type: 'date', dateFormat: 'timestamp' })
        .validateType()
        .getErrors()
        .length.should.eql(1)

  describe 'validateDenyXSS()', ->

    it 'should return an error if given a string contianing XSS and denyXSS = true', ->
      new Validator('<script>aaa</script>', '', { denyXSS: true })
        .validateDenyXSS()
        .getErrors()
        .length.should.eql(1)

    it 'should return true if given a string not contianing XSS and denyXSS = true', ->
      errors = new Validator('string', '', { denyXSS: true })
        .validateDenyXSS()
        .getErrors()
      expect(errors).to.be.null

    it 'should return true if given a string contianing XSS and denyXSS = false', ->
      errors = new Validator('<script>aaa</script>', '', { denyXSS: false })
        .validateDenyXSS()
        .getErrors()
      expect(errors).to.be.null


  describe 'validateMinLength()', ->

    it 'should not return an error given a non-string or non-array', ->
      errors = new Validator(true, '', { minLength: [1] })
        .validateMinLength(0)
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given an array of required length', ->
      errors = new Validator([1], '', { minLength: [1] })
        .validateMinLength(0)
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given an string of required length', ->
      errors = new Validator('a', '', { minLength: [1] })
        .validateMinLength(0)
        .getErrors()
      expect(errors).to.be.null

    it 'should return an error given an array of less than required length', ->
      new Validator([], '', { minLength: [1] })
        .validateMinLength(0)
        .getErrors()
        .length.should.eql(1)

    it 'should return an error given an string of less than required length', ->
      new Validator('', '', { minLength: [1] })
        .validateMinLength(0)
        .getErrors()
        .length.should.eql(1)


  describe 'validateMaxLength()', ->

    it 'should not return an error given a non-string or non-array', ->
      errors = new Validator(true, '', { maxLength: [1] })
        .validateMaxLength(0)
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given an array of required length', ->
      errors = new Validator([1], '', { maxLength: [1] })
        .validateMaxLength(0)
        .getErrors()
      expect(errors).to.be.null

    it 'should not return an error given an string of required length', ->
      errors = new Validator('a', '', { maxLength: [1] })
        .validateMaxLength(0)
        .getErrors()
      expect(errors).to.be.null

    it 'should return an error given an array of more than required length', ->
      new Validator([1,2], '', { maxLength: [1] })
        .validateMaxLength(0)
        .getErrors()
        .length.should.eql(1)

    it 'should return an error given an string of more than required length', ->
      new Validator('ab', '', { maxLength: [1] })
        .validateMaxLength(0)
        .getErrors()
        .length.should.eql(1)

  describe 'validateFunction()', ->
    schema =
      validate: [
        (val) -> val+1,
        (val) -> val-1
      ]
    it 'should not return an error if the custom function returns true', ->
      errors = new Validator(1, '', schema)
        .validateFunction(0)
        .getErrors()
      expect(errors).to.be.null


    it 'should return an error if the custom function returns false', ->
      new Validator(1, '', schema)
        .validateFunction(1)
        .getErrors()
        .length.should.eql(1)
