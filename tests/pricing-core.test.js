'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pricing = require('../assets/js/pricing-core');

test('calculates totals for multiple selected packages', function () {
    const result = pricing.calculateTotals([
        { price: 2999, originalPrice: 4200 },
        { price: 499, originalPrice: 799 }
    ]);

    assert.deepEqual(result, {
        offerTotal: 3498,
        regularTotal: 4999,
        savings: 0
    });
    assert.equal(pricing.getSavings(result.regularTotal, result.offerTotal), 1501);
});

test('returns zero totals for an empty selection', function () {
    assert.deepEqual(pricing.calculateTotals([]), {
        offerTotal: 0,
        regularTotal: 0,
        savings: 0
    });
});

test('does not report negative savings when offer exceeds regular price', function () {
    assert.equal(pricing.getSavings(100, 120), 0);
});

test('rejects malformed pricing items', function () {
    assert.throws(function () {
        pricing.calculateTotals([{ price: 'invalid', originalPrice: 100 }]);
    }, TypeError);
});

test('rejects negative prices', function () {
    assert.throws(function () {
        pricing.calculateTotals([{ price: -1, originalPrice: 100 }]);
    }, RangeError);
});

test('formats Indian rupee amounts', function () {
    assert.equal(pricing.formatINR(15999), '₹15,999');
});

test('rejects non-finite formatting values', function () {
    assert.throws(function () {
        pricing.formatINR(Number.NaN);
    }, TypeError);
});
