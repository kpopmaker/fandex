import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  handleNaverNewsVercelCronFallback,
  NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE,
} from '../lib/server/ingestion/naverNewsVercelCronFallback';
import type {
  NaverNewsRecurringDependencies,
} from '../lib/server/ingestion/naverNewsRecurringScheduler';

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

function fakeDispatch(
  counter: { count: number },
): NonNullable<NaverNewsRecurringDependencies['dispatch']> {
  return async (
    input,
  ) => {
    counter.count += 1;
    assert.equal(input.query, '아이유 IU');
    assert.equal(input.display, 100);
    assert.equal(
      input.environment.FANDEX_NAVER_NEWS_SCHEDULER_SECRET,
      SCHEDULER_SECRET,
    );
    return Object.freeze({
      mode: 'scheduler-dispatch' as const,
      dispatchVersion:
        'v126_naver_news_scheduler_dispatch_v1' as const,
      schedulerVersion:
        'v125_naver_news_scheduler_v1' as const,
      slotStart: '2026-10-01T12:00:00.000Z',
      nextSlotStart: '2026-10-01T13:00:00.000Z',
      collectionKey:
        'sched-v125-naver-news-20261001t120000z-f1ed381d367d',
      workerId:
        'naver-scheduler-v125-20261001t120000z-f1ed381d367d',
      production: Object.freeze({
        mode: 'production-write' as const,
        contractVersion:
          'v121_naver_news_ingestion_v1' as const,
        status: 'applied' as const,
        requestSha256: 'a'.repeat(64),
        resultSha256: 'b'.repeat(64),
        attempt: 1,
        counts: Object.freeze({
          received: 100,
          rawEvidence: 100,
          normalizedRecords: 100,
          duplicateRecords: 0,
          rejectedItems: 0,
        }),
      }),
    });
  };
}

test('rejects wrong auth, schedule, method, and query before dispatch', async () => {
  const candidates = [
    request({ authorization: 'Bearer wrong' }),
    request({ schedule: '0 * * * *' }),
    request({ method: 'POST' }),
    request({
      url: 'https://example.test/api/internal/naver-news/vercel-cron-fallback?x=1',
    }),
  ];

  for (const candidate of candidates) {
    const counter = { count: 0 };
    const response = await handleNaverNewsVercelCronFallback(
      candidate,
      environment(),
      {
        dispatch: fakeDispatch(counter),
      },
    );
    assert.ok([403, 405].includes(response.status));
    assert.equal(counter.count, 0);
  }
});

test('rejects missing CRON_SECRET and non-Production runtime before dispatch', async () => {
  for (const env of [
    environment({ CRON_SECRET: undefined }),
    environment({ VERCEL_ENV: 'preview' }),
  ]) {
    const counter = { count: 0 };
    const response = await handleNaverNewsVercelCronFallback(
      request(),
      env,
      { dispatch: fakeDispatch(counter) },
    );
    assert.ok([403, 503].includes(response.status));
    assert.equal(counter.count, 0);
  }
});

test('authenticated exact Vercel Cron request dispatches the existing scheduler once', async () => {
  const counter = { count: 0 };
  const response = await handleNaverNewsVercelCronFallback(
    request(),
    environment(),
    {
      dispatch: fakeDispatch(counter),
      now: () => new Date('2026-10-01T12:17:00.000Z'),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(counter.count, 1);
  assert.deepEqual(await response.json(), {
    ok: true,
    mode: 'naver-news-vercel-cron-fallback-v1',
    trigger: 'vercel-cron-authenticated',
    schedule: '17 * * * *',
    activationVersion:
      'v1_naver_news_shadow_recurring_activation',
    canonicalArtistId: 'iu',
    recurringVersion:
      'v128_naver_news_recurring_scheduler_v1',
    schedulerVersion:
      'v125_naver_news_scheduler_v1',
    slotStart: '2026-10-01T12:00:00.000Z',
    collectionKey:
      'sched-v125-naver-news-20261001t120000z-f1ed381d367d',
    status: 'applied',
  });
});

test('Blob mirror mode requires OIDC before dispatch and forwards resolved token', async () => {
  const counter = { count: 0 };
  let oidcCalls = 0;

  const response = await handleNaverNewsVercelCronFallback(
    request(),
    environment({
      FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE: 'shadow-write-v1',
      BLOB_STORE_ID: 'store_123',
    }),
    {
      resolveOidcToken() {
        oidcCalls += 1;
        return 'oidc-token';
      },
      dispatch: async (input) => {
        counter.count += 1;
        assert.equal(input.environment.VERCEL_OIDC_TOKEN, 'oidc-token');
        assert.equal(input.environment.BLOB_STORE_ID, 'store_123');
        return fakeDispatch({ count: 0 })(input);
      },
      now: () => new Date('2026-10-01T12:17:00.000Z'),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(oidcCalls, 1);
  assert.equal(counter.count, 1);
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

test('route is GET-only in sin1 and uses request-context OIDC', async () => {
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
});
