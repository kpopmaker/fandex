import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMomentumProductPublicationApprovalCandidateForIU,
} from '../lib/server/product/momentumProductPublicationApprovalCandidate';

test('current Momentum publication approval candidate fails closed until activation Production is revalidated', async () => {
  const candidate =
    await getMomentumProductPublicationApprovalCandidateForIU();

  assert.equal(candidate.status, 'blocked');
  if (candidate.status !== 'blocked') return;

  assert.equal(candidate.reason, 'activation-production-binding-stale');
  assert.equal(candidate.activationAuthorized, true);
  assert.equal(candidate.productPublicationAuthorized, false);
  assert.equal(candidate.publicRouteActivated, false);
  assert.equal(candidate.publication, 'shadow');
  assert.equal(candidate.productMomentumScore, null);
  assert.equal(candidate.numericProductEligible, false);
  assert.equal(candidate.legacyGrowthMomentumPointReuseAllowed, false);
  assert.equal(candidate.previewFallbackAllowed, false);
  assert.equal(candidate.directProductionContributionEligible, false);
});
