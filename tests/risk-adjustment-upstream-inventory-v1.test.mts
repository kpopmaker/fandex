import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RISK_ADJUSTMENT_REVIEWED_MAIN,
  getRiskAdjustmentUpstreamInventory,
  listRiskAdjustmentBlockedUpstreamVariables,
  listRiskAdjustmentUsableUpstreamVariables,
} from '../lib/intelligence/riskAdjustmentUpstreamInventory';

test('inventory is bound to the reviewed latest main snapshot', () => {
  assert.equal(
    RISK_ADJUSTMENT_REVIEWED_MAIN,
    'e8ad0ecab3731e2aed9ea54d7dea89519648865a',
  );
});

test('only current Production public-route upstreams are structurally usable', () => {
  assert.deepEqual(listRiskAdjustmentUsableUpstreamVariables(), [
    'newsIssuePoint',
    'comebackActivityPoint',
  ]);
});

test('non-Production candidates remain blocked from Risk input', () => {
  assert.deepEqual(listRiskAdjustmentBlockedUpstreamVariables(), [
    'growthMomentumPoint',
    'musicAlbumPoint',
    'snsFandomPoint',
    'brandFitPoint',
  ]);
});

test('newsIssuePoint remains runtime-conditional and metadata-incomplete', () => {
  const entry = getRiskAdjustmentUpstreamInventory('newsIssuePoint');
  assert.equal(entry.repositoryState, 'main-production-public-route');
  assert.equal(entry.riskInputAllowed, true);
  assert.deepEqual(entry.blockers, [
    'required-quality-metadata-incomplete',
  ]);
});

test('Activity Exposure is categorical Production truth, not a numeric comeback score', () => {
  const entry = getRiskAdjustmentUpstreamInventory(
    'comebackActivityPoint',
  );
  assert.equal(entry.repositoryState, 'main-production-public-route');
  assert.equal(entry.productForm, 'categorical');
  assert.equal(entry.riskInputAllowed, true);
});

test('Momentum shadow state cannot be consumed even though evidence is real', () => {
  const entry = getRiskAdjustmentUpstreamInventory(
    'growthMomentumPoint',
  );
  assert.equal(entry.repositoryState, 'main-shadow-categorical');
  assert.equal(entry.riskInputAllowed, false);
  assert.equal(entry.blockers.includes('upstream-not-production'), true);
});

test('draft source candidates do not become Risk inputs by existing in open PRs', () => {
  for (const variableId of [
    'musicAlbumPoint',
    'snsFandomPoint',
    'brandFitPoint',
  ] as const) {
    const entry = getRiskAdjustmentUpstreamInventory(variableId);
    assert.equal(entry.repositoryState, 'draft-variable-candidate');
    assert.equal(entry.riskInputAllowed, false);
    assert.equal(entry.blockers.includes('upstream-not-production'), true);
  }
});
