import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';

import type {
  ProductActivityExposureEvent,
} from '../lib/product/contracts/productActivityExposure';
import {
  createActivityExposureProviderObservation,
} from '../lib/server/ingestion/activityExposureContracts';
import {
  persistMusicBrainzActivityExposureShadow,
  persistYouTubeActivityExposureShadow,
} from '../lib/server/ingestion/activityExposurePersistenceBridge';
import {
  readActivityExposureShadowProduct,
  readActivityExposureStoredEvidence,
  type ActivityExposurePersistencePool,
} from '../lib/server/ingestion/activityExposureRepository';
import type {
  MusicBrainzActivityExposureCollection,
} from '../lib/server/ingestion/activityExposureMusicBrainzCollector';
import type {
  YouTubeActivityExposureCollection,
} from '../lib/server/ingestion/activityExposureYouTubeCollector';

const databaseUrl = process.env.ACTIVITY_EXPOSURE_TEST_DATABASE_URL;
const run = databaseUrl ? test : test.skip;

const iuMbid = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const youtubeChannelId = 'UC3SyT4_WLHzN7JmHQwKQZww';

function releaseCollection(collectedAt: string): MusicBrainzActivityExposureCollection {
  const eventId =
    'activity:musicbrainz:release-group:1299e16d-133b-47b0-b991-36cf11eff7d7';
  const event: ProductActivityExposureEvent = Object.freeze({
    artistId: 'iu',
    eventId,
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
    collectedAt,
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
    revisionId: `collection:${collectedAt}`,
    supersedesRevisionId: null,
  });
  const observation = createActivityExposureProviderObservation({
    artistId: 'iu',
    sourceProvider: 'musicbrainz',
    providerArtistId: iuMbid,
    sourceEntityType: 'release-group',
    sourceEntityId: event.sourceEntityId,
    requestRef: 'musicbrainz:browse:artist:iu:offset:0',
    responseCapturedAt: collectedAt,
    collectedAt,
    rawPayloadCanonical: '{"id":"release-group","date":"2024-01-01"}',
    rawPayloadRetentionState: 'digest-only',
    retentionPolicyVersion: 'musicbrainz-core-field-review-v1',
    evidenceRef: event.evidenceRef,
    authorizationState: 'review-required',
    normalizedEventIds: [eventId],
  });

  return Object.freeze({
    artistId: 'iu',
    providerArtistId: iuMbid,
    collectedAt,
    providerReleaseGroupCount: 1,
    enumeratedReleaseGroupCount: 1,
    releaseGroupPages: Object.freeze([]),
    releasePages: Object.freeze([]),
    rawObservations: Object.freeze([observation]),
    events: Object.freeze([event]),
    missingSourceDataReleaseGroupIds: Object.freeze([]),
    identityUnresolvedReleaseGroupIds: Object.freeze([]),
    providerCoverage: Object.freeze({
      provider: 'musicbrainz',
      providerArtistId: iuMbid,
      collectionStatus: 'succeeded',
      coverageState: 'covered',
      collectedAt,
    }),
  });
}

function youtubeCollection(collectedAt: string): YouTubeActivityExposureCollection {
  const observation = createActivityExposureProviderObservation({
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

  return Object.freeze({
    artistId: 'iu',
    providerArtistId: youtubeChannelId,
    uploadsPlaylistId: 'UU3SyT4_WLHzN7JmHQwKQZww',
    collectedAt,
    playlistVideoIds: Object.freeze(['missing-video']),
    resolvedVideoIds: Object.freeze([]),
    unavailableVideoIds: Object.freeze(['missing-video']),
    channelMismatchVideoIds: Object.freeze([]),
    rawObservations: Object.freeze([observation]),
    events: Object.freeze([]),
    providerCoverage: Object.freeze({
      provider: 'youtube',
      providerArtistId: youtubeChannelId,
      collectionStatus: 'bounded_partial',
      coverageState: 'partial',
      collectedAt,
    }),
  });
}

run('PostgreSQL bridge persists semantic revisions and reads two-provider shadow truth', async () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    ssl: false,
  });

  try {
    const first = await persistMusicBrainzActivityExposureShadow({
      collection: releaseCollection('2026-09-25T00:00:00.000Z'),
      startedAt: '2026-09-24T23:59:59.000Z',
      completedAt: '2026-09-25T00:00:01.000Z',
      pool: pool as unknown as ActivityExposurePersistencePool,
    });
    assert.equal(first.observationCount, 1);
    assert.equal(first.eventCount, 1);

    const repeat = await persistMusicBrainzActivityExposureShadow({
      collection: releaseCollection('2026-09-25T08:00:00.000Z'),
      startedAt: '2026-09-25T07:59:59.000Z',
      completedAt: '2026-09-25T08:00:01.000Z',
      pool: pool as unknown as ActivityExposurePersistencePool,
    });
    assert.equal(repeat.observationCount, 0);
    assert.equal(repeat.eventCount, 0);

    const youtube = await persistYouTubeActivityExposureShadow({
      collection: youtubeCollection('2026-09-25T08:00:00.000Z'),
      startedAt: '2026-09-25T07:59:59.000Z',
      completedAt: '2026-09-25T08:00:01.000Z',
      pool: pool as unknown as ActivityExposurePersistencePool,
    });
    assert.equal(youtube.observationCount, 1);
    assert.equal(youtube.eventCount, 0);

    const counts = await pool.query(
      `SELECT
        (SELECT count(*)::int FROM fandex.activity_exposure_collection_runs) AS runs,
        (SELECT count(*)::int FROM fandex.activity_exposure_provider_observations) AS observations,
        (SELECT count(*)::int FROM fandex.activity_exposure_events) AS events`,
    );
    assert.deepEqual(counts.rows[0], {
      runs: 3,
      observations: 2,
      events: 1,
    });

    const model = await readActivityExposureShadowProduct(
      'iu',
      pool as unknown as ActivityExposurePersistencePool,
    );
    assert.equal(model.status, 'ok');
    if (model.status !== 'ok') return;
    assert.equal(model.model.publication, 'shadow');
    assert.equal(model.model.dataOrigin, 'observed');
    assert.equal(model.model.events.length, 1);
    const storedTrace = model.model.events[0]?.storedEvidenceTrace;
    assert.ok(storedTrace);
    assert.match(storedTrace.eventRecordId, /^[0-9a-f]{64}$/);
    assert.match(storedTrace.sourceObservationId, /^[0-9a-f]{64}$/);

    const storedEvidence = await readActivityExposureStoredEvidence(
      {
        artistId: 'iu',
        eventRecordId: storedTrace.eventRecordId,
      },
      pool as unknown as ActivityExposurePersistencePool,
    );
    assert.equal(storedEvidence.status, 'ok');
    if (storedEvidence.status === 'ok') {
      assert.equal(
        storedEvidence.model.sourceObservationId,
        storedTrace.sourceObservationId,
      );
      assert.equal(storedEvidence.model.providerObservedAt, null);
      assert.equal('rawPayload' in storedEvidence.model, false);
    }

    assert.equal(model.model.providerCoverage.length, 2);
    assert.equal(
      model.model.providerCoverage.find(({ provider }) => provider === 'musicbrainz')
        ?.collectedAt,
      '2026-09-25T08:00:01.000Z',
    );
    assert.equal('fact' in model.model, false);
    assert.equal('score' in model.model, false);
  } finally {
    await pool.end();
  }
});
