export const BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION =
  'brand-fit-identity-binding-v1' as const;

export type BrandFitArtistBrandBinding = Readonly<{
  contractVersion: typeof BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION;
  canonicalArtistId: string;
  canonicalBrandId: string;
  relationshipType: 'ambassador' | 'endorsement' | 'campaign-participant' | 'collaboration';
  identityState: 'resolved';
  relationshipEvidence: Readonly<{
    sourceType: 'official-company-press-release';
    sourceUrl: string;
    announcedOn: string;
    lastCorroboratedOn: string | null;
  }>;
}>;

export type BrandFitBrandChannelBinding = Readonly<{
  contractVersion: typeof BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION;
  canonicalBrandId: string;
  provider: 'youtube';
  providerChannelId: string;
  providerChannelHandle: string | null;
  identityState: 'resolved';
  sourceUrl: string;
  reviewedOn: string;
}>;

export type BrandFitCampaignBinding = Readonly<{
  contractVersion: typeof BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION;
  canonicalCampaignId: string;
  canonicalBrandId: string;
  canonicalArtistId: string;
  campaignLabel: string;
  identityState: 'resolved';
  evidence: Readonly<{
    provider: 'youtube';
    providerChannelId: string;
    videoId: string;
    sourceUrl: string;
    sourceDate: string;
    sourceDatePrecision: 'day';
  }>;
}>;

export type BrandFitYouTubeCollectionPlan = Readonly<{
  contractVersion: typeof BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION;
  planId: string;
  provider: 'youtube-data-api';
  canonicalArtistId: string;
  canonicalBrandId: string;
  canonicalCampaignId: string | null;
  providerChannelId: string;
  sourceVideoId: string;
  requiredApiParts: readonly ['snippet'];
  requiresExactProviderPublishedAt: true;
  exactProviderPublishedAtPrefilled: false;
  requiresComplianceAttestation: true;
  liveCollectionAuthorized: false;
  collectionOwner: 'production-operations';
}>;

export const IU_ESTEE_LAUDER_AMBASSADOR_BINDING:
  BrandFitArtistBrandBinding = Object.freeze({
    contractVersion: BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION,
    canonicalArtistId: 'iu',
    canonicalBrandId: 'estee-lauder',
    relationshipType: 'ambassador',
    identityState: 'resolved',
    relationshipEvidence: Object.freeze({
      sourceType: 'official-company-press-release',
      sourceUrl:
        'https://www.elcompanies.com/en/news-and-media/newsroom/press-releases/2024/04-11-2024-120032323',
      announcedOn: '2024-04-11',
      lastCorroboratedOn: '2026-04-08',
    }),
  });

export const ESTEE_LAUDER_KOREA_YOUTUBE_BINDING:
  BrandFitBrandChannelBinding = Object.freeze({
    contractVersion: BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION,
    canonicalBrandId: 'estee-lauder',
    provider: 'youtube',
    providerChannelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
    providerChannelHandle: '@KREsteeLauder',
    identityState: 'resolved',
    sourceUrl:
      'https://www.youtube.com/channel/UCUeEq2B8Cx3Sdjj0Zva7uRA',
    reviewedOn: '2026-10-01',
  });

export const IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING:
  BrandFitCampaignBinding = Object.freeze({
    contractVersion: BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION,
    canonicalCampaignId: 'estee-lauder-korea-new-night-campaign-2025-iu',
    canonicalBrandId: 'estee-lauder',
    canonicalArtistId: 'iu',
    campaignLabel: 'NEW Night Campaign',
    identityState: 'resolved',
    evidence: Object.freeze({
      provider: 'youtube',
      providerChannelId:
        ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.providerChannelId,
      videoId: '39CUlBDuRSo',
      sourceUrl: 'https://www.youtube.com/watch?v=39CUlBDuRSo',
      sourceDate: '2025-08-03',
      sourceDatePrecision: 'day',
    }),
  });

export const IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN:
  BrandFitYouTubeCollectionPlan = Object.freeze({
    contractVersion: BRAND_FIT_IDENTITY_BINDING_CONTRACT_VERSION,
    planId: 'brand-fit:iu:estee-lauder:new-night-2025:youtube',
    provider: 'youtube-data-api',
    canonicalArtistId:
      IU_ESTEE_LAUDER_AMBASSADOR_BINDING.canonicalArtistId,
    canonicalBrandId:
      IU_ESTEE_LAUDER_AMBASSADOR_BINDING.canonicalBrandId,
    canonicalCampaignId:
      IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.canonicalCampaignId,
    providerChannelId:
      ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.providerChannelId,
    sourceVideoId:
      IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.evidence.videoId,
    requiredApiParts: Object.freeze(['snippet'] as const),
    requiresExactProviderPublishedAt: true,
    exactProviderPublishedAtPrefilled: false,
    requiresComplianceAttestation: true,
    liveCollectionAuthorized: false,
    collectionOwner: 'production-operations',
  });

export function validateBrandFitIdentityBindings(): readonly string[] {
  const issues: string[] = [];

  if (
    IU_ESTEE_LAUDER_AMBASSADOR_BINDING.canonicalBrandId
      !== ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.canonicalBrandId
  ) {
    issues.push('brand-channel-brand-mismatch');
  }

  if (
    IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.canonicalBrandId
      !== IU_ESTEE_LAUDER_AMBASSADOR_BINDING.canonicalBrandId
  ) {
    issues.push('campaign-brand-mismatch');
  }

  if (
    IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.canonicalArtistId
      !== IU_ESTEE_LAUDER_AMBASSADOR_BINDING.canonicalArtistId
  ) {
    issues.push('campaign-artist-mismatch');
  }

  if (
    IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.evidence.providerChannelId
      !== ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.providerChannelId
  ) {
    issues.push('campaign-channel-mismatch');
  }

  if (
    IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN.liveCollectionAuthorized
      !== false
  ) {
    issues.push('live-collection-must-remain-disabled');
  }

  if (
    IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN
      .exactProviderPublishedAtPrefilled !== false
  ) {
    issues.push('provider-published-at-must-not-be-prefilled');
  }

  return Object.freeze(
    [...new Set(issues)].sort((left, right) => left.localeCompare(right)),
  );
}
