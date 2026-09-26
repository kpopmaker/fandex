import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLuminateNormalizationFreezeInputs,
  buildLuminateTrackedFirstWeekWindow,
  LUMINATE_ALBUM_PRODUCTION_EVIDENCE_RESEARCH,
  LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH,
} from '../lib/alternative-evidence/luminateAlbumSalesProductionCandidateResearch';
import { evaluateMusicAlbumPointProductionReadiness } from '../lib/alternative-evidence/albumProductionReadinessResearch';

test('Luminate preserves provider-reported physical units without promoting modeled or equivalent quantities', () => {
  const descriptor = LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH;

  assert.equal(descriptor.productMetric, 'ProductSales');
  assert.equal(descriptor.physicalScope.requiredDistributionChannel, 'physical');
  assert.equal(descriptor.physicalScope.crossTerritoryRawAggregationAllowed, false);
  assert.equal(descriptor.physicalScope.sameTerritoryRequiredForBaselineComparison, true);
  assert.equal(descriptor.quantitySemantics.primaryRawUnitFieldCandidate, 'REPORTED_QUANTITY');
  assert.equal(descriptor.quantitySemantics.reportedQuantityMeaning, 'provider-reported-units-without-luminate-modeling');
  assert.equal(descriptor.quantitySemantics.modeledQuantityField, 'QUANTITY');
  assert.equal(descriptor.quantitySemantics.modeledQuantityAllowedForPrimaryAnchor, false);
  assert.equal(descriptor.quantitySemantics.equivalentQuantityAllowedForPrimaryAnchor, false);
  assert.equal(descriptor.quantitySemantics.completeMyAlbumAllowedForPhysicalPrimaryAnchor, false);
  assert.deepEqual(descriptor.supportedTerritories, ['US', 'CA']);
});

test('Luminate first-week anchor is a provider-specific seven-day REPORT_DATE window, not Hanteo semantics', () => {
  const period = LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.providerPeriodSemantics;
  const window = buildLuminateTrackedFirstWeekWindow('2024-02-20');

  assert.deepEqual(window, {
    dateBasis: 'REPORT_DATE',
    startDate: '2024-02-20',
    endDate: '2024-02-26',
    calendarDayCount: 7,
    releaseRelative: true,
  });
  assert.equal(period.reportDateField, 'REPORT_DATE');
  assert.equal(period.reportDateMeaning, 'date-of-record-as-reported-by-data-provider');
  assert.equal(period.fandexPeriodDefinition, 'release-date-through-release-date-plus-six-report-dates-inclusive');
  assert.equal(period.onlinePhysicalRecognitionRule, 'ship-date-plus-three-days');
  assert.equal(period.storefrontSourceSemantics, 'daily-electronic-point-of-sale-sales');
  assert.equal(period.consumerOrderDateEquivalentRequired, false);
  assert.equal(period.hanteoFirstWeekSemanticsMayBeAssumedEquivalent, false);
  assert.equal(period.crossProviderFirstWeekSemanticEquivalenceVerified, false);
  assert.equal(period.sameProviderSameScopeBaselineComparisonAllowed, true);
  assert.equal(period.providerPeriodDefinitionResolved, true);
  assert.equal(period.state, 'verified');
  assert.equal(LUMINATE_ALBUM_PRODUCTION_EVIDENCE_RESEARCH.periodSemantics, 'verified');

  assert.throws(() => buildLuminateTrackedFirstWeekWindow('2024-02-30'), /luminate_release_date_invalid/);
});

test('Luminate correction semantics reaggregate provider facts before canonical supersession', () => {
  const correction = LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.correctionSemantics;

  assert.equal(correction.pastReportDateCorrectionsDocumented, true);
  assert.equal(correction.negativeQuantityMayRepresentReturnOrCorrection, true);
  assert.equal(correction.rawFactResolutionPolicy, 'sum-all-related-activity-for-target-timeframe');
  assert.equal(correction.rawFactCorrectionMode, 'append-delta-and-reaggregate');
  assert.equal(correction.rawFactRowMayBeTreatedAsIndependentAlbumPerformanceObservation, false);
  assert.equal(correction.canonicalRevisionPolicy, 'recomputed-period-snapshot-supersedes-prior-canonical-snapshot');
  assert.equal(correction.canonicalRevisionCreatesNewPerformanceObservation, false);
  assert.equal(correction.revisionPolicyResolved, true);
  assert.equal(LUMINATE_ALBUM_PRODUCTION_EVIDENCE_RESEARCH.revisionSemantics, 'verified');
});

test('Luminate default terms do not authorize FANDEX Production use', () => {
  const authorization = LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.authorization;

  assert.equal(authorization.currentFandexAuthorization, false);
  assert.equal(authorization.defaultTermsPermittedUse, 'confidential-internal-business-use');
  assert.equal(authorization.separateOrderFormOrWritingMayExpandUse, true);
  assert.equal(authorization.acquisitionRights, 'review-required');
  assert.equal(authorization.normalizedStorageRights, 'review-required');
  assert.equal(authorization.commercialUseRights, 'review-required');
  assert.equal(authorization.derivedPublicationRights, 'review-required');
  assert.equal(authorization.publicBenchmarkingOrRankingAllowedByDefaultTerms, false);
  assert.equal(authorization.directObservationAuthorized, false);
});

test('Luminate internal normalization definitions are resolved except source authorization', () => {
  const normalization = buildLuminateNormalizationFreezeInputs();

  assert.deepEqual(normalization, {
    sourceAuthorizationResolved: false,
    providerPeriodDefinitionResolved: true,
    baselineDefinitionResolved: true,
    crossReleaseComparabilityResolved: true,
    transformationRuleDefined: true,
    revisionPolicyResolved: true,
  });

  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: LUMINATE_ALBUM_PRODUCTION_EVIDENCE_RESEARCH,
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
  assert.ok(!readiness.blockers.includes('provider-period-semantics-not-fully-verified'));
  assert.ok(!readiness.blockers.includes('provider-revision-semantics-not-fully-verified'));
  assert.ok(!readiness.blockers.includes('provider-historical-query-semantics-not-fully-verified'));
  assert.ok(readiness.blockers.includes('normalization-source-authorization-unresolved'));
  assert.ok(!readiness.blockers.includes('normalization-provider-period-unresolved'));
  assert.ok(readiness.blockers.includes('direct-absolute-sales-input-missing'));
  assert.ok(readiness.blockers.includes('normalization-data-unassessed'));
});

test('no Luminate live adapter or call is permitted before a FANDEX license exists', () => {
  const policy = LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.liveCallPolicy;
  assert.equal(policy.credentialsAvailableToFandexResearch, false);
  assert.equal(policy.liveCallAttempted, false);
  assert.equal(policy.liveCallAllowedWithoutSubscriptionOrLicense, false);
  assert.equal(policy.adapterImplementationAllowedBeforeAuthorization, false);
});
