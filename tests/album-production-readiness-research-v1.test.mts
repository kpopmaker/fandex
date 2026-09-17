import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CIRCLE_RETAIL_ALBUM_PRODUCTION_EVIDENCE,
  HANTEO_ALBUM_PRODUCTION_EVIDENCE,
  evaluateAlbumNormalizationFreezeReadiness,
  evaluateMusicAlbumPointProductionReadiness,
} from '../lib/alternative-evidence/albumProductionReadinessResearch';
import { fromAlbumResearchClaim } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import { buildIuTheWinningReportedWeeklySalesClaim } from '../lib/alternative-evidence/albumResearchClaimPersistenceResearch';
import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
  CIRCLE_PROVIDER_EVIDENCE,
  HANTEO_EVIDENCE_DESCRIPTOR,
  HANTEO_PROVIDER_EVIDENCE,
} from '../lib/alternative-evidence/directProviderEvidence';

const unresolvedNormalization = Object.freeze({
  sourceAuthorizationResolved: false,
  providerPeriodDefinitionResolved: false,
  baselineDefinitionResolved: false,
  crossReleaseComparabilityResolved: false,
  transformationRuleDefined: false,
  revisionPolicyResolved: false,
});

test('official semantics do not imply Production authorization', () => {
  assert.equal(HANTEO_ALBUM_PRODUCTION_EVIDENCE.constructCompatible, true);
  assert.equal(HANTEO_ALBUM_PRODUCTION_EVIDENCE.acquisitionRights, 'review-required');
  assert.equal(HANTEO_ALBUM_PRODUCTION_EVIDENCE.directObservationAuthorized, false);
  assert.equal(HANTEO_ALBUM_PRODUCTION_EVIDENCE.historicalQuerySemantics, 'unverified');

  assert.equal(CIRCLE_RETAIL_ALBUM_PRODUCTION_EVIDENCE.constructCompatible, true);
  assert.equal(CIRCLE_RETAIL_ALBUM_PRODUCTION_EVIDENCE.acquisitionRights, 'blocked');
  assert.equal(CIRCLE_RETAIL_ALBUM_PRODUCTION_EVIDENCE.normalizedStorageRights, 'review-required');
  assert.equal(CIRCLE_RETAIL_ALBUM_PRODUCTION_EVIDENCE.directObservationAuthorized, false);
});

test('provider onboarding distinguishes Circle TDM restriction from Hanteo rights review', () => {
  assert.equal(CIRCLE_PROVIDER_EVIDENCE.acquisitionClass, 'blocked');
  assert.ok(CIRCLE_PROVIDER_EVIDENCE.blockers.includes('unauthorized-tdm-prohibited'));
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.acquisitionState, 'blocked');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.automationState, 'blocked');
  assert.equal(CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.authorization.normalizedStorageState, 'review-required');

  assert.equal(HANTEO_PROVIDER_EVIDENCE.acquisitionClass, 'public-page-only');
  assert.ok(HANTEO_PROVIDER_EVIDENCE.requestEvidence.includes('detail.salesVolume'));
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.onboarding.authorization.acquisitionState, 'review-required');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.onboarding.authorization.automationState, 'review-required');
  assert.equal(HANTEO_EVIDENCE_DESCRIPTOR.onboarding.productionAllowed, false);
});

test('normalization freeze is definition-based and uses no invented numeric threshold', () => {
  const blocked = evaluateAlbumNormalizationFreezeReadiness(unresolvedNormalization);
  assert.equal(blocked.state, 'blocked');
  assert.deepEqual(blocked.blockers, [
    'normalization-source-authorization-unresolved',
    'normalization-provider-period-unresolved',
    'normalization-baseline-definition-unresolved',
    'normalization-cross-release-comparability-unresolved',
    'normalization-transformation-rule-unresolved',
    'normalization-revision-policy-unresolved',
  ]);

  const ready = evaluateAlbumNormalizationFreezeReadiness({
    sourceAuthorizationResolved: true,
    providerPeriodDefinitionResolved: true,
    baselineDefinitionResolved: true,
    crossReleaseComparabilityResolved: true,
    transformationRuleDefined: true,
    revisionPolicyResolved: true,
  });
  assert.deepEqual(ready, { state: 'ready-for-freeze-review', blockers: [] });
});

test('stored reported sales context cannot substitute an authorized direct provider observation', () => {
  const features = fromAlbumResearchClaim(buildIuTheWinningReportedWeeklySalesClaim());
  assert.equal(features.length, 1);
  assert.equal(features[0]?.sourceClass, 'news-reported-provider');
  assert.equal(features[0]?.value, 206128);
  assert.equal(features[0]?.unit, 'physical-units');

  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: HANTEO_ALBUM_PRODUCTION_EVIDENCE,
    normalization: unresolvedNormalization,
    features,
  });

  assert.equal(readiness.state, 'blocked');
  assert.equal(readiness.providerState, 'rights-blocked');
  assert.equal(readiness.reportedContextInputIds.length, 1);
  assert.equal(readiness.directAbsoluteInputIds.length, 0);
  assert.ok(readiness.blockers.includes('reported-sales-context-cannot-substitute-authorized-direct-observation'));
  assert.ok(readiness.blockers.includes('direct-absolute-sales-input-missing'));
  assert.ok(readiness.blockers.includes('provider-acquisition-rights-unresolved'));
  assert.ok(readiness.blockers.includes('provider-historical-query-semantics-not-fully-verified'));
  assert.ok(readiness.blockers.includes('normalization-transformation-rule-unresolved'));
});

test('Circle Retail construct compatibility remains rights-blocked under current public-site evidence', () => {
  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: CIRCLE_RETAIL_ALBUM_PRODUCTION_EVIDENCE,
    normalization: unresolvedNormalization,
    features: [],
  });
  assert.equal(readiness.state, 'blocked');
  assert.equal(readiness.providerState, 'rights-blocked');
  assert.ok(readiness.blockers.includes('provider-acquisition-rights-unresolved'));
  assert.ok(readiness.blockers.includes('provider-normalized-storage-rights-unresolved'));
  assert.ok(readiness.blockers.includes('provider-revision-semantics-not-fully-verified'));
});
