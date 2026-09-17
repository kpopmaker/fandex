import test from 'node:test';
import assert from 'node:assert/strict';

import { fromAlbumResearchClaim } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import { buildIuTheWinningReportedWeeklySalesClaim } from '../lib/alternative-evidence/albumResearchClaimPersistenceResearch';
import { evaluateMusicAlbumPointProductionReadiness } from '../lib/alternative-evidence/albumProductionReadinessResearch';
import { buildHanteoFirstWeekNormalizationFreezeInputs } from '../lib/alternative-evidence/hanteoFirstWeekPeriodResearch';
import { HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH } from '../lib/alternative-evidence/hanteoFirstWeekProductionEvidenceResearch';

test('first-week period and public revision semantics are no longer blockers for the specialized Hanteo path', () => {
  const features = fromAlbumResearchClaim(buildIuTheWinningReportedWeeklySalesClaim());
  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH,
    normalization: buildHanteoFirstWeekNormalizationFreezeInputs(),
    features,
  });

  assert.equal(HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH.periodSemantics, 'verified');
  assert.equal(HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH.revisionSemantics, 'verified');
  assert.equal(readiness.normalizationState, 'blocked');
  assert.ok(!readiness.blockers.includes('provider-period-semantics-not-fully-verified'));
  assert.ok(!readiness.blockers.includes('provider-revision-semantics-not-fully-verified'));
  assert.ok(!readiness.blockers.includes('normalization-provider-period-unresolved'));
});

test('rights, direct observation and historical query semantics still block Production', () => {
  const features = fromAlbumResearchClaim(buildIuTheWinningReportedWeeklySalesClaim());
  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH,
    normalization: buildHanteoFirstWeekNormalizationFreezeInputs(),
    features,
  });

  assert.equal(readiness.state, 'blocked');
  assert.equal(readiness.providerState, 'rights-blocked');
  assert.ok(readiness.blockers.includes('provider-acquisition-rights-unresolved'));
  assert.ok(readiness.blockers.includes('provider-normalized-storage-rights-unresolved'));
  assert.ok(readiness.blockers.includes('provider-derived-publication-rights-unresolved'));
  assert.ok(readiness.blockers.includes('authorized-direct-provider-observation-missing'));
  assert.ok(readiness.blockers.includes('provider-historical-query-semantics-not-fully-verified'));
  assert.ok(!readiness.blockers.includes('provider-revision-semantics-not-fully-verified'));
  assert.ok(readiness.blockers.includes('reported-sales-context-cannot-substitute-authorized-direct-observation'));
  assert.ok(readiness.blockers.includes('direct-absolute-sales-input-missing'));
  assert.ok(readiness.blockers.includes('normalization-source-authorization-unresolved'));
});
