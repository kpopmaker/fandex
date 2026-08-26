import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

import {
  applyPersistenceBundle,
  claimOutboxBatch,
  completeOutboxEvent,
} from '../../lib/server/persistence/adapter';
import {
  buildCanonicalPersistencePayload,
  deriveRequestPostDigest,
  derivePersistenceIdempotencyKey,
  sha256Canonical,
  V112_V113_FOUNDATION_LINEAGE,
  type PersistenceBundle,
} from '../../lib/server/persistence/contracts';
import { applyMigrationPlan, loadMigrationPlan } from './run-postgres-migrations.mjs';

const ENV_PATH = resolve('tmp/source-sandbox/v116-staging/.env.preview.local');
const MIGRATION_APPROVAL = 'approved-v114-managed-postgres';
const EXPECTED_MIGRATION_SHA256 = '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a';
const V115_COMMIT = 'bf2b35a1054ffd545e273edc6797d0d8d57844a6';
const V115_LOCK_SHA256 = 'aceab7ea86c26b96ae0c564920c5e5b0f1d0dd58366c25ed219849056c62fdfc';
const TABLES = ['historical_enrichment_requests','ingestion_outbox','normalized_sources','persistence_audit_events','persistence_transactions','schema_migrations','source_evidence_provenance'];
let validationStage = 'initialization';

function setStage(stage: string): void {
  validationStage = stage;
  process.stderr.write(`STAGE: ${stage}\n`);
}

const stagingAttestation = Object.freeze({
  provider: 'neon', resource: 'fandex-managed-postgres', branch: 'staging-v116', parent: 'main',
  region: 'AWS Asia Pacific 1 Singapore', postgresqlVersion: 18, autoDeleteAfterDays: 7,
  vercelEnvironment: 'Preview', previewVariablesSensitive: true,
  productionVariablesSeparate: true, productionSecretReadCount: 0,
});

type Counts = { query: number; read: number; write: number; control: number };

function recordQuery(counts: Counts, sql: string): void {
  counts.query += 1;
  const normalized = sql.trim().toUpperCase();
  if (/^(BEGIN|COMMIT|ROLLBACK)/.test(normalized)) counts.control += 1;
  else if (normalized.startsWith('SELECT') && !normalized.includes('PG_ADVISORY')) counts.read += 1;
  else counts.write += 1;
}

function safeDatabaseStep(sql: string): string | null {
  const normalized = sql.trim().replace(/\s+/g, ' ').toUpperCase();
  if (normalized.startsWith('BEGIN ISOLATION')) return 'transaction_begin';
  if (normalized.startsWith('SET LOCAL LOCK_TIMEOUT')) return 'transaction_lock_timeout';
  if (normalized.startsWith('SET LOCAL STATEMENT_TIMEOUT')) return 'transaction_statement_timeout';
  if (normalized.includes('PG_ADVISORY_XACT_LOCK')) return 'transaction_advisory_lock';
  if (normalized.startsWith('SELECT CANONICAL_PAYLOAD_DIGEST')) return 'transaction_replay_lookup';
  if (normalized === 'ROLLBACK') return 'transaction_rollback';
  if (normalized === 'COMMIT') return 'transaction_commit';
  return null;
}

class CountedPool {
  constructor(private readonly pool: Pool, private readonly counts: Counts) {}
  async query<T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<QueryResult<T>> {
    recordQuery(this.counts, text);
    return this.pool.query<T>(text, values as unknown[] | undefined);
  }
  async connect(): Promise<PoolClient> {
    const client = await this.pool.connect();
    const query = client.query.bind(client);
    const counts = this.counts;
    return new Proxy(client, {
      get(target, property, receiver) {
        if (property === 'query') {
          return ((text: string, values?: readonly unknown[]) => {
            recordQuery(counts, text);
            const step = safeDatabaseStep(text);
            if (step) process.stderr.write(`DB_STEP: ${step}\n`);
            return query(text, values as unknown[] | undefined);
          }) as PoolClient['query'];
        }
        if (property === 'release') return target.release.bind(target);
        return Reflect.get(target, property, receiver);
      },
    }) as PoolClient;
  }
  async end(): Promise<void> { await this.pool.end(); }
}

function requireSecret(key: 'FANDEX_RUNTIME_DATABASE_URL' | 'FANDEX_MIGRATION_DATABASE_URL'): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key}_missing`);
  return value;
}

function exactBundle(): PersistenceBundle {
  const bundle: PersistenceBundle = {
    requestId: '4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283',
    internalSourceId: 'src_40f253cea60253b4f7b8d1e747f9cc87',
    idempotencyKey: '', canonicalPayloadDigest: '', expectedState: 'absent',
    v108ApplicationRecordDigest: 'f1f1c0c2abb6e2234b310c22ecea3986738d91566ca74ff2fd6f2cf98688a319',
    v110ClosureRecordDigest: '433ee79cceecce7c131318e8c43792f1e1a7e4459e101bafd389714073952731',
    v110CopiedClosedRequestDigest: '091946debd718c0c5d33fe75b8eb6f0eb9e0ee8c63ec9c71ea202e59516a18f2',
    foundationLineage: V112_V113_FOUNDATION_LINEAGE,
    expectedNormalizedVersion: 1,
    expectedNormalizedDigest: '7b854bbb1fd3acc9278a58d27b3a7d799f1b84c52c778f9b84ddc3c504fc9644',
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
      exactHeadline: '원이, 윈터, 원희…경상도 매력에 푹 빠져든다 [MD피플]', publisher: '마이데일리',
      journalistByline: '김하영 기자', normalizedJournalist: '김하영',
      evidenceSha256: 'c2afc0d294ac82a6cda0739b9cb589080c09dede72664ed6f58a454de76db1b6',
      evidenceWidth: 1467, evidenceHeight: 317,
      verificationLineage: { v100: 'verified' }, acceptanceLineage: { v101: 'accepted' },
    },
    request: { requestedFields: ['content_context','source_attribution'], closureRecordReference: 'v110_closure_fa95c7a9513cebe1d99f5cdd32f33285088137633037ab5e04d45d40270fb2ee', recordVersion: 2 },
    outbox: { eventType: 'source_persistence_applied', payload: { requestId: '4788f3059b8b0a5b111aafd475c1ff3a6fa47dc60be690236a2603001735f283' } },
  };
  bundle.requestPostDigest = deriveRequestPostDigest(bundle);
  bundle.idempotencyKey = derivePersistenceIdempotencyKey(bundle);
  bundle.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(bundle));
  return bundle;
}

function buildV116LegacyCanonicalPayload(bundle: PersistenceBundle) {
  return {
    requestId: bundle.requestId,
    internalSourceId: bundle.internalSourceId,
    expectedNormalizedVersion: bundle.expectedNormalizedVersion,
    expectedNormalizedDigest: bundle.expectedNormalizedDigest,
    expectedRequestVersion: bundle.expectedRequestVersion,
    expectedRequestDigest: bundle.expectedRequestDigest,
    normalizedPostDigest: bundle.normalizedPostDigest,
    requestPostDigest: bundle.v110CopiedClosedRequestDigest,
    normalized: bundle.normalized,
    evidence: bundle.evidence,
    request: bundle.request,
    outbox: bundle.outbox,
    v108ApplicationRecordDigest: bundle.v108ApplicationRecordDigest,
    v110ClosureRecordDigest: bundle.v110ClosureRecordDigest,
    foundationLineage: bundle.foundationLineage,
    expectedState: bundle.expectedState,
    normalizedV36: bundle.normalizedV36,
  };
}

function changedBundle(base: PersistenceBundle, summary: string): PersistenceBundle {
  const bundle = structuredClone(base);
  bundle.expectedState = 'present';
  bundle.normalized.summary = summary;
  bundle.normalizedV36.summary = summary;
  bundle.normalizedPostDigest = sha256Canonical(bundle.normalizedV36);
  bundle.normalized.contentSha256 = bundle.normalizedPostDigest;
  bundle.idempotencyKey = derivePersistenceIdempotencyKey(bundle);
  bundle.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(bundle));
  return bundle;
}

async function main(): Promise<void> {
  setStage('preview_environment_load');
  const injectedPreview = process.argv.includes('--injected-preview');
  if (injectedPreview) {
    if (process.env.VERCEL_ENV !== 'preview') throw new Error('preview_environment_not_injected');
  } else {
    delete process.env.FANDEX_RUNTIME_DATABASE_URL;
    delete process.env.FANDEX_MIGRATION_DATABASE_URL;
    loadEnvFile(ENV_PATH);
  }
  setStage('preview_environment_key_validation');
  const pooledUrl = requireSecret('FANDEX_RUNTIME_DATABASE_URL');
  const unpooledUrl = requireSecret('FANDEX_MIGRATION_DATABASE_URL');
  const bundle = exactBundle();
  const legacyIdempotencyKey = V112_V113_FOUNDATION_LINEAGE.v112IdempotencyKey;
  const legacyCanonicalPayloadDigest = sha256Canonical(buildV116LegacyCanonicalPayload(bundle));
  if (bundle.idempotencyKey === legacyIdempotencyKey) throw new Error('idempotency_contract_not_versioned');
  setStage('v115_lineage_validation');
  const lockBytes = await readFile('package-lock.json');
  if (createHash('sha256').update(lockBytes).digest('hex') !== V115_LOCK_SHA256 || V115_COMMIT.length !== 40) throw new Error('v115_lineage_mismatch');

  const counts: Counts = { query: 0, read: 0, write: 0, control: 0 };
  setStage('bounded_read_only_preflight');
  const preflightPool = new CountedPool(new Pool({ connectionString: unpooledUrl, max: 1, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10_000, statement_timeout: 30_000 }), counts);
  const firstQuery = await preflightPool.query<{ server_major: number; transaction_read_only: string; schema_exists: boolean; migrations_exists: boolean }>(
    `SELECT current_setting('server_version_num')::integer / 10000 AS server_major,
      current_setting('transaction_read_only') AS transaction_read_only,
      EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='fandex') AS schema_exists,
      to_regclass('fandex.schema_migrations') IS NOT NULL AS migrations_exists`,
  );
  const preflight = firstQuery.rows[0];
  let recoveredAuthorizedApplication = false;
  let legacyStateRequiresFreshBranch = false;
  if (!preflight || preflight.server_major !== stagingAttestation.postgresqlVersion || preflight.transaction_read_only !== 'off' || preflight.schema_exists !== preflight.migrations_exists) throw new Error('staging_preflight_failed');
  if (preflight.migrations_exists) {
    const existing = await preflightPool.query<{ version: string; migration_sha256: string }>('SELECT version, migration_sha256 FROM fandex.schema_migrations ORDER BY version');
    if (existing.rows.length !== 1 || Number(existing.rows[0].version) !== 1 || existing.rows[0].migration_sha256 !== EXPECTED_MIGRATION_SHA256) throw new Error('unexpected_existing_migration');
    const targets = await preflightPool.query<{
      source_count: string; request_count: string; provenance_count: string; transaction_count: string;
      audit_count: string; outbox_count: string; source_digest: string | null; source_version: string | null;
      source_title: string | null; source_publisher: string | null; request_state: string | null;
      request_fulfilled: boolean | null; request_closed: boolean | null; request_digest: string | null;
      request_version: string | null; request_closure: string | null; evidence_digest: string | null;
      evidence_headline: string | null; evidence_publisher: string | null; evidence_byline: string | null;
      payload_digest: string | null; transaction_status: string | null; outbox_status: string | null;
      legacy_transaction_count: string; legacy_audit_count: string; legacy_outbox_count: string;
      legacy_payload_digest: string | null; legacy_transaction_status: string | null; legacy_outbox_status: string | null;
    }>(`SELECT
      (SELECT count(*) FROM fandex.normalized_sources WHERE internal_source_id=$1)::text AS source_count,
      (SELECT count(*) FROM fandex.historical_enrichment_requests WHERE request_id=$2)::text AS request_count,
      (SELECT count(*) FROM fandex.source_evidence_provenance WHERE internal_source_id=$1)::text AS provenance_count,
      (SELECT count(*) FROM fandex.persistence_transactions WHERE idempotency_key=$3)::text AS transaction_count,
      (SELECT count(*) FROM fandex.persistence_audit_events WHERE idempotency_key=$3)::text AS audit_count,
      (SELECT count(*) FROM fandex.ingestion_outbox WHERE idempotency_key=$3)::text AS outbox_count,
      (SELECT count(*) FROM fandex.persistence_transactions WHERE idempotency_key=$4)::text AS legacy_transaction_count,
      (SELECT count(*) FROM fandex.persistence_audit_events WHERE idempotency_key=$4)::text AS legacy_audit_count,
      (SELECT count(*) FROM fandex.ingestion_outbox WHERE idempotency_key=$4)::text AS legacy_outbox_count,
      (SELECT content_sha256 FROM fandex.normalized_sources WHERE internal_source_id=$1) AS source_digest,
      (SELECT record_version::text FROM fandex.normalized_sources WHERE internal_source_id=$1) AS source_version,
      (SELECT title FROM fandex.normalized_sources WHERE internal_source_id=$1) AS source_title,
      (SELECT author_or_publisher FROM fandex.normalized_sources WHERE internal_source_id=$1) AS source_publisher,
      (SELECT request_state FROM fandex.historical_enrichment_requests WHERE request_id=$2) AS request_state,
      (SELECT persistent_fulfilled FROM fandex.historical_enrichment_requests WHERE request_id=$2) AS request_fulfilled,
      (SELECT persistent_closed FROM fandex.historical_enrichment_requests WHERE request_id=$2) AS request_closed,
      (SELECT state_sha256 FROM fandex.historical_enrichment_requests WHERE request_id=$2) AS request_digest,
      (SELECT record_version::text FROM fandex.historical_enrichment_requests WHERE request_id=$2) AS request_version,
      (SELECT closure_record_reference FROM fandex.historical_enrichment_requests WHERE request_id=$2) AS request_closure,
      (SELECT evidence_sha256 FROM fandex.source_evidence_provenance WHERE internal_source_id=$1) AS evidence_digest,
      (SELECT exact_headline FROM fandex.source_evidence_provenance WHERE internal_source_id=$1) AS evidence_headline,
      (SELECT publisher FROM fandex.source_evidence_provenance WHERE internal_source_id=$1) AS evidence_publisher,
      (SELECT journalist_byline FROM fandex.source_evidence_provenance WHERE internal_source_id=$1) AS evidence_byline,
      (SELECT canonical_payload_digest FROM fandex.persistence_transactions WHERE idempotency_key=$3) AS payload_digest,
      (SELECT status FROM fandex.persistence_transactions WHERE idempotency_key=$3) AS transaction_status,
      (SELECT status FROM fandex.ingestion_outbox WHERE idempotency_key=$3) AS outbox_status,
      (SELECT canonical_payload_digest FROM fandex.persistence_transactions WHERE idempotency_key=$4) AS legacy_payload_digest,
      (SELECT status FROM fandex.persistence_transactions WHERE idempotency_key=$4) AS legacy_transaction_status,
      (SELECT status FROM fandex.ingestion_outbox WHERE idempotency_key=$4) AS legacy_outbox_status`,
    [bundle.internalSourceId,bundle.requestId,bundle.idempotencyKey,legacyIdempotencyKey]);
    const target = targets.rows[0];
    const cardinalities = [target.source_count,target.request_count,target.provenance_count,target.transaction_count,target.audit_count,target.outbox_count];
    const legacyArtifactCardinalities = [target.legacy_transaction_count,target.legacy_audit_count,target.legacy_outbox_count];
    if (cardinalities.every((value) => value === '0')) {
      if (!legacyArtifactCardinalities.every((value) => value === '0')) throw new Error('unexpected_existing_target_data');
      recoveredAuthorizedApplication = false;
    } else {
      const exactAuthorizedState = cardinalities.every((value) => value === '1')
        && target.source_digest === bundle.normalizedPostDigest
        && target.source_version === String(bundle.normalized.recordVersion)
        && target.source_title === bundle.normalized.title
        && target.source_publisher === bundle.normalized.authorOrPublisher
        && target.request_state === 'closed' && target.request_fulfilled === true && target.request_closed === true
        && target.request_digest === bundle.requestPostDigest
        && target.request_version === String(bundle.request.recordVersion)
        && target.request_closure === bundle.request.closureRecordReference
        && target.evidence_digest === bundle.evidence.evidenceSha256
        && target.evidence_headline === bundle.evidence.exactHeadline
        && target.evidence_publisher === bundle.evidence.publisher
        && target.evidence_byline === bundle.evidence.journalistByline
        && target.payload_digest === bundle.canonicalPayloadDigest
        && target.transaction_status === 'applied'
        && ['pending','processing','applied'].includes(target.outbox_status ?? '');
      if (exactAuthorizedState && legacyArtifactCardinalities.every((value) => value === '0')) {
        recoveredAuthorizedApplication = true;
      } else {
        const exactLegacyState = cardinalities.slice(0,3).every((value) => value === '1')
          && cardinalities.slice(3).every((value) => value === '0')
          && legacyArtifactCardinalities.every((value) => value === '1')
          && target.source_digest === bundle.normalizedPostDigest
          && target.source_version === String(bundle.normalized.recordVersion)
          && target.source_title === bundle.normalized.title
          && target.source_publisher === bundle.normalized.authorOrPublisher
          && target.request_state === 'closed' && target.request_fulfilled === true && target.request_closed === true
          && target.request_digest === bundle.v110CopiedClosedRequestDigest
          && target.request_version === String(bundle.request.recordVersion)
          && target.request_closure === bundle.request.closureRecordReference
          && target.evidence_digest === bundle.evidence.evidenceSha256
          && target.evidence_headline === bundle.evidence.exactHeadline
          && target.evidence_publisher === bundle.evidence.publisher
          && target.evidence_byline === bundle.evidence.journalistByline
          && target.legacy_payload_digest === legacyCanonicalPayloadDigest
          && target.legacy_transaction_status === 'applied'
          && ['pending','processing','applied'].includes(target.legacy_outbox_status ?? '');
        if (!exactLegacyState) throw new Error('unexpected_existing_target_data');
        legacyStateRequiresFreshBranch = true;
      }
    }
  }
  await preflightPool.end();
  if (legacyStateRequiresFreshBranch) throw new Error('legacy_v116_state_requires_fresh_branch');

  const migrations = await loadMigrationPlan();
  if (migrations.length !== 1 || migrations[0].sha256 !== EXPECTED_MIGRATION_SHA256) throw new Error('migration_plan_mismatch');
  const migrationEnvironment: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV ?? 'test', FANDEX_MIGRATION_DATABASE_URL: unpooledUrl, FANDEX_APPROVE_V114_MIGRATION: MIGRATION_APPROVAL };
  setStage('migration_first_apply');
  await applyMigrationPlan(migrations, migrationEnvironment, (sql) => recordQuery(counts, sql));
  setStage('migration_replay');
  await applyMigrationPlan(migrations, migrationEnvironment, (sql) => recordQuery(counts, sql));

  setStage('schema_inspection');
  const rawPool = new Pool({ connectionString: pooledUrl, max: 5, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10_000, statement_timeout: 30_000 });
  const pool = new CountedPool(rawPool, counts);
  const adapterPool = pool as unknown as Parameters<typeof applyPersistenceBundle>[1];
  const tableRows = await pool.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema='fandex' AND table_type='BASE TABLE' ORDER BY table_name");
  const tableNames = tableRows.rows.map((row) => row.table_name);
  if (JSON.stringify(tableNames) !== JSON.stringify(TABLES)) throw new Error('table_set_mismatch');
  const constraints = await pool.query<{ table_name: string; constraint_name: string; constraint_type: string }>("SELECT table_name, constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_schema='fandex' ORDER BY table_name,constraint_name");
  if (!['PRIMARY KEY','FOREIGN KEY','UNIQUE','CHECK'].every((kind) => constraints.rows.some((row) => row.constraint_type === kind))) throw new Error('constraint_set_incomplete');
  const trigger = await pool.query<{ enabled: string }>("SELECT tgenabled AS enabled FROM pg_trigger WHERE tgrelid='fandex.persistence_audit_events'::regclass AND tgname='persistence_audit_events_append_only' AND NOT tgisinternal");
  if (trigger.rows.length !== 1 || trigger.rows[0].enabled !== 'O') throw new Error('audit_trigger_missing');
  const privileges = await pool.query<{ public_table_grants: string; public_schema_usage: boolean }>("SELECT (SELECT count(*) FROM information_schema.role_table_grants WHERE table_schema='fandex' AND grantee='PUBLIC')::text AS public_table_grants, has_schema_privilege('public','fandex','usage') AS public_schema_usage");
  if (privileges.rows[0].public_table_grants !== '0' || privileges.rows[0].public_schema_usage) throw new Error('public_privilege_present');
  const migrationRow = await pool.query<{ version: string; migration_sha256: string }>('SELECT version, migration_sha256 FROM fandex.schema_migrations ORDER BY version');
  if (migrationRow.rows.length !== 1 || migrationRow.rows[0].migration_sha256 !== EXPECTED_MIGRATION_SHA256) throw new Error('migration_record_mismatch');

  setStage('bundle_first_apply');
  const applied = await applyPersistenceBundle(bundle, adapterPool);
  const expectedInitialOutcome = recoveredAuthorizedApplication ? 'idempotent_existing_result' : 'applied';
  if (applied.status !== expectedInitialOutcome) throw new Error('first_application_not_applied');
  const countsBeforeReplay = await pool.query<{ sources: string; requests: string; provenance: string; transactions: string; audits: string; outbox: string }>('SELECT (SELECT count(*) FROM fandex.normalized_sources WHERE internal_source_id=$1)::text AS sources,(SELECT count(*) FROM fandex.historical_enrichment_requests WHERE request_id=$2)::text AS requests,(SELECT count(*) FROM fandex.source_evidence_provenance WHERE internal_source_id=$1)::text AS provenance,(SELECT count(*) FROM fandex.persistence_transactions WHERE idempotency_key=$3)::text AS transactions,(SELECT count(*) FROM fandex.persistence_audit_events WHERE idempotency_key=$3)::text AS audits,(SELECT count(*) FROM fandex.ingestion_outbox WHERE idempotency_key=$3)::text AS outbox', [bundle.internalSourceId,bundle.requestId,bundle.idempotencyKey]);
  if (Object.values(countsBeforeReplay.rows[0]).some((value) => value !== '1')) throw new Error('first_application_cardinality_mismatch');
  setStage('bundle_replay_and_negative_probes');
  const replay = await applyPersistenceBundle(bundle, adapterPool);
  if (replay.status !== 'idempotent_existing_result') throw new Error('replay_not_idempotent');
  const countsAfterReplay = await pool.query('SELECT (SELECT count(*) FROM fandex.normalized_sources WHERE internal_source_id=$1)::text AS sources,(SELECT count(*) FROM fandex.historical_enrichment_requests WHERE request_id=$2)::text AS requests,(SELECT count(*) FROM fandex.source_evidence_provenance WHERE internal_source_id=$1)::text AS provenance,(SELECT count(*) FROM fandex.persistence_transactions WHERE idempotency_key=$3)::text AS transactions,(SELECT count(*) FROM fandex.persistence_audit_events WHERE idempotency_key=$3)::text AS audits,(SELECT count(*) FROM fandex.ingestion_outbox WHERE idempotency_key=$3)::text AS outbox', [bundle.internalSourceId,bundle.requestId,bundle.idempotencyKey]);
  if (JSON.stringify(countsAfterReplay.rows[0]) !== JSON.stringify(countsBeforeReplay.rows[0])) throw new Error('replay_duplicate_effect');

  const conflict = structuredClone(bundle);
  conflict.outbox.payload = { requestId: bundle.requestId, conflictProbe: true };
  conflict.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(conflict));
  if ((await applyPersistenceBundle(conflict, adapterPool)).status !== 'rejected_conflict') throw new Error('conflict_probe_failed');
  const stale = changedBundle(bundle, `${bundle.normalized.summary} stale-probe`);
  if ((await applyPersistenceBundle(stale, adapterPool)).status !== 'rejected_stale_state') throw new Error('stale_probe_failed');
  const u2026 = changedBundle(bundle, bundle.normalized.summary);
  u2026.normalized.title = u2026.normalized.title.replace('…',''); u2026.normalizedV36.title = u2026.normalized.title;
  u2026.idempotencyKey = derivePersistenceIdempotencyKey(u2026); u2026.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(u2026));
  if ((await applyPersistenceBundle(u2026, adapterPool)).status !== 'rejected_conflict') throw new Error('u2026_probe_failed');
  const conflated = structuredClone(bundle);
  conflated.normalized.authorOrPublisher = '김하영'; conflated.normalizedV36.author_or_publisher = '김하영'; conflated.evidence.publisher = '김하영';
  conflated.idempotencyKey = derivePersistenceIdempotencyKey(conflated); conflated.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(conflated));
  if ((await applyPersistenceBundle(conflated, adapterPool)).status !== 'rejected_conflict') throw new Error('role_probe_failed');
  const unauthorized = structuredClone(bundle) as PersistenceBundle & { normalized: PersistenceBundle['normalized'] & { body?: string } };
  unauthorized.normalized.body = 'blocked'; unauthorized.canonicalPayloadDigest = sha256Canonical(buildCanonicalPersistencePayload(unauthorized));
  if ((await applyPersistenceBundle(unauthorized, adapterPool)).status !== 'rejected_conflict') throw new Error('field_probe_failed');

  let rollbackRejected = false;
  const rollbackClient = await pool.connect();
  try {
    await rollbackClient.query('BEGIN');
    await rollbackClient.query('UPDATE fandex.normalized_sources SET title=$1 WHERE internal_source_id=$2', ['rollback-probe',bundle.internalSourceId]);
    await rollbackClient.query('INSERT INTO fandex.persistence_audit_events (idempotency_key,sequence,event_type,event_digest,bounded_payload) VALUES ($1,2,$2,$3,$4::jsonb)', [bundle.idempotencyKey,'rollback_probe','invalid',JSON.stringify({ bounded: true })]);
    await rollbackClient.query('COMMIT');
  } catch { rollbackRejected = true; await rollbackClient.query('ROLLBACK'); } finally { rollbackClient.release(); }
  const rollbackState = await pool.query<{ title: string }>('SELECT title FROM fandex.normalized_sources WHERE internal_source_id=$1', [bundle.internalSourceId]);
  if (!rollbackRejected || rollbackState.rows[0].title !== bundle.normalized.title) throw new Error('rollback_probe_failed');

  let auditUpdateRejected = false; let auditDeleteRejected = false;
  for (const operation of ['UPDATE','DELETE'] as const) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (operation === 'UPDATE') await client.query('UPDATE fandex.persistence_audit_events SET event_type=$1 WHERE idempotency_key=$2', ['blocked',bundle.idempotencyKey]);
      else await client.query('DELETE FROM fandex.persistence_audit_events WHERE idempotency_key=$1', [bundle.idempotencyKey]);
      await client.query('COMMIT');
    } catch { if (operation === 'UPDATE') auditUpdateRejected = true; else auditDeleteRejected = true; await client.query('ROLLBACK'); } finally { client.release(); }
  }
  if (!auditUpdateRejected || !auditDeleteRejected) throw new Error('audit_mutation_not_blocked');

  setStage('outbox_validation');
  const outboxBeforeClaim = await pool.query<{ status: string }>('SELECT status FROM fandex.ingestion_outbox WHERE idempotency_key=$1', [bundle.idempotencyKey]);
  let claims: Awaited<ReturnType<typeof claimOutboxBatch>> = [];
  if (outboxBeforeClaim.rows[0]?.status !== 'applied') {
    const [leftClaim,rightClaim] = await Promise.all([claimOutboxBatch('v116-left',1,30,adapterPool),claimOutboxBatch('v116-right',1,30,adapterPool)]);
    claims = [...leftClaim,...rightClaim];
    if (claims.length !== 1 || !(await completeOutboxEvent(claims[0].outboxId,claims[0].leaseOwner,adapterPool))) throw new Error('outbox_claim_failed');
  }

  setStage('stable_projection');
  const normalized = await pool.query('SELECT internal_source_id,provider,source_type,office_code,article_id,title,summary,author_or_publisher,to_char(displayed_source_timestamp,\'YYYY-MM-DD HH24:MI:SS\') AS displayed_source_timestamp,to_char(normalized_provider_timestamp AT TIME ZONE \'Asia/Seoul\',\'YYYY-MM-DD"T"HH24:MI:SS\')||\'+09:00\' AS normalized_provider_timestamp,content_sha256,record_version::text FROM fandex.normalized_sources WHERE internal_source_id=$1', [bundle.internalSourceId]);
  const request = await pool.query('SELECT request_id,internal_source_id,requested_fields,request_state,persistent_fulfilled,persistent_closed,closure_record_reference,state_sha256,record_version::text FROM fandex.historical_enrichment_requests WHERE request_id=$1', [bundle.requestId]);
  const provenance = await pool.query('SELECT provenance_id,internal_source_id,source_url,exact_headline,publisher,journalist_byline,normalized_journalist,semantic_roles,to_char(displayed_source_timestamp,\'YYYY-MM-DD HH24:MI:SS\') AS displayed_source_timestamp,to_char(normalized_provider_timestamp AT TIME ZONE \'Asia/Seoul\',\'YYYY-MM-DD"T"HH24:MI:SS\')||\'+09:00\' AS normalized_provider_timestamp,evidence_sha256,evidence_width,evidence_height,verification_lineage,acceptance_lineage FROM fandex.source_evidence_provenance WHERE internal_source_id=$1', [bundle.internalSourceId]);
  const transactionAudit = await pool.query('SELECT t.idempotency_key,t.request_id,t.internal_source_id,t.canonical_payload_digest,t.status,t.before_digests,t.after_digests,a.sequence::text,a.event_type,a.event_digest,a.bounded_payload FROM fandex.persistence_transactions t JOIN fandex.persistence_audit_events a USING(idempotency_key) WHERE t.idempotency_key=$1 ORDER BY a.sequence', [bundle.idempotencyKey]);
  const outbox = await pool.query('SELECT outbox_id,idempotency_key,status,event_type,bounded_payload,attempt_count,max_attempts,lease_owner,lease_expires_at IS NULL AS lease_cleared,bounded_error_metadata FROM fandex.ingestion_outbox WHERE idempotency_key=$1', [bundle.idempotencyKey]);
  await pool.end();

  const migrationApplication = { version: 1, sha256: migrationRow.rows[0].migration_sha256, firstOutcome: 'applied', validationOutcome: preflight.migrations_exists ? 'idempotent_existing_result' : 'applied', replayOutcome: 'idempotent_existing_result', recoveredAuthorizedApplication };
  const schemaInspection = { tables: tableNames, constraintCount: constraints.rows.length, constraintTypes: [...new Set(constraints.rows.map((row) => row.constraint_type))].sort(), auditMutationTrigger: true, publicTableGrants: 0, publicSchemaUsage: false };
  const projections = {
    migration_application: sha256Canonical(migrationApplication), schema_inspection: sha256Canonical(schemaInspection),
    normalized_row: sha256Canonical(normalized.rows[0]), historical_request_row: sha256Canonical(request.rows[0]),
    provenance_row: sha256Canonical(provenance.rows[0]), transaction_audit_collection: sha256Canonical(transactionAudit.rows),
    outbox_result: sha256Canonical(outbox.rows[0]),
  };
  const result = {
    version: 'v116', stagingAttestation, preflight: { serverMajor: preflight.server_major, readWriteCapable: true, schemaInitiallyPresent: preflight.schema_exists, migrationsInitiallyPresent: preflight.migrations_exists },
    migration: migrationApplication, schema: schemaInspection,
    persistence: { first: 'applied', validationOutcome: applied.status, replay: replay.status, conflict: 'rejected_conflict', stale: 'rejected_stale_state', unauthorizedField: 'rejected_conflict', u2026Mutation: 'rejected_conflict', roleConflation: 'rejected_conflict', rollback: 'rolled_back', auditUpdate: 'rejected', auditDelete: 'rejected', serializationRetryMaximum: 3 },
    outbox: { concurrentClaimCount: claims.length, validationStartedApplied: outboxBeforeClaim.rows[0]?.status === 'applied', duplicateClaimEffects: 0, finalStatus: outbox.rows[0].status, downstreamExternalCalls: 0 },
    digests: projections,
    aggregate_staging_validation: sha256Canonical({ migrationApplication, schemaInspection, projections, first: 'applied', validationOutcome: applied.status, replay: replay.status, outbox: outbox.rows[0] }),
    effects: { stagingQueryCount: counts.query, stagingReadCount: counts.read, stagingWriteStatementCount: counts.write, stagingControlStatementCount: counts.control, productionQueryCount: 0, productionReadCount: 0, productionWriteCount: 0, credentialValueOutputCount: 0, credentialHashCount: 0, downstreamExternalCalls: 0 },
  };
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
}

main().catch((error) => {
  const known = new Set(['v115_lineage_mismatch','staging_preflight_failed','unexpected_existing_migration','unexpected_existing_target_data','migration_plan_mismatch','migration_record_mismatch','table_set_mismatch','constraint_set_incomplete','audit_trigger_missing','public_privilege_present','idempotency_contract_not_versioned','legacy_v116_state_requires_fresh_branch','first_application_not_applied','first_application_cardinality_mismatch','replay_not_idempotent','replay_duplicate_effect','conflict_probe_failed','stale_probe_failed','u2026_probe_failed','role_probe_failed','field_probe_failed','rollback_probe_failed','audit_mutation_not_blocked','outbox_claim_failed']);
  const message = error instanceof Error && known.has(error.message) ? error.message : 'external_boundary_error';
  process.stderr.write(`FAIL CLOSED: ${validationStage}:${message}\n`);
  process.exitCode = 1;
});
