import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { applyPersistenceBundle, claimOutboxBatch, inspectPersistentPreState } from '../lib/server/persistence/adapter';
import {
  buildCanonicalPersistencePayload,
  classifyPersistenceReplay,
  deriveNormalizedPostDigest,
  derivePersistenceIdempotencyKey,
  deriveRequestPostDigest,
  MAX_SERIALIZATION_RETRIES,
  OUTBOX_MAX_ATTEMPTS,
  PERSISTENCE_CONTRACT_VERSION,
  V110_CLOSURE_LINEAGE,
  V112_V113_FOUNDATION_LINEAGE,
  redactDatabaseError,
  requireMigrationDatabaseUrl,
  requireRuntimeDatabaseUrl,
  sha256Canonical,
  validatePersistenceBundle,
  withSerializableRetries,
  type PersistenceBundle,
} from '../lib/server/persistence/contracts';
import { applyMigrationPlan } from '../scripts/database/run-postgres-migrations.mjs';

const migrationPath = new URL('../database/migrations/001_v114_managed_postgres_persistence.sql', import.meta.url);
const adapterPath = new URL('../lib/server/persistence/adapter.ts', import.meta.url);
const dbPath = new URL('../lib/server/persistence/db.ts', import.meta.url);
const runnerPath = new URL('../scripts/database/run-postgres-migrations.mts', import.meta.url);
const stagingValidatorPath = new URL('../scripts/database/validate-staging-v116.mts', import.meta.url);
const packagePath = new URL('../package.json', import.meta.url);

const fixtureBase: PersistenceBundle = {
  requestId: '4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283',
  internalSourceId: 'src_40f253cea60253b4f7b8d1e747f9cc87',
  idempotencyKey: '',
  canonicalPayloadDigest: '',
  v108ApplicationRecordDigest: 'f1f1c0c2abb6e2234b310c22ecea3986738d91566ca74ff2fd6f2cf98688a319',
  v110ClosureRecordDigest: '433ee79cceecce7c131318e8c43792f1e1a7e4459e101bafd389714073952731',
  v110CopiedClosedRequestDigest: '091946debd718c0c5d33fe75b8eb6f0eb9e0ee8c63ec9c71ea202e59516a18f2',
  foundationLineage: V112_V113_FOUNDATION_LINEAGE,
  expectedState: 'present',
  expectedNormalizedVersion: 1,
  expectedNormalizedDigest: 'bb873ca811508c71efddde599a57501bbf4a9c473d4672a57f5a1ddcaed35af0',
  expectedRequestVersion: 1,
  expectedRequestDigest: 'e66c8bc6d0831af5a9541646de80a4e370428c232b07b79d0435d21693da4833',
  normalizedPostDigest: '7b854bbb1fd3acc9278a58d27b3a7d799f1b84c52c778f9b84ddc3c504fc9644',
  requestPostDigest: '',
  normalized: {
    provider: 'naver', sourceType: 'news', officeCode: '117', articleId: '0004076125',
    title: '원이, 윈터, 원희…경상도 매력에 푹 빠져든다 [MD피플]',
    summary: '요즘 가요계에서 가장 핫한 여자 아이돌을 꼽으라면 리센느 원이, 에스파 윈터, 아일릿 원희를 빼놓을 수... 에스파 활동을 통해 글로벌 인기를 누리고 있는 윈터는 팬 소통 플랫폼과 예능 등에서 종종 부산 사투리를...',
    authorOrPublisher: '마이데일리', displayedSourceTimestamp: '2026-06-19 00:09:47',
    normalizedProviderTimestamp: '2026-06-19T00:10:00+09:00',
    contentSha256: '7b854bbb1fd3acc9278a58d27b3a7d799f1b84c52c778f9b84ddc3c504fc9644', recordVersion: 2,
  },
  normalizedV36: {
    internal_source_id: 'src_40f253cea60253b4f7b8d1e747f9cc87', provider_key: 'naver', source_type: 'news',
    artist_name: '에스파', artist_slug: 'aespa', external_source_id: '117/0004076125',
    source_url: 'https://www.mydaily.co.kr/page/view/2026061816093817264',
    title: '원이, 윈터, 원희…경상도 매력에 푹 빠져든다 [MD피플]',
    summary: '요즘 가요계에서 가장 핫한 여자 아이돌을 꼽으라면 리센느 원이, 에스파 윈터, 아일릿 원희를 빼놓을 수... 에스파 활동을 통해 글로벌 인기를 누리고 있는 윈터는 팬 소통 플랫폼과 예능 등에서 종종 부산 사투리를...',
    published_at: '2026-06-19T00:10:00+09:00', author_or_publisher: '마이데일리', collected_at: null,
    raw_row_number: 991, content_hash: '24d19cff5100528b54de9f1f905132a34b1c63064eff084cc727b4621c86185e',
  },
  evidence: {
    sourceUrl: 'https://www.mydaily.co.kr/page/view/2026061816093817264',
    exactHeadline: '원이, 윈터, 원희…경상도 매력에 푹 빠져든다 [MD피플]',
    publisher: '마이데일리', journalistByline: '김하영 기자', normalizedJournalist: '김하영',
    evidenceSha256: 'c2afc0d294ac82a6cda0739b9cb589080c09dede72664ed6f58a454de76db1b6',
    evidenceWidth: 1467, evidenceHeight: 317,
    verificationLineage: { v100: true }, acceptanceLineage: { v101: true },
  },
  request: { requestedFields: ['content_context', 'source_attribution'], closureRecordReference: 'v110_closure_fa95c7a9513cebe1d99f5cdd32f33285088137633037ab5e04d45d40270fb2ee', recordVersion: 2 },
  outbox: { eventType: 'source_persistence_applied', payload: { requestId: '4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283' } },
};

function fixture(): PersistenceBundle {
  const value = structuredClone(fixtureBase);
  value.requestPostDigest = deriveRequestPostDigest(value);
  value.idempotencyKey = derivePersistenceIdempotencyKey(value);
  value.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(value));
  return value;
}

function mockPool(handler: (sql: string, values?: readonly unknown[]) => Promise<{ rowCount: number; rows: Record<string, unknown>[] }>) {
  const calls: string[] = [];
  const query = async (sql: string, values?: readonly unknown[]) => {
    calls.push(sql);
    return handler(sql, values);
  };
  const client = { query, release() {} };
  return {
    calls,
    pool: { query, async connect() { return client; } } as unknown as Parameters<typeof applyPersistenceBundle>[1],
  };
}

function mockMigrationPool(handler: (sql: string, values?: readonly unknown[]) => Promise<{ rowCount: number; rows: Record<string, unknown>[] }>) {
  const calls: string[] = [];
  let ended = false;
  const query = async (sql: string, values?: readonly unknown[]) => {
    calls.push(sql);
    return handler(sql, values);
  };
  const client = { query, release() {} };
  return {
    calls,
    get ended() { return ended; },
    pool: {
      async connect() { return client; },
      async end() { ended = true; },
    } as unknown as NonNullable<Parameters<typeof applyMigrationPlan>[3]>,
  };
}

const migrationEnvironment = {
  NODE_ENV: 'test' as const,
  FANDEX_APPROVE_V114_MIGRATION: 'approved-v114-managed-postgres',
  FANDEX_MIGRATION_DATABASE_URL: 'postgresql://fandex_migrator:synthetic@ep-safe.example.test/neondb',
};
const runnerMigration = {
  version: 1,
  fileName: '001_test.sql',
  sha256: 'a'.repeat(64),
  sql: 'SELECT migration_body',
};

test('migration runner skips CREATE SCHEMA when fandex already exists', async () => {
  const mock = mockMigrationPool(async (sql) => {
    if (sql.includes('FROM pg_namespace')) return { rowCount: 1, rows: [{ schema_exists: true }] };
    if (sql.includes('SELECT migration_sha256')) return { rowCount: 1, rows: [{ migration_sha256: runnerMigration.sha256 }] };
    return { rowCount: 0, rows: [] };
  });

  await applyMigrationPlan([runnerMigration], migrationEnvironment, () => {}, mock.pool);

  assert.equal(mock.calls.filter((sql) => sql.startsWith('CREATE SCHEMA')).length, 0);
  assert.ok(mock.calls.some((sql) => sql.includes('FROM pg_namespace')));
  assert.ok(mock.calls.indexOf('SELECT pg_advisory_xact_lock($1::bigint)') < mock.calls.findIndex((sql) => sql.includes('FROM pg_namespace')));
  assert.ok(mock.calls.includes('ROLLBACK'));
  assert.equal(mock.ended, true);
});

test('migration runner creates a missing schema and rolls back apply failures', async () => {
  const mock = mockMigrationPool(async (sql) => {
    if (sql.includes('FROM pg_namespace')) return { rowCount: 1, rows: [{ schema_exists: false }] };
    if (sql.includes('SELECT migration_sha256')) return { rowCount: 0, rows: [] };
    if (sql === runnerMigration.sql) throw new Error('secret database detail');
    return { rowCount: 0, rows: [] };
  });

  await assert.rejects(applyMigrationPlan([runnerMigration], migrationEnvironment, () => {}, mock.pool), /secret database detail/);

  assert.equal(mock.calls.filter((sql) => sql === 'CREATE SCHEMA IF NOT EXISTS fandex').length, 1);
  assert.ok(mock.calls.includes(runnerMigration.sql));
  assert.ok(mock.calls.includes('ROLLBACK'));
  assert.equal(mock.ended, true);
});

test('migration runner preserves digest conflict fail-closed behavior', async () => {
  const mock = mockMigrationPool(async (sql) => {
    if (sql.includes('FROM pg_namespace')) return { rowCount: 1, rows: [{ schema_exists: true }] };
    if (sql.includes('SELECT migration_sha256')) return { rowCount: 1, rows: [{ migration_sha256: 'b'.repeat(64) }] };
    return { rowCount: 0, rows: [] };
  });

  await assert.rejects(applyMigrationPlan([runnerMigration], migrationEnvironment, () => {}, mock.pool), /migration_version_digest_conflict/);

  assert.equal(mock.calls.filter((sql) => sql === runnerMigration.sql).length, 0);
  assert.ok(mock.calls.includes('ROLLBACK'));
  assert.equal(mock.ended, true);
});

test('migration has a deterministic digest and complete schema', async () => {
  const text = (await readFile(migrationPath, 'utf8')).replace(/\r\n/g, '\n');
  const first = createHash('sha256').update(text, 'utf8').digest('hex');
  const second = createHash('sha256').update(text.replace(/\n/g, '\r\n').replace(/\r\n/g, '\n'), 'utf8').digest('hex');
  assert.equal(first, '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a');
  assert.equal(first, second);
  for (const table of ['schema_migrations','normalized_sources','historical_enrichment_requests','source_evidence_provenance','persistence_transactions','persistence_audit_events','ingestion_outbox']) assert.match(text, new RegExp(`fandex\\.${table}`));
});

test('migration excludes forbidden columns and enforces audit immutability', async () => {
  const sql = (await readFile(migrationPath, 'utf8')).toLowerCase();
  for (const column of ['full_article_body','professional_email','screenshot_binary','local_tmp_path']) assert.doesNotMatch(sql, new RegExp(`\\b${column}\\s+(text|bytea|jsonb)`));
  assert.match(sql, /before update or delete on fandex\.persistence_audit_events/);
  assert.match(sql, /revoke all on all tables in schema fandex from public/);
  assert.match(sql, /max_attempts integer not null default 8 check \(max_attempts = 8\)/);
});

test('exact fixture preserves U+2026 and publisher/byline roles', () => {
  const value = fixture();
  validatePersistenceBundle(value);
  assert.equal(PERSISTENCE_CONTRACT_VERSION, 'v120_exact_post_state_v1');
  assert.equal(value.idempotencyKey, '42321543a2d98f7add059c1d31c27581c7610767da8310832cba356819a52287');
  assert.equal(value.canonicalPayloadDigest, 'ea55b96781c0619edfdd57b483fcd69b9c4f1c6498da4dbf117b7202503c0118');
  assert.notEqual(value.idempotencyKey, V112_V113_FOUNDATION_LINEAGE.v112IdempotencyKey);
  assert.equal(buildCanonicalPersistencePayload(value).persistenceContractVersion, PERSISTENCE_CONTRACT_VERSION);
  assert.equal(value.requestId, '4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283');
  assert.equal(value.internalSourceId, 'src_40f253cea60253b4f7b8d1e747f9cc87');
  assert.equal(value.evidence.sourceUrl, 'https://www.mydaily.co.kr/page/view/2026061816093817264');
  assert.equal(value.normalized.title, '원이, 윈터, 원희…경상도 매력에 푹 빠져든다 [MD피플]');
  assert.equal(Array.from(value.normalized.summary).length, 121);
  assert.equal(value.normalized.summary.normalize('NFC'), value.normalized.summary);
  assert.equal(value.normalized.authorOrPublisher, '마이데일리');
  assert.equal(value.evidence.journalistByline, '김하영 기자');
  assert.equal(value.evidence.normalizedJournalist, '김하영');
  assert.equal(value.evidence.evidenceSha256, 'c2afc0d294ac82a6cda0739b9cb589080c09dede72664ed6f58a454de76db1b6');
  assert.equal(value.normalized.title.split('…').length - 1, 1);
  assert.equal(value.normalized.authorOrPublisher, value.evidence.publisher);
  assert.notEqual(value.evidence.publisher, value.evidence.normalizedJournalist);
  assert.equal(value.normalizedPostDigest, deriveNormalizedPostDigest(value));
  assert.equal(value.requestPostDigest, deriveRequestPostDigest(value));
  assert.equal(value.requestPostDigest, 'a20d64d9fda71eb2167a8e6e852a7e6d71e64d9c61bb6565a72a5ddd7ed0a3e5');
});

test('v110 closure lineage, post-state digests, and versions are bound fail-closed', () => {
  const value = fixture();
  assert.deepEqual(V110_CLOSURE_LINEAGE, {
    closureRecordId: 'v110_closure_fa95c7a9513cebe1d99f5cdd32f33285088137633037ab5e04d45d40270fb2ee',
    closureRecordDigest: '433ee79cceecce7c131318e8c43792f1e1a7e4459e101bafd389714073952731',
    copiedClosedRequestDigest: '091946debd718c0c5d33fe75b8eb6f0eb9e0ee8c63ec9c71ea202e59516a18f2',
  });

  const normalizedTamper = structuredClone(value);
  normalizedTamper.normalizedV36.summary = `${normalizedTamper.normalizedV36.summary} tampered`;
  normalizedTamper.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(normalizedTamper));
  assert.throws(() => validatePersistenceBundle(normalizedTamper), /normalized_post_digest_not_derived/);

  const closureTamper = structuredClone(value);
  closureTamper.request.closureRecordReference = 'v110_closure_' + 'f'.repeat(64);
  closureTamper.requestPostDigest = deriveRequestPostDigest(closureTamper);
  closureTamper.idempotencyKey = derivePersistenceIdempotencyKey(closureTamper);
  closureTamper.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(closureTamper));
  assert.throws(() => validatePersistenceBundle(closureTamper), /invalid_v110_closure_lineage/);

  const versionTamper = structuredClone(value);
  versionTamper.request.recordVersion += 1;
  versionTamper.requestPostDigest = deriveRequestPostDigest(versionTamper);
  versionTamper.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(versionTamper));
  assert.throws(() => validatePersistenceBundle(versionTamper), /invalid_record_version_transition/);
});

test('v112 and v113 foundation lineage is exact and fail-closed', () => {
  const value = fixture();
  assert.deepEqual(value.foundationLineage, {
    v112SchemaManifestDigest: '43a21a2bd9f7c48dfed78bb945ac6dfc8af03e00e911d851a56ada5509af83d0',
    v112MigrationPlanDigest: '3fc7891174e383153a9760c944fee1984f86409896438cf8d3d27067b1cae7cd',
    v112AtomicTransactionPlanDigest: 'd2bbd16891eb6e3b500be8d0154024723ed8cc25a8762ebea2c4a9ee61c39e53',
    v112RollbackPlanDigest: '46b3cbd0b3a3ed9a9ede14228b51727e433780cf143ec7fa5e403a1aad498956',
    v112IdempotencyKey: 'c177aa26b45692bdb3c442bc8f361f04d834c9d5108d90a6bcbd3e0e68ce7465',
    v113ProviderDescriptorDigest: '2b86b1730dcf4910dbcef05ae60a84a6214b424c810b5278b8fd3d2d630e2cc6',
  });
  const changed = structuredClone(value);
  (changed.foundationLineage as { v113ProviderDescriptorDigest: string }).v113ProviderDescriptorDigest = 'f'.repeat(64);
  changed.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(changed));
  assert.throws(() => validatePersistenceBundle(changed), /invalid_v112_v113_foundation_lineage/);
});

test('replay and conflict vocabulary is deterministic', () => {
  const value = fixture();
  assert.equal(classifyPersistenceReplay(value.canonicalPayloadDigest, value.canonicalPayloadDigest, 'applied'), 'idempotent_existing_result');
  assert.equal(classifyPersistenceReplay(value.canonicalPayloadDigest, 'f'.repeat(64), 'applied'), 'rejected_conflict');
});

test('adapter returns identical replay and conflicting replay without writes', async () => {
  const value = fixture();
  const replay = mockPool(async (sql) => {
    if (sql.includes('INSERT INTO fandex.persistence_transactions')) return { rowCount: 0, rows: [] };
    if (sql.includes('SELECT canonical_payload_digest')) return { rowCount: 1, rows: [{ canonical_payload_digest: value.canonicalPayloadDigest, status: 'applied', after_digests: { normalized: value.normalizedPostDigest, request: value.requestPostDigest } }] };
    return { rowCount: 0, rows: [] };
  });
  assert.equal((await applyPersistenceBundle(value, replay.pool)).status, 'idempotent_existing_result');
  assert.ok(replay.calls.includes('ROLLBACK'));

  const conflict = mockPool(async (sql) => {
    if (sql.includes('INSERT INTO fandex.persistence_transactions')) return { rowCount: 0, rows: [] };
    if (sql.includes('SELECT canonical_payload_digest')) return { rowCount: 1, rows: [{ canonical_payload_digest: 'f'.repeat(64), status: 'applied', after_digests: null }] };
    return { rowCount: 0, rows: [] };
  });
  assert.equal((await applyPersistenceBundle(value, conflict.pool)).status, 'rejected_conflict');
});

test('adapter rejects stale state and rolls back transaction failures', async () => {
  const value = fixture();
  const stale = mockPool(async (sql) => {
    if (sql.includes('INSERT INTO fandex.persistence_transactions')) return { rowCount: 1, rows: [] };
    if (sql.includes('SELECT record_version, content_sha256')) return { rowCount: 1, rows: [{ record_version: '99', content_sha256: value.expectedNormalizedDigest }] };
    if (sql.includes('SELECT record_version, state_sha256')) return { rowCount: 1, rows: [{ record_version: String(value.expectedRequestVersion), state_sha256: value.expectedRequestDigest, request_state: 'open', requested_fields: value.request.requestedFields }] };
    return { rowCount: 0, rows: [] };
  });
  assert.equal((await applyPersistenceBundle(value, stale.pool)).status, 'rejected_stale_state');
  assert.ok(stale.calls.includes('ROLLBACK'));

  const failure = mockPool(async (sql) => {
    if (sql.includes('SELECT record_version, content_sha256')) throw new Error('secret database detail');
    return { rowCount: 0, rows: [] };
  });
  const result = await applyPersistenceBundle(value, failure.pool);
  assert.equal(result.status, 'failed_rolled_back');
  assert.deepEqual(result.error, { code: 'database_operation_failed' });
  assert.ok(failure.calls.includes('ROLLBACK'));
});

test('adapter rejects mismatched requested fields before persistence writes', async () => {
  const value = fixture();
  const mismatch = mockPool(async (sql) => {
    if (sql.includes('SELECT canonical_payload_digest')) return { rowCount: 0, rows: [] };
    if (sql.includes('SELECT record_version, content_sha256')) return { rowCount: 1, rows: [{ record_version: String(value.expectedNormalizedVersion), content_sha256: value.expectedNormalizedDigest }] };
    if (sql.includes('SELECT record_version, state_sha256')) return { rowCount: 1, rows: [{ record_version: String(value.expectedRequestVersion), state_sha256: value.expectedRequestDigest, request_state: 'open', requested_fields: ['source_attribution', 'content_context'] }] };
    return { rowCount: 1, rows: [] };
  });

  assert.equal((await applyPersistenceBundle(value, mismatch.pool)).status, 'rejected_stale_state');
  assert.equal(mismatch.calls.filter((sql) => sql.includes('INSERT INTO fandex.persistence_transactions')).length, 0);
  assert.equal(mismatch.calls.filter((sql) => sql.includes('UPDATE fandex.historical_enrichment_requests')).length, 0);
  assert.ok(mismatch.calls.includes('ROLLBACK'));
});

test('request CAS and postcondition preserve exact requested fields', async () => {
  const value = fixture();
  const requestUpdateValues: unknown[][] = [];
  const success = mockPool(async (sql, values) => {
    if (sql.includes('SELECT canonical_payload_digest')) return { rowCount: 0, rows: [] };
    if (sql.includes('FOR UPDATE') && sql.includes('normalized_sources')) return { rowCount: 1, rows: [{ record_version: String(value.expectedNormalizedVersion), content_sha256: value.expectedNormalizedDigest }] };
    if (sql.includes('FOR UPDATE') && sql.includes('historical_enrichment_requests')) return { rowCount: 1, rows: [{ record_version: String(value.expectedRequestVersion), state_sha256: value.expectedRequestDigest, request_state: 'open', requested_fields: value.request.requestedFields }] };
    if (sql.includes('UPDATE fandex.historical_enrichment_requests')) requestUpdateValues.push([...(values ?? [])]);
    if (sql.includes('SELECT record_version, content_sha256') && !sql.includes('FOR UPDATE')) return { rowCount: 1, rows: [{ record_version: String(value.normalized.recordVersion), content_sha256: value.normalizedPostDigest }] };
    if (sql.includes('SELECT record_version, state_sha256, request_state, requested_fields')) return { rowCount: 1, rows: [{ record_version: String(value.request.recordVersion), state_sha256: value.requestPostDigest, request_state: 'closed', requested_fields: value.request.requestedFields, persistent_fulfilled: true, persistent_closed: true, closure_record_reference: value.request.closureRecordReference }] };
    return { rowCount: 1, rows: [] };
  });

  assert.equal((await applyPersistenceBundle(value, success.pool)).status, 'applied');
  assert.equal(requestUpdateValues.length, 1);
  assert.deepEqual(requestUpdateValues[0]?.[7], value.request.requestedFields);
  assert.ok(success.calls.some((sql) => sql.includes('requested_fields=$8::text[]')));

  const tamperedPostcondition = mockPool(async (sql) => {
    if (sql.includes('SELECT canonical_payload_digest')) return { rowCount: 0, rows: [] };
    if (sql.includes('FOR UPDATE') && sql.includes('normalized_sources')) return { rowCount: 1, rows: [{ record_version: String(value.expectedNormalizedVersion), content_sha256: value.expectedNormalizedDigest }] };
    if (sql.includes('FOR UPDATE') && sql.includes('historical_enrichment_requests')) return { rowCount: 1, rows: [{ record_version: String(value.expectedRequestVersion), state_sha256: value.expectedRequestDigest, request_state: 'open', requested_fields: value.request.requestedFields }] };
    if (sql.includes('SELECT record_version, content_sha256') && !sql.includes('FOR UPDATE')) return { rowCount: 1, rows: [{ record_version: String(value.normalized.recordVersion), content_sha256: value.normalizedPostDigest }] };
    if (sql.includes('SELECT record_version, state_sha256, request_state, requested_fields')) return { rowCount: 1, rows: [{ record_version: String(value.request.recordVersion), state_sha256: value.requestPostDigest, request_state: 'closed', requested_fields: ['content_context'], persistent_fulfilled: true, persistent_closed: true, closure_record_reference: value.request.closureRecordReference }] };
    return { rowCount: 1, rows: [] };
  });

  const tampered = await applyPersistenceBundle(value, tamperedPostcondition.pool);
  assert.equal(tampered.status, 'failed_rolled_back');
  assert.deepEqual(tampered.error, { code: 'database_operation_failed' });
  assert.ok(tamperedPostcondition.calls.includes('ROLLBACK'));
});

test('expected absent bootstraps source and request atomically and rejects existing rows', async () => {
  const absent = fixture();
  absent.expectedState = 'absent';
  absent.expectedNormalizedDigest = absent.normalizedPostDigest;
  absent.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(absent));

  const success = mockPool(async (sql) => {
    if (sql.includes('SELECT canonical_payload_digest')) return { rowCount: 0, rows: [] };
    if (sql.includes('FOR UPDATE') && sql.includes('normalized_sources')) return { rowCount: 0, rows: [] };
    if (sql.includes('FOR UPDATE') && sql.includes('historical_enrichment_requests')) return { rowCount: 0, rows: [] };
    if (sql.includes('SELECT record_version, content_sha256') && !sql.includes('FOR UPDATE')) return { rowCount: 1, rows: [{ record_version: String(absent.normalized.recordVersion), content_sha256: absent.normalizedPostDigest }] };
    if (sql.includes('SELECT record_version, state_sha256, request_state, requested_fields')) return { rowCount: 1, rows: [{ record_version: String(absent.request.recordVersion), state_sha256: absent.requestPostDigest, request_state: 'closed', requested_fields: absent.request.requestedFields, persistent_fulfilled: true, persistent_closed: true, closure_record_reference: absent.request.closureRecordReference }] };
    return { rowCount: 1, rows: [] };
  });
  assert.equal((await applyPersistenceBundle(absent, success.pool)).status, 'applied');
  assert.equal(success.calls.filter((sql) => sql.includes('INSERT INTO fandex.normalized_sources')).length, 1);
  assert.equal(success.calls.filter((sql) => sql.includes('INSERT INTO fandex.historical_enrichment_requests')).length, 1);

  const existing = mockPool(async (sql) => {
    if (sql.includes('SELECT canonical_payload_digest')) return { rowCount: 0, rows: [] };
    if (sql.includes('FOR UPDATE') && sql.includes('normalized_sources')) return { rowCount: 1, rows: [{ record_version: '1', content_sha256: absent.expectedNormalizedDigest }] };
    if (sql.includes('FOR UPDATE') && sql.includes('historical_enrichment_requests')) return { rowCount: 0, rows: [] };
    return { rowCount: 1, rows: [] };
  });
  assert.equal((await applyPersistenceBundle(absent, existing.pool)).status, 'rejected_stale_state');
  assert.equal(existing.calls.filter((sql) => sql.includes('INSERT INTO fandex.normalized_sources')).length, 0);
});

test('unexpected normalized fields fail closed before SQL', async () => {
  const changed = fixture() as PersistenceBundle & { normalized: PersistenceBundle['normalized'] & { unauthorized?: string } };
  changed.normalized.unauthorized = 'blocked';
  changed.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(changed));
  const pool = mockPool(async () => ({ rowCount: 0, rows: [] }));
  assert.equal((await applyPersistenceBundle(changed, pool.pool)).status, 'rejected_conflict');
  assert.equal(pool.calls.length, 0);
});

test('serialization retries are bounded to three retries', async () => {
  let calls = 0;
  await assert.rejects(withSerializableRetries(async () => { calls += 1; throw Object.assign(new Error('hidden'), { code: '40001' }); }));
  assert.equal(MAX_SERIALIZATION_RETRIES, 3);
  assert.equal(calls, 4);
});

test('missing runtime URL fails closed and errors are redacted', () => {
  assert.throws(() => requireRuntimeDatabaseUrl({ NODE_ENV: 'test' }), /runtime_database_url_invalid/);
  assert.throws(() => requireMigrationDatabaseUrl({ NODE_ENV: 'test' }), /migration_database_url_invalid/);
  assert.deepEqual(redactDatabaseError(Object.assign(new Error('postgres://secret'), { detail: 'password', code: 'XX000' })), { code: 'database_operation_failed' });
});

test('runtime and migration environment boundaries do not cross', async () => {
  const db = await readFile(dbPath, 'utf8');
  const runner = await readFile(runnerPath, 'utf8');
  assert.match(db, /import 'server-only'/);
  assert.match(db, /requireRuntimeDatabaseUrl\(process\.env\)/);
  assert.doesNotMatch(db, /DATABASE_URL(?:_UNPOOLED)?/);
  assert.match(runner, /requireMigrationDatabaseUrl\(environment\)/);
  assert.doesNotMatch(runner, /environment\.DATABASE_URL(?:_UNPOOLED)?/);
  assert.match(runner, /argv\.includes\('--apply'\)/);
  assert.match(runner, /FANDEX_APPROVE_V114_MIGRATION/);
});

test('adapter SQL is parameterized, atomic, rollback-safe, and SKIP LOCKED', async () => {
  const adapter = await readFile(adapterPath, 'utf8');
  assert.match(adapter, /BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(adapter, /SELECT record_version, content_sha256[\s\S]+FOR UPDATE/);
  assert.match(adapter, /ROLLBACK/);
  assert.match(adapter, /COMMIT/);
  assert.match(adapter, /FOR UPDATE SKIP LOCKED/);
  assert.match(adapter, /normalized_postcondition_failed/);
  assert.match(adapter, /request_postcondition_failed/);
  assert.match(adapter, /outbox_append_conflict/);
  assert.match(adapter, /\$1/);
  assert.doesNotMatch(adapter, /\$\{bundle\./);
});

test('persistent pre-state is read in one statement-level snapshot', async () => {
  const state = mockPool(async (sql) => {
    assert.match(sql, /normalized_sources/);
    assert.match(sql, /historical_enrichment_requests/);
    return {
      rowCount: 1,
      rows: [{
        normalized_state: { recordVersion: '2', stateDigest: 'a'.repeat(64) },
        request_state: { recordVersion: '3', stateDigest: 'b'.repeat(64), requestState: 'open', requestedFields: ['content_context', 'source_attribution'] },
      }],
    };
  });
  const result = await inspectPersistentPreState('request', 'source', state.pool);
  assert.equal(state.calls.length, 1);
  assert.deepEqual(result, {
    normalized: { recordVersion: 2, stateDigest: 'a'.repeat(64) },
    request: { recordVersion: 3, stateDigest: 'b'.repeat(64), requestState: 'open', requestedFields: ['content_context', 'source_attribution'] },
  });
});

test('outbox claim terminalizes an expired final-attempt lease before claiming work', async () => {
  const outbox = mockPool(async (sql) => {
    assert.match(sql, /WITH terminal_candidates AS/);
    assert.match(sql, /terminal_expired AS/);
    assert.match(sql, /status='dead_letter'/);
    assert.match(sql, /lease_expired_at_attempt_limit/);
    assert.match(sql, /attempt_count >= max_attempts/);
    assert.match(sql, /attempt_count < max_attempts/);
    assert.match(sql, /ORDER BY updated_at, outbox_id/);
    assert.equal(sql.match(/FOR UPDATE SKIP LOCKED LIMIT \$1/g)?.length, 2);
    return {
      rowCount: 1,
      rows: [{
        outbox_id: 'event-1', idempotency_key: 'a'.repeat(64), event_type: 'source_persistence_applied',
        bounded_payload: { requestId: 'request' }, attempt_count: 1,
      }],
    };
  });
  const claimed = await claimOutboxBatch('worker', 1, 30, outbox.pool);
  assert.equal(outbox.calls.length, 1);
  assert.deepEqual(claimed, [{
    outboxId: 'event-1', idempotencyKey: 'a'.repeat(64), eventType: 'source_persistence_applied',
    payload: { requestId: 'request' }, attemptCount: 1, leaseOwner: 'worker',
  }]);
});

test('v116 legacy staging state is classified before any current-contract write', async () => {
  const validator = await readFile(stagingValidatorPath, 'utf8');
  assert.match(validator, /legacyIdempotencyKey = V112_V113_FOUNDATION_LINEAGE\.v112IdempotencyKey/);
  assert.match(validator, /bundle\.idempotencyKey === legacyIdempotencyKey/);
  assert.match(validator, /legacy_payload_digest === legacyCanonicalPayloadDigest/);
  assert.match(validator, /legacy_v116_state_requires_fresh_branch/);
  assert.match(validator, /if \(legacyStateRequiresFreshBranch\) throw new Error\('legacy_v116_state_requires_fresh_branch'\)/);
});

test('outbox claim model has zero concurrent duplicates and dead-letters at eight', async () => {
  const pending = new Set(['event-1']);
  const claim = () => { const item = pending.values().next().value as string | undefined; if (item) pending.delete(item); return item; };
  const [left, right] = await Promise.all([Promise.resolve().then(claim), Promise.resolve().then(claim)]);
  assert.equal([left, right].filter(Boolean).length, 1);
  assert.equal(OUTBOX_MAX_ATTEMPTS, 8);
  const status = (attempt: number) => attempt >= OUTBOX_MAX_ATTEMPTS ? 'dead_letter' : 'retryable_failed';
  assert.equal(status(7), 'retryable_failed');
  assert.equal(status(8), 'dead_letter');
});

test('migration is not part of build or start', async () => {
  const pkg = JSON.parse(await readFile(packagePath, 'utf8')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts.build, 'next build');
  assert.equal(pkg.scripts.start, 'next start');
  assert.doesNotMatch(`${pkg.scripts.build} ${pkg.scripts.start}`, /migrat|database|postgres/i);
});
