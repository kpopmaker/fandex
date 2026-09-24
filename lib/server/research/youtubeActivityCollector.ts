import {
  createActivityExposureRawObservation,
  type ActivityExposureRawObservation,
} from '../../research/activityExposureObservation';
import {
  validateActivityExposureStream,
  type ActivityExposureEvent,
} from '../../research/activityExposure';

export const YOUTUBE_ACTIVITY_CHANNELS_URL =
  'https://www.googleapis.com/youtube/v3/channels';
export const YOUTUBE_ACTIVITY_PLAYLIST_ITEMS_URL =
  'https://www.googleapis.com/youtube/v3/playlistItems';
export const YOUTUBE_ACTIVITY_VIDEOS_URL =
  'https://www.googleapis.com/youtube/v3/videos';
export const YOUTUBE_ACTIVITY_TIMEOUT_MS = 10_000;
export const YOUTUBE_ACTIVITY_PAGE_SIZE = 50;

const MAX_RESPONSE_BYTES = 2_500_000;
const MAX_TITLE_BYTES = 4_096;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeActivityFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type YouTubeActivityCollectorOptions = Readonly<{
  apiKey: string;
  fetch?: YouTubeActivityFetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
}>;

type YouTubeChannelResponse = Readonly<{
  items: readonly Readonly<{
    id: string;
    contentDetails?: Readonly<{
      relatedPlaylists?: Readonly<{ uploads?: string }>;
    }>;
  }>[];
}>;

type YouTubePlaylistItemsResponse = Readonly<{
  nextPageToken?: string;
  items: readonly Readonly<{
    contentDetails?: Readonly<{ videoId?: string }>;
  }>[];
}>;

type YouTubeVideosResponse = Readonly<{
  items: readonly Readonly<{
    id: string;
    snippet?: Readonly<{
      channelId?: string;
      title?: string;
      publishedAt?: string;
    }>;
  }>[];
}>;

export type YouTubeActivityCollection = Readonly<{
  artistId: string;
  providerArtistId: string;
  uploadsPlaylistId: string;
  collectedAt: string;
  rawObservations: readonly ActivityExposureRawObservation[];
  events: readonly ActivityExposureEvent[];
  validationIssues: readonly ReturnType<typeof validateActivityExposureStream>[number][];
}>;

function fail(code: string): never {
  throw new Error(code);
}

function byteLength(value: string) {
  return Buffer.byteLength(value, 'utf8');
}

function requireApiKey(value: string) {
  if (!value || value !== value.trim() || value.length > 512 || /[\u0000-\u001f\u007f]/.test(value)) {
    fail('youtube_activity_config_invalid');
  }
}

function validatePublishedAt(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    return fail('youtube_activity_response_invalid');
  }
  const normalized = new Date(value).toISOString();
  if (normalized !== value && normalized.replace('.000Z', 'Z') !== value) {
    return fail('youtube_activity_response_invalid');
  }
  return value;
}

function validateChannelResponse(
  value: unknown,
  expectedChannelId: string,
): YouTubeChannelResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('youtube_activity_response_invalid');
  }
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items) || response.items.length !== 1) {
    return fail('youtube_activity_channel_not_unique');
  }
  const channel = response.items[0] as Record<string, unknown>;
  if (channel.id !== expectedChannelId) {
    return fail('youtube_activity_channel_mismatch');
  }
  const contentDetails = channel.contentDetails as Record<string, unknown> | undefined;
  const related = contentDetails?.relatedPlaylists as Record<string, unknown> | undefined;
  const uploads = related?.uploads;
  if (typeof uploads !== 'string' || uploads.length === 0) {
    return fail('youtube_activity_uploads_playlist_missing');
  }
  return response as YouTubeChannelResponse;
}

function validatePlaylistItemsResponse(value: unknown): YouTubePlaylistItemsResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('youtube_activity_response_invalid');
  }
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items) || response.items.length > YOUTUBE_ACTIVITY_PAGE_SIZE) {
    return fail('youtube_activity_response_invalid');
  }
  if (
    response.nextPageToken !== undefined
    && typeof response.nextPageToken !== 'string'
  ) {
    return fail('youtube_activity_response_invalid');
  }
  for (const item of response.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return fail('youtube_activity_response_invalid');
    }
    const videoId = (item as Record<string, unknown>).contentDetails
      && ((item as Record<string, unknown>).contentDetails as Record<string, unknown>).videoId;
    if (typeof videoId !== 'string' || !VIDEO_ID.test(videoId)) {
      return fail('youtube_activity_response_invalid');
    }
  }
  return response as YouTubePlaylistItemsResponse;
}

function validateVideosResponse(value: unknown): YouTubeVideosResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('youtube_activity_response_invalid');
  }
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items) || response.items.length > YOUTUBE_ACTIVITY_PAGE_SIZE) {
    return fail('youtube_activity_response_invalid');
  }
  for (const item of response.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return fail('youtube_activity_response_invalid');
    }
    const video = item as Record<string, unknown>;
    if (typeof video.id !== 'string' || !VIDEO_ID.test(video.id)) {
      return fail('youtube_activity_response_invalid');
    }
    if (!video.snippet || typeof video.snippet !== 'object' || Array.isArray(video.snippet)) {
      return fail('youtube_activity_response_invalid');
    }
    const snippet = video.snippet as Record<string, unknown>;
    if (typeof snippet.channelId !== 'string' || !CHANNEL_ID.test(snippet.channelId)) {
      return fail('youtube_activity_response_invalid');
    }
    if (typeof snippet.title !== 'string' || byteLength(snippet.title) > MAX_TITLE_BYTES) {
      return fail('youtube_activity_response_invalid');
    }
    validatePublishedAt(snippet.publishedAt);
  }
  return response as YouTubeVideosResponse;
}

function buildOfficialVideoEvent(input: Readonly<{
  artistId: string;
  channelId: string;
  collectedAt: string;
  video: YouTubeVideosResponse['items'][number];
}>): ActivityExposureEvent | null {
  const snippet = input.video.snippet;
  if (!snippet || snippet.channelId !== input.channelId) return null;
  const publishedAt = validatePublishedAt(snippet.publishedAt);
  return Object.freeze({
    artistId: input.artistId,
    eventId: `activity:youtube:video:${input.video.id}`,
    eventFamily: 'official_content',
    eventType: 'official_video_publication',
    lifecycleState: 'observed',
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt: publishedAt,
    occurredAtPrecision: 'timestamp',
    sourcePublishedAt: publishedAt,
    collectedAt: input.collectedAt,
    sourceProvider: 'youtube',
    sourceEntityType: 'video',
    sourceEntityId: input.video.id,
    canonicalFamilyId: null,
    providerArtistId: input.channelId,
    evidenceRef: `https://www.youtube.com/watch?v=${input.video.id}`,
    identityState: 'resolved_for_research',
    missingState: 'covered',
    evidenceState: 'direct_provider_evidence',
    conflictState: 'clear',
    timeZoneState: 'provider_iso8601_timestamp',
    revisionId: 'research-collection',
    supersedesRevisionId: null,
    title: snippet.title,
  });
}

export function createYouTubeActivityResearchCollector(
  options: YouTubeActivityCollectorOptions,
) {
  requireApiKey(options.apiKey);
  const externalFetch = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMilliseconds = options.timeoutMilliseconds ?? YOUTUBE_ACTIVITY_TIMEOUT_MS;

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
      if (!response.ok) fail('youtube_activity_http_failed');
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        fail('youtube_activity_response_invalid');
      }
      const declaredLength = response.headers.get('content-length');
      if (declaredLength && Number(declaredLength) > MAX_RESPONSE_BYTES) {
        fail('youtube_activity_response_invalid');
      }
      const body = await response.text();
      if (byteLength(body) > MAX_RESPONSE_BYTES) {
        fail('youtube_activity_response_invalid');
      }
      try {
        return JSON.parse(body);
      } catch {
        return fail('youtube_activity_response_invalid');
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('youtube_activity_')) {
        throw error;
      }
      return fail('youtube_activity_request_failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchChannel(channelId: string) {
    if (!CHANNEL_ID.test(channelId)) fail('youtube_activity_channel_id_invalid');
    const url = new URL(YOUTUBE_ACTIVITY_CHANNELS_URL);
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
      const url = new URL(YOUTUBE_ACTIVITY_PLAYLIST_ITEMS_URL);
      url.searchParams.set('part', 'contentDetails');
      url.searchParams.set('playlistId', uploadsPlaylistId);
      url.searchParams.set('maxResults', String(YOUTUBE_ACTIVITY_PAGE_SIZE));
      url.searchParams.set('key', options.apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const page = validatePlaylistItemsResponse(await fetchJson(url));
      for (const item of page.items) {
        const videoId = item.contentDetails!.videoId!;
        if (!videoIds.includes(videoId)) videoIds.push(videoId);
      }

      const next = page.nextPageToken;
      if (next) {
        if (seenPageTokens.has(next)) fail('youtube_activity_pagination_cycle');
        seenPageTokens.add(next);
      }
      pageToken = next;
    } while (pageToken);

    return videoIds;
  }

  async function fetchVideos(videoIds: readonly string[]) {
    const videos: YouTubeVideosResponse['items'][number][] = [];
    for (let index = 0; index < videoIds.length; index += YOUTUBE_ACTIVITY_PAGE_SIZE) {
      const batch = videoIds.slice(index, index + YOUTUBE_ACTIVITY_PAGE_SIZE);
      const url = new URL(YOUTUBE_ACTIVITY_VIDEOS_URL);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('id', batch.join(','));
      url.searchParams.set('key', options.apiKey);
      const response = validateVideosResponse(await fetchJson(url));
      videos.push(...response.items);
    }
    return videos;
  }

  return Object.freeze({
    mode: 'research-only' as const,
    async collect(input: Readonly<{
      artistId: string;
      providerArtistId: string;
    }>): Promise<YouTubeActivityCollection> {
      const collectedAt = now().toISOString();
      if (!Number.isFinite(Date.parse(collectedAt))) {
        fail('youtube_activity_clock_invalid');
      }

      const channelResponse = await fetchChannel(input.providerArtistId);
      const channel = channelResponse.items[0];
      const uploadsPlaylistId = channel.contentDetails!.relatedPlaylists!.uploads!;
      const videoIds = await fetchAllUploadVideoIds(uploadsPlaylistId);
      const videos = await fetchVideos(videoIds);

      const rawObservations: ActivityExposureRawObservation[] = [];
      rawObservations.push(createActivityExposureRawObservation({
        scope: 'research',
        artistId: input.artistId,
        sourceProvider: 'youtube',
        providerArtistId: input.providerArtistId,
        sourceEntityType: 'channel',
        sourceEntityId: input.providerArtistId,
        requestRef: `youtube:channels:contentDetails:${input.providerArtistId}`,
        responseCapturedAt: collectedAt,
        collectedAt,
        rawPayloadCanonical: JSON.stringify({
          provider: 'youtube',
          kind: 'channel-content-details',
          channel: channelResponse.items[0],
        }),
        rawPayloadRetentionState: 'retained',
        evidenceRef: `https://www.youtube.com/channel/${input.providerArtistId}`,
        revisionState: 'original',
        authorizationState: 'research-allowed',
        normalizedEventIds: [],
      }));

      const events: ActivityExposureEvent[] = [];
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

        rawObservations.push(createActivityExposureRawObservation({
          scope: 'research',
          artistId: input.artistId,
          sourceProvider: 'youtube',
          providerArtistId: input.providerArtistId,
          sourceEntityType: 'video',
          sourceEntityId: video.id,
          requestRef: `youtube:videos:snippet:${video.id}`,
          responseCapturedAt: collectedAt,
          collectedAt,
          sourcePublishedAt: video.snippet?.publishedAt ?? null,
          providerObservedAt: null,
          rawPayloadCanonical: JSON.stringify({
            provider: 'youtube',
            kind: 'video',
            video,
          }),
          rawPayloadRetentionState: 'retained',
          evidenceRef: `https://www.youtube.com/watch?v=${video.id}`,
          revisionState: 'original',
          authorizationState: 'research-allowed',
          normalizedEventIds: event ? [event.eventId] : [],
        }));

        if (event) events.push(event);
      }

      const validationIssues = validateActivityExposureStream(events, {
        artistId: input.artistId,
        youtubeChannelId: input.providerArtistId,
      });

      return Object.freeze({
        artistId: input.artistId,
        providerArtistId: input.providerArtistId,
        uploadsPlaylistId,
        collectedAt,
        rawObservations: Object.freeze(rawObservations),
        events: Object.freeze(events),
        validationIssues: Object.freeze(validationIssues),
      });
    },
  });
}
