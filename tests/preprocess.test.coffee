'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

preprocess = require('../lib/preprocess')

describe 'Preprocess:', ->

  describe '_replaceDocumentInPayload()', ->
    it 'should eat poo', ->
      obj =
        account:
          name: 'jay'
        'friendCount.$.relatives':
          $each: [1,2,3]
      doc =
        account:
          name: 'gus'
        friendCount:
          relatives: [2,3,4]

      result = preprocess._replaceDocumentInPayload(obj, doc)
      # console.log(result);

  describe '_getDocumentFromPayload()', ->

    it 'should', ->
      obj =
        account:
          name: 'jay'
        'friendCount.$.relatives':
          $each: [1,2,3]
      result = preprocess._getDocumentFromPayload(obj)
