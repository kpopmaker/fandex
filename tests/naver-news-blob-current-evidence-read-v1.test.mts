import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  buildNaverNewsSchedulerPlan,
} from '../lib/server/ingestion/naverNewsScheduler';
import {
  handleNaverNewsBlobCurrentEvidenceRead,
  NAVER_NEWS_BLOB_CURRENT_EVIDENCE_READ_ID,
  NAVER_NEWS_BLOB_CURRENT_EVIDENCE_SOURCE,
} from '../lib/server/ingestion/naverNewsBlobCurrentEvidenceRead';
import {
  stageNaverNewsStoredEvidenceMirror,
} from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import type {
  ImmutableTextObjectPutResult,
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

const SECRET = 'scheduler-secret-value';

function memoryStore(): ImmutableTextObjectStore {
  const rows = new Map<string, string>();
  return {
    async readText(pathname) {
      return rows.get(pathname) ?? null;
    },
    async listPathnames(prefix) {
      return [...rows.keys()]
        .filter((pathname) => pathname.startsWith(prefix))
        .sort();
    },
    async putTextIfAbsent(
      pathname,
      body,
    ): Promise<ImmutableTextObjectPutResult> {
      const current = rows.get(pathname);
      if (current === undefined) {
        rows.set(pathname, body);
        return Object.freeze({
          status: 'created' as const,
          pathname,
        });
      }
      if (current === body) {
        return Object.freeze({
          status: 'idempotent-existing' as const,
          pathname,
        });
      }
      return Object.freeze({
        status: 'conflict' as const,
        pathname,
      });
    },
  };
}

function environment(
  overrides: Record<string, string | undefined> = {},
) {
  return {
    FANDEX_NAVER_NEWS_SCHEDULER_SECRET: SECRET,
    BLOB_STORE_ID: 'store_123',
    VERCEL_ENV: 'production',
    ...overrides,
  };
}

function request(
  overrides: {
    authorization?: string;
    id?: string;
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
    'x-fandex-momentum-blob-current-evidence-id',
    overrides.id ?? NAVER_NEWS_BLOB_CURRENT_EVIDENCE_READ_ID,
  );
  headers.set(
    'x-fandex-scheduler-source',
    overrides.source ?? NAVER_NEWS_BLOB_CURRENT_EVIDENCE_SOURCE,
  );

  return new Request(
    overrides.url
      ?? 'https://example.test/api/internal/naver-news/blob-current-evidence',
    {
      method: 'POST',
      headers,
      ...(overrides.body === undefined
        ? {}
        : { body: overrides.body }),
    },
  );
}

async function stageLaterSlot(store: ImmutableTextObjectStore) {
  const scheduler = buildNaverNewsSchedulerPlan({
    query: '아이유 IU',
    at: '2026-09-15T17:00:00.000Z',
    display: 100,
  });
  const identity = buildNaverNewsJobIdentity(scheduler.command);
  const plan = buildNaverNewsIngestionWritePlan(identity, {
    fetchedAt: '2026-09-15T17:00:05.000Z',
    response: {
      lastBuildDate: '2026-09-15T17:00:04.000Z',
      total: 1,
      start: 1,
      display: 1,
      items: [
        {
          title: '아이유 새 앨범 소식',
          originallink: 'https://news.example.test/iu-stage',
          description: '아이유 관련 최신 기사',
          pubDate: '2026-09-15T16:59:00.000Z',
        },
      ],
    },
  });
  await stageNaverNewsStoredEvidenceMirror(plan, store);
  return plan;
}

test('authorization and source guards reject before OIDC or Blob access', async () => {
  for (const candidate of [
    request({ authorization: 'Bearer wrong' }),
    request({ id: 'wrong' }),
    request({ source: 'github-actions-hourly-v1' }),
  ]) {
    let oidcCalls = 0;
    let storeCalls = 0;
    const response = await handleNaverNewsBlobCurrentEvidenceRead(
      candidate,
      environment(),
      {
        resolveOidcToken() {
          oidcCalls += 1;
          return 'unexpected';
        },
        createReadStore() {
          storeCalls += 1;
          throw new Error('unreachable');
        },
      },
    );

    assert.equal(response.status, 403);
    assert.equal(oidcCalls, 0);
    assert.equal(storeCalls, 0);
    assert.deepEqual(await response.json(), {
      ok: false,
      mode: 'momentum-naver-blob-current-evidence-read',
      errorClass: 'request_rejected',
    });
  }
});

test('query/body and non-Production runtime fail closed', async () => {
  const query = await handleNaverNewsBlobCurrentEvidenceRead(
    request({
      url: 'https://example.test/api/internal/naver-news/blob-current-evidence?x=1',
    }),
    environment(),
    { createReadStore: () => { throw new Error('unreachable'); } },
  );
  assert.equal(query.status, 400);

  const body = await handleNaverNewsBlobCurrentEvidenceRead(
    request({ body: '{}' }),
    environment(),
    { createReadStore: () => { throw new Error('unreachable'); } },
  );
  assert.equal(body.status, 400);

  let oidcCalls = 0;
  const preview = await handleNaverNewsBlobCurrentEvidenceRead(
    request(),
    environment({ VERCEL_ENV: 'preview' }),
    {
      resolveOidcToken() {
        oidcCalls += 1;
        return 'unexpected';
      },
      createReadStore: () => { throw new Error('unreachable'); },
    },
  );
  assert.equal(preview.status, 503);
  assert.equal(oidcCalls, 0);
});

test('reads staged Blob evidence and returns unavailable Momentum projection when historical slots are missing', async () => {
  const store = memoryStore();
  const plan = await stageLaterSlot(store);
  let readStoreCalls = 0;

  const response = await handleNaverNewsBlobCurrentEvidenceRead(
    request(),
    environment(),
    {
      resolveOidcToken: () => 'oidc-token',
      createReadStore(runtimeEnvironment) {
        readStoreCalls += 1;
        assert.equal(runtimeEnvironment.VERCEL_OIDC_TOKEN, 'oidc-token');
        assert.equal(runtimeEnvironment.BLOB_STORE_ID, 'store_123');
        assert.equal(runtimeEnvironment.FANDEX_RUNTIME_DATABASE_URL, undefined);
        return {
          readText: store.readText,
          listPathnames: store.listPathnames,
        };
      },
      now: () => new Date('2026-09-15T17:20:00.000Z'),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(readStoreCalls, 1);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.mode, 'momentum-naver-blob-current-evidence-read');
  assert.equal(
    body.contractVersion,
    'naver-news-blob-current-evidence-coverage-v1',
  );
  assert.equal(body.canonicalArtistId, 'iu');
  assert.equal(body.exactOfficialProtocol, true);
  assert.equal(body.schedulerCompletionClaimed, false);
  assert.equal(body.latestStagedJobId, plan.identity.jobId);
  assert.equal(
    body.latestStagedCollectionKey,
    plan.identity.request.collectionKey,
  );
  assert.equal(body.latestStagedJobValidated, true);
  assert.equal(body.seriesStatus, 'unavailable');
  assert.equal(body.expectedSlotCount, 2);
  assert.equal(body.reproducedSnapshotCount, 1);
  assert.equal(body.missingSlotCount, 1);
  assert.equal(
    body.currentStoredEvidenceReproducedForReadiness,
    false,
  );
  assert.deepEqual(body.momentumProjection, {
    throughSlotStart: '2026-09-15T17:00:00.000Z',
    jobId: plan.identity.jobId,
    collectionKey: plan.identity.request.collectionKey,
    exactOfficialProtocol: true,
    seriesStatus: 'unavailable',
    expectedSlotCount: 2,
    reproducedSnapshotCount: 1,
  });
  assert.equal(body.databaseReads, 0);
  assert.equal(body.databaseWrites, 0);
  assert.equal(body.blobWrites, 0);
});

test('route and handler contain no database or Blob write capability', async () => {
  const [handler, route, runtime] = await Promise.all([
    readFile(
      new URL(
        '../lib/server/ingestion/naverNewsBlobCurrentEvidenceRead.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../app/api/internal/naver-news/blob-current-evidence/route.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../lib/server/ingestion/naverNewsBlobMirrorRuntime.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  for (const source of [handler, route]) {
    assert.doesNotMatch(source, /FANDEX_RUNTIME_DATABASE_URL/);
    assert.doesNotMatch(source, /from ['"]pg['"]/);
    assert.doesNotMatch(source, /createPostgresNaverNews/);
    assert.doesNotMatch(source, /putTextIfAbsent/);
    assert.doesNotMatch(source, /stageNaverNewsStoredEvidenceMirror/);
    assert.doesNotMatch(source, /finalizeNaverNewsStoredEvidenceMirror/);
  }

  assert.match(route, /createProductionNaverNewsBlobEvidenceReadStore/);
  assert.match(route, /preferredRegion = 'sin1'/);
  assert.match(runtime, /createProductionNaverNewsBlobEvidenceReadStore/);
  assert.match(
    runtime,
    /createVercelBlobTextReadStore\(client, config\)/,
  );
});
