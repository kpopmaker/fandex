import type {
  ProductActivityExposureEvent,
  ProductActivityExposureProviderCoverage,
} from '../../product/contracts/productActivityExposure';
import {
  createActivityExposureProviderObservation,
  type ActivityExposureProviderObservation,
} from './activityExposureContracts';

export const MUSICBRAINZ_ACTIVITY_EXPOSURE_RELEASE_GROUP_URL =
  'https://musicbrainz.org/ws/2/release-group';
export const MUSICBRAINZ_ACTIVITY_EXPOSURE_RELEASE_URL =
  'https://musicbrainz.org/ws/2/release';
export const MUSICBRAINZ_ACTIVITY_EXPOSURE_USER_AGENT =
  'FANDEX/1.0 (https://github.com/kpopmaker/fandex)';
export const MUSICBRAINZ_ACTIVITY_EXPOSURE_TIMEOUT_MS = 10_000;
export const MUSICBRAINZ_ACTIVITY_EXPOSURE_PAGE_SIZE = 100;
export const MUSICBRAINZ_ACTIVITY_EXPOSURE_MIN_REQUEST_INTERVAL_MS = 1_000;

const MAX_RESPONSE_BYTES = 2_500_000;
const MAX_TITLE_BYTES = 2_048;
const MBID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MusicBrainzActivityExposureReleaseGroup = Readonly<{
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

export type MusicBrainzActivityExposureRelease = Readonly<{
  id: string;
  title: string;
  status?: string | null;
  date?: string;
  country?: string | null;
}>;

export type MusicBrainzActivityExposureReleaseGroupPage = Readonly<{
  'release-group-count': number;
  'release-group-offset': number;
  'release-groups': readonly MusicBrainzActivityExposureReleaseGroup[];
}>;

export type MusicBrainzActivityExposureReleasePage = Readonly<{
  'release-count': number;
  'release-offset': number;
  releases: readonly MusicBrainzActivityExposureRelease[];
}>;

export type MusicBrainzActivityExposureFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MusicBrainzActivityExposureCollectorOptions = Readonly<{
  fetch?: MusicBrainzActivityExposureFetch;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMilliseconds?: number;
  userAgent?: string;
}>;

export type MusicBrainzActivityExposureCollection = Readonly<{
  artistId: string;
  providerArtistId: string;
  collectedAt: string;
  providerReleaseGroupCount: number;
  enumeratedReleaseGroupCount: number;
  releaseGroupPages: readonly MusicBrainzActivityExposureReleaseGroupPage[];
  releasePages: readonly MusicBrainzActivityExposureReleasePage[];
  rawObservations: readonly ActivityExposureProviderObservation[];
  events: readonly ProductActivityExposureEvent[];
  missingSourceDataReleaseGroupIds: readonly string[];
  identityUnresolvedReleaseGroupIds: readonly string[];
  providerCoverage: ProductActivityExposureProviderCoverage;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function byteLength(value: string) {
  return Buffer.byteLength(value, 'utf8');
}

function validateDatePrecision(
  value: string,
): 'year' | 'month' | 'day' | null {
  if (/^\d{4}$/.test(value)) return 'year';
  if (/^\d{4}-\d{2}$/.test(value)) return 'month';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'day';
  return null;
}

function dateStartKey(value: string) {
  const precision = validateDatePrecision(value);
  if (precision === null) return null;
  const [year, month = '01', day = '01'] = value.split('-');
  return `${year}-${month}-${day}`;
}

function validateReleaseGroup(
  value: unknown,
): MusicBrainzActivityExposureReleaseGroup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !MBID.test(item.id)) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (
    typeof item.title !== 'string'
    || byteLength(item.title) > MAX_TITLE_BYTES
  ) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (
    item['first-release-date'] !== undefined
    && (
      typeof item['first-release-date'] !== 'string'
      || validateDatePrecision(item['first-release-date']) === null
    )
  ) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (
    item['artist-credit'] !== undefined
    && !Array.isArray(item['artist-credit'])
  ) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  return item as MusicBrainzActivityExposureReleaseGroup;
}

function validateRelease(
  value: unknown,
): MusicBrainzActivityExposureRelease {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !MBID.test(item.id)) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (
    typeof item.title !== 'string'
    || byteLength(item.title) > MAX_TITLE_BYTES
  ) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (
    item.status !== undefined
    && item.status !== null
    && typeof item.status !== 'string'
  ) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (
    item.date !== undefined
    && (
      typeof item.date !== 'string'
      || validateDatePrecision(item.date) === null
    )
  ) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  return item as MusicBrainzActivityExposureRelease;
}

function validateReleaseGroupPage(
  value: unknown,
  expectedOffset: number,
): MusicBrainzActivityExposureReleaseGroupPage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  const page = value as Record<string, unknown>;
  const count = page['release-group-count'];
  const offset = page['release-group-offset'];
  const groups = page['release-groups'];
  if (!Number.isInteger(count) || Number(count) < 0) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (!Number.isInteger(offset) || Number(offset) !== expectedOffset) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (
    !Array.isArray(groups)
    || groups.length > MUSICBRAINZ_ACTIVITY_EXPOSURE_PAGE_SIZE
  ) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  return Object.freeze({
    'release-group-count': Number(count),
    'release-group-offset': Number(offset),
    'release-groups': Object.freeze(groups.map(validateReleaseGroup)),
  });
}

function validateReleasePage(
  value: unknown,
  expectedOffset: number,
): MusicBrainzActivityExposureReleasePage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  const page = value as Record<string, unknown>;
  const count = page['release-count'];
  const offset = page['release-offset'];
  const releases = page.releases;
  if (!Number.isInteger(count) || Number(count) < 0) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (!Number.isInteger(offset) || Number(offset) !== expectedOffset) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  if (
    !Array.isArray(releases)
    || releases.length > MUSICBRAINZ_ACTIVITY_EXPOSURE_PAGE_SIZE
  ) {
    return fail('musicbrainz_activity_exposure_response_invalid');
  }
  return Object.freeze({
    'release-count': Number(count),
    'release-offset': Number(offset),
    releases: Object.freeze(releases.map(validateRelease)),
  });
}

function artistCreditContains(
  releaseGroup: MusicBrainzActivityExposureReleaseGroup,
  providerArtistId: string,
) {
  return (releaseGroup['artist-credit'] ?? []).some(
    (credit) => credit.artist?.id === providerArtistId,
  );
}

function normalizedArtistCredits(
  releaseGroup: MusicBrainzActivityExposureReleaseGroup,
) {
  return Object.freeze(
    (releaseGroup['artist-credit'] ?? [])
      .filter((credit) => typeof credit.artist?.id === 'string')
      .map((credit) => Object.freeze({
        providerArtistId: credit.artist!.id!,
        creditedName: credit.name ?? credit.artist?.name ?? null,
        canonicalProviderName: credit.artist?.name ?? null,
      })),
  );
}

function earliestOfficialRelease(
  releases: readonly MusicBrainzActivityExposureRelease[],
) {
  const dated = releases
    .filter((release) => release.status === 'Official' && release.date)
    .filter((release) => dateStartKey(release.date!) !== null);

  if (dated.length === 0) return null;

  return [...dated].sort((a, b) => {
    const aKey = dateStartKey(a.date!)!;
    const bKey = dateStartKey(b.date!)!;
    if (aKey !== bKey) return aKey.localeCompare(bKey);
    return a.date!.length - b.date!.length;
  })[0];
}

function normalizeReleaseGroupEvent(input: Readonly<{
  artistId: string;
  providerArtistId: string;
  collectedAt: string;
  releaseGroup: MusicBrainzActivityExposureReleaseGroup;
  supportingRelease: MusicBrainzActivityExposureRelease;
}>): ProductActivityExposureEvent {
  const occurredAt = input.supportingRelease.date!;
  const providerArtistCredits = normalizedArtistCredits(input.releaseGroup);
  return Object.freeze({
    artistId: input.artistId,
    eventId: `activity:musicbrainz:release-group:${input.releaseGroup.id}`,
    eventFamily: 'release' as const,
    eventType: 'confirmed_release' as const,
    lifecycleState: 'observed' as const,
    participationScope:
      providerArtistCredits.length > 1 ? 'collaboration' as const : 'solo' as const,
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt,
    occurredAtPrecision: validateDatePrecision(occurredAt)!,
    sourcePublishedAt: null,
    collectedAt: input.collectedAt,
    sourceProvider: 'musicbrainz' as const,
    sourceEntityType: 'release-group' as const,
    sourceEntityId: input.releaseGroup.id,
    canonicalFamilyId: input.releaseGroup.id,
    providerArtistId: input.providerArtistId,
    providerArtistCredits,
    evidenceRef:
      `https://musicbrainz.org/release-group/${input.releaseGroup.id}`,
    identityState: 'resolved',
    missingState: 'covered' as const,
    evidenceState: 'direct_provider_evidence_with_official_release_support',
    conflictState: 'clear',
    timeZoneState: 'provider_date',
    revisionId: `collection:${input.collectedAt}`,
    supersedesRevisionId: null,
  });
}

export function createMusicBrainzActivityExposureCollector(
  options: MusicBrainzActivityExposureCollectorOptions = {},
) {
  const externalFetch = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? (
    (milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
  );
  const timeoutMilliseconds =
    options.timeoutMilliseconds ?? MUSICBRAINZ_ACTIVITY_EXPOSURE_TIMEOUT_MS;
  const userAgent =
    options.userAgent ?? MUSICBRAINZ_ACTIVITY_EXPOSURE_USER_AGENT;

  if (!userAgent.trim() || byteLength(userAgent) > 512) {
    fail('musicbrainz_activity_exposure_config_invalid');
  }

  let requestCount = 0;

  async function rateLimitedFetch(url: URL): Promise<unknown> {
    if (requestCount > 0) {
      await sleep(MUSICBRAINZ_ACTIVITY_EXPOSURE_MIN_REQUEST_INTERVAL_MS);
    }
    requestCount += 1;

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
      if (!response.ok) fail('musicbrainz_activity_exposure_http_failed');

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        fail('musicbrainz_activity_exposure_response_invalid');
      }

      const declaredLength = response.headers.get('content-length');
      if (declaredLength && Number(declaredLength) > MAX_RESPONSE_BYTES) {
        fail('musicbrainz_activity_exposure_response_invalid');
      }

      const body = await response.text();
      if (byteLength(body) > MAX_RESPONSE_BYTES) {
        fail('musicbrainz_activity_exposure_response_invalid');
      }

      try {
        return JSON.parse(body);
      } catch {
        return fail('musicbrainz_activity_exposure_response_invalid');
      }
    } catch (error) {
      if (
        error instanceof Error
        && error.message.startsWith('musicbrainz_activity_exposure_')
      ) {
        throw error;
      }
      return fail('musicbrainz_activity_exposure_request_failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchReleaseGroupPage(
    providerArtistId: string,
    offset: number,
  ) {
    if (!MBID.test(providerArtistId)) {
      fail('musicbrainz_activity_exposure_artist_id_invalid');
    }
    const url = new URL(MUSICBRAINZ_ACTIVITY_EXPOSURE_RELEASE_GROUP_URL);
    url.searchParams.set('artist', providerArtistId);
    url.searchParams.set('fmt', 'json');
    url.searchParams.set('inc', 'artist-credits');
    url.searchParams.set('release-group-status', 'website-default');
    url.searchParams.set(
      'limit',
      String(MUSICBRAINZ_ACTIVITY_EXPOSURE_PAGE_SIZE),
    );
    url.searchParams.set('offset', String(offset));
    return validateReleaseGroupPage(await rateLimitedFetch(url), offset);
  }

  async function fetchOfficialReleasePages(releaseGroupId: string) {
    if (!MBID.test(releaseGroupId)) {
      fail('musicbrainz_activity_exposure_release_group_id_invalid');
    }

    const pages: MusicBrainzActivityExposureReleasePage[] = [];
    let offset = 0;
    let expectedCount: number | null = null;

    while (true) {
      const url = new URL(MUSICBRAINZ_ACTIVITY_EXPOSURE_RELEASE_URL);
      url.searchParams.set('release-group', releaseGroupId);
      url.searchParams.set('status', 'official');
      url.searchParams.set('fmt', 'json');
      url.searchParams.set(
        'limit',
        String(MUSICBRAINZ_ACTIVITY_EXPOSURE_PAGE_SIZE),
      );
      url.searchParams.set('offset', String(offset));

      const page = validateReleasePage(await rateLimitedFetch(url), offset);
      pages.push(page);
      expectedCount ??= page['release-count'];

      if (page['release-count'] !== expectedCount) {
        fail('musicbrainz_activity_exposure_pagination_changed');
      }

      offset += page.releases.length;
      if (page.releases.length === 0 || offset >= page['release-count']) break;
    }

    return pages;
  }

  return Object.freeze({
    async collect(input: Readonly<{
      artistId: string;
      providerArtistId: string;
    }>): Promise<MusicBrainzActivityExposureCollection> {
      const collectedAt = now().toISOString();
      if (!Number.isFinite(Date.parse(collectedAt))) {
        fail('musicbrainz_activity_exposure_clock_invalid');
      }

      const releaseGroupPages: MusicBrainzActivityExposureReleaseGroupPage[] = [];
      const releasePages: MusicBrainzActivityExposureReleasePage[] = [];
      const rawObservations: ActivityExposureProviderObservation[] = [];
      const events: ProductActivityExposureEvent[] = [];
      const missingSourceDataReleaseGroupIds: string[] = [];
      const identityUnresolvedReleaseGroupIds: string[] = [];
      const seenReleaseGroupIds = new Set<string>();

      let offset = 0;
      let expectedCount: number | null = null;

      while (true) {
        const page = await fetchReleaseGroupPage(input.providerArtistId, offset);
        releaseGroupPages.push(page);
        expectedCount ??= page['release-group-count'];

        if (page['release-group-count'] !== expectedCount) {
          fail('musicbrainz_activity_exposure_pagination_changed');
        }

        for (const releaseGroup of page['release-groups']) {
          if (seenReleaseGroupIds.has(releaseGroup.id)) continue;
          seenReleaseGroupIds.add(releaseGroup.id);

          const releaseGroupRaw = JSON.stringify({
            provider: 'musicbrainz',
            kind: 'release-group',
            pageOffset: page['release-group-offset'],
            releaseGroup,
          });

          if (!artistCreditContains(releaseGroup, input.providerArtistId)) {
            identityUnresolvedReleaseGroupIds.push(releaseGroup.id);
            rawObservations.push(createActivityExposureProviderObservation({
              artistId: input.artistId,
              sourceProvider: 'musicbrainz',
              providerArtistId: input.providerArtistId,
              sourceEntityType: 'release-group',
              sourceEntityId: releaseGroup.id,
              requestRef:
                `musicbrainz:browse:artist:${input.providerArtistId}:offset:${page['release-group-offset']}`,
              responseCapturedAt: collectedAt,
              collectedAt,
              providerObservedAt:
                releaseGroup['first-release-date'] ?? null,
              rawPayloadCanonical: releaseGroupRaw,
              rawPayloadRetentionState: 'digest-only',
              retentionPolicyVersion: 'musicbrainz-core-field-review-v1',
              evidenceRef:
                `https://musicbrainz.org/release-group/${releaseGroup.id}`,
              authorizationState: 'review-required',
              normalizedEventIds: [],
            }));
            continue;
          }

          const officialPages = await fetchOfficialReleasePages(releaseGroup.id);
          releasePages.push(...officialPages);
          const officialReleases = officialPages.flatMap(
            (releasePage) => releasePage.releases,
          );
          const supportingRelease = earliestOfficialRelease(officialReleases);
          const event = supportingRelease
            ? normalizeReleaseGroupEvent({
                artistId: input.artistId,
                providerArtistId: input.providerArtistId,
                collectedAt,
                releaseGroup,
                supportingRelease,
              })
            : null;

          if (!event) {
            missingSourceDataReleaseGroupIds.push(releaseGroup.id);
          }

          rawObservations.push(createActivityExposureProviderObservation({
            artistId: input.artistId,
            sourceProvider: 'musicbrainz',
            providerArtistId: input.providerArtistId,
            sourceEntityType: 'release-group',
            sourceEntityId: releaseGroup.id,
            requestRef:
              `musicbrainz:browse:artist:${input.providerArtistId}:offset:${page['release-group-offset']}`,
            responseCapturedAt: collectedAt,
            collectedAt,
            providerObservedAt:
              releaseGroup['first-release-date'] ?? null,
            rawPayloadCanonical: releaseGroupRaw,
            rawPayloadRetentionState: 'digest-only',
            retentionPolicyVersion: 'musicbrainz-core-field-review-v1',
            evidenceRef:
              `https://musicbrainz.org/release-group/${releaseGroup.id}`,
            authorizationState: 'review-required',
            normalizedEventIds: event ? [event.eventId] : [],
          }));

          for (const release of officialReleases) {
            rawObservations.push(createActivityExposureProviderObservation({
              artistId: input.artistId,
              sourceProvider: 'musicbrainz',
              providerArtistId: input.providerArtistId,
              sourceEntityType: 'release',
              sourceEntityId: release.id,
              requestRef:
                `musicbrainz:browse:release-group:${releaseGroup.id}:status:official`,
              responseCapturedAt: collectedAt,
              collectedAt,
              providerObservedAt: release.date ?? null,
              rawPayloadCanonical: JSON.stringify({
                provider: 'musicbrainz',
                kind: 'release',
                releaseGroupId: releaseGroup.id,
                release,
              }),
              rawPayloadRetentionState: 'digest-only',
              retentionPolicyVersion: 'musicbrainz-core-field-review-v1',
              evidenceRef:
                `https://musicbrainz.org/release/${release.id}`,
              authorizationState: 'review-required',
              normalizedEventIds:
                event && release.id === supportingRelease?.id
                  ? [event.eventId]
                  : [],
            }));
          }

          if (event) events.push(event);
        }

        offset += page['release-groups'].length;
        if (
          page['release-groups'].length === 0
          || offset >= page['release-group-count']
        ) break;
      }

      const partial =
        missingSourceDataReleaseGroupIds.length > 0
        || identityUnresolvedReleaseGroupIds.length > 0;

      const providerCoverage = Object.freeze({
        provider: 'musicbrainz' as const,
        providerArtistId: input.providerArtistId,
        collectionStatus: partial ? 'bounded_partial' as const : 'succeeded' as const,
        coverageState: partial ? 'partial' as const : 'covered' as const,
        collectedAt,
      });

      return Object.freeze({
        artistId: input.artistId,
        providerArtistId: input.providerArtistId,
        collectedAt,
        providerReleaseGroupCount: expectedCount ?? 0,
        enumeratedReleaseGroupCount: seenReleaseGroupIds.size,
        releaseGroupPages: Object.freeze(releaseGroupPages),
        releasePages: Object.freeze(releasePages),
        rawObservations: Object.freeze(rawObservations),
        events: Object.freeze(events),
        missingSourceDataReleaseGroupIds:
          Object.freeze(missingSourceDataReleaseGroupIds),
        identityUnresolvedReleaseGroupIds:
          Object.freeze(identityUnresolvedReleaseGroupIds),
        providerCoverage,
      });
    },
  });
}
