import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  runNaverNewsBlobOnlyDirect,
} from '../scripts/ingestion/run-naver-news-blob-only-direct-v1';
import type {
  NaverNewsBlobOnlyCollectionStageSummary,
} from '../lib/server/ingestion/naverNewsBlobOnlyCollectionStage';
import type {
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';
import {
  buildNaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';

const APPROVAL = 'approved-github-actions-blob-only-direct-v1';

const CURRENT_SLOT_COLLECTION_KEY =
  'sched-v125-naver-news-20261002t000000z-f1ed381d367d';
const CURRENT_SLOT_IDENTITY = buildNaverNewsJobIdentity({
  provider: 'naver-news',
  collectionKey: CURRENT_SLOT_COLLECTION_KEY,
  query: '아이유 IU',
  display: 100,
  start: 1,
  sort: 'date',
});

function environment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    FANDEX_NAVER_BLOB_ONLY_DIRECT_EXECUTION_APPROVAL: APPROVAL,
    FANDEX_NAVER_NEWS_RECURRING_ENABLED:
      'approved-v128-recurring-foundation',
    FANDEX_NAVER_NEWS_RECURRING_DEPLOYMENT: 'production',
    FANDEX_NAVER_NEWS_RECURRING_QUERY: '아이유 IU',
    FANDEX_NAVER_NEWS_RECURRING_DISPLAY: '100',
    FANDEX_NAVER_NEWS_SCHEDULER_SECRET: 'scheduler-secret',
    FANDEX_NAVER_NEWS_API_ENDPOINT:
      'https://openapi.naver.com/v1/search/news.json',
    FANDEX_NAVER_NEWS_CLIENT_ID: 'client-id',
    FANDEX_NAVER_NEWS_CLIENT_SECRET: 'client-secret',
    BLOB_READ_WRITE_TOKEN: 'blob-token',
    ...overrides,
  };
}

function fakeStore(): ImmutableTextObjectStore {
  return Object.freeze({
    async readText() {
      return null;
    },
    async listPathnames() {
      return Object.freeze([]);
    },
    async putTextIfAbsent(pathname: string) {
      return Object.freeze({ status: 'created' as const, pathname });
    },
  });
}

const RESULT: NaverNewsBlobOnlyCollectionStageSummary = Object.freeze({
  contractVersion: 'naver-news-blob-only-collection-stage-v1',
  mode: 'blob-only-collection-stage',
  schedulerVersion: 'v125_naver_news_scheduler_v1',
  slotStart: '2026-10-02T00:00:00.000Z',
  collectionKey:
    'sched-v125-naver-news-20261002t000000z-f1ed381d367d',
  jobId: 'a'.repeat(64),
  requestSha256: 'b'.repeat(64),
  resultSha256: 'c'.repeat(64),
  planSha256: 'd'.repeat(64),
  stagedObjectStatus: 'created',
  counts: Object.freeze({
    received: 100,
    rawEvidence: 100,
    normalizedRecords: 99,
    duplicateRecords: 1,
    rejectedItems: 0,
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

test('requires explicit direct Blob-only execution approval before store creation', async () => {
  let storeCalls = 0;
  await assert.rejects(
    () => runNaverNewsBlobOnlyDirect(
      environment({
        FANDEX_NAVER_BLOB_ONLY_DIRECT_EXECUTION_APPROVAL: 'NO',
      }),
      {
        createStore() {
          storeCalls += 1;
          return fakeStore();
        },
      },
    ),
    /naver_news_blob_only_direct_approval_required/,
  );
  assert.equal(storeCalls, 0);
});

test('runs one canonical Blob-only stage directly without Vercel or database effects', async () => {
  let storeCalls = 0;
  let stageCalls = 0;
  let finalizeCalls = 0;

  const summary = await runNaverNewsBlobOnlyDirect(
    environment(),
    {
      createStore(runtimeEnvironment) {
        storeCalls += 1;
        assert.equal(
          runtimeEnvironment.BLOB_READ_WRITE_TOKEN,
          'blob-token',
        );
        assert.equal(runtimeEnvironment.VERCEL_ENV, undefined);
        assert.equal(
          runtimeEnvironment.FANDEX_RUNTIME_DATABASE_URL,
          undefined,
        );
        return fakeStore();
      },
      async runStage(input, dependencies) {
        stageCalls += 1;
        assert.equal(input.query, '아이유 IU');
        assert.equal(input.display, 100);
        assert.ok(dependencies.store);
        return RESULT;
      },
      async finalizeManifest(jobId, resultSha256, store) {
        finalizeCalls += 1;
        assert.equal(jobId, RESULT.jobId);
        assert.equal(resultSha256, RESULT.resultSha256);
        assert.ok(store);
        return Object.freeze({
          schedulerManifest: Object.freeze({
            status: 'created' as const,
            pathname: 'fandex/naver-news/stored-evidence-mirror/v1/scheduler-manifests/test.json',
          }),
          schedulerManifestPayloadDigest: 'e'.repeat(64),
        });
      },
    },
  );

  assert.equal(storeCalls, 1);
  assert.equal(stageCalls, 1);
  assert.equal(finalizeCalls, 1);
  assert.deepEqual(summary, {
    mode: 'github-actions-direct-blob-only',
    runStatus: 'collected-and-finalized',
    contractVersion: 'naver-news-blob-only-collection-stage-v1',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    slotStart: '2026-10-02T00:00:00.000Z',
    collectionKey: CURRENT_SLOT_COLLECTION_KEY,
    jobId: CURRENT_SLOT_IDENTITY.jobId,
    resultSha256: 'c'.repeat(64),
    stagedObjectStatus: 'created',
    counts: {
      received: 100,
      rawEvidence: 100,
      normalizedRecords: 99,
      duplicateRecords: 1,
      rejectedItems: 0,
    },
    providerCalls: 1,
    databaseWrites: 0,
    schedulerManifestFinalized: true,
  });
});

test('skips provider collection when the current scheduler slot is already finalized', async () => {
  let stageCalls = 0;
  let finalizeCalls = 0;
  const summary = await runNaverNewsBlobOnlyDirect(
    environment(),
    {
      createStore: () => fakeStore(),
      now: () => new Date('2026-10-02T00:17:00.000Z'),
      async readSucceededSchedulerJobs() {
        return Object.freeze([Object.freeze({
          jobId: CURRENT_SLOT_IDENTITY.jobId,
          collectionKey: CURRENT_SLOT_COLLECTION_KEY,
          requestContract: Object.freeze({
            provider: 'naver-news' as const,
            collectionKey: CURRENT_SLOT_COLLECTION_KEY,
            query: '아이유 IU',
            display: 100,
            start: 1,
            sort: 'date' as const,
          }),
        })]);
      },
      async runStage() {
        stageCalls += 1;
        return RESULT;
      },
      async finalizeManifest() {
        finalizeCalls += 1;
        throw new Error('should_not_finalize');
      },
    },
  );

  assert.equal(stageCalls, 0);
  assert.equal(finalizeCalls, 0);
  assert.deepEqual(summary, {
    mode: 'github-actions-direct-blob-only',
    runStatus: 'already-finalized',
    contractVersion: 'naver-news-blob-only-collection-stage-v1',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    slotStart: '2026-10-02T00:00:00.000Z',
    collectionKey:
      'sched-v125-naver-news-20261002t000000z-f1ed381d367d',
    jobId: 'a'.repeat(64),
    resultSha256: null,
    stagedObjectStatus: null,
    counts: null,
    providerCalls: 0,
    databaseWrites: 0,
    schedulerManifestFinalized: true,
  });
});

test('fails closed when finalized current-slot identity conflicts with the frozen plan', async () => {
  let stageCalls = 0;
  await assert.rejects(
    () => runNaverNewsBlobOnlyDirect(
      environment(),
      {
        createStore: () => fakeStore(),
        now: () => new Date('2026-10-02T00:17:00.000Z'),
        async readSucceededSchedulerJobs() {
          return Object.freeze([Object.freeze({
            jobId: 'f'.repeat(64),
            collectionKey: CURRENT_SLOT_COLLECTION_KEY,
            requestContract: Object.freeze({
              provider: 'naver-news' as const,
              collectionKey:
                'sched-v125-naver-news-20261002t000000z-f1ed381d367d',
              query: '아이유 IU',
              display: 100,
              start: 1,
              sort: 'date' as const,
            }),
          })]);
        },
        async runStage() {
          stageCalls += 1;
          return RESULT;
        },
      },
    ),
    /naver_news_blob_only_direct_preflight_conflict/,
  );
  assert.equal(stageCalls, 0);
});

test('fails closed when a staged scheduler job does not produce an official manifest', async () => {
  await assert.rejects(
    () => runNaverNewsBlobOnlyDirect(
      environment(),
      {
        createStore: () => fakeStore(),
        async runStage() {
          return RESULT;
        },
        async finalizeManifest() {
          return Object.freeze({
            schedulerManifest: null,
            schedulerManifestPayloadDigest: null,
          });
        },
      },
    ),
    /naver_news_blob_only_direct_manifest_required/,
  );
});

test('rejects protocol drift before stage execution', async () => {
  let stageCalls = 0;
  await assert.rejects(
    () => runNaverNewsBlobOnlyDirect(
      environment({
        FANDEX_NAVER_NEWS_RECURRING_QUERY: 'different query',
      }),
      {
        createStore: () => fakeStore(),
        async runStage() {
          stageCalls += 1;
          return RESULT;
        },
      },
    ),
  );
  assert.equal(stageCalls, 0);
});

test('direct runner contains no Postgres, Vercel OIDC, or HTTP Production route dependency', async () => {
  const source = await readFile(
    new URL(
      '../scripts/ingestion/run-naver-news-blob-only-direct-v1.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /from ['"]pg['"]/);
  assert.doesNotMatch(source, /FANDEX_RUNTIME_DATABASE_URL/);
  assert.doesNotMatch(source, /getVercelOidcToken/);
  assert.doesNotMatch(source, /fandex-eta\.vercel\.app/);
  assert.doesNotMatch(source, /fetch\(/);
  assert.match(source, /runNaverNewsBlobOnlyCollectionStage/);
  assert.match(source, /createProductionNaverNewsBlobEvidenceStore/);
  assert.match(source, /finalizeNaverNewsStoredEvidenceMirrorByJobId/);
});

test('Production workflow is manual-only, Vercel-independent, and secret-gated', async () => {
  const workflow = await readFile(
    new URL(
      '../.github/workflows/naver-news-blob-only-direct-production-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.match(
    workflow,
    /approved-github-actions-blob-only-direct-v1/,
  );
  assert.match(
    workflow,
    /secrets\.FANDEX_NAVER_EVIDENCE_BLOB_READ_WRITE_TOKEN/,
  );
  assert.doesNotMatch(workflow, /FANDEX_RUNTIME_DATABASE_URL/);
  assert.doesNotMatch(workflow, /VERCEL_OIDC_TOKEN/);
  assert.doesNotMatch(workflow, /fandex-eta\.vercel\.app/);
  assert.doesNotMatch(workflow, /curl /);
});


test('recurring Production workflow activates the frozen hourly cadence and preserves the manual approval path', async () => {
  const workflow = await readFile(
    new URL(
      '../.github/workflows/naver-news-blob-only-recurring-production-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /^\s*schedule:/m);
  assert.match(workflow, /cron: '17 \* \* \* \*'/);
  assert.match(workflow, /github\.event_name == 'schedule'/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
  assert.match(
    workflow,
    /inputs\.execution_approval == 'approved-github-actions-blob-only-recurring-v1'/,
  );
  assert.match(
    workflow,
    /FANDEX_NAVER_NEWS_RECURRING_ENABLED: approved-v128-recurring-foundation/,
  );
  assert.match(
    workflow,
    /FANDEX_NAVER_NEWS_RECURRING_DEPLOYMENT: production/,
  );
  assert.match(
    workflow,
    /FANDEX_NAVER_NEWS_RECURRING_QUERY: 아이유 IU/,
  );
  assert.match(
    workflow,
    /FANDEX_NAVER_NEWS_RECURRING_DISPLAY: '100'/,
  );
  assert.match(
    workflow,
    /FANDEX_NAVER_NEWS_SCHEDULER_SECRET: \$\{\{ secrets\.FANDEX_NAVER_NEWS_SCHEDULER_SECRET \}\}/,
  );
  assert.match(
    workflow,
    /BLOB_READ_WRITE_TOKEN: \$\{\{ secrets\.FANDEX_NAVER_EVIDENCE_BLOB_READ_WRITE_TOKEN \}\}/,
  );
  assert.match(workflow, /schedulerManifestFinalized !== true/);
  assert.match(workflow, /schedulerManifestFinalizationRequired=true/);
  assert.doesNotMatch(workflow, /FANDEX_RUNTIME_DATABASE_URL/);
});
