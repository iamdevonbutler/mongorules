const should = require('chai').should();
const expect = require('chai').expect;
const assert = require('chai').assert;

const {exit} = require('../helpers/utils');

const mongorules = require('../../lib');

describe('Api:', function() {

  it ('should remove models', function* () {
    mongorules.addModel('test', 'mongorules-testing', 'test', {});
    mongorules._models.test['mongorules-testing'].test.should.be.ok;
    mongorules.removeModel('test', 'mongorules-testing', 'test')
    expect(mongorules._models.test['mongorules-testing'].test).to.be.undefined;
  });

});
