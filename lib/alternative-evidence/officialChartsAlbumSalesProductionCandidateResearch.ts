import {
  ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS,
} from './albumNormalizationResearch';
import type {
  AlbumNormalizationFreezeInputs,
  AlbumProviderProductionEvidence,
} from './albumProductionReadinessResearch';

export const OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH_VERSION =
  'official-charts-album-sales-production-candidate-research-v1' as const;

export const OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH = Object.freeze({
  contractVersion: OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'official-charts-company' as const,
  providerName: 'Official Charts Company' as const,
  sourceFamily: 'licensed-data-service-research' as const,
  construct: 'physical completed-purchase-class sales reaction' as const,
  supportedTerritories: Object.freeze(['GB'] as const),
  accessSurfaces: Object.freeze([
    'official-charts-pro',
    'official-charts-online',
    'bespoke-data-feed',
    'licensed-chart-or-report',
  ] as const),
  constructEvidence: Object.freeze({
    officialPhysicalSalesAvailable: true as const,
    albumLevelInsightsAdvertised: true as const,
    dailySalesTrackingAdvertised: true as const,
    directRetailPartnerReportingAdvertised: true as const,
    chartReportingRetailerMustCarryOutCustomerTransactionDirectly: true as const,
    shipmentOrWholesaleMaySubstitute: false as const,
  }),
  coverage: Object.freeze({
    market: 'UK' as const,
    physicalMarketCoverageClaim: 'over-99-percent-streaming-and-physical-market' as const,
    historicalPhysicalTransactionsAvailable: true as const,
    historicalCoverageStart: 'week-5-1994' as const,
  }),
  periodSemantics: Object.freeze({
    dailySalesDataAvailable: true as const,
    releaseRelativeSevenDayWindowCanBeDerivedFromDailyData: true as const,
    exactSaleDateFieldContractPubliclyDocumented: false as const,
    onlineVersusStorefrontRecognitionRulePubliclyDocumented: false as const,
    providerTimezoneCutoffPubliclyDocumented: false as const,
    hanteoFirstWeekSemanticsMayBeAssumedEquivalent: false as const,
    state: 'partially-verified' as const,
  }),
  revisionSemantics: Object.freeze({
    publicCorrectionOrRevisionContractDocumented: false as const,
    providerRevisionPolicyMayBeAssumed: false as const,
    state: 'unverified' as const,
  }),
  authorization: Object.freeze({
    currentFandexAuthorization: false as const,
    subscriptionAccessExplicitlyOffered: true as const,
    bespokeDataFeedsExplicitlyOffered: true as const,
    chartPublicationLicencesExplicitlyOffered: true as const,
    proDataConfidentialByDefault: true as const,
    publicWebsitePublicationAllowedByDefault: false as const,
    rawOrDerivedDataPublicationRightsExplicitlyGrantedToFandex: false as const,
    acquisitionRights: 'review-required' as const,
    automatedAccessRights: 'review-required' as const,
    normalizedStorageRights: 'review-required' as const,
    retentionRights: 'review-required' as const,
    commercialUseRights: 'review-required' as const,
    derivedPublicationRights: 'review-required' as const,
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
    'https://www.officialcharts.com/our-business-services/b2b-data/',
    'https://www.officialcharts.com/pro/standard/faqs/',
    'https://www.officialcharts.com/pro/use-case/for-artists-managers/',
    'https://www.officialcharts.com/pro/register-to-be-a-chart-reporting-retailer/',
    'https://www.officialcharts.com/our-business-services/chart-licensing/',
    'https://www.officialcharts.com/who-we-are/copyright-notice/',
  ]),
});

export const OFFICIAL_CHARTS_ALBUM_PRODUCTION_EVIDENCE_RESEARCH = Object.freeze({
  providerId: 'official-charts-company' as const,
  constructCompatible: true,
  constructEvidence:
    'Official Charts states that it tracks complete UK physical sales and daily sales performance using data received directly from retail partners, and requires chart-reporting retailers to conduct the financial transaction with the customer. FANDEX has no current subscription or licence, exact daily sale-date/cutoff semantics are not publicly specified, and the public correction/revision contract is not documented.',
  acquisitionRights: 'review-required' as const,
  normalizedStorageRights: 'review-required' as const,
  derivedPublicationRights: 'review-required' as const,
  directObservationAuthorized: false,
  periodSemantics: 'partially-verified' as const,
  historicalQuerySemantics: 'verified' as const,
  revisionSemantics: 'unverified' as const,
  evidenceUrls: OFFICIAL_CHARTS_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.evidenceUrls,
}) satisfies AlbumProviderProductionEvidence;

export function buildOfficialChartsNormalizationFreezeInputs(): AlbumNormalizationFreezeInputs {
  return Object.freeze({
    sourceAuthorizationResolved: false,
    providerPeriodDefinitionResolved: false,
    baselineDefinitionResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.baselineDefinitionResolved,
    crossReleaseComparabilityResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.crossReleaseComparabilityResolved,
    transformationRuleDefined: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.transformationRuleDefined,
    revisionPolicyResolved: false,
  });
}
