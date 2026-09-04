import assert from 'node:assert/strict';
import test from 'node:test';

import {
  makeAvailableProductNumericFact,
  makeMissingProductNumericFact,
  makeNotTrackedProductNumericFact,
} from '../lib/product/contracts/productNumericFact';

test('available Product numeric facts preserve zero exactly', () => {
  const fact = makeAvailableProductNumericFact(0);

  assert.equal(fact.availability, 'available');
  assert.equal(fact.value, 0);
});

test('available Product numeric facts preserve positive and negative finite values', () => {
  assert.equal(makeAvailableProductNumericFact(72.8).value, 72.8);
  assert.equal(makeAvailableProductNumericFact(-3.5).value, -3.5);
});

test('missing and not-tracked Product numeric facts remain null and distinct', () => {
  const missing = makeMissingProductNumericFact();
  const notTracked = makeNotTrackedProductNumericFact();

  assert.equal(missing.availability, 'missing');
  assert.equal(missing.value, null);
  assert.equal(notTracked.availability, 'not-tracked');
  assert.equal(notTracked.value, null);
  assert.notEqual(missing.availability, notTracked.availability);
});

test('available Product numeric facts reject non-finite source values', () => {
  assert.throws(() => makeAvailableProductNumericFact(Number.NaN), TypeError);
  assert.throws(() => makeAvailableProductNumericFact(Number.POSITIVE_INFINITY), TypeError);
  assert.throws(() => makeAvailableProductNumericFact(Number.NEGATIVE_INFINITY), TypeError);
});
