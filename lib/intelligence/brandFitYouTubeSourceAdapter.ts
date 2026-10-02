import {
  adaptBrandFitPartnershipEvidence,
  type BrandFitPartnershipEvidence,
} from './brandFitPointConstruct';
import {
  evaluateYouTubeBrandSourceCollectionEligibility,
  type BrandFitYouTubeComplianceControls,
} from './brandFitSourceQualification';

export const BRAND_FIT_YOUTUBE_SOURCE_ADAPTER_CONTRACT_VERSION =
  'brand-fit-youtube-source-adapter-v1' as const;

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type BrandFitYouTubeVideoInput = Readonly<{
  controls: BrandFitYouTubeComplianceControls;
  officialBrandChannel: Readonly<{
    canonicalBrandId: string;
    providerChannelId: string;
    identityState: 'resolved' | 'unresolved' | 'conflict';
  }>;
  artist: Readonly<{
    canonicalArtistId: string;
    aliases: readonly string[];
    identityState: 'resolved' | 'unresolved' | 'conflict';
  }>;
  canonicalCampaignId: string | null;
  video: Readonly<{
    videoId: string;
    channelId: string;
    title: string;
    description: string;
    publishedAt: string;
    collectedAt: string;
  }>;
}>;

export type BrandFitYouTubeAdapterResult =
  | Readonly<{
      status: 'ok';
      contractVersion:
        typeof BRAND_FIT_YOUTUBE_SOURCE_ADAPTER_CONTRACT_VERSION;
      evidence: BrandFitPartnershipEvidence;
      rawMetadataRetention: 'refresh-or-delete-within-30-days';
      rawTitleStoredInEvidence: false;
      rawDescriptionStoredInEvidence: false;
    }>
  | Readonly<{
      status: 'unsupported';
      contractVersion:
        typeof BRAND_FIT_YOUTUBE_SOURCE_ADAPTER_CONTRACT_VERSION;
      reason:
        | 'provider-compliance-blocked'
        | 'brand-channel-identity-unresolved'
        | 'brand-channel-identity-conflict'
        | 'artist-identity-unresolved'
        | 'artist-identity-conflict'
        | 'source-channel-mismatch'
        | 'source-id-invalid'
        | 'artist-not-explicitly-mentioned'
        | 'relationship-not-explicit'
        | 'campaign-identity-required'
        | 'evidence-contract-rejected';
    }>;

function unsupported(
  reason: Extract<BrandFitYouTubeAdapterResult, { status: 'unsupported' }>['reason'],
): BrandFitYouTubeAdapterResult {
  return Object.freeze({
    status: 'unsupported' as const,
    contractVersion: BRAND_FIT_YOUTUBE_SOURCE_ADAPTER_CONTRACT_VERSION,
    reason,
  });
}

function normalizedText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

function textContainsAlias(text: string, alias: string): boolean {
  const candidate = normalizedText(alias).trim();
  if (!candidate) return false;

  if (/^[a-z0-9]+$/.test(candidate)) {
    return text
      .split(/[^a-z0-9]+/)
      .some((token) => token === candidate);
  }

  return text.includes(candidate);
}

function classifyExplicitRelationship(
  text: string,
): Readonly<{
  eventType:
    | 'relationship-announced'
    | 'campaign-appearance'
    | 'collaboration-released';
  relationshipType:
    | 'ambassador'
    | 'campaign-participant'
    | 'collaboration';
  campaignRequired: boolean;
}> | null {
  if (/\bambassador\b/i.test(text) || text.includes('앰버서더')) {
    return Object.freeze({
      eventType: 'relationship-announced' as const,
      relationshipType: 'ambassador' as const,
      campaignRequired: false,
    });
  }

  if (/\bcampaign\b/i.test(text) || text.includes('캠페인')) {
    return Object.freeze({
      eventType: 'campaign-appearance' as const,
      relationshipType: 'campaign-participant' as const,
      campaignRequired: true,
    });
  }

  if (
    /\bcollaboration\b/i.test(text)
    || /\bcollab\b/i.test(text)
    || text.includes('콜라보')
  ) {
    return Object.freeze({
      eventType: 'collaboration-released' as const,
      relationshipType: 'collaboration' as const,
      campaignRequired: true,
    });
  }

  return null;
}

export function adaptOfficialBrandYouTubeVideo(
  input: BrandFitYouTubeVideoInput,
): BrandFitYouTubeAdapterResult {
  const eligibility = evaluateYouTubeBrandSourceCollectionEligibility(
    input.controls,
  );
  if (eligibility.status !== 'eligible-for-brand-adapter') {
    return unsupported('provider-compliance-blocked');
  }

  if (input.officialBrandChannel.identityState === 'conflict') {
    return unsupported('brand-channel-identity-conflict');
  }
  if (
    input.officialBrandChannel.identityState !== 'resolved'
    || input.officialBrandChannel.canonicalBrandId.trim() === ''
    || !CHANNEL_ID.test(input.officialBrandChannel.providerChannelId)
  ) {
    return unsupported('brand-channel-identity-unresolved');
  }

  if (input.artist.identityState === 'conflict') {
    return unsupported('artist-identity-conflict');
  }
  if (
    input.artist.identityState !== 'resolved'
    || input.artist.canonicalArtistId.trim() === ''
    || input.artist.aliases.length === 0
  ) {
    return unsupported('artist-identity-unresolved');
  }

  if (
    !VIDEO_ID.test(input.video.videoId)
    || !CHANNEL_ID.test(input.video.channelId)
  ) {
    return unsupported('source-id-invalid');
  }
  if (
    input.video.channelId !== input.officialBrandChannel.providerChannelId
  ) {
    return unsupported('source-channel-mismatch');
  }

  const text = normalizedText(
    input.video.title + '\n' + input.video.description,
  );
  if (
    !input.artist.aliases.some((alias) => textContainsAlias(text, alias))
  ) {
    return unsupported('artist-not-explicitly-mentioned');
  }

  const relationship = classifyExplicitRelationship(text);
  if (relationship === null) {
    return unsupported('relationship-not-explicit');
  }
  if (
    relationship.campaignRequired
    && (
      input.canonicalCampaignId === null
      || input.canonicalCampaignId.trim() === ''
    )
  ) {
    return unsupported('campaign-identity-required');
  }

  const adapted = adaptBrandFitPartnershipEvidence({
    eventId: 'brand-fit:youtube:' + input.video.videoId,
    eventType: relationship.eventType,
    relationshipType: relationship.relationshipType,
    explicitRelationshipClaim: true,
    identity: {
      canonicalArtistId: input.artist.canonicalArtistId,
      canonicalBrandId: input.officialBrandChannel.canonicalBrandId,
      canonicalCampaignId: input.canonicalCampaignId,
      identityState: 'resolved',
    },
    source: {
      family: 'official-brand-youtube-video',
      reliability: 'primary-official',
      sourceUrl:
        'https://www.youtube.com/watch?v=' + input.video.videoId,
      sourcePublishedAt: input.video.publishedAt,
      rightsState: 'restricted',
    },
    time: {
      activityStartAt: input.video.publishedAt,
      activityEndAt: null,
      collectedAt: input.video.collectedAt,
    },
    revision: {
      revisionId:
        'youtube:' + input.video.videoId + ':' + input.video.collectedAt,
      supersedesRevisionId: null,
    },
  });

  if (adapted.status !== 'ok') {
    return unsupported('evidence-contract-rejected');
  }

  return Object.freeze({
    status: 'ok' as const,
    contractVersion: BRAND_FIT_YOUTUBE_SOURCE_ADAPTER_CONTRACT_VERSION,
    evidence: adapted.evidence,
    rawMetadataRetention: 'refresh-or-delete-within-30-days' as const,
    rawTitleStoredInEvidence: false as const,
    rawDescriptionStoredInEvidence: false as const,
  });
}
