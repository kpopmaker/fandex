import type { FandexRightsGateState } from './publicationGate';

export const BRAND_FIT_SOURCE_QUALIFICATION_CONTRACT_VERSION =
  'brand-fit-source-qualification-v1' as const;

export type BrandFitQualifiedProviderId =
  | 'estee-lauder-site-direct-fetch'
  | 'youtube-data-api-official-brand-channel';

export type BrandFitSourceTransport =
  | 'direct-web'
  | 'provider-api';

export type BrandFitSourceQualificationStatus =
  | 'blocked'
  | 'conditional-candidate';

export type BrandFitSourceQualification = Readonly<{
  contractVersion:
    typeof BRAND_FIT_SOURCE_QUALIFICATION_CONTRACT_VERSION;
  providerId: BrandFitQualifiedProviderId;
  transport: BrandFitSourceTransport;
  sourceFamily:
    | 'official-brand-announcement'
    | 'official-brand-youtube-video';
  rightsState: FandexRightsGateState;
  status: BrandFitSourceQualificationStatus;
  directCollectionEligible: boolean;
  numericDerivationEligible: false;
  reviewedAt: string;
  legalEvidenceUrls: readonly string[];
  blockers: readonly string[];
  requiredControls: readonly string[];
  allowedEvidenceUse: readonly string[];
}>;

export type BrandFitYouTubeComplianceControls = Readonly<{
  usesYouTubeDataApiOnly: boolean;
  scrapingDisabled: boolean;
  audiovisualDownloadDisabled: boolean;
  nonAuthorizedMetadataRefreshWithin30Days: boolean;
  latestMetadataRefreshEnabled: boolean;
  termsAndPrivacyDisclosureReady: boolean;
  officialBrandChannelBindingRequired: boolean;
  numericDerivedMetricDisabled: boolean;
}>;

export type BrandFitYouTubeCollectionEligibility = Readonly<{
  providerId: 'youtube-data-api-official-brand-channel';
  status: 'eligible-for-brand-adapter' | 'blocked';
  rightsState: 'restricted';
  directCollectionEligible: boolean;
  numericDerivationEligible: false;
  blockers: readonly string[];
}>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

export const ESTEE_LAUDER_DIRECT_SITE_QUALIFICATION:
  BrandFitSourceQualification = Object.freeze({
    contractVersion: BRAND_FIT_SOURCE_QUALIFICATION_CONTRACT_VERSION,
    providerId: 'estee-lauder-site-direct-fetch',
    transport: 'direct-web',
    sourceFamily: 'official-brand-announcement',
    rightsState: 'deny',
    status: 'blocked',
    directCollectionEligible: false,
    numericDerivationEligible: false,
    reviewedAt: '2026-10-01',
    legalEvidenceUrls: Object.freeze([
      'https://www.esteelauder.com/terms-conditions',
      'https://www.elcompanies.com/en/terms-and-conditions',
    ]),
    blockers: Object.freeze([
      'automated-scraping-prohibited',
      'commercial-reuse-not-authorized',
      'personal-use-license-only',
    ]),
    requiredControls: Object.freeze([]),
    allowedEvidenceUse: Object.freeze([
      'manual-source-qualification-reference-only',
    ]),
  });

export const YOUTUBE_DATA_API_BRAND_SOURCE_QUALIFICATION:
  BrandFitSourceQualification = Object.freeze({
    contractVersion: BRAND_FIT_SOURCE_QUALIFICATION_CONTRACT_VERSION,
    providerId: 'youtube-data-api-official-brand-channel',
    transport: 'provider-api',
    sourceFamily: 'official-brand-youtube-video',
    rightsState: 'restricted',
    status: 'conditional-candidate',
    directCollectionEligible: false,
    numericDerivationEligible: false,
    reviewedAt: '2026-10-01',
    legalEvidenceUrls: Object.freeze([
      'https://developers.google.com/youtube/terms/api-services-terms-of-service',
      'https://developers.google.com/youtube/terms/developer-policies',
      'https://developers.google.com/youtube/terms/derived-metrics-policy',
      'https://developers.google.com/youtube/v3/docs/videos',
    ]),
    blockers: Object.freeze([
      'collection-compliance-controls-not-attested',
      'official-brand-channel-binding-not-attested',
    ]),
    requiredControls: Object.freeze([
      'api-only-access-no-scraping',
      'no-audiovisual-download',
      'non-authorized-metadata-refresh-or-delete-within-30-days',
      'latest-metadata-refresh',
      'terms-and-privacy-disclosure',
      'official-brand-channel-binding',
      'no-numeric-derived-metric',
    ]),
    allowedEvidenceUse: Object.freeze([
      'explicit-artist-brand-campaign-claim-from-official-brand-channel-metadata',
      'source-video-id-lineage',
      'source-published-at-lineage',
    ]),
  });

export function evaluateYouTubeBrandSourceCollectionEligibility(
  controls: BrandFitYouTubeComplianceControls,
): BrandFitYouTubeCollectionEligibility {
  const blockers: string[] = [];

  if (!controls.usesYouTubeDataApiOnly) {
    blockers.push('youtube-data-api-not-exclusive-access-path');
  }
  if (!controls.scrapingDisabled) {
    blockers.push('youtube-scraping-not-disabled');
  }
  if (!controls.audiovisualDownloadDisabled) {
    blockers.push('youtube-audiovisual-download-not-disabled');
  }
  if (!controls.nonAuthorizedMetadataRefreshWithin30Days) {
    blockers.push('youtube-30-day-refresh-delete-control-missing');
  }
  if (!controls.latestMetadataRefreshEnabled) {
    blockers.push('youtube-latest-metadata-refresh-missing');
  }
  if (!controls.termsAndPrivacyDisclosureReady) {
    blockers.push('youtube-terms-privacy-disclosure-missing');
  }
  if (!controls.officialBrandChannelBindingRequired) {
    blockers.push('official-brand-channel-binding-control-missing');
  }
  if (!controls.numericDerivedMetricDisabled) {
    blockers.push('youtube-numeric-derived-metric-not-disabled');
  }

  const normalizedBlockers = orderedUnique(blockers);
  return Object.freeze({
    providerId: 'youtube-data-api-official-brand-channel' as const,
    status:
      normalizedBlockers.length === 0
        ? 'eligible-for-brand-adapter' as const
        : 'blocked' as const,
    rightsState: 'restricted' as const,
    directCollectionEligible: normalizedBlockers.length === 0,
    numericDerivationEligible: false as const,
    blockers: normalizedBlockers,
  });
}

export function listBrandFitSourceQualifications():
  readonly BrandFitSourceQualification[] {
  return Object.freeze([
    ESTEE_LAUDER_DIRECT_SITE_QUALIFICATION,
    YOUTUBE_DATA_API_BRAND_SOURCE_QUALIFICATION,
  ]);
}
