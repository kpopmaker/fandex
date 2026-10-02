import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  runNaverNewsBlobOnlyRecurring,
} from '../scripts/ingestion/run-naver-news-blob-only-recurring-v1';
import type {
  NaverNewsBlobOnlyCollectionStageSummary,
} from '../lib/server/ingestion/naverNewsBlobOnlyCollectionStage';
import type {
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

const APPROVAL = 'approved-github-actions-blob-only-recurring-v1';

function environment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    FANDEX_NAVER_BLOB_ONLY_RECURRING_EXECUTION_APPROVAL: APPROVAL,
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
  slotStart: '2026-10-02T09:00:00.000Z',
  collectionKey:
    'sched-v125-naver-news-20261002t090000z-f1ed381d367d',
  jobId: 'a'.repeat(64),
  requestSha256: 'b'.repeat(64),
  resultSha256: 'c'.repeat(64),
  planSha256: 'd'.repeat(64),
  stagedObjectStatus: 'created',
  counts: Object.freeze({
    received: 100,
    rawEvidence: 100,
    normalizedRecords: 100,
    duplicateRecords: 0,
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

test('recurring Blob-only stage requires its own explicit approval', async () => {
  let storeCalls = 0;
  await assert.rejects(
    () => runNaverNewsBlobOnlyRecurring(
      environment({
        FANDEX_NAVER_BLOB_ONLY_RECURRING_EXECUTION_APPROVAL: 'NO',
      }),
      {
        createStore() {
          storeCalls += 1;
          return fakeStore();
        },
      },
    ),
    /naver_news_blob_only_recurring_approval_required/,
  );
  assert.equal(storeCalls, 0);
});

test('recurring Blob-only candidate stages evidence without manifest finalization', async () => {
  let stageCalls = 0;

  const summary = await runNaverNewsBlobOnlyRecurring(
    environment(),
    {
      createStore(runtimeEnvironment) {
        assert.equal(runtimeEnvironment.BLOB_READ_WRITE_TOKEN, 'blob-token');
        assert.equal(runtimeEnvironment.FANDEX_RUNTIME_DATABASE_URL, undefined);
        return fakeStore();
      },
      async runStage(input, dependencies) {
        stageCalls += 1;
        assert.equal(input.query, '아이유 IU');
        assert.equal(input.display, 100);
        assert.ok(dependencies.store);
        return RESULT;
      },
    },
  );

  assert.equal(stageCalls, 1);
  assert.deepEqual(summary, {
    mode: 'github-actions-recurring-blob-only-stage',
    contractVersion: 'naver-news-blob-only-collection-stage-v1',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    slotStart: '2026-10-02T09:00:00.000Z',
    collectionKey:
      'sched-v125-naver-news-20261002t090000z-f1ed381d367d',
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
    productActivations: 0,
  });
});

test('recurring runner cannot reach a manifest finalizer or database path', async () => {
  const source = await readFile(
    new URL(
      '../scripts/ingestion/run-naver-news-blob-only-recurring-v1.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(source, /runNaverNewsBlobOnlyCollectionStage/);
  assert.match(source, /createProductionNaverNewsBlobEvidenceStore/);
  assert.doesNotMatch(source, /finalizeNaverNewsStoredEvidenceMirror/);
  assert.doesNotMatch(source, /FANDEX_RUNTIME_DATABASE_URL/);
  assert.doesNotMatch(source, /from ['"]pg['"]/);
  assert.doesNotMatch(source, /getVercelOidcToken/);
  assert.doesNotMatch(source, /fetch\(/);
});

test('recurring Production workflow calls only the stage-only runner', async () => {
  const workflow = await readFile(
    new URL(
      '../.github/workflows/naver-news-blob-only-recurring-production-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.match(
    workflow,
    /FANDEX_NAVER_BLOB_ONLY_RECURRING_EXECUTION_APPROVAL/,
  );
  assert.match(
    workflow,
    /run-naver-news-blob-only-recurring-v1\.ts/,
  );
  assert.doesNotMatch(
    workflow,
    /run-naver-news-blob-only-direct-v1\.ts/,
  );
  assert.doesNotMatch(
    workflow,
    /FANDEX_NAVER_BLOB_ONLY_DIRECT_EXECUTION_APPROVAL/,
  );
  assert.match(workflow, /schedulerManifestFinalized=false/);
  assert.match(workflow, /databaseWrites=0/);
  assert.match(workflow, /productActivations=0/);
});
