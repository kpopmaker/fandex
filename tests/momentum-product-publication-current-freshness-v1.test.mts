import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMomentumProductPublicationApprovalCandidateForIU,
} from '../lib/server/product/momentumProductPublicationApprovalCandidate';

test('current Momentum publication approval candidate fails closed after 2026-09-28 source advancement', async () => {
  const candidate =
    await getMomentumProductPublicationApprovalCandidateForIU();

  assert.equal(candidate.status, 'blocked');
  if (candidate.status !== 'blocked') return;

  assert.equal(candidate.reason, 'activation-authorization-not-ready');
  assert.equal(candidate.activationAuthorized, false);
  assert.equal(candidate.productPublicationAuthorized, false);
  assert.equal(candidate.publicRouteActivated, false);
  assert.equal(candidate.publication, 'shadow');
  assert.equal(candidate.productMomentumScore, null);
  assert.equal(candidate.numericProductEligible, false);
  assert.equal(candidate.legacyGrowthMomentumPointReuseAllowed, false);
  assert.equal(candidate.previewFallbackAllowed, false);
  assert.equal(candidate.directProductionContributionEligible, false);
});
