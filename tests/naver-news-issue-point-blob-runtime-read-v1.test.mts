import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot,
} from '../lib/server/product/naverNewsIssuePointBlobRuntimeRead';
import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  buildNaverNewsSchedulerPlan,
} from '../lib/server/ingestion/naverNewsScheduler';
import {
  stageNaverNewsStoredEvidenceMirror,
  finalizeNaverNewsStoredEvidenceMirror,
} from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import type {
  ImmutableTextObjectPutResult,
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

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
      const existing = rows.get(pathname);
      if (existing === undefined) {
        rows.set(pathname, body);
        return Object.freeze({
          status: 'created' as const,
          pathname,
        });
      }
      return Object.freeze({
        status:
          existing === body
            ? 'idempotent-existing' as const
            : 'conflict' as const,
        pathname,
      });
    },
  };
}

function planFor(slotStart: string) {
  const scheduler = buildNaverNewsSchedulerPlan({
    query: '아이유 IU',
    at: slotStart,
    display: 100,
  });
  const identity = buildNaverNewsJobIdentity(scheduler.command);
  return buildNaverNewsIngestionWritePlan(identity, {
    fetchedAt:
      new Date(Date.parse(slotStart) + 5_000).toISOString(),
    response: {
      lastBuildDate:
        new Date(Date.parse(slotStart) + 4_000).toISOString(),
      total: 1,
      start: 1,
      display: 1,
      items: [
        {
          title: `아이유 기사 ${slotStart}`,
          originallink:
            `https://news.example.test/iu-${slotStart}`,
          description: '아이유 관련 기사',
          pubDate:
            new Date(Date.parse(slotStart) - 60_000).toISOString(),
        },
      ],
    },
  });
}

async function stageOfficial(
  store: ImmutableTextObjectStore,
  slotStart: string,
) {
  const plan = planFor(slotStart);
  await stageNaverNewsStoredEvidenceMirror(plan, store);
  await finalizeNaverNewsStoredEvidenceMirror(
    plan.identity,
    plan.resultSha256,
    store,
  );
  return plan;
}

test('Blob-backed current newsIssuePoint reader resolves latest official manifest without Postgres', async () => {
  const store = memoryStore();
  await stageOfficial(store, '2026-09-15T16:00:00.000Z');
  const latest = await stageOfficial(
    store,
    '2026-09-15T17:00:00.000Z',
  );

  let oidcCalls = 0;
  let createStoreCalls = 0;

  const result =
    await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
      {
        VERCEL_ENV: 'production',
        BLOB_STORE_ID: 'store_test',
      },
      {
        resolveOidcToken() {
          oidcCalls += 1;
          return 'oidc-test-token';
        },
        createReadStore(environment) {
          createStoreCalls += 1;
          assert.equal(
            environment.VERCEL_OIDC_TOKEN,
            'oidc-test-token',
          );
          assert.equal(environment.BLOB_STORE_ID, 'store_test');
          return {
            readText: store.readText,
            listPathnames: store.listPathnames,
          };
        },
      },
    );

  assert.equal(oidcCalls, 1);
  assert.equal(createStoreCalls, 1);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.identity.sourceArtistId, 'iu');
  assert.equal(result.model.identity.variableId, 'newsIssuePoint');
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.presentation, 'standard');
  assert.equal(result.model.publication, 'shadow');
  assert.equal(
    result.model.sourceMetadata.sourceKind,
    'naver-news-issue-point-frozen-methodology',
  );
  assert.equal(
    result.model.sourceMetadata.throughSlotStart,
    '2026-09-15T17:00:00.000Z',
  );
  assert.match(
    latest.identity.request.collectionKey,
    /20260915t170000z/,
  );
  assert.equal(
    result.model.evidenceTrace.kind,
    'naver-news-issue-point-stored-evidence',
  );
});

test('Blob-backed current newsIssuePoint reader fails closed outside Production', async () => {
  let storeCalls = 0;
  const result =
    await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
      {
        VERCEL_ENV: 'preview',
        BLOB_STORE_ID: 'store_test',
      },
      {
        resolveOidcToken: () => 'unexpected',
        createReadStore() {
          storeCalls += 1;
          throw new Error('unreachable');
        },
      },
    );

  assert.equal(storeCalls, 0);
  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(
    result.issues[0]?.reason,
    'runtime-read-failed',
  );
});

test('Blob-backed current newsIssuePoint reader contains no Postgres dependency', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile(
      new URL(
        '../lib/server/product/naverNewsIssuePointBlobRuntimeRead.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  );

  assert.doesNotMatch(source, /getRuntimeDatabasePool/);
  assert.doesNotMatch(source, /createPostgresNaverNews/);
  assert.doesNotMatch(source, /from ['"]pg['"]/);
  assert.match(
    source,
    /createObjectStoreNaverNewsLatestOfficialShadowSlotRepository/,
  );
  assert.match(
    source,
    /createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository/,
  );
});
