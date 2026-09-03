import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDirectAlbumObservation } from '../lib/alternative-evidence/directAlbumProvider';
import {
  createAlbumResearchObservationIntakeGrant,
  planAlbumResearchObservationIntake,
  type AlbumResearchObservationRecord,
} from '../lib/server/ingestion/albumResearchObservationIntake';
import {
  createAlbumResearchPersistenceWriteGrant,
  executeAlbumResearchPersistenceWrite,
  type AlbumResearchPersistencePool,
} from '../lib/server/ingestion/albumResearchPersistenceWriter';

function observation(value = 100, revision?: Readonly<{ previousId: string; revisionId: string; at: string }>) {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: null,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8800000000001',
    fandexArtistId: 'artist-a',
    fandexReleaseId: 'release-a',
    fandexReleaseFamilyId: null,
    semantic: 'period-sale',
    value,
    unit: 'physical-units',
    territory: null,
    format: null,
    providerPeriod: '20260903',
    providerPublishedAt: null,
    observedAt: '2026-09-03T12:00:00.000Z',
    collectedAt: '2026-09-03T12:01:00.000Z',
    revisionId: revision?.revisionId ?? null,
    revisionObservedAt: revision?.at ?? null,
    supersedesObservationId: revision?.previousId ?? null,
    knowledgeMode: revision ? 'current-research' : 'as-known-at-collection',
    scopeRole: 'standalone',
    parentObservationId: null,
    syntheticFixture: false,
  });
}

function intake(observations: readonly ReturnType<typeof observation>[], existingRecords: readonly AlbumResearchObservationRecord[] = []) {
  const grant = createAlbumResearchObservationIntakeGrant({
    observations,
    authorizationEvidenceIds: ['test:research-intake-authorized'],
  });
  const result = planAlbumResearchObservationIntake({ observations, existingRecords, grant });
  assert.equal(result.status, 'planned');
  assert.ok(result.persistencePlan);
  return result;
}

type Stored = {
  record_id: string;
  source_entity_id: string;
  observation_id: string;
  payload_digest: string;
  record_state: 'original' | 'revised';
  supersedes_record_id: string | null;
  observation_payload: unknown;
};

function fakePool() {
  const rows = new Map<string, Stored>();
  const statements: string[] = [];
  const pool: AlbumResearchPersistencePool = {
    async connect() {
      return {
        async query<T = Record<string, unknown>>(sql: string, values: readonly unknown[] = []) {
          statements.push(sql.trim().split(/\s+/).slice(0, 3).join(' '));
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rowCount: null, rows: [] as T[] };
          }
          if (sql.includes('FROM fandex.album_research_observation_records') && sql.includes('WHERE record_id = $1')) {
            const row = rows.get(String(values[0]));
            return { rowCount: row ? 1 : 0, rows: (row ? [row] : []) as T[] };
          }
          if (sql.includes('INSERT INTO fandex.album_research_observation_records')) {
            const recordId = String(values[0]);
            if (rows.has(recordId)) return { rowCount: 0, rows: [] as T[] };
            rows.set(recordId, {
              record_id: recordId,
              source_entity_id: String(values[3]),
              observation_id: String(values[5]),
              payload_digest: String(values[6]),
              record_state: values[10] as 'original' | 'revised',
              supersedes_record_id: values[11] === null ? null : String(values[11]),
              observation_payload: JSON.parse(String(values[15])),
            });
            return { rowCount: 1, rows: [{ record_id: recordId }] as T[] };
          }
          throw new Error(`unexpected_sql:${sql}`);
        },
        release() {},
      };
    },
  };
  return { pool, rows, statements };
}

function writeGrant(result: ReturnType<typeof intake>) {
  return createAlbumResearchPersistenceWriteGrant({
    intakeResult: result,
    authorizationEvidenceIds: ['test:explicit-database-write-authorization'],
  });
}

test('writer remains blocked without an exact write grant and never connects', async () => {
  const planned = intake([observation()]);
  let connected = false;
  const pool: AlbumResearchPersistencePool = { async connect() { connected = true; throw new Error('should_not_connect'); } };
  const result = await executeAlbumResearchPersistenceWrite({ intakeResult: planned, grant: null, pool });
  assert.equal(result.status, 'blocked');
  assert.equal(result.databaseWrites, 0);
  assert.equal(connected, false);
});

test('writer inserts one research record transactionally and reports one database write', async () => {
  const obs = observation();
  const planned = intake([obs]);
  const db = fakePool();
  const result = await executeAlbumResearchPersistenceWrite({ intakeResult: planned, grant: writeGrant(planned), pool: db.pool });
  assert.equal(result.status, 'applied');
  assert.equal(result.insertedRecordCount, 1);
  assert.equal(result.databaseWrites, 1);
  assert.equal(db.rows.size, 1);
  assert.ok(db.statements.includes('BEGIN'));
  assert.ok(db.statements.includes('COMMIT'));
});

test('duplicate-noop verifies the exact stored payload and performs no new insert', async () => {
  const obs = observation();
  const first = intake([obs]);
  const db = fakePool();
  await executeAlbumResearchPersistenceWrite({ intakeResult: first, grant: writeGrant(first), pool: db.pool });
  const second = intake([obs], first.records);
  assert.equal(second.persistencePlan?.duplicateNoopCount, 1);
  const result = await executeAlbumResearchPersistenceWrite({ intakeResult: second, grant: writeGrant(second), pool: db.pool });
  assert.equal(result.status, 'idempotent-succeeded');
  assert.equal(result.insertedRecordCount, 0);
  assert.equal(result.duplicateVerifiedCount, 1);
  assert.equal(db.rows.size, 1);
});

test('explicit same-series revision appends a new row and preserves the original', async () => {
  const original = observation(100);
  const first = intake([original]);
  const db = fakePool();
  await executeAlbumResearchPersistenceWrite({ intakeResult: first, grant: writeGrant(first), pool: db.pool });

  const corrected = observation(120, {
    previousId: original.observationId,
    revisionId: 'revision-1',
    at: '2026-09-03T13:00:00.000Z',
  });
  const revised = intake([corrected], first.records);
  assert.equal(revised.persistencePlan?.revisionCount, 1);
  const result = await executeAlbumResearchPersistenceWrite({ intakeResult: revised, grant: writeGrant(revised), pool: db.pool });
  assert.equal(result.status, 'applied');
  assert.equal(result.revisionInsertedCount, 1);
  assert.equal(db.rows.size, 2);
  const storedRevision = [...db.rows.values()].find(row => row.observation_id === corrected.observationId);
  assert.equal(storedRevision?.supersedes_record_id, first.records[0].recordId);
  assert.equal(storedRevision?.record_state, 'revised');
});

test('write grant cannot authorize a different intake result', async () => {
  const left = intake([observation(100)]);
  const right = intake([observation(101)]);
  const db = fakePool();
  const result = await executeAlbumResearchPersistenceWrite({ intakeResult: right, grant: writeGrant(left), pool: db.pool });
  assert.equal(result.status, 'blocked');
  assert.equal(db.rows.size, 0);
});

test('database-side duplicate payload mismatch fails closed and rolls back', async () => {
  const obs = observation();
  const first = intake([obs]);
  const db = fakePool();
  await executeAlbumResearchPersistenceWrite({ intakeResult: first, grant: writeGrant(first), pool: db.pool });
  const row = db.rows.get(first.records[0].recordId)!;
  db.rows.set(row.record_id, { ...row, payload_digest: 'f'.repeat(64) });
  const second = intake([obs], first.records);
  await assert.rejects(
    () => executeAlbumResearchPersistenceWrite({ intakeResult: second, grant: writeGrant(second), pool: db.pool }),
    /album_research_writer_duplicate_conflict/,
  );
  assert.ok(db.statements.includes('ROLLBACK'));
});
