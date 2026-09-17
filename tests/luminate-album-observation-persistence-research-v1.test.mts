import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDirectAlbumObservation,
  DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
  type DirectAlbumObservationDraft,
} from '../lib/alternative-evidence/directAlbumProvider';
import type { LuminateFandexAuthorizationGrant } from '../lib/alternative-evidence/luminateAlbumAuthorizationResearch';
import {
  buildLuminateObservationStoredRow,
  type LuminateAlbumObservationStoredRow,
} from '../lib/alternative-evidence/luminateAlbumObservationIntakeResearch';
import {
  LUMINATE_ALBUM_OBSERVATION_PERSISTENCE_RESEARCH_DESCRIPTOR,
  persistLuminateAlbumObservationStoredRow,
} from '../lib/alternative-evidence/luminateAlbumObservationPersistenceResearch';
import {
  LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_ENV,
  LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_VALUE,
  parseLuminateAlbumResearchWriteArgs,
  runLuminateAlbumResearchWrite,
  type LuminateAlbumResearchWritePool,
} from '../scripts/ingestion/write-luminate-album-observation-research';

function grant(overrides: Partial<LuminateFandexAuthorizationGrant> = {}): LuminateFandexAuthorizationGrant {
  return {
    agreementKind: 'order-form',
    agreementEvidenceId: 'licensed-order-form-evidence',
    licenseActive: true,
    physicalProductSalesIncluded: 'expressly-allowed',
    authorizedTerritories: ['US'],
    apiOrDataShareAccess: 'expressly-allowed',
    recurringProgrammaticCollection: 'expressly-allowed',
    normalizedStorage: 'expressly-allowed',
    retentionDuringLicense: 'expressly-allowed',
    commercialProductUse: 'expressly-allowed',
    publicOutputMode: 'derived-metric-only',
    publicDerivedMetricPublication: 'expressly-allowed',
    publicRankingOrBenchmarking: 'not-addressed',
    rawRedistribution: 'not-addressed',
    postTerminationPolicy: 'delete-source-and-retract-provider-derived-output',
    postTerminationPolicyEvidenceId: 'licensed-termination-policy-evidence',
    ...overrides,
  };
}

function observation(overrides: Partial<DirectAlbumObservationDraft> = {}) {
  return buildDirectAlbumObservation({
    contractVersion: DIRECT_ALBUM_OBSERVATION_CONTRACT_VERSION,
    providerId: 'luminate-music',
    providerObservationId: 'luminate:test:iu:the-winning:us:first-week',
    providerArtistId: 'luminate:artist:iu',
    providerReleaseId: 'luminate:release:the-winning',
    providerEditionId: null,
    providerSkuId: null,
    fandexArtistId: 'iu',
    fandexReleaseId: 'research:iu:release:the-winning:2024-02-20',
    fandexReleaseFamilyId: 'research:iu:release-family:the-winning',
    semantic: 'first-week-sale',
    value: 250000,
    unit: 'physical-units',
    territory: 'US',
    format: 'physical',
    providerPeriod: '2024-02-20/2024-02-26',
    providerPublishedAt: null,
    observedAt: '2026-09-18T00:00:00.000Z',
    collectedAt: '2026-09-18T00:00:00.000Z',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'release-total',
    parentObservationId: null,
    syntheticFixture: false,
    ...overrides,
  });
}

function storedRow(overrides: Partial<DirectAlbumObservationDraft> = {}): LuminateAlbumObservationStoredRow {
  return buildLuminateObservationStoredRow({
    observation: observation(overrides),
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
  });
}

type QueryResponse = Readonly<{ rowCount: number | null; rows: any[] }>;

class ScriptedPool implements LuminateAlbumResearchWritePool {
  readonly calls: Array<Readonly<{ text: string; values?: readonly unknown[] }>> = [];
  private readonly responses: QueryResponse[];
  ended = false;

  constructor(responses: QueryResponse[]) {
    this.responses = [...responses];
  }

  async query<T = Record<string, unknown>>(text: string, values?: readonly unknown[]) {
    this.calls.push(Object.freeze({ text, values }));
    const next = this.responses.shift();
    if (!next) throw new Error('unexpected_query');
    return next as { rowCount: number | null; rows: T[] };
  }

  async end() {
    this.ended = true;
  }
}

function existingProjection(row: LuminateAlbumObservationStoredRow) {
  return {
    record_id: row.record_id,
    observation_id: row.observation_id,
    payload_digest: row.payload_digest,
    intake_plan_digest: row.intake_plan_digest,
    write_grant_digest: row.write_grant_digest,
    source_entity_id: row.source_entity_id,
    provider: row.provider,
    fandex_artist_id: row.fandex_artist_id,
    fandex_release_id: row.fandex_release_id,
    record_state: row.record_state,
    supersedes_record_id: row.supersedes_record_id,
  };
}

test('persistence descriptor is append-only and requires only SELECT + INSERT runtime privileges', () => {
  const descriptor = LUMINATE_ALBUM_OBSERVATION_PERSISTENCE_RESEARCH_DESCRIPTOR;
  assert.equal(descriptor.lifecycle, 'research');
  assert.equal(descriptor.appendOnly, true);
  assert.deepEqual(descriptor.allowedSqlMutations, ['insert']);
  assert.deepEqual(descriptor.runtimePrivilegesRequired, ['select', 'insert']);
  assert.equal(descriptor.updateAllowed, false);
  assert.equal(descriptor.deleteAllowed, false);
  assert.equal(descriptor.productionWritePath, false);
  assert.equal(descriptor.externalProviderCallIncluded, false);
});

test('new authorized stored row is inserted with parameterized append-only SQL', async () => {
  const row = storedRow();
  const pool = new ScriptedPool([
    { rowCount: 0, rows: [] },
    { rowCount: 1, rows: [{ record_id: row.record_id }] },
  ]);
  const result = await persistLuminateAlbumObservationStoredRow(pool, row);
  assert.equal(result.status, 'applied');
  assert.equal(pool.calls.length, 2);
  assert.match(pool.calls[0].text, /^SELECT /);
  assert.match(pool.calls[1].text, /^INSERT INTO fandex\.album_research_observation_records/);
  assert.match(pool.calls[1].text, /ON CONFLICT DO NOTHING/);
  assert.doesNotMatch(pool.calls[1].text, /\bUPDATE\b|\bDELETE\b/);
  assert.equal(pool.calls[1].values?.[0], row.record_id);
  assert.equal(pool.calls[1].values?.[5], row.observation_id);
});

test('exact replay is idempotent and performs no insert', async () => {
  const row = storedRow();
  const pool = new ScriptedPool([
    { rowCount: 1, rows: [existingProjection(row)] },
  ]);
  const result = await persistLuminateAlbumObservationStoredRow(pool, row);
  assert.equal(result.status, 'idempotent-existing');
  assert.equal(pool.calls.length, 1);
  assert.match(pool.calls[0].text, /^SELECT /);
});

test('same observation identity with different stored evidence is rejected as conflict', async () => {
  const row = storedRow();
  const conflicting = { ...existingProjection(row), payload_digest: 'b'.repeat(64) };
  const pool = new ScriptedPool([
    { rowCount: 1, rows: [conflicting] },
  ]);
  const result = await persistLuminateAlbumObservationStoredRow(pool, row);
  assert.equal(result.status, 'rejected-conflict');
  assert.equal(pool.calls.length, 1);
});

test('revision insert requires the exact stored predecessor and matching lineage', async () => {
  const original = storedRow();
  const revisedObservation = observation({
    providerObservationId: 'luminate:test:iu:the-winning:us:first-week:revision-1',
    value: 249500,
    revisionId: 'revision-1',
    revisionObservedAt: '2026-09-18T01:00:00.000Z',
    supersedesObservationId: original.observation_id,
    observedAt: '2026-09-18T01:00:00.000Z',
    collectedAt: '2026-09-18T01:00:00.000Z',
  });
  const revised = buildLuminateObservationStoredRow({
    observation: revisedObservation,
    releaseDate: '2024-02-20',
    grant: grant(),
    schemaProviderConstraintIncludesLuminate: true,
    supersedesStoredRecordId: original.record_id,
  });

  const missingPool = new ScriptedPool([
    { rowCount: 0, rows: [] },
    { rowCount: 0, rows: [] },
  ]);
  assert.equal((await persistLuminateAlbumObservationStoredRow(missingPool, revised)).status,
    'rejected-missing-predecessor');

  const mismatchedPool = new ScriptedPool([
    { rowCount: 0, rows: [] },
    { rowCount: 1, rows: [{ ...existingProjection(original), fandex_release_id: 'other-release' }] },
  ]);
  assert.equal((await persistLuminateAlbumObservationStoredRow(mismatchedPool, revised)).status,
    'rejected-predecessor-lineage-mismatch');
});

test('write command requires --apply, explicit approval, and a runtime-role database URL', async () => {
  assert.deepEqual(parseLuminateAlbumResearchWriteArgs(['--apply', '--input', 'fixture.json']), {
    inputPath: 'fixture.json',
  });
  assert.throws(() => parseLuminateAlbumResearchWriteArgs(['--input', 'fixture.json']),
    /luminate_album_research_write_argument_invalid/);

  await assert.rejects(
    runLuminateAlbumResearchWrite(
      ['--apply', '--input', 'fixture.json'],
      {},
      { readFileText: async () => '{}' },
    ),
    /luminate_album_research_write_approval_required/,
  );

  await assert.rejects(
    runLuminateAlbumResearchWrite(
      ['--apply', '--input', 'fixture.json'],
      { [LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_ENV]: LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_VALUE },
      { readFileText: async () => '{}' },
    ),
    /runtime_database_url_invalid/,
  );
});

test('write command rebuilds the intake-gated row and can apply through an injected append-only pool', async () => {
  const candidateObservation = observation();
  const candidateGrant = grant();
  const expected = buildLuminateObservationStoredRow({
    observation: candidateObservation,
    releaseDate: '2024-02-20',
    grant: candidateGrant,
    schemaProviderConstraintIncludesLuminate: true,
  });
  const pool = new ScriptedPool([
    { rowCount: 0, rows: [] },
    { rowCount: 1, rows: [{ record_id: expected.record_id }] },
  ]);
  const summary = await runLuminateAlbumResearchWrite(
    ['--apply', '--input', 'fixture.json'],
    {
      [LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_ENV]: LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_VALUE,
      FANDEX_RUNTIME_DATABASE_URL: 'postgresql://fandex_runtime:secret@example-pooler.test/neondb',
    },
    {
      readFileText: async () => JSON.stringify({
        observation: candidateObservation,
        releaseDate: '2024-02-20',
        grant: candidateGrant,
      }),
      poolFactory: () => pool,
    },
  );
  assert.equal(summary.mode, 'research-write');
  assert.equal(summary.provider, 'luminate-music');
  assert.equal(summary.status, 'applied');
  assert.equal(summary.recordId, expected.record_id);
  assert.equal(summary.observationId, expected.observation_id);
  assert.equal(pool.ended, true);
});
