import {
  ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS,
} from './albumNormalizationResearch';
import type {
  AlbumNormalizationFreezeInputs,
  AlbumProviderProductionEvidence,
} from './albumProductionReadinessResearch';

export const ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH_VERSION =
  'oricon-album-sales-production-candidate-research-v1' as const;

export const ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH = Object.freeze({
  contractVersion: ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'oricon-research' as const,
  providerName: 'Oricon Research / ORICON BiZ online' as const,
  sourceFamily: 'licensed-data-service-research' as const,
  construct: 'physical completed-purchase-class sales reaction' as const,
  supportedTerritories: Object.freeze(['JP'] as const),
  constructEvidence: Object.freeze({
    retailerAndEcSalesDataUsed: true as const,
    dailyAlbumSalesAvailable: true as const,
    weeklyAlbumSalesAvailable: true as const,
    cumulativeAlbumSalesAvailable: true as const,
    customPeriodDataOffered: true as const,
    nationwideEstimatedSalesCopiesPublished: true as const,
    providerUnitNature: 'provider-estimated-physical-sales-copies' as const,
    providerEstimateMayBeRelabeledAsCensusCount: false as const,
    sameProviderEstimateMayBePreservedAsPhysicalUnits: true as const,
  }),
  providerPeriodSemantics: Object.freeze({
    publicWeeklyPeriodPattern: 'monday-through-sunday' as const,
    dailySalesAvailable: true as const,
    releaseWeekMondayThroughFollowingSundayDailyWindowAvailable: true as const,
    customPeriodDataAvailable: true as const,
    weeklyEstimateIncludesAdditionalWeeklyReports: true as const,
    sumOfSevenDailyEstimatesEqualsFinalWeeklyEstimate: false as const,
    naiveDailySevenDaySumAllowedForFandexFirstWeek: false as const,
    customReleaseRelativeSevenDayFinalEstimateContractVerified: false as const,
    exactDailyCutoffVerified: false as const,
    exactTimezoneContractVerified: false as const,
    firstWeekCanonicalizationReady: false as const,
    state: 'partially-verified' as const,
  }),
  revisionSemantics: Object.freeze({
    correctionOrRestatementBehaviorPubliclyVerified: false as const,
    revisionDeliveryContractVerified: false as const,
    canonicalRevisionPolicyMayBeAppliedWithoutProviderSemantics: false as const,
    state: 'unverified' as const,
  }),
  historicalAccess: Object.freeze({
    historicalRankingServiceAvailable: true as const,
    cumulativeSalesAvailable: true as const,
    customPeriodDataAvailable: true as const,
    providerHistoricalQueryRequiredForFandexProduction: false as const,
  }),
  authorization: Object.freeze({
    currentFandexAuthorization: false as const,
    corporateDataServiceExplicitlyOffered: true as const,
    rankingAndSalesDataSoldForExternalUse: true as const,
    acquisitionRights: 'review-required' as const,
    automatedAccessRights: 'review-required' as const,
    normalizedStorageRights: 'review-required' as const,
    retentionRights: 'review-required' as const,
    commercialUseRights: 'review-required' as const,
    derivedPublicationRights: 'review-required' as const,
    rawRedistributionRights: 'review-required' as const,
    directObservationAuthorized: false as const,
  }),
  liveCallPolicy: Object.freeze({
    credentialsAvailableToFandexResearch: false as const,
    liveCallAttempted: false as const,
    publicPageScrapingMaySubstituteLicensedFeed: false as const,
    adapterImplementationAllowedBeforeAuthorization: false as const,
  }),
  productionEligible: false as const,
  productScorePublished: false as const,
  methodologyFrozen: false as const,
  evidenceUrls: Object.freeze([
    'https://www.oricon.jp/business/dataservice/',
    'https://biz.oricon.co.jp/online_info.asp',
    'https://biz.oricon.co.jp/menu.asp',
    'https://www.oricon.jp/contact/',
    'https://www.oricon.co.jp/rank/ja/w/',
  ]),
});

export const ORICON_ALBUM_PRODUCTION_EVIDENCE_RESEARCH = Object.freeze({
  providerId: 'oricon-research' as const,
  constructCompatible: true,
  constructEvidence:
    'Oricon Research collects retailer and e-commerce physical product sales data and provides daily, weekly, cumulative, and custom-period album sales data through corporate data services. Published unit figures are provider-estimated nationwide sales copies and must retain that provider-estimate meaning. Oricon explicitly states that a weekly estimate is not the simple sum of daily estimates because additional weekly store reports are incorporated.',
  acquisitionRights: 'review-required' as const,
  normalizedStorageRights: 'review-required' as const,
  derivedPublicationRights: 'review-required' as const,
  directObservationAuthorized: false,
  periodSemantics: 'partially-verified' as const,
  historicalQuerySemantics: 'verified' as const,
  revisionSemantics: 'unverified' as const,
  evidenceUrls: ORICON_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.evidenceUrls,
}) satisfies AlbumProviderProductionEvidence;

export function buildOriconNormalizationFreezeInputs(): AlbumNormalizationFreezeInputs {
  return Object.freeze({
    sourceAuthorizationResolved: false,
    providerPeriodDefinitionResolved: false,
    baselineDefinitionResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.baselineDefinitionResolved,
    crossReleaseComparabilityResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.crossReleaseComparabilityResolved,
    transformationRuleDefined: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.transformationRuleDefined,
    revisionPolicyResolved: false,
  });
}
