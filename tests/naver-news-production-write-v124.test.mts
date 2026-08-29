import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildNaverNewsJobIdentity,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  type NaverNewsApiResponse,
  type NaverNewsRequestContract,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  FANDEX_NAVER_NEWS_CLIENT_ID_ENV,
  FANDEX_NAVER_NEWS_CLIENT_SECRET_ENV,
  NAVER_NEWS_EXTERNAL_ENDPOINT_ENV,
  type NaverNewsExternalFetch,
} from '../lib/server/ingestion/naverNewsExternalCollector';
import {
  NAVER_NEWS_V124_APPROVAL_ENV,
  NAVER_NEWS_V124_APPROVAL_VALUE,
  productionWriteExitCode,
  runNaverNewsProductionWrite,
  type NaverNewsProductionWriteDependencies,
  type NaverNewsProductionWritePool,
  type NaverNewsProductionWritePoolConfig,
} from '../scripts/ingestion/write-naver-news-v124.mjs';

const cliPath = new URL('../scripts/ingestion/write-naver-news-v124.mts', import.meta.url);
const packagePath = new URL('../package.json', import.meta.url);
const migrationOnePath = new URL('../database/migrations/001_v114_managed_postgres_persistence.sql', import.meta.url);
const migrationTwoPath = new URL('../database/migrations/002_v121_naver_news_operational_ingestion.sql', import.meta.url);
const endpoint = 'https://openapi.naver.com/v1/search/news.json';
const clientId = 'synthetic-v124-client-id';
const clientSecret = 'synthetic-v124-client-secret';
const runtimeUrl = 'postgresql://fandex_runtime:synthetic-runtime-password@ep-safe-pooler.example.test/neondb';
const migrationUrl = 'postgresql://fandex_migrator:synthetic-migration-password@ep-safe.example.test/neondb';
const fakeDatabaseLeak = 'postgresql://fandex_runtime:fake-db-secret@private-pooler-host.example.test/neondb';
const fixedCollectedAt = '2026-08-30T06:00:00.000Z';

const argv = Object.freeze([
  '--apply',
  '--query', 'FANDEX v124 synthetic production write',
  '--collection-key', 'manual-v124-synthetic-write',
  '--display', '1',
  '--start', '1',
  '--sort', 'date',
  '--worker-id', 'manual-v124-worker',
]);

function environment(options: Readonly<{ approved?: boolean; runtime?: string | null }> = {}): Record<string, string> {
  const values: Record<string, string> = {
    [NAVER_NEWS_EXTERNAL_ENDPOINT_ENV]: endpoint,
    [FANDEX_NAVER_NEWS_CLIENT_ID_ENV]: clientId,
    [FANDEX_NAVER_NEWS_CLIENT_SECRET_ENV]: clientSecret,
  };
  if (options.approved !== false) values[NAVER_NEWS_V124_APPROVAL_ENV] = NAVER_NEWS_V124_APPROVAL_VALUE;
  if (options.runtime !== null) values.FANDEX_RUNTIME_DATABASE_URL = options.runtime ?? runtimeUrl;
  return values;
}

function apiResponse(request: NaverNewsRequestContract): NaverNewsApiResponse {
  return {
    lastBuildDate: 'Sun, 30 Aug 2026 15:00:00 +0900',
    total: 1,
    start: request.start,
    display: 1,
    items: [{
      title: '<b>FANDEX</b> v124 synthetic item',
      originallink: 'https://news.example.test/articles/fandex-v124',
      link: 'https://n.news.naver.com/mnews/article/001/0000000124',
      description: 'Synthetic v124 response only.',
      pubDate: 'Sun, 30 Aug 2026 14:59:00 +0900',
    }],
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function errorFrom(operation: Promise<unknown>): Promise<Error> {
  try {
    await operation;
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }
  throw new Error('expected_test_rejection');
}

type StoredJob = {
  job_id: string;
  idempotency_key: string;
  request_sha256: string;
  request_contract: unknown;
  status: 'pending' | 'running' | 'succeeded' | 'retryable_failed' | 'dead_letter';
  attempt_count: number;
  max_attempts: number;
  claim_token: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
  result_sha256: string | null;
};

class SyntheticPostgresPool implements NaverNewsProductionWritePool {
  connectCalls = 0;
  queryCalls = 0;
  releaseCalls = 0;
  endCalls = 0;
  beginCalls = 0;
  commitCalls = 0;
  rollbackCalls = 0;
  writeQueries = 0;
  rawEvidenceWrites = 0;
  normalizedWrites = 0;
  auditWrites = 0;
  auditSequence = 0;
  job: StoredJob | null = null;

  constructor(private readonly failOnJobInsert = false) {}

  async connect() {
    this.connectCalls += 1;
    return {
      query: async <T = Record<string, unknown>,>(sql: string, values?: readonly unknown[]) => {
        this.queryCalls += 1;
        const result = await this.query(sql, values);
        return result as { rowCount: number; rows: T[] };
      },
      release: () => { this.releaseCalls += 1; },
    };
  }

  async end(): Promise<void> {
    this.endCalls += 1;
  }

  private async query(sql: string, values: readonly unknown[] = []): Promise<{ rowCount: number; rows: unknown[] }> {
    if (sql === 'BEGIN') {
      this.beginCalls += 1;
      return { rowCount: 0, rows: [] };
    }
    if (sql === 'COMMIT') {
      this.commitCalls += 1;
      return { rowCount: 0, rows: [] };
    }
    if (sql === 'ROLLBACK') {
      this.rollbackCalls += 1;
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('INSERT INTO fandex.source_ingestion_jobs')) {
      if (this.failOnJobInsert) throw new Error(fakeDatabaseLeak);
      this.writeQueries += 1;
      if (this.job) return { rowCount: 0, rows: [] };
      this.job = {
        job_id: String(values[0]),
        idempotency_key: String(values[1]),
        request_sha256: String(values[2]),
        request_contract: JSON.parse(String(values[6])) as unknown,
        status: 'pending',
        attempt_count: 0,
        max_attempts: Number(values[7]),
        claim_token: null,
        lease_owner: null,
        lease_expires_at: null,
        result_sha256: null,
      };
      return { rowCount: 1, rows: [{ job_id: this.job.job_id }] };
    }
    if (sql.includes('FROM fandex.source_ingestion_jobs') && sql.includes('FOR UPDATE')) {
      return { rowCount: this.job ? 1 : 0, rows: this.job ? [{ ...this.job }] : [] };
    }
    if (sql.includes('COALESCE(MAX(sequence)')) {
      return { rowCount: 1, rows: [{ next_sequence: this.auditSequence + 1 }] };
    }
    if (sql.includes('INSERT INTO fandex.source_ingestion_audit_events')) {
      this.writeQueries += 1;
      this.auditWrites += 1;
      this.auditSequence = Math.max(this.auditSequence, Number(values[1]));
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes("SET status = 'running'")) {
      assert.ok(this.job);
      this.writeQueries += 1;
      this.job.status = 'running';
      this.job.attempt_count = Number(values[1]);
      this.job.claim_token = String(values[2]);
      this.job.lease_owner = String(values[3]);
      this.job.lease_expires_at = String(values[4]);
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('INSERT INTO fandex.source_ingestion_raw_evidence')) {
      this.writeQueries += 1;
      this.rawEvidenceWrites += 1;
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('INSERT INTO fandex.source_ingestion_normalized_records')) {
      this.writeQueries += 1;
      this.normalizedWrites += 1;
      return { rowCount: 1, rows: [{ record_id: values[0] }] };
    }
    if (sql.includes("SET status = 'succeeded'")) {
      assert.ok(this.job);
      this.writeQueries += 1;
      this.job.status = 'succeeded';
      this.job.result_sha256 = String(values[1]);
      this.job.claim_token = null;
      this.job.lease_owner = null;
      this.job.lease_expires_at = null;
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('SET status = $2')) {
      assert.ok(this.job);
      this.writeQueries += 1;
      this.job.status = values[1] as StoredJob['status'];
      this.job.claim_token = null;
      this.job.lease_owner = null;
      this.job.lease_expires_at = null;
      return { rowCount: 1, rows: [] };
    }
    throw new Error('unexpected_synthetic_postgres_query');
  }
}

function fixedWorkerClock(start = Date.parse('2026-08-30T06:00:00.000Z')): () => string {
  let tick = 0;
  return () => new Date(start + tick++ * 1_000).toISOString();
}

type ExternalEffectCounters = {
  apiCalls: number;
  poolCreations: number;
  databaseConnections: number;
  databaseQueries: number;
  databaseWrites: number;
};

function zeroCounters(): ExternalEffectCounters {
  return { apiCalls: 0, poolCreations: 0, databaseConnections: 0, databaseQueries: 0, databaseWrites: 0 };
}

function zeroEffectDependencies(counters: ExternalEffectCounters): NaverNewsProductionWriteDependencies {
  return {
    collectorOptions: {
      fetch: async () => {
        counters.apiCalls += 1;
        return jsonResponse({});
      },
    },
    poolFactory: () => {
      counters.poolCreations += 1;
      const pool = new SyntheticPostgresPool();
      return {
        async connect() {
          counters.databaseConnections += 1;
          const client = await pool.connect();
          return {
            async query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]) {
              counters.databaseQueries += 1;
              if (/^\s*(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(sql)) counters.databaseWrites += 1;
              return client.query<T>(sql, values);
            },
            release() { client.release(); },
          };
        },
        async end() { await pool.end(); },
      };
    },
  };
}

test('missing approval fails before API calls or pool creation', async () => {
  const counters = zeroCounters();
  await assert.rejects(
    runNaverNewsProductionWrite(argv, environment({ approved: false }), zeroEffectDependencies(counters)),
    { message: 'naver_news_production_write_approval_required' },
  );
  assert.deepEqual(counters, zeroCounters());
});

test('approval without --apply fails before API calls or pool creation', async () => {
  const counters = zeroCounters();
  await assert.rejects(
    runNaverNewsProductionWrite(argv.filter((value) => value !== '--apply'), environment(), zeroEffectDependencies(counters)),
    { message: 'naver_news_production_write_apply_required' },
  );
  assert.deepEqual(counters, zeroCounters());
});

test('invalid, duplicate, unknown, and missing arguments fail before external effects', async () => {
  const cases = [
    [...argv, '--unknown'],
    [...argv, '--query', 'duplicate'],
    argv.filter((value) => value !== '--worker-id' && value !== 'manual-v124-worker'),
    argv.map((value) => value === 'manual-v124-worker' ? '../unsafe-worker' : value),
    argv.map((value) => value === '1' ? '101' : value),
  ];
  for (const invalid of cases) {
    const counters = zeroCounters();
    await assert.rejects(runNaverNewsProductionWrite(invalid, environment(), zeroEffectDependencies(counters)));
    assert.deepEqual(counters, zeroCounters());
  }
});

test('missing or migration-role database URLs never reach collector or pool', async () => {
  const environments = [
    environment({ runtime: null }),
    { ...environment({ runtime: null }), FANDEX_MIGRATION_DATABASE_URL: migrationUrl },
    { ...environment(), FANDEX_RUNTIME_DATABASE_URL: migrationUrl, FANDEX_MIGRATION_DATABASE_URL: migrationUrl },
  ];
  for (const values of environments) {
    const counters = zeroCounters();
    await assert.rejects(
      runNaverNewsProductionWrite(argv, values, zeroEffectDependencies(counters)),
      { message: 'runtime_database_url_invalid' },
    );
    assert.deepEqual(counters, zeroCounters());
  }
});

test('synthetic production run uses the external collector and existing atomic repository flow once', async () => {
  const pool = new SyntheticPostgresPool();
  const configs: NaverNewsProductionWritePoolConfig[] = [];
  let apiCalls = 0;
  const request = buildNaverNewsJobIdentity({
    provider: 'naver-news',
    collectionKey: 'manual-v124-synthetic-write',
    query: 'FANDEX v124 synthetic production write',
    display: 1,
    start: 1,
    sort: 'date',
  }).request;
  const syntheticFetch: NaverNewsExternalFetch = async () => {
    apiCalls += 1;
    return jsonResponse(apiResponse(request));
  };
  const dependencies: NaverNewsProductionWriteDependencies = {
    collectorOptions: { fetch: syntheticFetch, now: () => new Date(fixedCollectedAt) },
    poolFactory: (config) => { configs.push(config); return pool; },
    now: fixedWorkerClock(),
  };

  const applied = await runNaverNewsProductionWrite(argv, environment(), dependencies);

  assert.deepEqual(configs[0], {
    connectionString: runtimeUrl,
    max: 1,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
    ssl: { rejectUnauthorized: true },
  });
  assert.equal(applied.mode, 'production-write');
  assert.equal(applied.contractVersion, NAVER_NEWS_INGESTION_CONTRACT_VERSION);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.attempt, 1);
  assert.deepEqual(applied.counts, {
    rawEvidence: 1,
    normalizedRecords: 1,
    duplicateRecords: 0,
    rejectedItems: 0,
  });
  assert.equal(apiCalls, 1);
  assert.equal(pool.beginCalls, 3);
  assert.equal(pool.commitCalls, 3);
  assert.equal(pool.rollbackCalls, 0);
  assert.equal(pool.rawEvidenceWrites, 1);
  assert.equal(pool.normalizedWrites, 1);
  assert.equal(pool.auditWrites, 6);
  assert.equal(pool.releaseCalls, pool.connectCalls);
  assert.equal(pool.endCalls, 1);

  const replay = await runNaverNewsProductionWrite(argv, environment(), dependencies);
  assert.equal(replay.status, 'idempotent_succeeded');
  assert.equal(replay.resultSha256, applied.resultSha256);
  assert.equal(replay.counts, null);
  assert.equal(apiCalls, 1);
  assert.equal(pool.rawEvidenceWrites, 1);
  assert.equal(pool.normalizedWrites, 1);
  assert.equal(pool.releaseCalls, pool.connectCalls);
  assert.equal(pool.endCalls, 2);
  assert.doesNotMatch(
    JSON.stringify([applied, replay]),
    /FANDEX v124 synthetic|manual-v124|openapi|client-id|client-secret|runtime-password|originallink|description|INSERT|UPDATE/i,
  );
});

test('synthetic fetch errors are bounded and use the existing retryable failure path', async () => {
  const pool = new SyntheticPostgresPool();
  let apiCalls = 0;
  const secretLeak = `${endpoint} ${clientId} ${clientSecret}`;
  const result = await runNaverNewsProductionWrite(argv, environment(), {
    collectorOptions: {
      fetch: async () => { apiCalls += 1; throw new Error(secretLeak); },
    },
    poolFactory: () => pool,
    now: fixedWorkerClock(),
  });

  assert.equal(result.status, 'retryable_failed');
  assert.equal(result.resultSha256, null);
  assert.equal(result.attempt, 1);
  assert.equal(result.counts, null);
  assert.equal(apiCalls, 1);
  assert.equal(pool.job?.status, 'retryable_failed');
  assert.equal(pool.beginCalls, 3);
  assert.equal(pool.commitCalls, 3);
  assert.equal(pool.rollbackCalls, 0);
  assert.equal(pool.releaseCalls, pool.connectCalls);
  assert.equal(pool.endCalls, 1);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(`${clientId}|${clientSecret}|openapi\\.naver\\.com`));
});

test('synthetic database errors are redacted and clean up client and pool', async () => {
  const pool = new SyntheticPostgresPool(true);
  let apiCalls = 0;
  const error = await errorFrom(runNaverNewsProductionWrite(argv, environment(), {
    collectorOptions: {
      fetch: async () => { apiCalls += 1; return jsonResponse({}); },
    },
    poolFactory: () => pool,
  }));

  assert.equal(error.message, 'naver_news_production_write_failed');
  assert.doesNotMatch(error.message, /fake-db-secret|private-pooler-host|fandex_runtime/);
  assert.equal(apiCalls, 0);
  assert.equal(pool.connectCalls, 1);
  assert.equal(pool.beginCalls, 1);
  assert.equal(pool.commitCalls, 0);
  assert.equal(pool.rollbackCalls, 1);
  assert.equal(pool.releaseCalls, 1);
  assert.equal(pool.endCalls, 1);
});

test('production write status exit classification is success-only', () => {
  assert.equal(productionWriteExitCode('applied'), 0);
  assert.equal(productionWriteExitCode('idempotent_succeeded'), 0);
  for (const status of ['retryable_failed', 'busy', 'dead_letter', 'conflict', 'claim_lost'] as const) {
    assert.equal(productionWriteExitCode(status), 1);
  }
});

test('v124 source exposes only bounded output and adds no scheduler, migration, or direct SQL path', async () => {
  const [source, packageJson, migrationOne, migrationTwo] = await Promise.all([
    readFile(cliPath, 'utf8'),
    readFile(packagePath, 'utf8'),
    readFile(migrationOnePath),
    readFile(migrationTwoPath),
  ]);
  assert.match(source, /createNaverNewsExternalCollector/);
  assert.match(source, /createPostgresNaverNewsIngestionRepository/);
  assert.match(source, /runNaverNewsIngestionWorker/);
  assert.match(source, /requireRuntimeDatabaseUrl\(environment\)/);
  assert.match(source, /finally \{[\s\S]*await pool\.end\(\)/);
  assert.doesNotMatch(source, /FANDEX_MIGRATION_DATABASE_URL|INSERT INTO|UPDATE fandex|client\.query\(|setInterval\(|node-cron|cron\.schedule|scheduleJob\(/i);
  assert.match(source, /NAVER News v124 production write failed closed\. No credential, endpoint, database detail, SQL, or raw payload was logged\./);
  assert.match(packageJson, /"test:ingestion:v124": "tsx --test tests\/naver-news-production-write-v124\.test\.mts"/);
  assert.match(packageJson, /"ingestion:naver-news:write": "tsx scripts\/ingestion\/write-naver-news-v124\.mts"/);
  assert.equal(createHash('sha256').update(migrationOne).digest('hex'), '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a');
  assert.equal(createHash('sha256').update(migrationTwo).digest('hex'), 'b0a33ab53736fec070e029e9d7df7d405b56df8d5eb04ae13d163f6b0d72bbae');
});
