import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  handleNaverNewsBlobOnlyProductionStage,
  NAVER_NEWS_BLOB_ONLY_PRODUCTION_EXECUTION_ID,
  NAVER_NEWS_BLOB_ONLY_PRODUCTION_SOURCE,
} from '../lib/server/ingestion/naverNewsBlobOnlyProductionStage';
import type {
  NaverNewsBlobOnlyCollectionStageSummary,
} from '../lib/server/ingestion/naverNewsBlobOnlyCollectionStage';
import type {
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

const SECRET = 'scheduler-secret-value';

function environment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    FANDEX_NAVER_NEWS_RECURRING_ENABLED:
      'approved-v128-recurring-foundation',
    FANDEX_NAVER_NEWS_RECURRING_DEPLOYMENT: 'production',
    FANDEX_NAVER_NEWS_RECURRING_QUERY: '아이유 IU',
    FANDEX_NAVER_NEWS_RECURRING_DISPLAY: '100',
    FANDEX_NAVER_NEWS_SCHEDULER_SECRET: SECRET,
    FANDEX_NAVER_NEWS_API_ENDPOINT:
      'https://openapi.naver.com/v1/search/news.json',
    FANDEX_NAVER_NEWS_CLIENT_ID: 'client-id',
    FANDEX_NAVER_NEWS_CLIENT_SECRET: 'client-secret',
    VERCEL_ENV: 'production',
    BLOB_STORE_ID: 'store_123',
    ...overrides,
  };
}

function request(
  overrides: {
    authorization?: string;
    executionId?: string;
    source?: string;
    url?: string;
    body?: string;
  } = {},
): Request {
  const headers = new Headers();
  headers.set(
    'authorization',
    overrides.authorization ?? `Bearer ${SECRET}`,
  );
  headers.set(
    'x-fandex-blob-only-stage-id',
    overrides.executionId
      ?? NAVER_NEWS_BLOB_ONLY_PRODUCTION_EXECUTION_ID,
  );
  headers.set(
    'x-fandex-scheduler-source',
    overrides.source ?? NAVER_NEWS_BLOB_ONLY_PRODUCTION_SOURCE,
  );
  return new Request(
    overrides.url
      ?? 'https://example.test/api/internal/naver-news/blob-only-collection-stage',
    {
      method: 'POST',
      headers,
      ...(overrides.body === undefined ? {} : { body: overrides.body }),
    },
  );
}

function fakeStore(): ImmutableTextObjectStore {
  return Object.freeze({
    async readText() { return null; },
    async listPathnames() { return Object.freeze([]); },
    async putTextIfAbsent(pathname: string) {
      return Object.freeze({ status: 'created' as const, pathname });
    },
  });
}

const STAGE_RESULT: NaverNewsBlobOnlyCollectionStageSummary =
  Object.freeze({
    contractVersion: 'naver-news-blob-only-collection-stage-v1',
    mode: 'blob-only-collection-stage',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    slotStart: '2026-10-01T00:00:00.000Z',
    collectionKey:
      'sched-v125-naver-news-20261001t000000z-f1ed381d367d',
    jobId:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    requestSha256:
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    resultSha256:
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    planSha256:
      'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    stagedObjectStatus: 'created',
    counts: Object.freeze({
      received: 100,
      rawEvidence: 100,
      normalizedRecords: 98,
      duplicateRecords: 1,
      rejectedItems: 1,
    }),
    safety: Object.freeze({
      databaseConnections: 0,
      databaseQueries: 0,
      databaseWrites: 0,
      databaseCompletionPerformed: false,
      schedulerManifestFinalized: false,
      schedulesActivated: 0,
      environmentMutations: 0,
      productActivations: 0,
      publicRouteCutovers: 0,
    }),
  });

test('rejects wrong authorization before OIDC, store, or stage execution', async () => {
  let oidcCalls = 0;
  let storeCalls = 0;
  let stageCalls = 0;

  const response = await handleNaverNewsBlobOnlyProductionStage(
    request({ authorization: 'Bearer wrong-secret' }),
    environment(),
    {
      resolveOidcToken: () => {
        oidcCalls += 1;
        return 'unexpected';
      },
      createStore() {
        storeCalls += 1;
        return fakeStore();
      },
      runStage: async () => {
        stageCalls += 1;
        return STAGE_RESULT;
      },
    },
  );

  assert.equal(response.status, 403);
  assert.equal(oidcCalls, 0);
  assert.equal(storeCalls, 0);
  assert.equal(stageCalls, 0);
  assert.deepEqual(await response.json(), {
    ok: false,
    mode: 'naver-production-blob-only-collection-stage',
    errorClass: 'request_rejected',
  });
});

test('requires exact purpose id and manual GitHub source marker', async () => {
  for (const candidate of [
    request({ executionId: 'wrong' }),
    request({ source: 'github-actions-hourly-v1' }),
  ]) {
    const response = await handleNaverNewsBlobOnlyProductionStage(
      candidate,
      environment(),
      {
        createStore: () => {
          throw new Error('must not create store');
        },
      },
    );
    assert.equal(response.status, 403);
    assert.equal((await response.json()).errorClass, 'request_rejected');
  }
});

test('rejects query/body and non-Production runtime without side effects', async () => {
  const withQuery = await handleNaverNewsBlobOnlyProductionStage(
    request({
      url: 'https://example.test/api/internal/naver-news/blob-only-collection-stage?x=1',
    }),
    environment(),
    { createStore: () => { throw new Error('unreachable'); } },
  );
  assert.equal(withQuery.status, 400);

  const withBody = await handleNaverNewsBlobOnlyProductionStage(
    request({ body: '{}' }),
    environment(),
    { createStore: () => { throw new Error('unreachable'); } },
  );
  assert.equal(withBody.status, 400);

  let oidcCalls = 0;
  const preview = await handleNaverNewsBlobOnlyProductionStage(
    request(),
    environment({ VERCEL_ENV: 'preview' }),
    {
      resolveOidcToken: () => {
        oidcCalls += 1;
        return 'unexpected';
      },
      createStore: () => { throw new Error('unreachable'); },
    },
  );
  assert.equal(preview.status, 503);
  assert.equal(oidcCalls, 0);
  assert.equal((await preview.json()).errorClass, 'runtime_unavailable');
});

test('resolves request-context OIDC and executes one bounded Blob-only stage', async () => {
  let oidcCalls = 0;
  let storeCalls = 0;
  let stageCalls = 0;

  const response = await handleNaverNewsBlobOnlyProductionStage(
    request(),
    environment(),
    {
      resolveOidcToken: () => {
        oidcCalls += 1;
        return 'oidc-token';
      },
      createStore(runtimeEnvironment) {
        storeCalls += 1;
        assert.equal(runtimeEnvironment.VERCEL_OIDC_TOKEN, 'oidc-token');
        assert.equal(runtimeEnvironment.BLOB_STORE_ID, 'store_123');
        assert.equal(runtimeEnvironment.FANDEX_RUNTIME_DATABASE_URL, undefined);
        return fakeStore();
      },
      runStage: async (input, dependencies) => {
        stageCalls += 1;
        assert.equal(input.query, '아이유 IU');
        assert.equal(input.display, 100);
        assert.equal(input.environment.VERCEL_OIDC_TOKEN, 'oidc-token');
        assert.ok(dependencies.store);
        return STAGE_RESULT;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(oidcCalls, 1);
  assert.equal(storeCalls, 1);
  assert.equal(stageCalls, 1);
  assert.deepEqual(await response.json(), {
    ok: true,
    mode: 'naver-production-blob-only-collection-stage',
    contractVersion: 'naver-news-blob-only-collection-stage-v1',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    slotStart: '2026-10-01T00:00:00.000Z',
    collectionKey:
      'sched-v125-naver-news-20261001t000000z-f1ed381d367d',
    jobId:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    resultSha256:
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    stagedObjectStatus: 'created',
    counts: {
      received: 100,
      rawEvidence: 100,
      normalizedRecords: 98,
      duplicateRecords: 1,
      rejectedItems: 1,
    },
    databaseWrites: 0,
    schedulerManifestFinalized: false,
  });
});

test('fails closed when OIDC or collection stage is unavailable', async () => {
  const noOidc = await handleNaverNewsBlobOnlyProductionStage(
    request(),
    environment(),
    {
      resolveOidcToken: () => undefined,
      createStore: () => fakeStore(),
    },
  );
  assert.equal(noOidc.status, 503);
  assert.equal((await noOidc.json()).errorClass, 'runtime_unavailable');

  const stageFailed = await handleNaverNewsBlobOnlyProductionStage(
    request(),
    environment({ VERCEL_OIDC_TOKEN: 'persisted-oidc' }),
    {
      createStore: () => fakeStore(),
      runStage: async () => {
        throw new Error('private detail');
      },
    },
  );
  assert.equal(stageFailed.status, 502);
  assert.deepEqual(await stageFailed.json(), {
    ok: false,
    mode: 'naver-production-blob-only-collection-stage',
    errorClass: 'collection_stage_failed',
  });
});

test('Production wrapper contains no Postgres or database dependency', async () => {
  const [handler, route] = await Promise.all([
    readFile(
      new URL(
        '../lib/server/ingestion/naverNewsBlobOnlyProductionStage.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../app/api/internal/naver-news/blob-only-collection-stage/route.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  for (const source of [handler, route]) {
    assert.doesNotMatch(source, /from ['"]pg['"]/);
    assert.doesNotMatch(source, /FANDEX_RUNTIME_DATABASE_URL/);
    assert.doesNotMatch(source, /requireRuntimeDatabaseUrl/);
    assert.doesNotMatch(source, /createPostgresNaverNews/);
  }
  assert.match(route, /getVercelOidcToken/);
  assert.match(route, /preferredRegion = 'sin1'/);
  assert.match(route, /createProductionNaverNewsBlobEvidenceStore/);
});
