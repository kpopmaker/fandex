import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProductState } from '../lib/product/contracts/productState';

test('Product state keeps availability and direction independent', () => {
  const state = {
    availability: 'missing',
    freshness: 'unknown',
    direction: 'unknown',
    conflict: 'none',
    revision: 'none',
    dataOrigin: 'observed',
    publication: 'production',
    presentation: 'standard',
  } as const satisfies ProductState;

  assert.equal(state.availability, 'missing');
  assert.equal(state.direction, 'unknown');
  assert.notEqual(state.availability, 'stable');
});

test('Product state preserves origin, publication, and presentation distinctions', () => {
  const observedProduction = {
    availability: 'available',
    freshness: 'current',
    direction: 'up',
    conflict: 'none',
    revision: 'none',
    dataOrigin: 'observed',
    publication: 'production',
    presentation: 'standard',
  } as const satisfies ProductState;
  const syntheticShadowPreview = {
    ...observedProduction,
    dataOrigin: 'synthetic',
    publication: 'shadow',
    presentation: 'preview',
  } as const satisfies ProductState;

  assert.notEqual(observedProduction.dataOrigin, syntheticShadowPreview.dataOrigin);
  assert.notEqual(observedProduction.publication, syntheticShadowPreview.publication);
  assert.notEqual(observedProduction.presentation, syntheticShadowPreview.presentation);
});

test('Product conflict and revision can vary independently', () => {
  const conflictWithoutRevision = {
    availability: 'available',
    freshness: 'frozen',
    direction: 'down',
    conflict: 'detected',
    revision: 'none',
    dataOrigin: 'observed',
    publication: 'production',
    presentation: 'standard',
  } as const satisfies ProductState;
  const revisionWithoutConflict = {
    ...conflictWithoutRevision,
    conflict: 'none',
    revision: 'revised',
  } as const satisfies ProductState;

  assert.equal(conflictWithoutRevision.conflict, 'detected');
  assert.equal(conflictWithoutRevision.revision, 'none');
  assert.equal(revisionWithoutConflict.conflict, 'none');
  assert.equal(revisionWithoutConflict.revision, 'revised');
});
