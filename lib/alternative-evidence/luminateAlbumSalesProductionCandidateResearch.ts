import {
  ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS,
} from './albumNormalizationResearch';
import type {
  AlbumNormalizationFreezeInputs,
  AlbumProviderProductionEvidence,
} from './albumProductionReadinessResearch';

export const LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH_VERSION =
  'luminate-album-sales-production-candidate-research-v1' as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function addCalendarDays(date: string, days: number): string {
  if (!ISO_DATE_RE.test(date)) throw new Error('luminate_release_date_invalid');
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month! - 1
    || parsed.getUTCDate() !== day
  ) {
    throw new Error('luminate_release_date_invalid');
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export type LuminateTrackedFirstWeekWindow = Readonly<{
  dateBasis: 'REPORT_DATE';
  startDate: string;
  endDate: string;
  calendarDayCount: 7;
  releaseRelative: true;
}>;

export function buildLuminateTrackedFirstWeekWindow(releaseDate: string): LuminateTrackedFirstWeekWindow {
  return Object.freeze({
    dateBasis: 'REPORT_DATE' as const,
    startDate: releaseDate,
    endDate: addCalendarDays(releaseDate, 6),
    calendarDayCount: 7 as const,
    releaseRelative: true as const,
  });
}

export const LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH = Object.freeze({
  contractVersion: LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'luminate-music' as const,
  providerName: 'Luminate Music' as const,
  sourceFamily: 'licensed-data-service-research' as const,
  construct: 'physical completed-purchase-class sales reaction' as const,
  productMetric: 'ProductSales' as const,
  supportedTerritories: Object.freeze(['US', 'CA'] as const),
  accessSurfaces: Object.freeze(['music-api', 'snowflake-data-share'] as const),
  releaseIdentity: Object.freeze({
    musicalProductIdAvailable: true as const,
    musicalReleaseIdAvailable: true as const,
    musicalReleaseGroupIdAvailable: true as const,
    releaseDateAvailable: true as const,
    productFormatAvailable: true as const,
    releaseTypeAvailable: true as const,
  }),
  physicalScope: Object.freeze({
    requiredDistributionChannel: 'physical' as const,
    purchaseMethodValues: Object.freeze(['online', 'storefront'] as const),
    productFormatValuesDocumented: Object.freeze([
      'cd',
      'cassette',
      'vinyl',
      'mxcd',
      'dvd',
      'vhs',
      'laser',
      'unknown',
    ] as const),
    digitalMaySubstitutePhysical: false as const,
    crossTerritoryRawAggregationAllowed: false as const,
    sameTerritoryRequiredForBaselineComparison: true as const,
  }),
  quantitySemantics: Object.freeze({
    primaryRawUnitFieldCandidate: 'REPORTED_QUANTITY' as const,
    reportedQuantityMeaning: 'provider-reported-units-without-luminate-modeling' as const,
    modeledQuantityField: 'QUANTITY' as const,
    modeledQuantityAllowedForPrimaryAnchor: false as const,
    equivalentQuantityField: 'EQUIVALENT_QUANTITY' as const,
    equivalentQuantityAllowedForPrimaryAnchor: false as const,
    transactionTypes: Object.freeze(['S', 'R', 'CMA'] as const),
    saleTransactionType: 'S' as const,
    returnAdjustmentTransactionType: 'R' as const,
    completeMyAlbumAllowedForPhysicalPrimaryAnchor: false as const,
  }),
  providerPeriodSemantics: Object.freeze({
    reportDateField: 'REPORT_DATE' as const,
    reportDateMeaning: 'date-of-record-as-reported-by-data-provider' as const,
    releaseDateField: 'RELEASE_DATE' as const,
    providerNativeFirstWeekMetricRequired: false as const,
    fandexPeriodDefinition:
      'release-date-through-release-date-plus-six-report-dates-inclusive' as const,
    dateBasis: 'REPORT_DATE' as const,
    calendarDayCount: 7 as const,
    releaseRelative: true as const,
    onlinePhysicalRecognitionRule: 'ship-date-plus-three-days' as const,
    onlinePhysicalRulePurpose: 'approximate-time-for-physical-product-to-reach-consumer' as const,
    storefrontSourceSemantics: 'daily-electronic-point-of-sale-sales' as const,
    consumerOrderDateEquivalentRequired: false as const,
    hanteoFirstWeekSemanticsMayBeAssumedEquivalent: false as const,
    crossProviderFirstWeekSemanticEquivalenceVerified: false as const,
    sameProviderSameScopeBaselineComparisonAllowed: true as const,
    providerPeriodDefinitionResolved: true as const,
    state: 'verified' as const,
  }),
  correctionSemantics: Object.freeze({
    modifiedAtField: 'MODIFIED_AT' as const,
    pastReportDateCorrectionsDocumented: true as const,
    negativeQuantityMayRepresentReturnOrCorrection: true as const,
    rawFactResolutionPolicy: 'sum-all-related-activity-for-target-timeframe' as const,
    rawFactCorrectionMode: 'append-delta-and-reaggregate' as const,
    rawFactRowMayBeTreatedAsIndependentAlbumPerformanceObservation: false as const,
    canonicalRevisionPolicy: 'recomputed-period-snapshot-supersedes-prior-canonical-snapshot' as const,
    canonicalRevisionCreatesNewPerformanceObservation: false as const,
    revisionPolicyResolved: true as const,
  }),
  historicalAccess: Object.freeze({
    activityToDateApiAvailable: true as const,
    providerHistoricalQueryRequiredForFandexProduction: false as const,
  }),
  authorization: Object.freeze({
    currentFandexAuthorization: false as const,
    defaultTermsPermittedUse: 'confidential-internal-business-use' as const,
    separateOrderFormOrWritingMayExpandUse: true as const,
    acquisitionRights: 'review-required' as const,
    automatedAccessRights: 'review-required' as const,
    normalizedStorageRights: 'review-required' as const,
    retentionRights: 'review-required' as const,
    commercialUseRights: 'review-required' as const,
    derivedPublicationRights: 'review-required' as const,
    publicBenchmarkingOrRankingAllowedByDefaultTerms: false as const,
    directObservationAuthorized: false as const,
  }),
  liveCallPolicy: Object.freeze({
    credentialsAvailableToFandexResearch: false as const,
    liveCallAttempted: false as const,
    liveCallAllowedWithoutSubscriptionOrLicense: false as const,
    adapterImplementationAllowedBeforeAuthorization: false as const,
  }),
  productionEligible: false as const,
  productScorePublished: false as const,
  methodologyFrozen: false as const,
  evidenceUrls: Object.freeze([
    'https://docs.luminatedata.com/docs/data-filters',
    'https://docs.luminatedata.com/docs/consumption-data-summary',
    'https://docs.luminatedata.com/docs/consumption-data-claim',
    'https://docs.luminatedata.com/docs/fact-data-structure',
    'https://docs.luminatedata.com/docs/metadata',
    'https://docs.luminatedata.com/changelog/music-api-updates',
    'https://docs.luminatedata.com/docs/onboarding-documentation',
    'https://support.luminatedata.com/portal/en/kb/articles/methodology-faqs',
    'https://support.luminatedata.com/portal/en/kb/articles/become-a-data-provider',
    'https://luminatedata.com/terms-of-use/',
  ]),
});

export const LUMINATE_ALBUM_PRODUCTION_EVIDENCE_RESEARCH = Object.freeze({
  providerId: 'luminate-music' as const,
  constructCompatible: true,
  constructEvidence:
    'Luminate Product Sales exposes physical product-sales units in the U.S. and Canada. REPORTED_QUANTITY preserves provider-reported units without Luminate modeling. FANDEX defines the Luminate first-week anchor as the seven inclusive REPORT_DATE calendar dates beginning on RELEASE_DATE, preserving Luminate tracking semantics including its documented online-physical ship-date-plus-three-days recognition rule. This period is provider-specific and is not treated as semantically equivalent to Hanteo first-week sales. FANDEX still has no current Luminate license.',
  acquisitionRights: 'review-required' as const,
  normalizedStorageRights: 'review-required' as const,
  derivedPublicationRights: 'review-required' as const,
  directObservationAuthorized: false,
  periodSemantics: 'verified' as const,
  historicalQuerySemantics: 'verified' as const,
  revisionSemantics: 'verified' as const,
  evidenceUrls: LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.evidenceUrls,
}) satisfies AlbumProviderProductionEvidence;

export function buildLuminateNormalizationFreezeInputs(): AlbumNormalizationFreezeInputs {
  return Object.freeze({
    sourceAuthorizationResolved: false,
    providerPeriodDefinitionResolved:
      LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.providerPeriodSemantics.providerPeriodDefinitionResolved,
    baselineDefinitionResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.baselineDefinitionResolved,
    crossReleaseComparabilityResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.crossReleaseComparabilityResolved,
    transformationRuleDefined: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.transformationRuleDefined,
    revisionPolicyResolved: LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.correctionSemantics.revisionPolicyResolved,
  });
}
