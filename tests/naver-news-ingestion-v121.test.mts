import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
  canonicalJson,
  isSha256,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_PROVIDER,
  validateNaverNewsIngestionWritePlan,
  type NaverNewsCollection,
  type NaverNewsIngestionCommand,
  type NaverNewsIngestionWritePlan,
  type NaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  createPostgresNaverNewsIngestionRepository,
  type ClaimNaverNewsJobResult,
  type CompleteNaverNewsJobResult,
  type EnsureNaverNewsJobResult,
  type FailNaverNewsJobResult,
  type NaverNewsIngestionPool,
  type NaverNewsIngestionRepository,
} from '../lib/server/ingestion/naverNewsRepository';
import {
  planNaverNewsIngestionDryRun,
  runNaverNewsIngestionWorker,
  type NaverNewsCollector,
} from '../lib/server/ingestion/naverNewsWorker';
import {
  buildDryRunReport,
  parseDryRunCommand,
} from '../scripts/ingestion/plan-naver-news-v121.mjs';
import { loadMigrationPlan } from '../scripts/database/run-postgres-migrations.mjs';

const migrationPath = new URL('../database/migrations/002_v121_naver_news_operational_ingestion.sql', import.meta.url);
const fixturePath = new URL('../scripts/ingestion/fixtures/naver-news-v121-dry-run.json', import.meta.url);
const workerPath = new URL('../lib/server/ingestion/naverNewsWorker.ts', import.meta.url);
const repositoryPath = new URL('../lib/server/ingestion/naverNewsRepository.ts', import.meta.url);
const cliPath = new URL('../scripts/ingestion/plan-naver-news-v121.mts', import.meta.url);
const packagePath = new URL('../package.json', import.meta.url);
const workflowPath = new URL('../.github/workflows/codex-version-pr-auto-merge.yml', import.meta.url);

const command: NaverNewsIngestionCommand = Object.freeze({
  provider: NAVER_NEWS_PROVIDER,
  collectionKey: 'manual-v121-dry-run-2026-08-29',
  query: 'FANDEX v121 NAVER News dry run',
  display: 4,
  start: 1,
  sort: 'date',
});

async function fixture(): Promise<NaverNewsCollection> {
  return JSON.parse(await readFile(fixturePath, 'utf8')) as NaverNewsCollection;
}

function fixedClock(start = Date.parse('2026-08-29T06:00:00.000Z')): () => string {
  let tick = 0;
  return () => new Date(start + tick++ * 1_000).toISOString();
}

class MemoryRepository implements NaverNewsIngestionRepository {
  identity: NaverNewsJobIdentity | null = null;
  status: 'pending' | 'running' | 'retryable_failed' | 'succeeded' | 'dead_letter' = 'pending';
  attempt = 0;
  resultSha256: string | null = null;
  completedPlan: NaverNewsIngestionWritePlan | null = null;
  claimToken: string | null = null;
  workerId: string | null = null;

  async ensureJob(identity: NaverNewsJobIdentity): Promise<EnsureNaverNewsJobResult> {
    if (!this.identity) {
      this.identity = identity;
      this.status = 'pending';
      return { status: 'created' };
    }
    if (canonicalJson(this.identity) !== canonicalJson(identity)) return { status: 'conflict' };
    if (this.status === 'succeeded' && this.resultSha256) {
      return { status: 'idempotent_succeeded', resultSha256: this.resultSha256 };
    }
    if (this.status === 'dead_letter') return { status: 'dead_letter' };
    return { status: 'existing' };
  }

  async claimJob(identity: NaverNewsJobIdentity, workerId: string): Promise<ClaimNaverNewsJobResult> {
    if (!this.identity || canonicalJson(this.identity) !== canonicalJson(identity)) return { status: 'conflict' };
    if (this.status === 'succeeded' && this.resultSha256) {
      return { status: 'idempotent_succeeded', resultSha256: this.resultSha256 };
    }
    if (this.status === 'running') return { status: 'busy' };
    if (this.status === 'dead_letter') return { status: 'dead_letter' };
    this.status = 'running';
    this.attempt += 1;
    this.claimToken = this.attempt.toString(16).padStart(64, '0');
    this.workerId = workerId;
    return {
      status: 'claimed',
      claimToken: this.claimToken,
      attempt: this.attempt,
      leaseExpiresAt: '2026-08-29T06:01:00.000Z',
    };
  }

  async completeJob(
    identity: NaverNewsJobIdentity,
    workerId: string,
    claimToken: string,
    plan: NaverNewsIngestionWritePlan,
  ): Promise<CompleteNaverNewsJobResult> {
    if (!this.identity || canonicalJson(this.identity) !== canonicalJson(identity)) return { status: 'conflict' };
    if (this.status === 'succeeded' && this.resultSha256 === plan.resultSha256) {
      return { status: 'idempotent_succeeded', resultSha256: plan.resultSha256 };
    }
    if (this.status !== 'running' || this.workerId !== workerId || this.claimToken !== claimToken) {
      return { status: 'claim_lost' };
    }
    this.completedPlan = structuredClone(plan);
    this.resultSha256 = plan.resultSha256;
    this.status = 'succeeded';
    this.claimToken = null;
    this.workerId = null;
    return { status: 'applied', resultSha256: plan.resultSha256 };
  }

  async failJob(
    identity: NaverNewsJobIdentity,
    workerId: string,
    claimToken: string,
  ): Promise<FailNaverNewsJobResult> {
    if (!this.identity || canonicalJson(this.identity) !== canonicalJson(identity)
        || this.status !== 'running' || this.workerId !== workerId || this.claimToken !== claimToken) {
      return { status: 'claim_lost' };
    }
    this.status = this.attempt >= 8 ? 'dead_letter' : 'retryable_failed';
    this.claimToken = null;
    this.workerId = null;
    return { status: this.status };
  }
}

test('v121 migration is additive, bounded, append-only, and least-privileged', async () => {
  const sql = (await readFile(migrationPath, 'utf8')).replace(/\r\n/g, '\n');
  for (const table of [
    'source_ingestion_jobs',
    'source_ingestion_raw_evidence',
    'source_ingestion_normalized_records',
    'source_ingestion_audit_events',
  ]) assert.match(sql, new RegExp(`CREATE TABLE fandex\\.${table}`));
  assert.equal((sql.match(/BEFORE UPDATE OR DELETE ON fandex\.source_ingestion_/g) ?? []).length, 3);
  assert.match(sql, /max_attempts integer NOT NULL DEFAULT 8 CHECK \(max_attempts = 8/);
  assert.match(sql, /GRANT SELECT, INSERT ON TABLE fandex\.source_ingestion_jobs TO fandex_runtime/);
  assert.match(sql, /GRANT UPDATE \([\s\S]*status,[\s\S]*updated_at[\s\S]*\) ON TABLE fandex\.source_ingestion_jobs TO fandex_runtime/);
  assert.match(sql, /GRANT SELECT, INSERT ON TABLE fandex\.source_ingestion_raw_evidence TO fandex_runtime/);
  assert.match(sql, /GRANT SELECT, INSERT ON TABLE fandex\.source_ingestion_normalized_records TO fandex_runtime/);
  assert.match(sql, /GRANT SELECT, INSERT ON TABLE fandex\.source_ingestion_audit_events TO fandex_runtime/);
  assert.doesNotMatch(sql, /GRANT[^;]*(?:DELETE|TRUNCATE|REFERENCES|TRIGGER|ALL PRIVILEGES)[^;]*TO fandex_runtime/);
  for (const forbidden of ['full_article_body', 'credential', 'client_secret', 'request_headers', 'response_headers']) {
    assert.doesNotMatch(sql.toLowerCase(), new RegExp(`\\b${forbidden}\\b`));
  }
  const plan = await loadMigrationPlan();
  assert.deepEqual(plan.map(({ version, fileName }) => [version, fileName]), [
    [1, '001_v114_managed_postgres_persistence.sql'],
    [2, '002_v121_naver_news_operational_ingestion.sql'],
  ]);
  assert.ok(isSha256(plan[1]?.sha256));
});

test('job identity is canonical, deterministic, and conflicts on a reused collection key', () => {
  const first = buildNaverNewsJobIdentity({ ...command, query: '  FANDEX   v121 NAVER News dry run  ' });
  const replay = buildNaverNewsJobIdentity({ ...command, query: 'FANDEX v121 NAVER News dry run' });
  const conflict = buildNaverNewsJobIdentity({ ...command, query: 'different query' });
  assert.deepEqual(first, replay);
  assert.equal(first.request.query, 'FANDEX v121 NAVER News dry run');
  assert.equal(first.jobId, conflict.jobId);
  assert.notEqual(first.requestSha256, conflict.requestSha256);
  assert.notEqual(first.idempotencyKey, conflict.idempotencyKey);
  for (const digest of [first.jobId, first.requestSha256, first.idempotencyKey]) assert.ok(isSha256(digest));
  assert.throws(() => buildNaverNewsJobIdentity({ ...command, collectionKey: '../unsafe' }), /collection_key_invalid/);
  assert.throws(() => buildNaverNewsJobIdentity({ ...command, display: 101 }), /display_invalid/);
});

test('fixture produces immutable raw evidence, deduplicated normalized records, and bounded audit', async () => {
  const identity = buildNaverNewsJobIdentity(command);
  const plan = buildNaverNewsIngestionWritePlan(identity, await fixture());
  const replay = buildNaverNewsIngestionWritePlan(identity, structuredClone(await fixture()));
  assert.equal(plan.contractVersion, NAVER_NEWS_INGESTION_CONTRACT_VERSION);
  assert.equal(plan.planSha256, replay.planSha256);
  assert.equal(plan.resultSha256, replay.resultSha256);
  assert.deepEqual(plan.counts, {
    received: 4,
    rawEvidence: 4,
    normalizedRecords: 2,
    duplicateRecords: 1,
    rejectedItems: 1,
  });
  assert.equal(plan.rawEvidence[0]?.rawPayload.title, '<b>FANDEX</b> v121 NAVER News fixture one');
  assert.equal(plan.normalizedRecords[0]?.title, 'FANDEX v121 NAVER News fixture one');
  assert.equal(plan.normalizedRecords[0]?.summary, 'Fixture-only "raw evidence" for deterministic normalization.');
  assert.equal(plan.normalizedRecords[0]?.sourceHost, 'news.example.test');
  assert.equal(plan.rawEvidence[2]?.normalizationOutcome, 'duplicate');
  assert.equal(plan.rawEvidence[2]?.normalizedRecordId, plan.normalizedRecords[0]?.recordId);
  assert.equal(plan.rawEvidence[3]?.normalizationOutcome, 'rejected');
  assert.equal(plan.rawEvidence[3]?.normalizedRecordId, null);
  assert.equal(plan.rawEvidence[3]?.rejectionCode, 'missing_source_url');
  assert.equal(new Set(plan.rawEvidence.map((row) => row.evidenceId)).size, 4);
  assert.equal(new Set(plan.normalizedRecords.map((row) => row.recordId)).size, 2);
  assert.equal(plan.audit.length, 4);
  assert.doesNotMatch(JSON.stringify(plan.audit), /FANDEX v121 NAVER News dry run|raw evidence<|client.secret/i);
  assert.doesNotMatch(JSON.stringify(plan.normalizedRecords), /publisher|journalist/i);
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.rawEvidence));
  assert.deepEqual(validateNaverNewsIngestionWritePlan(plan), { valid: true });
  const tampered = structuredClone(plan);
  (tampered.rawEvidence[0] as unknown as { normalizedRecordId: string | null }).normalizedRecordId = null;
  assert.throws(() => validateNaverNewsIngestionWritePlan(tampered), /write_plan_invalid/);
  assert.throws(() => buildNaverNewsIngestionWritePlan(identity, {
    fetchedAt: '2026-08-29T06:00:00.000Z',
    response: {
      lastBuildDate: '2026-08-29T06:00:00.000Z', total: 1, start: 1, display: 1,
      items: [{ title: 'x'.repeat(2_049), link: 'https://example.test/item', pubDate: '2026-08-29T06:00:00Z' }],
    },
  }), /raw_item_invalid/);
});

test('worker retries atomically, then replays without recollecting', async () => {
  const repository = new MemoryRepository();
  let collectorCalls = 0;
  const failingCollector: NaverNewsCollector = {
    mode: 'fixture',
    async collect() {
      collectorCalls += 1;
      throw new Error('upstream secret must not escape');
    },
  };
  const first = await runNaverNewsIngestionWorker({
    command,
    workerId: 'worker-v121-a',
    collector: failingCollector,
    repository,
    now: fixedClock(),
  });
  assert.equal(first.status, 'retryable_failed');
  assert.equal(repository.completedPlan, null);
  assert.equal(repository.status, 'retryable_failed');

  const successfulCollector: NaverNewsCollector = {
    mode: 'fixture',
    async collect() {
      collectorCalls += 1;
      return fixture();
    },
  };
  const second = await runNaverNewsIngestionWorker({
    command,
    workerId: 'worker-v121-a',
    collector: successfulCollector,
    repository,
    now: fixedClock(Date.parse('2026-08-29T06:02:00.000Z')),
  });
  assert.equal(second.status, 'applied');
  assert.equal(second.attempt, 2);
  assert.deepEqual(second.counts, { rawEvidence: 4, normalizedRecords: 2, duplicateRecords: 1, rejectedItems: 1 });
  assert.ok(repository.completedPlan);

  const replay = await runNaverNewsIngestionWorker({
    command,
    workerId: 'worker-v121-b',
    collector: successfulCollector,
    repository,
    now: fixedClock(Date.parse('2026-08-29T06:04:00.000Z')),
  });
  assert.equal(replay.status, 'idempotent_succeeded');
  assert.equal(replay.resultSha256, second.resultSha256);
  assert.equal(collectorCalls, 2);

  const conflict = await runNaverNewsIngestionWorker({
    command: { ...command, query: 'changed query for same collection key' },
    workerId: 'worker-v121-b',
    collector: successfulCollector,
    repository,
    now: fixedClock(Date.parse('2026-08-29T06:05:00.000Z')),
  });
  assert.equal(conflict.status, 'conflict');
  assert.equal(collectorCalls, 2);
});

test('dry-run CLI is fixture-only, deterministic, and has zero external effects', async () => {
  const first = await buildDryRunReport([]);
  const replay = await buildDryRunReport([]);
  assert.deepEqual(first, replay);
  assert.equal(first.mode, 'dry-run');
  assert.deepEqual(first.wouldWrite, { jobs: 1, rawEvidence: 4, normalizedRecords: 2, auditEvents: 6 });
  assert.ok(Object.values(first.effects).every((count) => count === 0));
  assert.equal(first.secretsRead, 0);
  const output = JSON.stringify(first);
  assert.doesNotMatch(output, /FANDEX v121 NAVER News dry run|originallink|description|credential|client_secret/i);
  assert.throws(() => parseDryRunCommand(['--apply']), /live_mode_forbidden/);
  assert.throws(() => parseDryRunCommand(['--live']), /live_mode_forbidden/);
  let externalCalls = 0;
  await assert.rejects(planNaverNewsIngestionDryRun(command, {
    mode: 'external',
    async collect() { externalCalls += 1; return fixture(); },
  }), /requires_fixture_collector/);
  assert.equal(externalCalls, 0);
});

test('PostgreSQL repository composes parameterized atomic completion without opening a default pool', async () => {
  const identity = buildNaverNewsJobIdentity(command);
  const plan = buildNaverNewsIngestionWritePlan(identity, await fixture());
  const claimToken = 'c'.repeat(64);
  const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  const pool = {
    async connect() {
      return {
        async query(sql: string, values?: readonly unknown[]) {
          calls.push({ sql, values });
          if (sql.includes('FROM fandex.source_ingestion_jobs') && sql.includes('FOR UPDATE')) {
            return { rowCount: 1, rows: [{
              job_id: identity.jobId,
              idempotency_key: identity.idempotencyKey,
              request_sha256: identity.requestSha256,
              request_contract: identity.request,
              status: 'running',
              attempt_count: '1',
              max_attempts: '8',
              claim_token: claimToken,
              lease_owner: 'worker-v121-a',
              lease_expires_at: '2026-08-29T06:01:00.000Z',
              result_sha256: null,
            }] };
          }
          if (sql.includes('COALESCE(MAX(sequence)')) return { rowCount: 1, rows: [{ next_sequence: '3' }] };
          if (sql.includes('INSERT INTO fandex.source_ingestion_normalized_records')) {
            return { rowCount: 1, rows: [{ record_id: values?.[0] }] };
          }
          return { rowCount: 1, rows: [] };
        },
        release() {},
      };
    },
  } as unknown as NaverNewsIngestionPool;
  const repository = createPostgresNaverNewsIngestionRepository(pool);
  const completed = await repository.completeJob(
    identity,
    'worker-v121-a',
    claimToken,
    plan,
    '2026-08-29T06:00:20.000Z',
  );
  assert.deepEqual(completed, { status: 'applied', resultSha256: plan.resultSha256 });
  assert.equal(calls[0]?.sql, 'BEGIN');
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  assert.equal(calls.filter(({ sql }) => sql.includes('INSERT INTO fandex.source_ingestion_raw_evidence')).length, 4);
  assert.equal(calls.filter(({ sql }) => sql.includes('INSERT INTO fandex.source_ingestion_normalized_records')).length, 2);
  assert.equal(calls.filter(({ sql }) => sql.includes('INSERT INTO fandex.source_ingestion_audit_events')).length, 4);
  assert.equal(calls.some(({ sql }) => /DELETE|TRUNCATE/.test(sql)), false);
  assert.ok(calls.filter(({ sql }) => sql.includes('INSERT INTO')).every(({ sql }) => /\$\d/.test(sql)));
});

test('repository errors are redacted and rolled back', async () => {
  const calls: string[] = [];
  const pool = {
    async connect() {
      return {
        async query(sql: string) {
          calls.push(sql);
          if (sql.startsWith('INSERT INTO fandex.source_ingestion_jobs')) {
            throw new Error('postgresql://owner:private-secret@private-host/neondb');
          }
          return { rowCount: 1, rows: [] };
        },
        release() {},
      };
    },
  } as unknown as NaverNewsIngestionPool;
  const repository = createPostgresNaverNewsIngestionRepository(pool);
  let caught: unknown;
  try {
    await repository.ensureJob(buildNaverNewsJobIdentity(command), '2026-08-29T06:00:00.000Z');
  } catch (error) {
    caught = error;
  }
  assert.equal(caught instanceof Error ? caught.message : '', 'naver_news_repository_operation_failed');
  assert.ok(calls.includes('ROLLBACK'));
  assert.doesNotMatch(JSON.stringify(caught), /private-secret|private-host|owner:/);
});

test('source, package, and protected validation remain fail-closed with no scheduler activation', async () => {
  const [workerSource, repositorySource, cliSource, packageJson, workflow] = await Promise.all([
    readFile(workerPath, 'utf8'),
    readFile(repositoryPath, 'utf8'),
    readFile(cliPath, 'utf8'),
    readFile(packagePath, 'utf8'),
    readFile(workflowPath, 'utf8'),
  ]);
  assert.doesNotMatch(workerSource, /process\.env|setInterval\(|node-cron|cron\.schedule|scheduleJob\(/i);
  assert.doesNotMatch(repositorySource, /process\.env|FANDEX_RUNTIME_DATABASE_URL|getRuntimeDatabasePool/);
  assert.doesNotMatch(cliSource, /process\.env|fetch\(|searchNaverNews|NAVER_NEWS_CLIENT_(?:ID|SECRET)/);
  assert.match(packageJson, /"test:ingestion:v121": "tsx --test tests\/naver-news-ingestion-v121\.test\.mts"/);
  assert.match(packageJson, /"ingestion:naver-news:plan": "tsx scripts\/ingestion\/plan-naver-news-v121\.mts"/);
  assert.match(workflow, /npm run test:ingestion:v121/);
  assert.doesNotMatch(workflow, /schedule:/);
});
