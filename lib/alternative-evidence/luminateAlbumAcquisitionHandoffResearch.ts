export const LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH_VERSION =
  'luminate-album-acquisition-handoff-research-v1' as const;

export type LuminateAcquisitionSurface = 'snowflake-data-share' | 'music-api';

export const LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH = Object.freeze({
  contractVersion: LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'luminate-music' as const,
  construct: 'physical completed-purchase-class sales reaction' as const,
  automaticExternalContactAllowed: false as const,
  automaticPurchaseOrSubscriptionAllowed: false as const,
  salesHandoffRequired: true as const,
  publicSelfServiceProductionLicenseEstablished: false as const,
  officialAcquisitionEntryPoints: Object.freeze({
    demoRequest: 'https://luminatedata.com/demo-request/' as const,
    musicApiProduct: 'https://luminatedata.com/api/' as const,
    developerHub: 'https://docs.luminatedata.com/' as const,
    dataShareOnboarding: 'https://docs.luminatedata.com/docs/onboarding-documentation' as const,
    terms: 'https://luminatedata.com/terms-of-use/' as const,
  }),
  surfacePriority: Object.freeze([
    Object.freeze({
      order: 1,
      surface: 'snowflake-data-share' as LuminateAcquisitionSurface,
      state: 'preferred-for-fandex-primary-anchor' as const,
      reasons: Object.freeze([
        'daily-fact-views-document-reported-quantity-without-luminate-modeling',
        'transaction-type-exposes-sale-return-and-complete-my_album',
        'report-date-is-explicit-date-basis',
        'modified-at-supports-correction-reaggregation-lineage',
        'read-only-permissioned-views-support-bounded-ingestion',
      ] as const),
      unresolvedBeforeContract: Object.freeze([
        'exact-tables-and-columns-in-purchased-share',
        'historical-coverage-for-target-releases',
        'authorized-territories-us-or-ca',
        'commercial-fandex-product-use',
        'normalized-storage-and-retention',
        'public-derived-metric-publication',
        'post-termination-output-policy',
      ] as const),
    }),
    Object.freeze({
      order: 2,
      surface: 'music-api' as LuminateAcquisitionSurface,
      state: 'conditional-secondary-path' as const,
      reasons: Object.freeze([
        'api-supports-musical-release-group-queries',
        'api-supports-product-sales-physical-filters',
        'api-supports-us-ca-location-filtering',
        'api-supports-historical-activity-to-date',
      ] as const),
      unresolvedBeforePrimaryAnchorUse: Object.freeze([
        'licensed-response-must-preserve-provider-reported-physical-units-or-equivalent-unmodeled-field',
        'licensed-response-must-support-correction-revision-reconstruction-compatible-with-fandex-policy',
        'exact-first-week-report-date-reconstruction-must-remain-verifiable',
      ] as const),
    }),
  ]),
  requestedDataScope: Object.freeze({
    territories: Object.freeze(['US', 'CA'] as const),
    metricCategory: 'ProductSales' as const,
    distributionChannel: 'physical' as const,
    purchaseMethods: Object.freeze(['online', 'storefront'] as const),
    quantityField: 'REPORTED_QUANTITY' as const,
    modeledQuantityMaySubstitute: false as const,
    equivalentQuantityMaySubstitute: false as const,
    transactionTypesRequired: Object.freeze(['S', 'R'] as const),
    completeMyAlbumExcludedFromPhysicalPrimaryAnchor: true as const,
    temporalFieldsRequired: Object.freeze(['REPORT_DATE', 'MODIFIED_AT'] as const),
    identityLevelsRequired: Object.freeze([
      'Musical Product',
      'Musical Release',
      'Musical Release Group',
      'Artist',
    ] as const),
    productFormatRequired: true as const,
  }),
  firstAcquisitionTargets: Object.freeze([
    Object.freeze({
      artist: 'IU',
      fandexReleaseId: 'research:iu:release:the-winning:2024-02-20',
      releaseDate: '2024-02-20',
      role: 'current' as const,
    }),
    Object.freeze({
      artist: 'IU',
      fandexReleaseId: 'research:iu:release:pieces:2021-12-29',
      releaseDate: '2021-12-29',
      role: 'first-baseline-candidate' as const,
    }),
  ]),
  orderFormOrSeparateWritingRequirements: Object.freeze([
    'music-data-share-or-music-api-access-for-authorized-users',
    'physical-product-sales-for-explicit-us-and-or-ca-territories',
    'recurring-programmatic-query-or-read-access',
    'normalized-derived-observation-storage',
    'retention-during-license-term',
    'commercial-use-in-fandex-product',
    'public-publication-of-fandex-derived-metric-without-raw-luminate-content',
    'post-termination-delete-and-retract-or-explicit-derived-output-survival-right',
  ] as const),
  explicitlyNotRequested: Object.freeze([
    'raw-luminate-payload-redistribution',
    'public-republication-of-luminate-content',
    'ai-model-training-on-luminate-content',
    'public-ranking-or-benchmarking-rights-for-derived-metric-only-output',
  ] as const),
  contractAcceptanceEvidenceRequired: Object.freeze([
    'executed-order-form-or-separate-writing-id',
    'license-active-state',
    'authorized-territories',
    'authorized-access-surface',
    'storage-and-retention-rights',
    'commercial-product-use-right',
    'public-derived-metric-publication-right',
    'post-termination-policy-evidence',
  ] as const),
  evidenceUrls: Object.freeze([
    'https://luminatedata.com/terms-of-use/',
    'https://luminatedata.com/api/',
    'https://luminatedata.com/demo-request/',
    'https://support.luminatedata.com/portal/en/kb/articles/developer-hub',
    'https://docs.luminatedata.com/docs/onboarding-documentation',
    'https://docs.luminatedata.com/docs/consumption-data-summary',
    'https://docs.luminatedata.com/docs/consumption-data-claim',
    'https://docs.luminatedata.com/docs/fact-data-structure',
    'https://docs.luminatedata.com/reference/getmusicalreleasegroups',
    'https://docs.luminatedata.com/docs/data-filters',
  ] as const),
});

export type LuminateAcquisitionHandoffAssessment = Readonly<{
  state: 'ready-for-manual-sales-handoff' | 'blocked-internally';
  preferredSurface: LuminateAcquisitionSurface;
  fallbackSurface: LuminateAcquisitionSurface;
  internalBlockers: readonly string[];
  externalRequirements: readonly string[];
}>;

export function assessLuminateAlbumAcquisitionHandoff(): LuminateAcquisitionHandoffAssessment {
  const preferred = LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH.surfacePriority[0];
  const fallback = LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH.surfacePriority[1];
  return Object.freeze({
    state: 'ready-for-manual-sales-handoff' as const,
    preferredSurface: preferred.surface,
    fallbackSurface: fallback.surface,
    internalBlockers: Object.freeze([]),
    externalRequirements: Object.freeze([
      ...preferred.unresolvedBeforeContract,
      ...LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH.orderFormOrSeparateWritingRequirements,
    ]),
  });
}
