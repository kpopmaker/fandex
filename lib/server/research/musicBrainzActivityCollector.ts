import {
  createActivityExposureRawObservation,
  type ActivityExposureRawObservation,
} from '../../research/activityExposureObservation';
import {
  validateActivityExposureStream,
  type ActivityExposureEvent,
} from '../../research/activityExposure';

export const MUSICBRAINZ_ACTIVITY_BASE_URL = 'https://musicbrainz.org/ws/2/release-group';
export const MUSICBRAINZ_ACTIVITY_USER_AGENT = 'FANDEX-Research/1.0 (https://github.com/kpopmaker/fandex)';
export const MUSICBRAINZ_ACTIVITY_TIMEOUT_MS = 10_000;
export const MUSICBRAINZ_ACTIVITY_PAGE_SIZE = 100;

const MAX_RESPONSE_BYTES = 2_500_000;
const MAX_TITLE_BYTES = 2_048;
const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MusicBrainzReleaseGroup = Readonly<{
  id: string;
  title: string;
  'first-release-date'?: string;
  'primary-type'?: string | null;
  'secondary-types'?: readonly string[];
  'artist-credit'?: readonly Readonly<{
    name?: string;
    artist?: Readonly<{ id?: string; name?: string; 'sort-name'?: string }>;
  }>[];
}>;

export type MusicBrainzReleaseGroupPage = Readonly<{
  'release-group-count': number;
  'release-group-offset': number;
  'release-groups': readonly MusicBrainzReleaseGroup[];
}>;

export type MusicBrainzActivityFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MusicBrainzActivityCollectorOptions = Readonly<{
  fetch?: MusicBrainzActivityFetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
  userAgent?: string;
}>;

export type MusicBrainzActivityCollection = Readonly<{
  artistId: string;
  providerArtistId: string;
  collectedAt: string;
  pages: readonly MusicBrainzReleaseGroupPage[];
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

function validateIsoCollectionTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) fail('musicbrainz_activity_clock_invalid');
}

function validateDatePrecision(value: string): 'year' | 'month' | 'day' | null {
  if (/^\d{4}$/.test(value)) return 'year';
  if (/^\d{4}-\d{2}$/.test(value)) return 'month';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'day';
  return null;
}

function validateReleaseGroup(value: unknown): MusicBrainzReleaseGroup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('musicbrainz_activity_response_invalid');
  }
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !MBID.test(item.id)) {
    return fail('musicbrainz_activity_response_invalid');
  }
  if (typeof item.title !== 'string' || byteLength(item.title) > MAX_TITLE_BYTES) {
    return fail('musicbrainz_activity_response_invalid');
  }
  if (
    item['first-release-date'] !== undefined
    && (
      typeof item['first-release-date'] !== 'string'
      || validateDatePrecision(item['first-release-date']) === null
    )
  ) {
    return fail('musicbrainz_activity_response_invalid');
  }
  if (
    item['artist-credit'] !== undefined
    && !Array.isArray(item['artist-credit'])
  ) {
    return fail('musicbrainz_activity_response_invalid');
  }
  return item as MusicBrainzReleaseGroup;
}

function validatePage(value: unknown, expectedOffset: number): MusicBrainzReleaseGroupPage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('musicbrainz_activity_response_invalid');
  }
  const page = value as Record<string, unknown>;
  const count = page['release-group-count'];
  const offset = page['release-group-offset'];
  const groups = page['release-groups'];

  if (!Number.isInteger(count) || Number(count) < 0) {
    return fail('musicbrainz_activity_response_invalid');
  }
  if (!Number.isInteger(offset) || Number(offset) !== expectedOffset) {
    return fail('musicbrainz_activity_response_invalid');
  }
  if (!Array.isArray(groups) || groups.length > MUSICBRAINZ_ACTIVITY_PAGE_SIZE) {
    return fail('musicbrainz_activity_response_invalid');
  }

  return Object.freeze({
    'release-group-count': Number(count),
    'release-group-offset': Number(offset),
    'release-groups': Object.freeze(groups.map(validateReleaseGroup)),
  });
}

function canonicalRawPayload(page: MusicBrainzReleaseGroupPage, releaseGroup: MusicBrainzReleaseGroup) {
  return JSON.stringify({
    provider: 'musicbrainz',
    pageOffset: page['release-group-offset'],
    releaseGroup,
  });
}

function artistCreditContains(
  releaseGroup: MusicBrainzReleaseGroup,
  providerArtistId: string,
) {
  return (releaseGroup['artist-credit'] ?? []).some(
    (credit) => credit.artist?.id === providerArtistId,
  );
}

function normalizeReleaseGroupEvent(input: Readonly<{
  artistId: string;
  providerArtistId: string;
  collectedAt: string;
  releaseGroup: MusicBrainzReleaseGroup;
}>): ActivityExposureEvent | null {
  const occurredAt = input.releaseGroup['first-release-date'] ?? null;
  if (occurredAt === null) return null;
  const precision = validateDatePrecision(occurredAt);
  if (precision === null) return null;

  return Object.freeze({
    artistId: input.artistId,
    eventId: `activity:musicbrainz:release-group:${input.releaseGroup.id}`,
    eventFamily: 'release',
    eventType: 'confirmed_release',
    lifecycleState: 'observed',
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt,
    occurredAtPrecision: precision,
    sourcePublishedAt: null,
    collectedAt: input.collectedAt,
    sourceProvider: 'musicbrainz',
    sourceEntityType: 'release-group',
    sourceEntityId: input.releaseGroup.id,
    canonicalFamilyId: input.releaseGroup.id,
    providerArtistId: input.providerArtistId,
    evidenceRef: `https://musicbrainz.org/release-group/${input.releaseGroup.id}`,
    identityState: 'resolved_for_research',
    missingState: 'covered',
    evidenceState: 'direct_provider_evidence',
    conflictState: 'clear',
    timeZoneState: 'not_applicable_date_only',
    revisionId: 'research-collection',
    supersedesRevisionId: null,
    title: input.releaseGroup.title,
    primaryType: input.releaseGroup['primary-type'] ?? null,
    secondaryTypes: input.releaseGroup['secondary-types'] ?? [],
  });
}

export function createMusicBrainzActivityResearchCollector(
  options: MusicBrainzActivityCollectorOptions = {},
) {
  const externalFetch = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMilliseconds = options.timeoutMilliseconds ?? MUSICBRAINZ_ACTIVITY_TIMEOUT_MS;
  const userAgent = options.userAgent ?? MUSICBRAINZ_ACTIVITY_USER_AGENT;

  if (!userAgent.trim() || byteLength(userAgent) > 512) {
    fail('musicbrainz_activity_config_invalid');
  }

  async function fetchPage(
    providerArtistId: string,
    offset: number,
  ): Promise<MusicBrainzReleaseGroupPage> {
    if (!MBID.test(providerArtistId)) fail('musicbrainz_activity_artist_id_invalid');
    if (!Number.isInteger(offset) || offset < 0) fail('musicbrainz_activity_offset_invalid');

    const url = new URL(MUSICBRAINZ_ACTIVITY_BASE_URL);
    url.searchParams.set('artist', providerArtistId);
    url.searchParams.set('fmt', 'json');
    url.searchParams.set('limit', String(MUSICBRAINZ_ACTIVITY_PAGE_SIZE));
    url.searchParams.set('offset', String(offset));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
    try {
      const response = await externalFetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent,
        },
        signal: controller.signal,
      });
      if (!response.ok) fail('musicbrainz_activity_http_failed');
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        fail('musicbrainz_activity_response_invalid');
      }
      const declaredLength = response.headers.get('content-length');
      if (declaredLength && Number(declaredLength) > MAX_RESPONSE_BYTES) {
        fail('musicbrainz_activity_response_invalid');
      }
      const body = await response.text();
      if (byteLength(body) > MAX_RESPONSE_BYTES) {
        fail('musicbrainz_activity_response_invalid');
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        fail('musicbrainz_activity_response_invalid');
      }
      return validatePage(parsed, offset);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('musicbrainz_activity_')) {
        throw error;
      }
      fail('musicbrainz_activity_request_failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  return Object.freeze({
    mode: 'research-only' as const,
    async collect(input: Readonly<{ artistId: string; providerArtistId: string }>): Promise<MusicBrainzActivityCollection> {
      const collectedAt = now().toISOString();
      validateIsoCollectionTime(collectedAt);

      const pages: MusicBrainzReleaseGroupPage[] = [];
      const rawObservations: ActivityExposureRawObservation[] = [];
      const events: ActivityExposureEvent[] = [];
      const seenReleaseGroupIds = new Set<string>();

      let offset = 0;
      let expectedCount: number | null = null;

      while (true) {
        const page = await fetchPage(input.providerArtistId, offset);
        pages.push(page);
        expectedCount ??= page['release-group-count'];
        if (page['release-group-count'] !== expectedCount) {
          fail('musicbrainz_activity_pagination_changed_during_collection');
        }

        for (const releaseGroup of page['release-groups']) {
          if (seenReleaseGroupIds.has(releaseGroup.id)) continue;
          seenReleaseGroupIds.add(releaseGroup.id);

          const identityMatches = artistCreditContains(releaseGroup, input.providerArtistId);
          const event = identityMatches
            ? normalizeReleaseGroupEvent({
                artistId: input.artistId,
                providerArtistId: input.providerArtistId,
                collectedAt,
                releaseGroup,
              })
            : null;

          const normalizedEventIds = event ? [event.eventId] : [];
          rawObservations.push(createActivityExposureRawObservation({
            scope: 'research',
            artistId: input.artistId,
            sourceProvider: 'musicbrainz',
            providerArtistId: input.providerArtistId,
            sourceEntityType: 'release-group',
            sourceEntityId: releaseGroup.id,
            requestRef: `musicbrainz:browse:artist:${input.providerArtistId}:offset:${page['release-group-offset']}`,
            responseCapturedAt: collectedAt,
            collectedAt,
            sourcePublishedAt: null,
            providerObservedAt: releaseGroup['first-release-date'] ?? null,
            rawPayloadCanonical: canonicalRawPayload(page, releaseGroup),
            rawPayloadRetentionState: 'retained',
            evidenceRef: `https://musicbrainz.org/release-group/${releaseGroup.id}`,
            revisionState: 'original',
            authorizationState: 'research-allowed',
            normalizedEventIds,
          }));

          if (event) events.push(event);
        }

        offset += page['release-groups'].length;
        if (
          page['release-groups'].length === 0
          || offset >= page['release-group-count']
        ) break;
      }

      const validationIssues = validateActivityExposureStream(events, {
        artistId: input.artistId,
        musicbrainzArtistId: input.providerArtistId,
      });

      return Object.freeze({
        artistId: input.artistId,
        providerArtistId: input.providerArtistId,
        collectedAt,
        pages: Object.freeze(pages),
        rawObservations: Object.freeze(rawObservations),
        events: Object.freeze(events),
        validationIssues: Object.freeze(validationIssues),
      });
    },
  });
}
