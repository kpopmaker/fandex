import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOfficialChartsNormalizationFreezeInputs,
  OFFICIAL_CHARTS_ALBUM_PRODUCTION_EVIDENCE_RESEARCH,
  OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH,
} from '../lib/alternative-evidence/officialChartsAlbumSalesProductionCandidateResearch';
import { evaluateMusicAlbumPointProductionReadiness } from '../lib/alternative-evidence/albumProductionReadinessResearch';

test('Official Charts is a UK completed-purchase-class contract candidate, not shipment data', () => {
  const descriptor = OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH;
  assert.deepEqual(descriptor.supportedTerritories, ['GB']);
  assert.equal(descriptor.constructEvidence.officialPhysicalSalesAvailable, true);
  assert.equal(descriptor.constructEvidence.albumLevelInsightsAdvertised, true);
  assert.equal(descriptor.constructEvidence.dailySalesTrackingAdvertised, true);
  assert.equal(descriptor.constructEvidence.directRetailPartnerReportingAdvertised, true);
  assert.equal(descriptor.constructEvidence.chartReportingRetailerMustCarryOutCustomerTransactionDirectly, true);
  assert.equal(descriptor.constructEvidence.shipmentOrWholesaleMaySubstitute, false);
  assert.equal(OFFICIAL_CHARTS_ALBUM_PRODUCTION_EVIDENCE_RESEARCH.constructCompatible, true);
});

test('Official Charts daily data does not silently resolve exact FANDEX first-week temporal semantics', () => {
  const period = OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.periodSemantics;
  assert.equal(period.dailySalesDataAvailable, true);
  assert.equal(period.releaseRelativeSevenDayWindowCanBeDerivedFromDailyData, true);
  assert.equal(period.exactSaleDateFieldContractPubliclyDocumented, false);
  assert.equal(period.onlineVersusStorefrontRecognitionRulePubliclyDocumented, false);
  assert.equal(period.providerTimezoneCutoffPubliclyDocumented, false);
  assert.equal(period.hanteoFirstWeekSemanticsMayBeAssumedEquivalent, false);
  assert.equal(period.state, 'partially-verified');
  assert.equal(OFFICIAL_CHARTS_ALBUM_PRODUCTION_EVIDENCE_RESEARCH.periodSemantics, 'partially-verified');
});

test('Official Charts subscription and publication licences do not equal current FANDEX authorization', () => {
  const authorization = OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.authorization;
  assert.equal(authorization.currentFandexAuthorization, false);
  assert.equal(authorization.subscriptionAccessExplicitlyOffered, true);
  assert.equal(authorization.bespokeDataFeedsExplicitlyOffered, true);
  assert.equal(authorization.chartPublicationLicencesExplicitlyOffered, true);
  assert.equal(authorization.proDataConfidentialByDefault, true);
  assert.equal(authorization.publicWebsitePublicationAllowedByDefault, false);
  assert.equal(authorization.rawOrDerivedDataPublicationRightsExplicitlyGrantedToFandex, false);
  assert.equal(authorization.acquisitionRights, 'review-required');
  assert.equal(authorization.normalizedStorageRights, 'review-required');
  assert.equal(authorization.derivedPublicationRights, 'review-required');
  assert.equal(authorization.directObservationAuthorized, false);
});

test('Official Charts normalization remains blocked by rights, exact period semantics, revision semantics, and data absence', () => {
  const normalization = buildOfficialChartsNormalizationFreezeInputs();
  assert.deepEqual(normalization, {
    sourceAuthorizationResolved: false,
    providerPeriodDefinitionResolved: false,
    baselineDefinitionResolved: true,
    crossReleaseComparabilityResolved: true,
    transformationRuleDefined: true,
    revisionPolicyResolved: false,
  });

  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: OFFICIAL_CHARTS_ALBUM_PRODUCTION_EVIDENCE_RESEARCH,
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

test('no Official Charts live adapter or call is permitted before a FANDEX subscription or licence exists', () => {
  const policy = OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.liveCallPolicy;
  assert.equal(policy.credentialsAvailableToFandexResearch, false);
  assert.equal(policy.liveCallAttempted, false);
  assert.equal(policy.liveCallAllowedWithoutSubscriptionOrLicense, false);
  assert.equal(policy.adapterImplementationAllowedBeforeAuthorization, false);
});
