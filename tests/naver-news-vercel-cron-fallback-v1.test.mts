import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  handleNaverNewsVercelCronFallback,
  NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE,
} from '../lib/server/ingestion/naverNewsVercelCronFallback';
import type {
  NaverNewsBlobOnlyCollectionStageSummary,
} from '../lib/server/ingestion/naverNewsBlobOnlyCollectionStage';
import type {
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

const CRON_SECRET = 'cron-secret-value';
const SCHEDULER_SECRET = 'scheduler-secret-value';

function environment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    CRON_SECRET,
    VERCEL_ENV: 'production',
    FANDEX_NAVER_NEWS_RECURRING_ENABLED:
      'approved-v128-recurring-foundation',
    FANDEX_NAVER_NEWS_RECURRING_DEPLOYMENT: 'production',
    FANDEX_NAVER_NEWS_RECURRING_QUERY: '아이유 IU',
    FANDEX_NAVER_NEWS_RECURRING_DISPLAY: '100',
    FANDEX_NAVER_NEWS_SCHEDULER_SECRET: SCHEDULER_SECRET,
    FANDEX_NAVER_NEWS_API_ENDPOINT:
      'https://openapi.naver.com/v1/search/news.json',
    FANDEX_NAVER_NEWS_CLIENT_ID: 'client-id',
    FANDEX_NAVER_NEWS_CLIENT_SECRET: 'client-secret',
    ...overrides,
  };
}

function request(
  overrides: {
    authorization?: string;
    schedule?: string;
    url?: string;
    method?: string;
  } = {},
): Request {
  const headers = new Headers();
  headers.set(
    'authorization',
    overrides.authorization ?? `Bearer ${CRON_SECRET}`,
  );
  headers.set(
    'x-vercel-cron-schedule',
    overrides.schedule ?? NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE,
  );
  return new Request(
    overrides.url
      ?? 'https://example.test/api/internal/naver-news/vercel-cron-fallback',
    {
      method: overrides.method ?? 'GET',
      headers,
    },
  );
}

function memoryStore(): ImmutableTextObjectStore {
  return Object.freeze({
    async readText() {
      return null;
    },
    async listPathnames() {
      return Object.freeze([]);
    },
    async putTextIfAbsent(pathname) {
      return Object.freeze({
        status: 'created' as const,
        pathname,
      });
    },
  });
}

function stageSummary(): NaverNewsBlobOnlyCollectionStageSummary {
  return Object.freeze({
    contractVersion: 'naver-news-blob-only-collection-stage-v1',
    mode: 'blob-only-collection-stage' as const,
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    slotStart: '2026-10-01T12:00:00.000Z',
    collectionKey:
      'sched-v125-naver-news-20261001t120000z-f1ed381d367d',
    jobId: 'a'.repeat(64),
    requestSha256: 'b'.repeat(64),
    resultSha256: 'c'.repeat(64),
    planSha256: 'd'.repeat(64),
    stagedObjectStatus: 'created' as const,
    counts: Object.freeze({
      received: 100,
      rawEvidence: 100,
      normalizedRecords: 100,
      duplicateRecords: 0,
      rejectedItems: 0,
    }),
    safety: Object.freeze({
      databaseConnections: 0 as const,
      databaseQueries: 0 as const,
      databaseWrites: 0 as const,
      databaseCompletionPerformed: false as const,
      schedulerManifestFinalized: false as const,
      schedulesActivated: 0 as const,
      environmentMutations: 0 as const,
      productActivations: 0 as const,
      publicRouteCutovers: 0 as const,
    }),
  });
}

test('rejects wrong auth, schedule, method, and query before Blob store or collection stage', async () => {
  const candidates = [
    request({ authorization: 'Bearer wrong' }),
    request({ schedule: '0 * * * *' }),
    request({ method: 'POST' }),
    request({
      url: 'https://example.test/api/internal/naver-news/vercel-cron-fallback?x=1',
    }),
  ];

  for (const candidate of candidates) {
    let storeCalls = 0;
    let stageCalls = 0;
    const response = await handleNaverNewsVercelCronFallback(
      candidate,
      environment(),
      {
        createStore() {
          storeCalls += 1;
          return memoryStore();
        },
        async runStage() {
          stageCalls += 1;
          return stageSummary();
        },
      },
    );
    assert.ok([403, 405].includes(response.status));
    assert.equal(storeCalls, 0);
    assert.equal(stageCalls, 0);
  }
});

test('rejects missing CRON_SECRET and non-Production runtime before Blob store or collection stage', async () => {
  for (const env of [
    environment({ CRON_SECRET: undefined }),
    environment({ VERCEL_ENV: 'preview' }),
  ]) {
    let storeCalls = 0;
    let stageCalls = 0;
    const response = await handleNaverNewsVercelCronFallback(
      request(),
      env,
      {
        createStore() {
          storeCalls += 1;
          return memoryStore();
        },
        async runStage() {
          stageCalls += 1;
          return stageSummary();
        },
      },
    );
    assert.ok([403, 503].includes(response.status));
    assert.equal(storeCalls, 0);
    assert.equal(stageCalls, 0);
  }
});

test('authenticated exact Vercel Cron request stages one official scheduler slot to Blob only', async () => {
  let oidcCalls = 0;
  let storeCalls = 0;
  let stageCalls = 0;

  const response = await handleNaverNewsVercelCronFallback(
    request(),
    environment({
      FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID: 'store_123',
    }),
    {
      resolveOidcToken() {
        oidcCalls += 1;
        return 'oidc-token';
      },
      createStore(runtimeEnvironment) {
        storeCalls += 1;
        assert.equal(
          runtimeEnvironment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID,
          'store_123',
        );
        assert.equal(
          runtimeEnvironment.VERCEL_OIDC_TOKEN,
          'oidc-token',
        );
        return memoryStore();
      },
      async runStage(input, dependencies) {
        stageCalls += 1;
        assert.equal(input.query, '아이유 IU');
        assert.equal(input.display, 100);
        assert.equal(
          input.environment.VERCEL_OIDC_TOKEN,
          'oidc-token',
        );
        assert.ok(dependencies.store);
        return stageSummary();
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(oidcCalls, 1);
  assert.equal(storeCalls, 1);
  assert.equal(stageCalls, 1);
  assert.deepEqual(await response.json(), {
    ok: true,
    mode: 'naver-news-vercel-cron-blob-only-fallback-v2',
    trigger: 'vercel-cron-authenticated',
    schedule: '17 * * * *',
    contractVersion: 'naver-news-blob-only-collection-stage-v1',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    slotStart: '2026-10-01T12:00:00.000Z',
    collectionKey:
      'sched-v125-naver-news-20261001t120000z-f1ed381d367d',
    jobId: 'a'.repeat(64),
    resultSha256: 'c'.repeat(64),
    stagedObjectStatus: 'created',
    counts: {
      received: 100,
      rawEvidence: 100,
      normalizedRecords: 100,
      duplicateRecords: 0,
      rejectedItems: 0,
    },
    databaseWrites: 0,
    schedulerManifestFinalized: false,
  });
});

test('missing Blob binding fails closed before collection stage', async () => {
  let storeCalls = 0;
  let stageCalls = 0;
  const response = await handleNaverNewsVercelCronFallback(
    request(),
    environment(),
    {
      resolveOidcToken() {
        return 'oidc-token';
      },
      createStore() {
        storeCalls += 1;
        return memoryStore();
      },
      async runStage() {
        stageCalls += 1;
        return stageSummary();
      },
    },
  );

  assert.equal(response.status, 503);
  assert.equal(storeCalls, 0);
  assert.equal(stageCalls, 0);
  assert.deepEqual(await response.json(), {
    ok: false,
    mode: 'naver-news-vercel-cron-blob-only-fallback-v2',
    errorClass: 'runtime_unavailable',
  });
});

test('candidate remains dormant because vercel.json contains no crons', async () => {
  const raw = await readFile(
    new URL('../vercel.json', import.meta.url),
    'utf8',
  );
  const config = JSON.parse(raw);
  assert.equal(config.crons, undefined);
  assert.deepEqual(config.git?.deploymentEnabled, {
    '*': false,
    main: true,
  });
});

test('route is GET-only in sin1 and binds request-context OIDC to the Production Blob store', async () => {
  const route = await readFile(
    new URL(
      '../app/api/internal/naver-news/vercel-cron-fallback/route.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function POST/);
  assert.match(route, /preferredRegion = 'sin1'/);
  assert.match(route, /getVercelOidcToken/);
  assert.match(route, /createProductionNaverNewsBlobEvidenceStore/);
});
