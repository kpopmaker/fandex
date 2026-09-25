import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ProductActivityExposureEvent,
} from '../lib/product/contracts/productActivityExposure';
import {
  createActivityExposureProviderObservation,
} from '../lib/server/ingestion/activityExposureContracts';
import {
  buildActivityExposureEventSemanticRevisionId,
  persistMusicBrainzActivityExposureShadow,
  persistYouTubeActivityExposureShadow,
} from '../lib/server/ingestion/activityExposurePersistenceBridge';
import type {
  ActivityExposurePersistencePool,
} from '../lib/server/ingestion/activityExposureRepository';
import type {
  MusicBrainzActivityExposureCollection,
} from '../lib/server/ingestion/activityExposureMusicBrainzCollector';
import type {
  YouTubeActivityExposureCollection,
} from '../lib/server/ingestion/activityExposureYouTubeCollector';

const collectedAt = '2026-09-25T00:00:00.000Z';
const iuMbid = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const youtubeChannelId = 'UC3SyT4_WLHzN7JmHQwKQZww';

function event(at = collectedAt): ProductActivityExposureEvent {
  return Object.freeze({
    artistId: 'iu',
    eventId:
      'activity:musicbrainz:release-group:1299e16d-133b-47b0-b991-36cf11eff7d7',
    eventFamily: 'release',
    eventType: 'confirmed_release',
    lifecycleState: 'observed',
    participationScope: 'solo',
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt: '2024-01-01',
    occurredAtPrecision: 'day',
    sourcePublishedAt: null,
    collectedAt: at,
    sourceProvider: 'musicbrainz',
    sourceEntityType: 'release-group',
    sourceEntityId: '1299e16d-133b-47b0-b991-36cf11eff7d7',
    canonicalFamilyId: '1299e16d-133b-47b0-b991-36cf11eff7d7',
    providerArtistId: iuMbid,
    providerArtistCredits: Object.freeze([
      Object.freeze({
        providerArtistId: iuMbid,
        creditedName: 'IU',
        canonicalProviderName: 'IU',
      }),
    ]),
    evidenceRef:
      'https://musicbrainz.org/release-group/1299e16d-133b-47b0-b991-36cf11eff7d7',
    identityState: 'resolved',
    missingState: 'covered',
    evidenceState: 'direct_provider_evidence_with_official_release_support',
    conflictState: 'clear',
    timeZoneState: 'provider_date',
    revisionId: `collection:${at}`,
    supersedesRevisionId: null,
  });
}

function observation(normalizedEventIds = [event().eventId]) {
  return createActivityExposureProviderObservation({
    artistId: 'iu',
    sourceProvider: 'musicbrainz',
    providerArtistId: iuMbid,
    sourceEntityType: 'release-group',
    sourceEntityId: '1299e16d-133b-47b0-b991-36cf11eff7d7',
    requestRef: 'musicbrainz:browse:artist:iu:offset:0',
    responseCapturedAt: collectedAt,
    collectedAt,
    rawPayloadCanonical: '{"id":"release-group","date":"2024-01-01"}',
    rawPayloadRetentionState: 'digest-only',
    retentionPolicyVersion: 'musicbrainz-core-field-review-v1',
    evidenceRef:
      'https://musicbrainz.org/release-group/1299e16d-133b-47b0-b991-36cf11eff7d7',
    authorizationState: 'review-required',
    normalizedEventIds,
  });
}

function musicCollection(currentEvent = event()): MusicBrainzActivityExposureCollection {
  return Object.freeze({
    artistId: 'iu',
    providerArtistId: iuMbid,
    collectedAt: currentEvent.collectedAt,
    providerReleaseGroupCount: 1,
    enumeratedReleaseGroupCount: 1,
    releaseGroupPages: Object.freeze([]),
    releasePages: Object.freeze([]),
    rawObservations: Object.freeze([observation([currentEvent.eventId])]),
    events: Object.freeze([currentEvent]),
    missingSourceDataReleaseGroupIds: Object.freeze([]),
    identityUnresolvedReleaseGroupIds: Object.freeze([]),
    providerCoverage: Object.freeze({
      provider: 'musicbrainz',
      providerArtistId: iuMbid,
      collectionStatus: 'succeeded',
      coverageState: 'covered',
      collectedAt: currentEvent.collectedAt,
    }),
  });
}

type Call = { sql: string; values?: readonly unknown[] };

function pool(input: Readonly<{
  calls: Call[];
  priorObservationRevision?: string;
  priorEventRevision?: string;
}>): ActivityExposurePersistencePool {
  const client = {
    async query<T = Record<string, unknown>>(
      sql: string,
      values?: readonly unknown[],
    ) {
      input.calls.push({ sql, values });
      if (sql.startsWith('INSERT INTO fandex.activity_exposure_collection_runs')) {
        return { rowCount: 1, rows: [{ run_id: 'x' }] as T[] };
      }
      if (sql.includes('SELECT event_record_id')) {
        return {
          rowCount: 1,
          rows: [{ event_record_id: 'e'.repeat(64) }] as T[],
        };
      }
      return { rowCount: 1, rows: [] as T[] };
    },
    release() {},
  };

  return {
    async connect() {
      return client;
    },
    async query<T = Record<string, unknown>>(
      sql: string,
      values?: readonly unknown[],
    ) {
      input.calls.push({ sql, values });
      if (sql.includes('activity_exposure_provider_observations')) {
        return {
          rowCount: input.priorObservationRevision ? 1 : 0,
          rows: input.priorObservationRevision
            ? [{
                observation_id: 'a'.repeat(64),
                source_entity_type: 'release-group',
                source_entity_id:
                  '1299e16d-133b-47b0-b991-36cf11eff7d7',
                revision_id: input.priorObservationRevision,
              }] as T[]
            : [],
        };
      }
      if (sql.includes('activity_exposure_events')) {
        return {
          rowCount: input.priorEventRevision ? 1 : 0,
          rows: input.priorEventRevision
            ? [{
                event_id: event().eventId,
                revision_id: input.priorEventRevision,
              }] as T[]
            : [],
        };
      }
      return { rowCount: 0, rows: [] as T[] };
    },
  };
}

test('semantic event revision ignores collection timestamp', () => {
  assert.notEqual(event().revisionId, event('2026-09-25T08:00:00.000Z').revisionId);
  assert.equal(
    buildActivityExposureEventSemanticRevisionId(event()),
    buildActivityExposureEventSemanticRevisionId(
      event('2026-09-25T08:00:00.000Z'),
    ),
  );
});

test('first collection writes semantic revision ids, never collection timestamp revisions', async () => {
  const calls: Call[] = [];
  const result = await persistMusicBrainzActivityExposureShadow({
    collection: musicCollection(),
    startedAt: '2026-09-24T23:59:59.000Z',
    completedAt: '2026-09-25T00:00:01.000Z',
    pool: pool({ calls }),
  });

  assert.equal(result.status, 'applied');
  const observationInsert = calls.find(({ sql }) =>
    sql.startsWith(
      'INSERT INTO fandex.activity_exposure_provider_observations',
    )
  );
  const eventInsert = calls.find(({ sql }) =>
    sql.startsWith('INSERT INTO fandex.activity_exposure_events')
  );

  assert.match(
    String(observationInsert?.values?.[15]),
    /^provider-revision:[0-9a-f]{64}$/,
  );
  assert.match(
    String(eventInsert?.values?.[2]),
    /^event-revision:[0-9a-f]{64}$/,
  );
  assert.doesNotMatch(String(eventInsert?.values?.[2]), /collection:/);
});

test('unchanged repeat creates a collection run but no new observation/event revision', async () => {
  const seedCalls: Call[] = [];
  await persistMusicBrainzActivityExposureShadow({
    collection: musicCollection(),
    startedAt: '2026-09-24T23:59:59.000Z',
    completedAt: '2026-09-25T00:00:01.000Z',
    pool: pool({ calls: seedCalls }),
  });

  const priorObservationRevision = String(
    seedCalls.find(({ sql }) =>
      sql.startsWith(
        'INSERT INTO fandex.activity_exposure_provider_observations',
      )
    )?.values?.[15],
  );
  const priorEventRevision =
    buildActivityExposureEventSemanticRevisionId(event());

  const calls: Call[] = [];
  const result = await persistMusicBrainzActivityExposureShadow({
    collection: musicCollection(event('2026-09-25T08:00:00.000Z')),
    startedAt: '2026-09-25T07:59:59.000Z',
    completedAt: '2026-09-25T08:00:01.000Z',
    pool: pool({
      calls,
      priorObservationRevision,
      priorEventRevision,
    }),
  });

  assert.equal(result.observationCount, 0);
  assert.equal(result.eventCount, 0);
  assert.equal(
    calls.some(({ sql }) =>
      sql.startsWith(
        'INSERT INTO fandex.activity_exposure_provider_observations',
      )
    ),
    false,
  );
  assert.equal(
    calls.some(({ sql }) =>
      sql.startsWith('INSERT INTO fandex.activity_exposure_events')
    ),
    false,
  );
});

test('YouTube unavailable video persists provider_unavailable, never zero/inactive', async () => {
  const unavailableObservation = createActivityExposureProviderObservation({
    artistId: 'iu',
    sourceProvider: 'youtube',
    providerArtistId: youtubeChannelId,
    sourceEntityType: 'video',
    sourceEntityId: 'missing-video',
    requestRef: 'youtube:videos:snippet:missing-video',
    responseCapturedAt: collectedAt,
    collectedAt,
    rawPayloadCanonical: '{"id":"missing-video"}',
    rawPayloadRetentionState: 'digest-only',
    retentionPolicyVersion: 'youtube-non-authorized-data-v1',
    evidenceRef: 'https://www.youtube.com/watch?v=missing-video',
    authorizationState: 'review-required',
    normalizedEventIds: [],
  });

  const collection: YouTubeActivityExposureCollection = Object.freeze({
    artistId: 'iu',
    providerArtistId: youtubeChannelId,
    uploadsPlaylistId: 'UU3SyT4_WLHzN7JmHQwKQZww',
    collectedAt,
    playlistVideoIds: Object.freeze(['missing-video']),
    resolvedVideoIds: Object.freeze([]),
    unavailableVideoIds: Object.freeze(['missing-video']),
    channelMismatchVideoIds: Object.freeze([]),
    rawObservations: Object.freeze([unavailableObservation]),
    events: Object.freeze([]),
    providerCoverage: Object.freeze({
      provider: 'youtube',
      providerArtistId: youtubeChannelId,
      collectionStatus: 'bounded_partial',
      coverageState: 'partial',
      collectedAt,
    }),
  });

  const calls: Call[] = [];
  await persistYouTubeActivityExposureShadow({
    collection,
    startedAt: '2026-09-24T23:59:59.000Z',
    completedAt: '2026-09-25T00:00:01.000Z',
    pool: pool({ calls }),
  });

  const observationInsert = calls.find(({ sql }) =>
    sql.startsWith(
      'INSERT INTO fandex.activity_exposure_provider_observations',
    )
  );
  assert.equal(observationInsert?.values?.[14], 'provider_unavailable');
  assert.equal('value' in collection.providerCoverage, false);
  assert.equal('inactive' in collection.providerCoverage, false);
});
