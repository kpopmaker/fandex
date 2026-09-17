export const ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH_VERSION =
  'album-completed-purchase-provider-survey-research-v1' as const;

export type AlbumCompletedPurchaseProviderSurveyCandidate = Readonly<{
  candidateId: string;
  providerClass:
    | 'chart-provider'
    | 'retailer-api'
    | 'licensed-data-service'
    | 'government-statistics'
    | 'secondary-report'
    | 'provider-news';
  constructCompatible: boolean;
  directProviderObservationAvailable: boolean;
  unitPhysicalSalesAvailable: boolean;
  currentFandexAuthorization: boolean;
  automaticAcquisitionRights: 'allowed' | 'review-required' | 'blocked' | 'not-applicable';
  normalizedStorageRights: 'allowed' | 'review-required' | 'blocked' | 'not-applicable';
  derivedPublicationRights: 'allowed' | 'review-required' | 'blocked' | 'not-applicable';
  contractualProductionPath: 'explicitly-offered' | 'not-evidenced' | 'not-applicable';
  territoryScope: readonly string[] | null;
  productionCandidateState:
    | 'contract-capable'
    | 'rights-blocked'
    | 'construct-incompatible'
    | 'context-only'
    | 'not-direct-provider';
  reason: string;
  evidenceUrls: readonly string[];
}>;

export const ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH = Object.freeze({
  contractVersion: ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  construct: 'physical completed-purchase-class sales reaction' as const,
  surveyScope: 'bounded-official-public-and-licensed-provider-survey' as const,
  exhaustiveUniverseClaim: false as const,
  openProductionCompatibleProviderFound: false as const,
  contractCapableProviderFound: true as const,
  candidates: Object.freeze([
    Object.freeze({
      candidateId: 'hanteo-chart',
      providerClass: 'chart-provider' as const,
      constructCompatible: true,
      directProviderObservationAvailable: false,
      unitPhysicalSalesAvailable: true,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'review-required' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
      contractualProductionPath: 'not-evidenced' as const,
      territoryScope: Object.freeze(['KR']),
      productionCandidateState: 'rights-blocked' as const,
      reason: 'Physical album sales construct matches, but the currently observed public/API surface does not establish FANDEX automation, normalized storage, or derived publication authorization.',
      evidenceUrls: Object.freeze([
        'https://www.hanteochart.com/en/charts/album/weekly/2024-W08',
        'https://www.hanteochart.com/ko/notices',
      ]),
    }),
    Object.freeze({
      candidateId: 'circle-retail-album-chart',
      providerClass: 'chart-provider' as const,
      constructCompatible: true,
      directProviderObservationAvailable: false,
      unitPhysicalSalesAvailable: true,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'blocked' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
      contractualProductionPath: 'not-evidenced' as const,
      territoryScope: Object.freeze(['KR']),
      productionCandidateState: 'rights-blocked' as const,
      reason: 'Retail Album Chart is retail-store sales, but Circle explicitly rejects unauthorized AI/ML training and text/data mining; the public page is not treated as an authorized Production ingestion surface.',
      evidenceUrls: Object.freeze([
        'https://circlechart.kr/page_chart/retail.circle?termGbn=week',
        'https://circlechart.kr/page_article/list.circle?sgenre=album',
      ]),
    }),
    Object.freeze({
      candidateId: 'luminate-music-api-data-share',
      providerClass: 'licensed-data-service' as const,
      constructCompatible: true,
      directProviderObservationAvailable: true,
      unitPhysicalSalesAvailable: true,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'review-required' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
      contractualProductionPath: 'explicitly-offered' as const,
      territoryScope: Object.freeze(['US', 'CA']),
      productionCandidateState: 'contract-capable' as const,
      reason: 'Luminate officially exposes Product Sales for physical music products in the U.S. and Canada through Music API/Data Share, including unit quantities, provider-reported quantities, report dates, transaction types, product/release identities, and modification timestamps. Default terms limit use to confidential internal business use and prohibit public derivative benchmarking unless an applicable order form or separate writing expressly permits it, so FANDEX is not currently authorized but a contractual Production path exists.',
      evidenceUrls: Object.freeze([
        'https://docs.luminatedata.com/docs/getting-started',
        'https://docs.luminatedata.com/reference/getmusicalreleasegroups',
        'https://docs.luminatedata.com/docs/consumption-data-provider',
        'https://docs.luminatedata.com/docs/data-filters',
        'https://luminatedata.com/terms-of-use/',
      ]),
    }),
    Object.freeze({
      candidateId: 'official-charts-b2b-data',
      providerClass: 'licensed-data-service' as const,
      constructCompatible: true,
      directProviderObservationAvailable: true,
      unitPhysicalSalesAvailable: true,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'review-required' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
      contractualProductionPath: 'explicitly-offered' as const,
      territoryScope: Object.freeze(['GB']),
      productionCandidateState: 'contract-capable' as const,
      reason: 'Official Charts tracks UK physical sales from direct retail partners and offers subscription data services, bespoke data feeds, and publication licences. Its public PRO material states that the data is confidential by default; exact daily sale-date/cutoff and correction semantics are not publicly specified, so FANDEX still needs both rights and provider-specific temporal/revision semantics before Production use.',
      evidenceUrls: Object.freeze([
        'https://www.officialcharts.com/our-business-services/b2b-data/',
        'https://www.officialcharts.com/pro/standard/faqs/',
        'https://www.officialcharts.com/pro/use-case/for-artists-managers/',
        'https://www.officialcharts.com/pro/register-to-be-a-chart-reporting-retailer/',
        'https://www.officialcharts.com/our-business-services/chart-licensing/',
        'https://www.officialcharts.com/who-we-are/copyright-notice/',
      ]),
    }),
    Object.freeze({
      candidateId: 'yes24-open-api-music',
      providerClass: 'retailer-api' as const,
      constructCompatible: false,
      directProviderObservationAvailable: true,
      unitPhysicalSalesAvailable: false,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'review-required' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
      contractualProductionPath: 'explicitly-offered' as const,
      territoryScope: Object.freeze(['KR']),
      productionCandidateState: 'construct-incompatible' as const,
      reason: 'YES24 now provides an official Open API with MUSIC product search and bestseller surfaces, but the exposed salePoint is a weighted sales-performance index rather than sold physical-unit quantity. YES24 also states that commercial services may require separate review/contract and prohibits unauthorized collection, redistribution, and resale. The API is useful for identity or proxy research, not the current absolute physical-unit construct.',
      evidenceUrls: Object.freeze([
        'https://developers.yes24.com/api-doc/goods-item-list',
        'https://developers.yes24.com/api-doc/goods-item-detail',
        'https://developers.yes24.com/support/faq',
        'https://www.yes24.com/Mall/Help/FAQ?faqGb=31&faqSubGb=YA1',
      ]),
    }),
    Object.freeze({
      candidateId: 'aladin-open-api-music',
      providerClass: 'retailer-api' as const,
      constructCompatible: false,
      directProviderObservationAvailable: true,
      unitPhysicalSalesAvailable: false,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'review-required' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
      contractualProductionPath: 'explicitly-offered' as const,
      territoryScope: Object.freeze(['KR']),
      productionCandidateState: 'construct-incompatible' as const,
      reason: 'Aladin OpenAPI supports music-product search/list/bestseller data but the documented public API does not expose completed-purchase physical-unit quantities. Its terms also require prior approval for commercial use and restrict unauthorized copying, storage, processing, distribution, and onward provision.',
      evidenceUrls: Object.freeze([
        'https://blog.aladin.co.kr/openapi/6695306',
        'https://blog.aladin.co.kr/openapi/13851154',
      ]),
    }),
    Object.freeze({
      candidateId: 'circle-general-album-chart',
      providerClass: 'chart-provider' as const,
      constructCompatible: false,
      directProviderObservationAvailable: false,
      unitPhysicalSalesAvailable: true,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'blocked' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
      contractualProductionPath: 'not-evidenced' as const,
      territoryScope: Object.freeze(['KR']),
      productionCandidateState: 'construct-incompatible' as const,
      reason: 'General Album Chart distribution/shipment-class quantities are not substituted for completed retail purchases.',
      evidenceUrls: Object.freeze([
        'https://circlechart.kr/page_chart/album.circle',
      ]),
    }),
    Object.freeze({
      candidateId: 'korea-customs-album-export-statistics',
      providerClass: 'government-statistics' as const,
      constructCompatible: false,
      directProviderObservationAvailable: false,
      unitPhysicalSalesAvailable: false,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'not-applicable' as const,
      normalizedStorageRights: 'not-applicable' as const,
      derivedPublicationRights: 'not-applicable' as const,
      contractualProductionPath: 'not-applicable' as const,
      territoryScope: null,
      productionCandidateState: 'construct-incompatible' as const,
      reason: 'Customs statistics describe export shipments/trade values and are not release-level completed consumer purchases.',
      evidenceUrls: Object.freeze([
        'https://www.korea.net/NewsFocus/Business/view?articleId=291600',
      ]),
    }),
    Object.freeze({
      candidateId: 'kocca-welcon-album-market-report',
      providerClass: 'secondary-report' as const,
      constructCompatible: false,
      directProviderObservationAvailable: false,
      unitPhysicalSalesAvailable: false,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'not-applicable' as const,
      normalizedStorageRights: 'not-applicable' as const,
      derivedPublicationRights: 'not-applicable' as const,
      contractualProductionPath: 'not-applicable' as const,
      territoryScope: null,
      productionCandidateState: 'not-direct-provider' as const,
      reason: 'The public report republishes market/chart context sourced from Circle rather than exposing an authorized direct per-release completed-purchase feed.',
      evidenceUrls: Object.freeze([
        'https://welcon.kocca.kr/',
      ]),
    }),
    Object.freeze({
      candidateId: 'hanteo-news-reported-sales',
      providerClass: 'provider-news' as const,
      constructCompatible: true,
      directProviderObservationAvailable: false,
      unitPhysicalSalesAvailable: true,
      currentFandexAuthorization: false,
      automaticAcquisitionRights: 'not-applicable' as const,
      normalizedStorageRights: 'not-applicable' as const,
      derivedPublicationRights: 'not-applicable' as const,
      contractualProductionPath: 'not-applicable' as const,
      territoryScope: Object.freeze(['KR']),
      productionCandidateState: 'context-only' as const,
      reason: 'Official Hanteo News can establish reported sales context and period semantics, but a reported article value is not an authorized direct-provider observation.',
      evidenceUrls: Object.freeze([
        'https://www.hanteonews.com/en/article/92270',
      ]),
    }),
  ] satisfies readonly AlbumCompletedPurchaseProviderSurveyCandidate[]),
  conclusion: Object.freeze({
    state: 'no-open-production-compatible-provider-found-but-contract-capable-paths-exist' as const,
    rightsBlockerRetained: true as const,
    universalAbsenceClaim: false as const,
    contractCapableCandidateIds: Object.freeze([
      'luminate-music-api-data-share',
      'official-charts-b2b-data',
    ]),
    internallyResolvedExceptRightsAndAuthorizedDataCandidateIds: Object.freeze([
      'luminate-music-api-data-share',
    ]),
    candidatesStillRequiringProviderSpecificSemantics: Object.freeze([
      'official-charts-b2b-data',
    ]),
    productionOutputMustRemainTerritoryScoped: true as const,
    globalMarketReactionMayBeInferredFromSingleTerritory: false as const,
    reportedContextMaySubstituteDirectObservation: false as const,
    rankOrSalesIndexMaySubstitutePhysicalUnits: false as const,
    shipmentMaySubstituteCompletedPurchase: false as const,
  }),
});
