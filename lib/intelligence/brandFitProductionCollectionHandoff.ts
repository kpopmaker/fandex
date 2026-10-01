import {
  ESTEE_LAUDER_KOREA_YOUTUBE_BINDING,
  IU_ESTEE_LAUDER_AMBASSADOR_BINDING,
  IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING,
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
  type BrandFitYouTubeCollectionPlan,
} from './brandFitIdentityBindings';
import {
  adaptOfficialBrandYouTubeVideo,
  type BrandFitYouTubeAdapterResult,
} from './brandFitYouTubeSourceAdapter';
import type {
  BrandFitYouTubeComplianceControls,
} from './brandFitSourceQualification';

export const BRAND_FIT_PRODUCTION_COLLECTION_HANDOFF_VERSION =
  'brand-fit-production-collection-handoff-v1' as const;

export type BrandFitYouTubeProviderObservation = Readonly<{
  provider: 'youtube-data-api';
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  publishedAt: string;
  collectedAt: string;
}>;

export type BrandFitCollectionHandoffInput = Readonly<{
  executionOwner: 'production-operations';
  plan: BrandFitYouTubeCollectionPlan;
  compliance: BrandFitYouTubeComplianceControls;
  providerObservation: BrandFitYouTubeProviderObservation;
}>;

export type BrandFitCollectionHandoffResult =
  | Readonly<{
      status: 'eligible-for-stored-evidence-review';
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_COLLECTION_HANDOFF_VERSION;
      adapterResult: Extract<BrandFitYouTubeAdapterResult, { status: 'ok' }>;
      databaseWriteAuthorized: false;
      productActivationAuthorized: false;
      rawProviderPayloadRetentionAuthorized: false;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_COLLECTION_HANDOFF_VERSION;
      reason:
        | 'collection-plan-mismatch'
        | 'provider-observation-mismatch'
        | 'provider-time-invalid'
        | 'adapter-rejected';
      databaseWriteAuthorized: false;
      productActivationAuthorized: false;
      rawProviderPayloadRetentionAuthorized: false;
    }>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const normalized = new Date(parsed).toISOString();
  return normalized === value || normalized.replace('.000Z', 'Z') === value;
}

function blocked(
  reason: Extract<BrandFitCollectionHandoffResult, { status: 'blocked' }>['reason'],
): BrandFitCollectionHandoffResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion: BRAND_FIT_PRODUCTION_COLLECTION_HANDOFF_VERSION,
    reason,
    databaseWriteAuthorized: false as const,
    productActivationAuthorized: false as const,
    rawProviderPayloadRetentionAuthorized: false as const,
  });
}

function planMatches(
  plan: BrandFitYouTubeCollectionPlan,
): boolean {
  const expected = IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN;
  return (
    plan.contractVersion === expected.contractVersion
    && plan.planId === expected.planId
    && plan.provider === 'youtube-data-api'
    && plan.canonicalArtistId === expected.canonicalArtistId
    && plan.canonicalBrandId === expected.canonicalBrandId
    && plan.canonicalCampaignId === expected.canonicalCampaignId
    && plan.providerChannelId === expected.providerChannelId
    && plan.sourceVideoId === expected.sourceVideoId
    && plan.requiresExactProviderPublishedAt === true
    && plan.exactProviderPublishedAtPrefilled === false
    && plan.requiresComplianceAttestation === true
    && plan.liveCollectionAuthorized === false
    && plan.collectionOwner === 'production-operations'
  );
}

export function prepareBrandFitYouTubeEvidenceCandidate(
  input: BrandFitCollectionHandoffInput,
): BrandFitCollectionHandoffResult {
  if (!planMatches(input.plan)) {
    return blocked('collection-plan-mismatch');
  }

  const observation = input.providerObservation;
  if (
    observation.provider !== 'youtube-data-api'
    || observation.videoId !== input.plan.sourceVideoId
    || observation.channelId !== input.plan.providerChannelId
  ) {
    return blocked('provider-observation-mismatch');
  }

  if (
    !exactIso(observation.publishedAt)
    || !exactIso(observation.collectedAt)
    || Date.parse(observation.collectedAt) < Date.parse(observation.publishedAt)
  ) {
    return blocked('provider-time-invalid');
  }

  const adapterResult = adaptOfficialBrandYouTubeVideo({
    controls: input.compliance,
    officialBrandChannel: {
      canonicalBrandId:
        ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.canonicalBrandId,
      providerChannelId:
        ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.providerChannelId,
      identityState:
        ESTEE_LAUDER_KOREA_YOUTUBE_BINDING.identityState,
    },
    artist: {
      canonicalArtistId:
        IU_ESTEE_LAUDER_AMBASSADOR_BINDING.canonicalArtistId,
      aliases: ['IU', '아이유'],
      identityState:
        IU_ESTEE_LAUDER_AMBASSADOR_BINDING.identityState,
    },
    canonicalCampaignId:
      IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING.canonicalCampaignId,
    video: {
      videoId: observation.videoId,
      channelId: observation.channelId,
      title: observation.title,
      description: observation.description,
      publishedAt: observation.publishedAt,
      collectedAt: observation.collectedAt,
    },
  });

  if (adapterResult.status !== 'ok') {
    return blocked('adapter-rejected');
  }

  return Object.freeze({
    status: 'eligible-for-stored-evidence-review' as const,
    contractVersion: BRAND_FIT_PRODUCTION_COLLECTION_HANDOFF_VERSION,
    adapterResult,
    databaseWriteAuthorized: false as const,
    productActivationAuthorized: false as const,
    rawProviderPayloadRetentionAuthorized: false as const,
  });
}
