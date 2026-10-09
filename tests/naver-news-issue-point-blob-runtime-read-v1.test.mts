import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FANDEX_NAVER_NEWS_VERCEL_PROJECT_ID,
  FANDEX_NAVER_NEWS_VERCEL_TEAM_ID,
  getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot,
  mintNaverNewsVercelProjectOidcToken,
  resolveNaverNewsRuntimeOidcToken,
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
  const protocolStart = Date.parse(
    '2026-10-03T01:00:00.000Z',
  );
  let latest = null as Awaited<
    ReturnType<typeof stageOfficial>
  > | null;

  for (let index = 0; index < 50; index += 1) {
    latest = await stageOfficial(
      store,
      new Date(
        protocolStart + index * 60 * 60 * 1_000,
      ).toISOString(),
    );
  }
  assert.ok(latest);

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
    '2026-10-05T02:00:00.000Z',
  );
  assert.match(
    latest.identity.request.collectionKey,
    /20261005t020000z/,
  );
  assert.equal(
    result.model.evidenceTrace.kind,
    'naver-news-issue-point-stored-evidence',
  );
});

test('Blob-backed current newsIssuePoint reader accepts host-neutral Production runtime', async () => {
  const store = memoryStore();
  const protocolStart = Date.parse(
    '2026-10-03T01:00:00.000Z',
  );

  for (let index = 0; index < 50; index += 1) {
    await stageOfficial(
      store,
      new Date(
        protocolStart + index * 60 * 60 * 1_000,
      ).toISOString(),
    );
  }

  let oidcCalls = 0;
  let createStoreCalls = 0;

  const result =
    await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
      {
        FANDEX_PRODUCT_RUNTIME_ENV: 'production',
        BLOB_READ_WRITE_TOKEN: 'static-test-token',
      },
      {
        resolveOidcToken() {
          oidcCalls += 1;
          return 'unexpected';
        },
        createReadStore(environment) {
          createStoreCalls += 1;
          assert.equal(
            environment.BLOB_READ_WRITE_TOKEN,
            'static-test-token',
          );
          return {
            readText: store.readText,
            listPathnames: store.listPathnames,
          };
        },
      },
    );

  assert.equal(oidcCalls, 0);
  assert.equal(createStoreCalls, 1);
  assert.equal(result.status, 'ok');
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
    result.issues[0]?.code,
    'real-source-data-issue',
  );
  if (result.issues[0]?.code === 'real-source-data-issue') {
    assert.equal(
      result.issues[0].reason,
      'runtime-read-failed',
    );
  }
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


test('Blob-backed current newsIssuePoint reader emits only sanitized latest-slot diagnostic', async () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    const result =
      await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
        {
          VERCEL_ENV: 'production',
          BLOB_STORE_ID: 'store_test',
        },
        {
          resolveOidcToken: () => 'oidc-test-token',
          createReadStore() {
            return {
              async readText() {
                return null;
              },
              async listPathnames() {
                return [];
              },
            };
          },
        },
      );

    assert.equal(result.status, 'data-issue');
    assert.deepEqual(warnings, [
      'FANDEX_NAVER_NEWS_BLOB_RUNTIME_DIAGNOSTIC=latest-slot-not-found',
    ]);
  } finally {
    console.warn = originalWarn;
  }
});


test('Blob-backed current newsIssuePoint reader accepts VERCEL_TARGET_ENV Production runtime', async () => {
  const store = memoryStore();
  const protocolStart = Date.parse(
    '2026-10-03T01:00:00.000Z',
  );

  for (let index = 0; index < 50; index += 1) {
    await stageOfficial(
      store,
      new Date(
        protocolStart + index * 60 * 60 * 1_000,
      ).toISOString(),
    );
  }

  const result =
    await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
      {
        VERCEL_TARGET_ENV: 'production',
        BLOB_READ_WRITE_TOKEN: 'static-test-token',
      },
      {
        createReadStore() {
          return {
            readText: store.readText,
            listPathnames: store.listPathnames,
          };
        },
      },
    );

  assert.equal(result.status, 'ok');
});

test('Blob-backed current newsIssuePoint reader emits sanitized production gate diagnostic', async () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    const result =
      await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
        {
          VERCEL_ENV: 'preview',
        },
      );

    assert.equal(result.status, 'data-issue');
    assert.deepEqual(warnings, [
      'FANDEX_NAVER_NEWS_BLOB_RUNTIME_DIAGNOSTIC=production-runtime-gate-failed',
    ]);
  } finally {
    console.warn = originalWarn;
  }
});


test('News Render runtime can mint project OIDC from VERCEL_TOKEN without logging the secret', async () => {
  const originalFetch = globalThis.fetch;
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  const payload = Buffer.from(
    JSON.stringify({ exp: expiresAt }),
  ).toString('base64url');
  const oidcToken =
    'header.' + payload + '.signature-signature-signature-signature';

  let requestUrl = '';
  let authorization = '';
  let body = '';

  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    authorization = String(
      (init?.headers as Record<string, string> | undefined)
        ?.Authorization ?? '',
    );
    body = String(init?.body ?? '');
    return new Response(
      JSON.stringify({ token: oidcToken }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const result = await mintNaverNewsVercelProjectOidcToken({
      VERCEL_TOKEN: 'render-project-access-token',
      FANDEX_VERCEL_PROJECT_ID:
        FANDEX_NAVER_NEWS_VERCEL_PROJECT_ID,
      FANDEX_VERCEL_TEAM_ID:
        FANDEX_NAVER_NEWS_VERCEL_TEAM_ID,
    });

    assert.equal(result, oidcToken);
    assert.match(
      requestUrl,
      new RegExp(
        '/v1/projects/'
          + FANDEX_NAVER_NEWS_VERCEL_PROJECT_ID
          + '/token',
      ),
    );
    assert.match(
      requestUrl,
      new RegExp(
        'teamId=' + FANDEX_NAVER_NEWS_VERCEL_TEAM_ID,
      ),
    );
    assert.equal(
      authorization,
      'Bearer render-project-access-token',
    );
    assert.match(
      body,
      /fandex:naver-news-product-runtime-read-v1/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('News Render OIDC mint fails closed on unexpected Vercel project binding', async () => {
  await assert.rejects(
    () =>
      mintNaverNewsVercelProjectOidcToken({
        VERCEL_TOKEN: 'render-project-access-token',
        FANDEX_VERCEL_PROJECT_ID: 'prj_unexpected',
        FANDEX_VERCEL_TEAM_ID:
          FANDEX_NAVER_NEWS_VERCEL_TEAM_ID,
      }),
    /naver_news_blob_runtime_vercel_project_binding_invalid/,
  );
});


test('News Render OIDC resolver falls back when Vercel-native OIDC throws', async () => {
  await assert.rejects(
    () =>
      resolveNaverNewsRuntimeOidcToken(
        {
          VERCEL_TOKEN: 'render-project-access-token',
          FANDEX_VERCEL_PROJECT_ID: 'prj_unexpected',
          FANDEX_VERCEL_TEAM_ID:
            FANDEX_NAVER_NEWS_VERCEL_TEAM_ID,
        },
        async () => {
          throw new Error('vercel-native-oidc-unavailable');
        },
      ),
    /naver_news_blob_runtime_vercel_project_binding_invalid/,
  );
});

test('News runtime stage timing is opt-in and excludes evidence, paths, and credentials', async () => {
  const store = memoryStore();
  const protocolStart = Date.parse('2026-10-03T01:00:00.000Z');
  for (let index = 0; index < 50; index += 1) {
    await stageOfficial(
      store,
      new Date(protocolStart + index * 60 * 60 * 1_000).toISOString(),
    );
  }

  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (...values: unknown[]) => {
    logs.push(values.map(String).join(' '));
  };
  let result;
  try {
    result = await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
      {
        FANDEX_PRODUCT_RUNTIME_ENV: 'production',
        FANDEX_NAVER_NEWS_STAGE_TIMINGS: '1',
        BLOB_READ_WRITE_TOKEN: 'private-static-test-token',
      },
      {
        createReadStore() {
          return {
            readText: store.readText,
            listPathnames: store.listPathnames,
          };
        },
      },
    );
  } finally {
    console.info = originalInfo;
  }

  assert.equal(result.status, 'ok');
  const prefix = 'FANDEX_NAVER_NEWS_BLOB_READ_STAGE=';
  const stages = logs.filter((line) => line.startsWith(prefix))
    .map((line) => JSON.parse(line.slice(prefix.length)) as {
      stage: string;
      outcome: string;
      durationMs: number | null;
    });
  assert.deepEqual(
    stages.map((line) => line.stage).sort(),
    [
      'credential-resolution',
      'store-initialization',
      'manifest-list',
      'manifest-load',
      'latest-slot-resolution',
      'canonical-evidence-batch',
      'series-assembly',
      'methodology-evaluation',
    ].sort(),
  );
  assert.ok(stages.every((line) => line.outcome === 'fulfilled'));
  const canonicalSummaries = logs.filter((line) =>
    line.startsWith('FANDEX_NAVER_NEWS_BLOB_CANONICAL_READ_PHASE='),
  );
  assert.equal(canonicalSummaries.length, 1);
  const phases = JSON.parse(canonicalSummaries[0]!.split('=')[1]!) as {
    outcome: string;
    objectsRequested: number;
    objectsFound: number;
    objectsMissing: number;
  };
  assert.equal(phases.outcome, 'fulfilled');
  assert.equal(phases.objectsRequested, 50);
  assert.equal(phases.objectsFound, 50);
  assert.equal(phases.objectsMissing, 0);
  assert.ok(stages.every((line) =>
    line.durationMs === null
    || (Number.isInteger(line.durationMs) && line.durationMs >= 0),
  ));
  assert.ok(logs.every((line) =>
    !line.includes('private-static-test-token')
    && !line.includes('stored-evidence-mirror/v1/')
    && !line.includes('아이유 기사'),
  ));
});

test('Production stage timing emits one safe manifest read phase summary without changing latest evidence', async () => {
  const store = memoryStore();
  const protocolStart = Date.parse('2026-10-03T01:00:00.000Z');
  for (let index = 0; index < 50; index += 1) {
    await stageOfficial(
      store,
      new Date(protocolStart + index * 60 * 60_000).toISOString(),
    );
  }

  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (...values: unknown[]) =>
    logs.push(values.map(String).join(' '));
  let result;
  try {
    result = await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
      {
        FANDEX_PRODUCT_RUNTIME_ENV: 'production',
        FANDEX_NAVER_NEWS_STAGE_TIMINGS: '1',
        BLOB_READ_WRITE_TOKEN: 'private-manifest-attribution-test-token',
      },
      {
        createReadStore() {
          return {
            readText: store.readText,
            listPathnames: store.listPathnames,
          };
        },
      },
    );
  } finally {
    console.info = originalInfo;
  }

  assert.equal(result.status, 'ok');
  const prefix = 'FANDEX_NAVER_NEWS_BLOB_MANIFEST_READ_PHASE=';
  const records = logs.filter((line) => line.startsWith(prefix));
  assert.equal(records.length, 1);
  const record = JSON.parse(records[0]!.slice(prefix.length)) as Record<string, unknown>;
  assert.deepEqual(Object.keys(record).sort(), [
    'contractVersion', 'outcome', 'manifestsRequested', 'manifestsFound',
    'manifestsMissing', 'configuredMaxConcurrentReads',
    'peakConcurrentRemoteReads', 'listWallMs', 'remoteReadSumMs', 'remoteReadMaxMs',
    'decodeSumMs', 'decodeMaxMs', 'wallMs',
  ].sort());
  assert.equal(record.contractVersion, 'naver-news-mirror-manifest-read-phase-v1');
  assert.equal(record.outcome, 'fulfilled');
  assert.equal(record.manifestsRequested, 50);
  assert.equal(record.manifestsFound, 50);
  assert.equal(record.manifestsMissing, 0);
  assert.equal(record.configuredMaxConcurrentReads, 8);
  assert.ok(typeof record.peakConcurrentRemoteReads === 'number');
  assert.ok((record.peakConcurrentRemoteReads as number) >= 1);
  assert.ok((record.peakConcurrentRemoteReads as number) <= 8);
  for (const key of [
    'listWallMs', 'remoteReadSumMs', 'remoteReadMaxMs',
    'decodeSumMs', 'decodeMaxMs', 'wallMs',
  ]) {
    assert.ok(Number.isInteger(record[key]) && (record[key] as number) >= 0);
  }
  assert.ok(logs.every((line) =>
    !line.includes('private-manifest-attribution-test-token')
    && !line.includes('stored-evidence-mirror/v1/')
    && !line.includes('아이유 새 소식'),
  ));
});

test('News stage timing preserves fail-closed credential resolution failure', async () => {
  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (...values: unknown[]) => logs.push(values.map(String).join(' '));
  let result;
  try {
    result = await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
      {
        FANDEX_PRODUCT_RUNTIME_ENV: 'production',
        FANDEX_NAVER_NEWS_STAGE_TIMINGS: '1',
        BLOB_STORE_ID: 'store_test',
      },
      {
        resolveOidcToken: () => {
          throw new Error('sensitive-token-lookup-failure');
        },
        createReadStore() {
          throw new Error('must-not-be-called');
        },
      },
    );
  } finally {
    console.info = originalInfo;
  }

  assert.equal(result.status, 'data-issue');
  const matching = logs.filter((line) =>
    line.startsWith('FANDEX_NAVER_NEWS_BLOB_READ_STAGE='),
  );
  assert.equal(matching.length, 1);
  assert.match(matching[0]!, /"stage":"credential-resolution"/);
  assert.match(matching[0]!, /"outcome":"rejected"/);
  assert.doesNotMatch(matching[0]!, /sensitive-token-lookup-failure/);
});


test('canonical concurrency experiment is independent of stage timings and requires exact Production opt-in', async () => {
  const store = memoryStore();
  const protocolStart = Date.parse('2026-10-03T01:00:00.000Z');
  for (let index = 0; index < 50; index += 1) {
    await stageOfficial(
      store,
      new Date(protocolStart + index * 60 * 60_000).toISOString(),
    );
  }

  async function probe(concurrency: string | undefined, stageTimings: string | undefined) {
    let active = 0;
    let peak = 0;
    const logLines: string[] = [];
    const originalInfo = console.info;
    console.info = (...values: unknown[]) =>
      logLines.push(values.map(String).join(' '));
    let result: Awaited<ReturnType<
      typeof getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot
    >>;
    try {
      result = await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
        {
          FANDEX_PRODUCT_RUNTIME_ENV: 'production',
          BLOB_READ_WRITE_TOKEN: 'test-only-no-remote-requests',
          ...(stageTimings ? { FANDEX_NAVER_NEWS_STAGE_TIMINGS: stageTimings } : {}),
          ...(concurrency ? { FANDEX_NAVER_NEWS_CANONICAL_READ_CONCURRENCY: concurrency } : {}),
        },
        {
          createReadStore() {
            return {
              listPathnames: store.listPathnames,
              async readText(pathname: string) {
                if (!pathname.includes('/jobs/')) return store.readText(pathname);
                active += 1;
                peak = Math.max(peak, active);
                try {
                  await new Promise<void>((resolve) => setTimeout(resolve, 3));
                  return await store.readText(pathname);
                } finally {
                  active -= 1;
                }
              },
            };
          },
        },
      );
    } finally {
      console.info = originalInfo;
    }
    assert.equal(result.status, 'ok');
    assert.equal(active, 0);
    const prefix = 'FANDEX_NAVER_NEWS_BLOB_CANONICAL_READ_PHASE=';
    const canonicalLogs = logLines.filter((line) => line.startsWith(prefix));
    if (stageTimings === '1') {
      assert.equal(canonicalLogs.length, 1);
      const stats = JSON.parse(canonicalLogs[0]!.slice(prefix.length)) as {
        configuredMaxConcurrentReads: number;
        peakConcurrentRemoteReads: number;
        objectsFound: number;
        objectsMissing: number;
      };
      assert.equal(stats.configuredMaxConcurrentReads, concurrency === '12' ? 12 : 8);
      assert.equal(stats.peakConcurrentRemoteReads, peak);
      assert.equal(stats.objectsFound, 50);
      assert.equal(stats.objectsMissing, 0);
    } else {
      assert.equal(canonicalLogs.length, 0, 'no telemetry unless stage timing is enabled');
    }
    return peak;
  }

  // Render already enables STAGE_TIMINGS=1; this alone must never enable 12.
  const baseline = await probe(undefined, '1');
  const unknown = await probe('11', '1');
  const optedIn = await probe('12', '1');
  const withoutDiagnostics = await probe('12', undefined);
  assert.ok(baseline > 1 && baseline <= 8);
  assert.ok(unknown > 1 && unknown <= 8);
  assert.ok(optedIn > 8 && optedIn <= 12);
  assert.ok(withoutDiagnostics > 8 && withoutDiagnostics <= 12);

  let createReadStoreCalled = false;
  const nonProduction = await getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
    {
      FANDEX_PRODUCT_RUNTIME_ENV: 'preview',
      FANDEX_NAVER_NEWS_CANONICAL_READ_CONCURRENCY: '12',
      BLOB_READ_WRITE_TOKEN: 'test-only-no-remote-requests',
    },
    {
      createReadStore() {
        createReadStoreCalled = true;
        throw new Error('non-production-store-must-not-be-created');
      },
    },
  );
  assert.equal(nonProduction.status, 'data-issue');
  assert.equal(createReadStoreCalled, false);
});
