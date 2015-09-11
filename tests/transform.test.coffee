'use strict'

require('babel/register')

#Module dependencies.
should = require('chai').should()
expect = require('chai').expect
assert = require('chai').assert

transform = require('../lib/transform')

describe 'Transform:', ->
