/*global describe, it */
'use strict';
var assert = require('assert');
var testonnaire = require('../');

describe('testonnaire node module', function () {
  it('must have at least one test', function () {
    testonnaire();
    assert(false, 'I was too lazy to write any tests. Shame on me.');
  });
});
