import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  runNaverNewsBlobOnlyCollectionStage,
} from '../lib/server/ingestion/naverNewsBlobOnlyCollectionStage';
import {
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  NAVER_NEWS_MIRROR_JOB_PREFIX,
  NAVER_NEWS_MIRROR_MANIFEST_PREFIX,
} from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import {
  assembleNaverNewsCanonicalJobEvidence,
} from '../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import type {
  NaverNewsCollector,
} from '../lib/server/ingestion/naverNewsWorker';
import type {
  ImmutableTextObjectStore,
  ImmutableTextObjectPutResult,
} from '../lib/server/storage/immutableTextObjectStore';

function memoryStore(): ImmutableTextObjectStore & {
  entries(): ReadonlyMap<string, string>;
} {
  const rows = new Map<string, string>();
  return {
    async readText(pathname) {
      return rows.get(pathname) ?? null;
    },
    async listPathnames(prefix) {
      return [...rows.keys()].filter((pathname) => pathname.startsWith(prefix)).sort();
    },
    async putTextIfAbsent(pathname, body): Promise<ImmutableTextObjectPutResult> {
      const current = rows.get(pathname);
      if (current === undefined) {
        rows.set(pathname, body);
        return Object.freeze({ status: 'created' as const, pathname });
      }
      if (current === body) {
        return Object.freeze({ status: 'idempotent-existing' as const, pathname });
      }
      return Object.freeze({ status: 'conflict' as const, pathname });
    },
    entries() {
      return rows;
    },
  };
}

const collector: NaverNewsCollector = Object.freeze({
  mode: 'fixture' as const,
  async collect() {
    return Object.freeze({
      fetchedAt: '2026-10-01T00:17:05.000Z',
      response: Object.freeze({
        lastBuildDate: '2026-10-01T00:17:04.000Z',
        total: 1,
        start: 1,
        display: 1,
        items: Object.freeze([
          Object.freeze({
            title: '아이유 테스트 기사',
            originallink: 'https://example.com/iu-test',
            link: 'https://n.news.naver.com/example',
            description: '아이유 관련 검증용 기사',
            pubDate: '2026-10-01T00:16:00.000Z',
          }),
        ]),
      }),
    });
  },
});

test('stages one exact official scheduler collection to immutable storage with zero DB effects', async () => {
  const store = memoryStore();
  const result = await runNaverNewsBlobOnlyCollectionStage(
    {
      query: '아이유 IU',
      display: 100,
      environment: {},
    },
    {
      store,
      collector,
      now: () => new Date('2026-10-01T00:17:30.000Z'),
    },
  );

  assert.equal(result.mode, 'blob-only-collection-stage');
  assert.equal(result.schedulerVersion, 'v125_naver_news_scheduler_v1');
  assert.equal(result.slotStart, '2026-10-01T00:00:00.000Z');
  assert.match(
    result.collectionKey,
    /^sched-v125-naver-news-20261001t000000z-[0-9a-f]{12}$/,
  );
  assert.match(result.jobId, /^[0-9a-f]{64}$/);
  assert.match(result.requestSha256, /^[0-9a-f]{64}$/);
  assert.match(result.resultSha256, /^[0-9a-f]{64}$/);
  assert.match(result.planSha256, /^[0-9a-f]{64}$/);
  assert.equal(result.stagedObjectStatus, 'created');
  assert.equal(result.counts.received, 1);
  assert.equal(result.counts.normalizedRecords, 1);
  assert.deepEqual(result.safety, {
    databaseConnections: 0,
    databaseQueries: 0,
    databaseWrites: 0,
    databaseCompletionPerformed: false,
    schedulerManifestFinalized: false,
    schedulesActivated: 0,
    environmentMutations: 0,
    productActivations: 0,
    publicRouteCutovers: 0,
  });

  const paths = [...store.entries().keys()];
  assert.equal(paths.length, 1);
  assert.ok(paths[0].startsWith(NAVER_NEWS_MIRROR_JOB_PREFIX));
  assert.ok(!paths[0].startsWith(NAVER_NEWS_MIRROR_MANIFEST_PREFIX));

  const repository =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(store);
  const stored = await repository.readJobEvidence(result.jobId);
  assert.ok(stored);
  assert.equal(stored.job.jobId, result.jobId);
  assert.equal(stored.job.request.collectionKey, result.collectionKey);
  assert.equal(stored.job.request.query, '아이유 IU');
  assert.equal(stored.normalizedRecords.length, 1);

  const canonical = await assembleNaverNewsCanonicalJobEvidence(
    { canonicalArtistId: 'iu', jobId: result.jobId },
    repository,
  );
  assert.equal(canonical.jobId, result.jobId);
  assert.equal(canonical.request.collectionKey, result.collectionKey);
  assert.equal(canonical.completeness.status, 'available');
});

test('replaying the same slot and collection is idempotent at the immutable object boundary', async () => {
  const store = memoryStore();
  const input = {
    query: '아이유 IU',
    display: 100,
    environment: {},
  };
  const dependencies = {
    store,
    collector,
    now: () => new Date('2026-10-01T00:17:30.000Z'),
  };

  const first = await runNaverNewsBlobOnlyCollectionStage(input, dependencies);
  const second = await runNaverNewsBlobOnlyCollectionStage(input, dependencies);

  assert.equal(first.stagedObjectStatus, 'created');
  assert.equal(second.stagedObjectStatus, 'idempotent-existing');
  assert.equal(second.jobId, first.jobId);
  assert.equal(second.collectionKey, first.collectionKey);
  assert.equal(second.resultSha256, first.resultSha256);
  assert.equal(store.entries().size, 1);
});

test('implementation cannot touch Postgres or finalize a scheduler manifest', async () => {
  const source = await readFile(
    new URL(
      '../lib/server/ingestion/naverNewsBlobOnlyCollectionStage.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /from ['"]pg['"]/);
  assert.doesNotMatch(source, /requireRuntimeDatabaseUrl/);
  assert.doesNotMatch(source, /createPostgresNaverNews/);
  assert.doesNotMatch(source, /finalizeNaverNewsStoredEvidenceMirror/);
  assert.doesNotMatch(source, /FANDEX_RUNTIME_DATABASE_URL/);
});
