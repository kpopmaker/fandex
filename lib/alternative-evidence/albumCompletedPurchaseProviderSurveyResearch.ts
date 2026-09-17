export const ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH_VERSION =
  'album-completed-purchase-provider-survey-research-v1' as const;

export type AlbumCompletedPurchaseProviderSurveyCandidate = Readonly<{
  candidateId: string;
  providerClass: 'chart-provider' | 'government-statistics' | 'secondary-report' | 'provider-news';
  constructCompatible: boolean;
  directProviderObservationAvailable: boolean;
  automaticAcquisitionRights: 'allowed' | 'review-required' | 'blocked' | 'not-applicable';
  normalizedStorageRights: 'allowed' | 'review-required' | 'blocked' | 'not-applicable';
  derivedPublicationRights: 'allowed' | 'review-required' | 'blocked' | 'not-applicable';
  productionCandidateState: 'rights-blocked' | 'construct-incompatible' | 'context-only' | 'not-direct-provider';
  reason: string;
  evidenceUrls: readonly string[];
}>;

export const ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH = Object.freeze({
  contractVersion: ALBUM_COMPLETED_PURCHASE_PROVIDER_SURVEY_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  construct: 'physical completed-purchase-class sales reaction' as const,
  surveyScope: 'bounded-official-and-public-provider-survey' as const,
  exhaustiveUniverseClaim: false as const,
  openProductionCompatibleProviderFound: false as const,
  candidates: Object.freeze([
    Object.freeze({
      candidateId: 'hanteo-chart',
      providerClass: 'chart-provider' as const,
      constructCompatible: true,
      directProviderObservationAvailable: false,
      automaticAcquisitionRights: 'review-required' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
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
      automaticAcquisitionRights: 'blocked' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
      productionCandidateState: 'rights-blocked' as const,
      reason: 'Retail Album Chart is retail-store sales, but Circle explicitly rejects unauthorized AI/ML training and text/data mining; the public page is not treated as an authorized Production ingestion surface.',
      evidenceUrls: Object.freeze([
        'https://circlechart.kr/page_chart/retail.circle?termGbn=week',
        'https://circlechart.kr/page_article/list.circle?sgenre=album',
      ]),
    }),
    Object.freeze({
      candidateId: 'circle-general-album-chart',
      providerClass: 'chart-provider' as const,
      constructCompatible: false,
      directProviderObservationAvailable: false,
      automaticAcquisitionRights: 'blocked' as const,
      normalizedStorageRights: 'review-required' as const,
      derivedPublicationRights: 'review-required' as const,
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
      automaticAcquisitionRights: 'not-applicable' as const,
      normalizedStorageRights: 'not-applicable' as const,
      derivedPublicationRights: 'not-applicable' as const,
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
      automaticAcquisitionRights: 'not-applicable' as const,
      normalizedStorageRights: 'not-applicable' as const,
      derivedPublicationRights: 'not-applicable' as const,
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
      automaticAcquisitionRights: 'not-applicable' as const,
      normalizedStorageRights: 'not-applicable' as const,
      derivedPublicationRights: 'not-applicable' as const,
      productionCandidateState: 'context-only' as const,
      reason: 'Official Hanteo News can establish reported sales context and period semantics, but a reported article value is not an authorized direct-provider observation.',
      evidenceUrls: Object.freeze([
        'https://www.hanteonews.com/en/article/92270',
      ]),
    }),
  ] satisfies readonly AlbumCompletedPurchaseProviderSurveyCandidate[]),
  conclusion: Object.freeze({
    state: 'no-open-production-compatible-provider-found-in-bounded-survey' as const,
    rightsBlockerRetained: true as const,
    universalAbsenceClaim: false as const,
    reportedContextMaySubstituteDirectObservation: false as const,
    shipmentMaySubstituteCompletedPurchase: false as const,
  }),
});
