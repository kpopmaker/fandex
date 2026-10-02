import {
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
} from './brandFitIdentityBindings';
import type {
  BrandFitYouTubeProviderObservation,
} from './brandFitProductionCollectionHandoff';

export const BRAND_FIT_YOUTUBE_API_REQUEST_CONTRACT_VERSION =
  'brand-fit-youtube-api-request-v1' as const;

export const BRAND_FIT_YOUTUBE_VIDEOS_ENDPOINT =
  'https://www.googleapis.com/youtube/v3/videos' as const;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const MAX_TITLE_BYTES = 4_096;
const MAX_DESCRIPTION_BYTES = 32_768;

export type BrandFitYouTubeApiRequestDescriptor = Readonly<{
  contractVersion: typeof BRAND_FIT_YOUTUBE_API_REQUEST_CONTRACT_VERSION;
  method: 'GET';
  endpoint: typeof BRAND_FIT_YOUTUBE_VIDEOS_ENDPOINT;
  query: Readonly<{
    part: 'snippet';
    id: string;
  }>;
  credentialTransport: 'query-key-injected-by-production-operations';
  credentialPersistedInPlan: false;
  responseFieldsRequired: readonly [
    'items[].id',
    'items[].snippet.channelId',
    'items[].snippet.title',
    'items[].snippet.description',
    'items[].snippet.publishedAt',
  ];
}>;

export type BrandFitYouTubeApiResponse = Readonly<{
  items?: readonly Readonly<{
    id?: unknown;
    snippet?: unknown;
  }>[];
}>;

export type BrandFitYouTubeApiObservationResult =
  | Readonly<{
      status: 'ok';
      contractVersion: typeof BRAND_FIT_YOUTUBE_API_REQUEST_CONTRACT_VERSION;
      observation: BrandFitYouTubeProviderObservation;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion: typeof BRAND_FIT_YOUTUBE_API_REQUEST_CONTRACT_VERSION;
      reason:
        | 'response-shape-invalid'
        | 'video-not-unique'
        | 'video-id-mismatch'
        | 'channel-id-invalid'
        | 'metadata-invalid'
        | 'published-at-invalid'
        | 'collection-time-invalid';
    }>;

function blocked(
  reason: Extract<
    BrandFitYouTubeApiObservationResult,
    { status: 'blocked' }
  >['reason'],
): BrandFitYouTubeApiObservationResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion: BRAND_FIT_YOUTUBE_API_REQUEST_CONTRACT_VERSION,
    reason,
  });
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function exactIso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const normalized = new Date(parsed).toISOString();
  return normalized === value || normalized.replace('.000Z', 'Z') === value;
}

export function buildBrandFitYouTubeApiRequestDescriptor():
  BrandFitYouTubeApiRequestDescriptor {
  const plan = IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN;
  return Object.freeze({
    contractVersion: BRAND_FIT_YOUTUBE_API_REQUEST_CONTRACT_VERSION,
    method: 'GET' as const,
    endpoint: BRAND_FIT_YOUTUBE_VIDEOS_ENDPOINT,
    query: Object.freeze({
      part: 'snippet' as const,
      id: plan.sourceVideoId,
    }),
    credentialTransport:
      'query-key-injected-by-production-operations' as const,
    credentialPersistedInPlan: false as const,
    responseFieldsRequired: Object.freeze([
      'items[].id',
      'items[].snippet.channelId',
      'items[].snippet.title',
      'items[].snippet.description',
      'items[].snippet.publishedAt',
    ] as const),
  });
}

export function parseBrandFitYouTubeApiObservation(
  response: unknown,
  collectedAt: string,
): BrandFitYouTubeApiObservationResult {
  if (
    !response
    || typeof response !== 'object'
    || Array.isArray(response)
  ) {
    return blocked('response-shape-invalid');
  }

  const value = response as BrandFitYouTubeApiResponse;
  if (!Array.isArray(value.items)) {
    return blocked('response-shape-invalid');
  }
  if (value.items.length !== 1) {
    return blocked('video-not-unique');
  }

  const item = value.items[0];
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return blocked('response-shape-invalid');
  }
  if (
    typeof item.id !== 'string'
    || !VIDEO_ID.test(item.id)
    || item.id
      !== IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN.sourceVideoId
  ) {
    return blocked('video-id-mismatch');
  }

  if (
    !item.snippet
    || typeof item.snippet !== 'object'
    || Array.isArray(item.snippet)
  ) {
    return blocked('response-shape-invalid');
  }

  const snippet = item.snippet as Record<string, unknown>;
  if (
    typeof snippet.channelId !== 'string'
    || !CHANNEL_ID.test(snippet.channelId)
  ) {
    return blocked('channel-id-invalid');
  }

  if (
    typeof snippet.title !== 'string'
    || byteLength(snippet.title) > MAX_TITLE_BYTES
    || typeof snippet.description !== 'string'
    || byteLength(snippet.description) > MAX_DESCRIPTION_BYTES
  ) {
    return blocked('metadata-invalid');
  }

  if (!exactIso(snippet.publishedAt)) {
    return blocked('published-at-invalid');
  }
  if (!exactIso(collectedAt)) {
    return blocked('collection-time-invalid');
  }
  if (Date.parse(collectedAt) < Date.parse(snippet.publishedAt)) {
    return blocked('collection-time-invalid');
  }

  return Object.freeze({
    status: 'ok' as const,
    contractVersion: BRAND_FIT_YOUTUBE_API_REQUEST_CONTRACT_VERSION,
    observation: Object.freeze({
      provider: 'youtube-data-api' as const,
      videoId: item.id,
      channelId: snippet.channelId,
      title: snippet.title,
      description: snippet.description,
      publishedAt: snippet.publishedAt,
      collectedAt,
    }),
  });
}
