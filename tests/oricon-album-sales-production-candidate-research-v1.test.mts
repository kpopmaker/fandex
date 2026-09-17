import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOriconNormalizationFreezeInputs,
  ORICON_ALBUM_PRODUCTION_EVIDENCE_RESEARCH,
  ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH,
} from '../lib/alternative-evidence/oriconAlbumSalesProductionCandidateResearch';
import { evaluateMusicAlbumPointProductionReadiness } from '../lib/alternative-evidence/albumProductionReadinessResearch';

test('Oricon is a JP completed-purchase unit-sales candidate with estimated-unit provenance preserved', () => {
  const descriptor = ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH;

  assert.deepEqual(descriptor.supportedTerritories, ['JP']);
  assert.equal(descriptor.constructEvidence.retailerAndEcSalesDataUsed, true);
  assert.equal(descriptor.constructEvidence.dailyAlbumSalesAvailable, true);
  assert.equal(descriptor.constructEvidence.weeklyAlbumSalesAvailable, true);
  assert.equal(descriptor.constructEvidence.cumulativeAlbumSalesAvailable, true);
  assert.equal(descriptor.constructEvidence.customPeriodDataOffered, true);
  assert.equal(descriptor.constructEvidence.providerUnitNature, 'provider-estimated-physical-sales-copies');
  assert.equal(descriptor.constructEvidence.providerEstimateMayBeRelabeledAsCensusCount, false);
  assert.equal(descriptor.constructEvidence.sameProviderEstimateMayBePreservedAsPhysicalUnits, true);
});

test('Oricon period semantics are promising but not yet freeze-ready', () => {
  const period = ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.providerPeriodSemantics;

  assert.equal(period.publicWeeklyPeriodPattern, 'monday-through-sunday');
  assert.equal(period.dailySalesAvailable, true);
  assert.equal(period.customPeriodDataAvailable, true);
  assert.equal(period.releaseRelativeSevenDayAggregationFeasible, true);
  assert.equal(period.exactDailyCutoffVerified, false);
  assert.equal(period.exactTimezoneContractVerified, false);
  assert.equal(period.firstWeekCanonicalizationReady, false);
  assert.equal(period.state, 'partially-verified');
  assert.equal(ORICON_ALBUM_PRODUCTION_EVIDENCE_RESEARCH.periodSemantics, 'partially-verified');
});

test('Oricon revision semantics stay unresolved rather than borrowing another provider policy', () => {
  const revision = ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.revisionSemantics;

  assert.equal(revision.correctionOrRestatementBehaviorPubliclyVerified, false);
  assert.equal(revision.revisionDeliveryContractVerified, false);
  assert.equal(revision.canonicalRevisionPolicyMayBeAppliedWithoutProviderSemantics, false);
  assert.equal(revision.state, 'unverified');
  assert.equal(ORICON_ALBUM_PRODUCTION_EVIDENCE_RESEARCH.revisionSemantics, 'unverified');
});

test('Oricon exposes a contractual data and publication path but FANDEX is not authorized', () => {
  const authorization = ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.authorization;

  assert.equal(authorization.currentFandexAuthorization, false);
  assert.equal(authorization.corporateDataServiceExplicitlyOffered, true);
  assert.equal(authorization.rankingAndSalesDataSoldForExternalUse, true);
  assert.equal(authorization.acquisitionRights, 'review-required');
  assert.equal(authorization.automatedAccessRights, 'review-required');
  assert.equal(authorization.normalizedStorageRights, 'review-required');
  assert.equal(authorization.commercialUseRights, 'review-required');
  assert.equal(authorization.derivedPublicationRights, 'review-required');
  assert.equal(authorization.directObservationAuthorized, false);
});

test('Oricon readiness remains blocked by rights, provider period/revision semantics and missing direct data', () => {
  const normalization = buildOriconNormalizationFreezeInputs();
  assert.deepEqual(normalization, {
    sourceAuthorizationResolved: false,
    providerPeriodDefinitionResolved: false,
    baselineDefinitionResolved: true,
    crossReleaseComparabilityResolved: true,
    transformationRuleDefined: true,
    revisionPolicyResolved: false,
  });

  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: ORICON_ALBUM_PRODUCTION_EVIDENCE_RESEARCH,
    normalization,
    normalizationData: null,
    features: [],
  });

  assert.equal(readiness.state, 'blocked');
  assert.equal(readiness.providerState, 'rights-blocked');
  assert.ok(readiness.blockers.includes('provider-acquisition-rights-unresolved'));
  assert.ok(readiness.blockers.includes('provider-normalized-storage-rights-unresolved'));
  assert.ok(readiness.blockers.includes('provider-derived-publication-rights-unresolved'));
  assert.ok(readiness.blockers.includes('authorized-direct-provider-observation-missing'));
  assert.ok(readiness.blockers.includes('provider-period-semantics-not-fully-verified'));
  assert.ok(readiness.blockers.includes('provider-revision-semantics-not-fully-verified'));
  assert.ok(readiness.blockers.includes('normalization-source-authorization-unresolved'));
  assert.ok(readiness.blockers.includes('normalization-provider-period-unresolved'));
  assert.ok(readiness.blockers.includes('normalization-revision-policy-unresolved'));
  assert.ok(readiness.blockers.includes('direct-absolute-sales-input-missing'));
  assert.ok(readiness.blockers.includes('normalization-data-unassessed'));
});

test('Oricon public ranking pages cannot substitute for licensed Production ingestion', () => {
  const policy = ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.liveCallPolicy;
  assert.equal(policy.credentialsAvailableToFandexResearch, false);
  assert.equal(policy.liveCallAttempted, false);
  assert.equal(policy.publicPageScrapingMaySubstituteLicensedFeed, false);
  assert.equal(policy.adapterImplementationAllowedBeforeAuthorization, false);
});
