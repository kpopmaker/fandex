import type {
  ProductActivityExposureEvent,
  ProductActivityExposureProviderCoverage,
} from '../../product/contracts/productActivityExposure';
import { canonicalJson } from '../../shared/canonicalDigest';
import {
  createActivityExposureProviderObservation,
  type ActivityExposureProviderObservation,
} from './activityExposureContracts';

export const YOUTUBE_ACTIVITY_EXPOSURE_CHANNELS_URL =
  'https://www.googleapis.com/youtube/v3/channels';
export const YOUTUBE_ACTIVITY_EXPOSURE_PLAYLIST_ITEMS_URL =
  'https://www.googleapis.com/youtube/v3/playlistItems';
export const YOUTUBE_ACTIVITY_EXPOSURE_VIDEOS_URL =
  'https://www.googleapis.com/youtube/v3/videos';
export const YOUTUBE_ACTIVITY_EXPOSURE_TIMEOUT_MS = 10_000;
export const YOUTUBE_ACTIVITY_EXPOSURE_PAGE_SIZE = 50;

const MAX_RESPONSE_BYTES = 2_500_000;
const MAX_TITLE_BYTES = 4_096;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeActivityExposureFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type YouTubeActivityExposureCollectorOptions = Readonly<{
  apiKey: string;
  fetch?: YouTubeActivityExposureFetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
}>;

type YouTubeActivityExposureChannelResponse = Readonly<{
  items: readonly Readonly<{
    id: string;
    contentDetails?: Readonly<{
      relatedPlaylists?: Readonly<{ uploads?: string }>;
    }>;
  }>[];
}>;

type YouTubeActivityExposurePlaylistItemsResponse = Readonly<{
  nextPageToken?: string;
  items: readonly Readonly<{
    contentDetails?: Readonly<{ videoId?: string }>;
  }>[];
}>;

type YouTubeActivityExposureVideosResponse = Readonly<{
  items: readonly Readonly<{
    id: string;
    snippet?: Readonly<{
      channelId?: string;
      title?: string;
      publishedAt?: string;
    }>;
  }>[];
}>;

export type YouTubeActivityExposureCollection = Readonly<{
  artistId: string;
  providerArtistId: string;
  uploadsPlaylistId: string;
  collectedAt: string;
  playlistVideoIds: readonly string[];
  resolvedVideoIds: readonly string[];
  unavailableVideoIds: readonly string[];
  channelMismatchVideoIds: readonly string[];
  rawObservations: readonly ActivityExposureProviderObservation[];
  events: readonly ProductActivityExposureEvent[];
  providerCoverage: ProductActivityExposureProviderCoverage;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function byteLength(value: string) {
  return Buffer.byteLength(value, 'utf8');
}

function requireApiKey(value: string) {
  if (
    !value
    || value !== value.trim()
    || value.length > 512
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    fail('youtube_activity_exposure_config_invalid');
  }
}

function validatePublishedAt(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    return fail('youtube_activity_exposure_response_invalid');
  }
  const normalized = new Date(value).toISOString();
  if (normalized !== value && normalized.replace('.000Z', 'Z') !== value) {
    return fail('youtube_activity_exposure_response_invalid');
  }
  return value;
}

function validateChannelResponse(
  value: unknown,
  expectedChannelId: string,
): YouTubeActivityExposureChannelResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('youtube_activity_exposure_response_invalid');
  }
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items) || response.items.length !== 1) {
    return fail('youtube_activity_exposure_channel_not_unique');
  }
  const channel = response.items[0] as Record<string, unknown>;
  if (channel.id !== expectedChannelId) {
    return fail('youtube_activity_exposure_channel_mismatch');
  }
  const contentDetails =
    channel.contentDetails as Record<string, unknown> | undefined;
  const related =
    contentDetails?.relatedPlaylists as Record<string, unknown> | undefined;
  const uploads = related?.uploads;
  if (typeof uploads !== 'string' || uploads.length === 0) {
    return fail('youtube_activity_exposure_uploads_playlist_missing');
  }
  return response as YouTubeActivityExposureChannelResponse;
}

function validatePlaylistItemsResponse(
  value: unknown,
): YouTubeActivityExposurePlaylistItemsResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('youtube_activity_exposure_response_invalid');
  }
  const response = value as Record<string, unknown>;
  if (
    !Array.isArray(response.items)
    || response.items.length > YOUTUBE_ACTIVITY_EXPOSURE_PAGE_SIZE
  ) {
    return fail('youtube_activity_exposure_response_invalid');
  }
  if (
    response.nextPageToken !== undefined
    && typeof response.nextPageToken !== 'string'
  ) {
    return fail('youtube_activity_exposure_response_invalid');
  }
  for (const item of response.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return fail('youtube_activity_exposure_response_invalid');
    }
    const contentDetails =
      (item as Record<string, unknown>).contentDetails;
    const videoId =
      contentDetails
      && typeof contentDetails === 'object'
      && !Array.isArray(contentDetails)
        ? (contentDetails as Record<string, unknown>).videoId
        : undefined;
    if (typeof videoId !== 'string' || !VIDEO_ID.test(videoId)) {
      return fail('youtube_activity_exposure_response_invalid');
    }
  }
  return response as YouTubeActivityExposurePlaylistItemsResponse;
}

function validateVideosResponse(
  value: unknown,
): YouTubeActivityExposureVideosResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('youtube_activity_exposure_response_invalid');
  }
  const response = value as Record<string, unknown>;
  if (
    !Array.isArray(response.items)
    || response.items.length > YOUTUBE_ACTIVITY_EXPOSURE_PAGE_SIZE
  ) {
    return fail('youtube_activity_exposure_response_invalid');
  }

  for (const item of response.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return fail('youtube_activity_exposure_response_invalid');
    }
    const video = item as Record<string, unknown>;
    if (typeof video.id !== 'string' || !VIDEO_ID.test(video.id)) {
      return fail('youtube_activity_exposure_response_invalid');
    }
    if (
      !video.snippet
      || typeof video.snippet !== 'object'
      || Array.isArray(video.snippet)
    ) {
      return fail('youtube_activity_exposure_response_invalid');
    }
    const snippet = video.snippet as Record<string, unknown>;
    if (
      typeof snippet.channelId !== 'string'
      || !CHANNEL_ID.test(snippet.channelId)
    ) {
      return fail('youtube_activity_exposure_response_invalid');
    }
    if (
      typeof snippet.title !== 'string'
      || byteLength(snippet.title) > MAX_TITLE_BYTES
    ) {
      return fail('youtube_activity_exposure_response_invalid');
    }
    validatePublishedAt(snippet.publishedAt);
  }

  return response as YouTubeActivityExposureVideosResponse;
}

function buildOfficialVideoEvent(input: Readonly<{
  artistId: string;
  channelId: string;
  collectedAt: string;
  video: YouTubeActivityExposureVideosResponse['items'][number];
}>): ProductActivityExposureEvent | null {
  const snippet = input.video.snippet;
  if (!snippet || snippet.channelId !== input.channelId) return null;

  const publishedAt = validatePublishedAt(snippet.publishedAt);
  return Object.freeze({
    artistId: input.artistId,
    eventId: `activity:youtube:video:${input.video.id}`,
    eventFamily: 'official_content' as const,
    eventType: 'official_video_publication' as const,
    lifecycleState: 'observed' as const,
    participationScope: 'solo' as const,
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt: publishedAt,
    occurredAtPrecision: 'timestamp' as const,
    sourcePublishedAt: publishedAt,
    collectedAt: input.collectedAt,
    sourceProvider: 'youtube' as const,
    sourceEntityType: 'video' as const,
    sourceEntityId: input.video.id,
    canonicalFamilyId: null,
    providerArtistId: input.channelId,
    providerArtistCredits: Object.freeze([
      Object.freeze({
        providerArtistId: input.channelId,
        creditedName: null,
        canonicalProviderName: null,
      }),
    ]),
    evidenceRef: `https://www.youtube.com/watch?v=${input.video.id}`,
    identityState: 'resolved',
    missingState: 'covered' as const,
    evidenceState: 'direct_provider_evidence',
    conflictState: 'clear',
    timeZoneState: 'provider_iso8601_timestamp',
    revisionId: `collection:${input.collectedAt}`,
    supersedesRevisionId: null,
  });
}

export function createYouTubeActivityExposureCollector(
  options: YouTubeActivityExposureCollectorOptions,
) {
  requireApiKey(options.apiKey);
  const externalFetch = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMilliseconds =
    options.timeoutMilliseconds ?? YOUTUBE_ACTIVITY_EXPOSURE_TIMEOUT_MS;

  async function fetchJson(url: URL): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
    try {
      const response = await externalFetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) fail('youtube_activity_exposure_http_failed');

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        fail('youtube_activity_exposure_response_invalid');
      }

      const declaredLength = response.headers.get('content-length');
      if (declaredLength && Number(declaredLength) > MAX_RESPONSE_BYTES) {
        fail('youtube_activity_exposure_response_invalid');
      }

      const body = await response.text();
      if (byteLength(body) > MAX_RESPONSE_BYTES) {
        fail('youtube_activity_exposure_response_invalid');
      }

      try {
        return JSON.parse(body);
      } catch {
        return fail('youtube_activity_exposure_response_invalid');
      }
    } catch (error) {
      if (
        error instanceof Error
        && error.message.startsWith('youtube_activity_exposure_')
      ) {
        throw error;
      }
      return fail('youtube_activity_exposure_request_failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchChannel(channelId: string) {
    if (!CHANNEL_ID.test(channelId)) {
      fail('youtube_activity_exposure_channel_id_invalid');
    }

    const url = new URL(YOUTUBE_ACTIVITY_EXPOSURE_CHANNELS_URL);
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', options.apiKey);

    return validateChannelResponse(await fetchJson(url), channelId);
  }

  async function fetchAllUploadVideoIds(uploadsPlaylistId: string) {
    const videoIds: string[] = [];
    let pageToken: string | undefined;
    const seenPageTokens = new Set<string>();

    do {
      const url = new URL(YOUTUBE_ACTIVITY_EXPOSURE_PLAYLIST_ITEMS_URL);
      url.searchParams.set('part', 'contentDetails');
      url.searchParams.set('playlistId', uploadsPlaylistId);
      url.searchParams.set(
        'maxResults',
        String(YOUTUBE_ACTIVITY_EXPOSURE_PAGE_SIZE),
      );
      url.searchParams.set('key', options.apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const page = validatePlaylistItemsResponse(await fetchJson(url));
      for (const item of page.items) {
        const videoId = item.contentDetails!.videoId!;
        if (!videoIds.includes(videoId)) videoIds.push(videoId);
      }

      const next = page.nextPageToken;
      if (next) {
        if (seenPageTokens.has(next)) {
          fail('youtube_activity_exposure_pagination_cycle');
        }
        seenPageTokens.add(next);
      }
      pageToken = next;
    } while (pageToken);

    return videoIds;
  }

  async function fetchVideos(videoIds: readonly string[]) {
    const videos: YouTubeActivityExposureVideosResponse['items'][number][] = [];

    for (
      let index = 0;
      index < videoIds.length;
      index += YOUTUBE_ACTIVITY_EXPOSURE_PAGE_SIZE
    ) {
      const batch = videoIds.slice(
        index,
        index + YOUTUBE_ACTIVITY_EXPOSURE_PAGE_SIZE,
      );
      const url = new URL(YOUTUBE_ACTIVITY_EXPOSURE_VIDEOS_URL);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('id', batch.join(','));
      url.searchParams.set('key', options.apiKey);
      const response = validateVideosResponse(await fetchJson(url));
      videos.push(...response.items);
    }

    return videos;
  }

  return Object.freeze({
    async collect(input: Readonly<{
      artistId: string;
      providerArtistId: string;
    }>): Promise<YouTubeActivityExposureCollection> {
      const collectedAt = now().toISOString();
      if (!Number.isFinite(Date.parse(collectedAt))) {
        fail('youtube_activity_exposure_clock_invalid');
      }

      const channelResponse = await fetchChannel(input.providerArtistId);
      const channel = channelResponse.items[0];
      const uploadsPlaylistId =
        channel.contentDetails!.relatedPlaylists!.uploads!;
      const playlistVideoIds =
        await fetchAllUploadVideoIds(uploadsPlaylistId);
      const videos = await fetchVideos(playlistVideoIds);
      const resolvedVideoIds = videos.map((video) => video.id);
      const resolvedSet = new Set(resolvedVideoIds);
      const unavailableVideoIds = playlistVideoIds.filter(
        (videoId) => !resolvedSet.has(videoId),
      );

      const rawObservations: ActivityExposureProviderObservation[] = [];
      rawObservations.push(createActivityExposureProviderObservation({
        artistId: input.artistId,
        sourceProvider: 'youtube',
        providerArtistId: input.providerArtistId,
        sourceEntityType: 'channel',
        sourceEntityId: input.providerArtistId,
        requestRef:
          `youtube:channels:contentDetails:${input.providerArtistId}`,
        responseCapturedAt: collectedAt,
        collectedAt,
        rawPayloadCanonical: canonicalJson({
          provider: 'youtube',
          kind: 'channel-content-details',
          channel,
        }),
        rawPayloadRetentionState: 'digest-only',
        retentionPolicyVersion: 'youtube-non-authorized-data-v1',
        evidenceRef:
          `https://www.youtube.com/channel/${input.providerArtistId}`,
        authorizationState: 'review-required',
        normalizedEventIds: [],
      }));

      const events: ProductActivityExposureEvent[] = [];
      const channelMismatchVideoIds: string[] = [];
      const seenVideoIds = new Set<string>();

      for (const video of videos) {
        if (seenVideoIds.has(video.id)) continue;
        seenVideoIds.add(video.id);

        const event = buildOfficialVideoEvent({
          artistId: input.artistId,
          channelId: input.providerArtistId,
          collectedAt,
          video,
        });

        if (!event) channelMismatchVideoIds.push(video.id);

        rawObservations.push(createActivityExposureProviderObservation({
          artistId: input.artistId,
          sourceProvider: 'youtube',
          providerArtistId: input.providerArtistId,
          sourceEntityType: 'video',
          sourceEntityId: video.id,
          requestRef: `youtube:videos:snippet:${video.id}`,
          responseCapturedAt: collectedAt,
          collectedAt,
          sourcePublishedAt: video.snippet?.publishedAt ?? null,
          providerObservedAt: video.snippet?.publishedAt ?? null,
          rawPayloadCanonical: canonicalJson({
            provider: 'youtube',
            kind: 'video',
            video,
          }),
          rawPayloadRetentionState: 'digest-only',
          retentionPolicyVersion: 'youtube-non-authorized-data-v1',
          evidenceRef:
            `https://www.youtube.com/watch?v=${video.id}`,
          authorizationState: 'review-required',
          normalizedEventIds: event ? [event.eventId] : [],
        }));

        if (event) events.push(event);
      }

      for (const videoId of unavailableVideoIds) {
        rawObservations.push(createActivityExposureProviderObservation({
          artistId: input.artistId,
          sourceProvider: 'youtube',
          providerArtistId: input.providerArtistId,
          sourceEntityType: 'video',
          sourceEntityId: videoId,
          requestRef: `youtube:videos:snippet:${videoId}`,
          responseCapturedAt: collectedAt,
          collectedAt,
          rawPayloadCanonical: canonicalJson({
            provider: 'youtube',
            kind: 'video-unresolved',
            videoId,
          }),
          rawPayloadRetentionState: 'digest-only',
          retentionPolicyVersion: 'youtube-non-authorized-data-v1',
          evidenceRef:
            `https://www.youtube.com/watch?v=${videoId}`,
          authorizationState: 'review-required',
          normalizedEventIds: [],
        }));
      }

      const partial =
        unavailableVideoIds.length > 0
        || channelMismatchVideoIds.length > 0;

      const providerCoverage = Object.freeze({
        provider: 'youtube' as const,
        providerArtistId: input.providerArtistId,
        collectionStatus: partial ? 'bounded_partial' as const : 'succeeded' as const,
        coverageState: partial ? 'partial' as const : 'covered' as const,
        collectedAt,
      });

      return Object.freeze({
        artistId: input.artistId,
        providerArtistId: input.providerArtistId,
        uploadsPlaylistId,
        collectedAt,
        playlistVideoIds: Object.freeze(playlistVideoIds),
        resolvedVideoIds: Object.freeze(resolvedVideoIds),
        unavailableVideoIds: Object.freeze(unavailableVideoIds),
        channelMismatchVideoIds: Object.freeze(channelMismatchVideoIds),
        rawObservations: Object.freeze(rawObservations),
        events: Object.freeze(events),
        providerCoverage,
      });
    },
  });
}
