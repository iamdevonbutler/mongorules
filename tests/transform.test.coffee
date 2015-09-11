'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

transform = require('../lib/transform')

describe 'Transform:', ->

  describe '_filterNulls', ->
    it 'should filter null values from an array and array of arrays', ->
      result = transform._filterNulls([1, null, 'a', [1, null, 'a']])
      result.length.should.eql(3)
      result[3].length.should.eql(2)
