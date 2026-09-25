import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildActivityExposurePersistenceRunId,
  persistActivityExposureCollection,
  readActivityExposureShadowProduct,
  readActivityExposureStoredEvidence,
  type ActivityExposurePersistenceInput,
  type ActivityExposurePersistencePool,
} from '../lib/server/ingestion/activityExposureRepository';
import {
  createActivityExposureProviderObservation,
} from '../lib/server/ingestion/activityExposureContracts';
import type {
  ProductActivityExposureEvent,
} from '../lib/product/contracts/productActivityExposure';

const collectedAt = '2026-09-25T00:00:00.000Z';
const musicBrainzArtistId = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';

function musicObservation() {
  return createActivityExposureProviderObservation({
    artistId: 'iu',
    sourceProvider: 'musicbrainz',
    providerArtistId: musicBrainzArtistId,
    sourceEntityType: 'release-group',
    sourceEntityId: '1299e16d-133b-47b0-b991-36cf11eff7d7',
    requestRef: 'musicbrainz:browse:artist:iu:offset:0',
    responseCapturedAt: collectedAt,
    collectedAt,
    providerObservedAt: '2024-01-01',
    rawPayloadCanonical: '{"id":"1299e16d-133b-47b0-b991-36cf11eff7d7"}',
    rawPayloadRetentionState: 'digest-only',
    retentionPolicyVersion: 'musicbrainz-core-field-review-v1',
    evidenceRef: 'https://musicbrainz.org/release-group/1299e16d-133b-47b0-b991-36cf11eff7d7',
    authorizationState: 'review-required',
    normalizedEventIds: [
      'activity:musicbrainz:release-group:1299e16d-133b-47b0-b991-36cf11eff7d7',
    ],
  });
}

function musicEvent(): ProductActivityExposureEvent {
  return Object.freeze({
    artistId: 'iu',
    eventId: 'activity:musicbrainz:release-group:1299e16d-133b-47b0-b991-36cf11eff7d7',
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
    providerArtistId: musicBrainzArtistId,
    providerArtistCredits: Object.freeze([
      Object.freeze({
        providerArtistId: musicBrainzArtistId,
        creditedName: 'IU',
        canonicalProviderName: 'IU',
      }),
    ]),
    evidenceRef: 'https://musicbrainz.org/release-group/1299e16d-133b-47b0-b991-36cf11eff7d7',
    identityState: 'resolved',
    missingState: 'covered',
    evidenceState: 'direct_provider_evidence_with_official_release_support',
    conflictState: 'clear',
    timeZoneState: 'provider_date',
    revisionId: 'provider-revision:musicbrainz:fixture-v1',
    supersedesRevisionId: null,
  });
}

function persistenceInput(): ActivityExposurePersistenceInput {
  const observation = musicObservation();
  return Object.freeze({
    artistId: 'iu',
    provider: 'musicbrainz',
    providerArtistId: musicBrainzArtistId,
    eventFamily: 'release',
    startedAt: collectedAt,
    completedAt: '2026-09-25T00:00:01.000Z',
    providerItemCount: 1,
    boundedErrorMetadata: null,
    providerCoverage: Object.freeze({
      provider: 'musicbrainz',
      providerArtistId: musicBrainzArtistId,
      collectionStatus: 'succeeded',
      coverageState: 'covered',
      collectedAt,
    }),
    observations: Object.freeze([
      Object.freeze({
        observation,
        revisionId: 'provider-revision:musicbrainz:fixture-v1',
        normalizationOutcome: 'event_emitted' as const,
        rawPayloadCanonical: null,
      }),
    ]),
    events: Object.freeze([musicEvent()]),
  });
}

type Call = { sql: string; values?: readonly unknown[] };

function persistencePool(calls: Call[]): ActivityExposurePersistencePool {
  const client = {
    async query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]) {
      calls.push({ sql, values });
      if (sql.startsWith('INSERT INTO fandex.activity_exposure_collection_runs')) {
        return { rowCount: 1, rows: [{ run_id: 'x' }] as T[] };
      }
      return { rowCount: 1, rows: [] as T[] };
    },
    release() {},
  };
  return {
    async connect() { return client; },
    async query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]) {
      calls.push({ sql, values });
      return { rowCount: 0, rows: [] as T[] };
    },
  };
}

test('run identity is deterministic and binds explicit revision semantics', () => {
  const first = persistenceInput();
  const replay = structuredClone(first);
  assert.equal(
    buildActivityExposurePersistenceRunId(first),
    buildActivityExposurePersistenceRunId(replay),
  );

  const changed: ActivityExposurePersistenceInput = {
    ...first,
    observations: [
      {
        ...first.observations[0],
        revisionId: 'provider-revision:musicbrainz:fixture-v2',
      },
    ],
  };
  assert.notEqual(
    buildActivityExposurePersistenceRunId(first),
    buildActivityExposurePersistenceRunId(changed),
  );
});

test('repository writes run, observation, digest-only raw lineage, and event atomically', async () => {
  const calls: Call[] = [];
  const result = await persistActivityExposureCollection(
    persistenceInput(),
    persistencePool(calls),
  );

  assert.equal(result.status, 'applied');
  assert.equal(result.observationCount, 1);
  assert.equal(result.eventCount, 1);
  assert.equal(calls[0]?.sql, 'BEGIN');
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  assert.equal(
    calls.filter(({ sql }) =>
      sql.startsWith('INSERT INTO fandex.activity_exposure_provider_observations')
    ).length,
    1,
  );
  const rawCall = calls.find(({ sql }) =>
    sql.startsWith('INSERT INTO fandex.activity_exposure_raw_payloads')
  );
  assert.ok(rawCall);
  assert.equal(rawCall?.values?.[2], null);
  assert.equal(rawCall?.values?.[4], 'not_retained');
  assert.equal(
    calls.filter(({ sql }) =>
      sql.startsWith('INSERT INTO fandex.activity_exposure_events')
    ).length,
    1,
  );
  assert.equal(calls.some(({ sql }) => /DELETE|TRUNCATE/.test(sql)), false);
});

test('repository never infers revision identity or stores non-retained raw payload bytes', async () => {
  const valid = persistenceInput();
  const missingRevision: ActivityExposurePersistenceInput = {
    ...valid,
    observations: [
      {
        ...valid.observations[0],
        revisionId: '',
      },
    ],
  };
  await assert.rejects(
    persistActivityExposureCollection(missingRevision, persistencePool([])),
    /activity_exposure_observation_revision_invalid/,
  );

  const rawLeak: ActivityExposurePersistenceInput = {
    ...valid,
    observations: [
      {
        ...valid.observations[0],
        rawPayloadCanonical: '{"should":"not persist"}',
      },
    ],
  };
  await assert.rejects(
    persistActivityExposureCollection(rawLeak, persistencePool([])),
    /activity_exposure_nonretained_payload_present/,
  );
});

test('repository rolls back and redacts unexpected database failures', async () => {
  const calls: Call[] = [];
  const pool: ActivityExposurePersistencePool = {
    async connect() {
      return {
        async query<T = Record<string, unknown>>(sql: string) {
          calls.push({ sql });
          if (sql.startsWith('INSERT INTO fandex.activity_exposure_collection_runs')) {
            throw new Error('postgresql://secret@example.test/neondb');
          }
          return { rowCount: 1, rows: [] as T[] };
        },
        release() {},
      };
    },
    async query<T = Record<string, unknown>>() {
      return { rowCount: 0, rows: [] as T[] };
    },
  };

  let caught: unknown;
  try {
    await persistActivityExposureCollection(persistenceInput(), pool);
  } catch (error) {
    caught = error;
  }
  assert.equal(
    caught instanceof Error ? caught.message : '',
    'activity_exposure_repository_operation_failed',
  );
  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.doesNotMatch(JSON.stringify(caught), /secret|example\.test|neondb/);
});

test('shadow reader requires both provider coverage and returns non-numeric event stream', async () => {
  const pool = {
    async query<T = Record<string, unknown>>(sql: string) {
      if (sql.includes('activity_exposure_collection_runs')) {
        return {
          rowCount: 2,
          rows: [
            {
              provider: 'musicbrainz',
              provider_artist_id: musicBrainzArtistId,
              collection_status: 'succeeded',
              coverage_state: 'covered',
              collected_at: collectedAt,
            },
            {
              provider: 'youtube',
              provider_artist_id: 'UC3SyT4_WLHzN7JmHQwKQZww',
              collection_status: 'succeeded',
              coverage_state: 'covered',
              collected_at: collectedAt,
            },
          ] as T[],
        };
      }
      return {
        rowCount: 1,
        rows: [{
          event_record_id: 'e'.repeat(64),
          source_observation_id: 'a'.repeat(64),
          event_id: musicEvent().eventId,
          revision_id: musicEvent().revisionId,
          supersedes_revision_id: null,
          artist_id: 'iu',
          event_family: 'release',
          event_type: 'confirmed_release',
          lifecycle_state: 'observed',
          announced_at: null,
          scheduled_start_at: null,
          scheduled_end_at: null,
          occurred_at: '2024-01-01',
          occurred_at_precision: 'day',
          source_published_at: null,
          collected_at: collectedAt,
          source_provider: 'musicbrainz',
          source_entity_type: 'release-group',
          source_entity_id: musicEvent().sourceEntityId,
          canonical_family_id: musicEvent().canonicalFamilyId,
          provider_artist_id: musicBrainzArtistId,
          provider_artist_credits: musicEvent().providerArtistCredits,
          evidence_ref: musicEvent().evidenceRef,
          identity_state: 'resolved',
          missing_state: 'covered',
          evidence_state: musicEvent().evidenceState,
          conflict_state: 'clear',
          time_zone_state: 'provider_date',
        }] as T[],
      };
    },
  };

  const result = await readActivityExposureShadowProduct('iu', pool);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.model.publication, 'shadow');
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.events.length, 1);
  assert.deepEqual(
    result.model.events[0]?.storedEvidenceTrace,
    {
      eventRecordId: 'e'.repeat(64),
      sourceObservationId: 'a'.repeat(64),
    },
  );
  assert.equal('fact' in result.model, false);
  assert.equal('score' in result.model, false);
});

test('repository source contains no legacy numeric Activity output or arbitrary recency model', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile(
      new URL('../lib/server/ingestion/activityExposureRepository.ts', import.meta.url),
      'utf8',
    ),
  );
  assert.doesNotMatch(
    source,
    /\b(?:comebackActivityPoint|activityScore|weight|decay|activeWindowDays)\b/,
  );
});


test('stored evidence reader returns lineage metadata without raw payload bytes', async () => {
  const pool = {
    async query<T = Record<string, unknown>>() {
      return {
        rowCount: 1,
        rows: [{
          event_record_id: 'e'.repeat(64),
          event_id: musicEvent().eventId,
          event_revision_id: musicEvent().revisionId,
          source_observation_id: 'a'.repeat(64),
          source_provider: 'musicbrainz',
          source_entity_type: 'release-group',
          source_entity_id: musicEvent().sourceEntityId,
          evidence_ref: musicEvent().evidenceRef,
          observation_revision_id: 'provider-revision:musicbrainz:fixture-v1',
          normalization_outcome: 'event_emitted',
          response_captured_at: collectedAt,
          observation_collected_at: collectedAt,
          source_published_at: null,
          provider_observed_at: '2024-01-01',
          raw_payload_sha256: 'b'.repeat(64),
          retention_state: 'not_retained',
          retention_policy_version: 'musicbrainz-core-field-review-v1',
          retained_at: null,
          refresh_due_at: null,
          refreshed_at: null,
          evicted_at: null,
        }] as T[],
      };
    },
  };

  const result = await readActivityExposureStoredEvidence(
    {
      artistId: 'iu',
      eventRecordId: 'e'.repeat(64),
    },
    pool,
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.model.eventRecordId, 'e'.repeat(64));
  assert.equal(result.model.sourceObservationId, 'a'.repeat(64));
  assert.equal(result.model.providerObservedAt, '2024-01-01');
  assert.equal(result.model.rawPayloadSha256, 'b'.repeat(64));
  assert.equal(result.model.retentionState, 'not_retained');
  assert.equal('rawPayload' in result.model, false);
  assert.equal('raw_payload' in result.model, false);
});

test('stored evidence reader fails closed for invalid lineage ids', async () => {
  const pool = {
    async query<T = Record<string, unknown>>() {
      return {
        rowCount: 1,
        rows: [{
          event_record_id: 'e'.repeat(64),
          event_id: musicEvent().eventId,
          event_revision_id: musicEvent().revisionId,
          source_observation_id: 'not-a-digest',
          source_provider: 'musicbrainz',
          source_entity_type: 'release-group',
          source_entity_id: musicEvent().sourceEntityId,
          evidence_ref: musicEvent().evidenceRef,
          observation_revision_id: 'provider-revision:musicbrainz:fixture-v1',
          normalization_outcome: 'event_emitted',
          response_captured_at: collectedAt,
          observation_collected_at: collectedAt,
          source_published_at: null,
          provider_observed_at: '2024-01-01',
          raw_payload_sha256: 'b'.repeat(64),
          retention_state: 'not_retained',
          retention_policy_version: 'musicbrainz-core-field-review-v1',
          retained_at: null,
          refresh_due_at: null,
          refreshed_at: null,
          evicted_at: null,
        }] as T[],
      };
    },
  };

  const result = await readActivityExposureStoredEvidence(
    {
      artistId: 'iu',
      eventRecordId: 'e'.repeat(64),
    },
    pool,
  );

  assert.deepEqual(result, {
    status: 'data-issue',
    reason: 'invalid-lineage',
  });
});
