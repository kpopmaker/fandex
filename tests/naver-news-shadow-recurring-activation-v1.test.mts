/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NAVER_NEWS_RECURRING_DEPLOYMENT_ENV,
  NAVER_NEWS_RECURRING_DEPLOYMENT_VALUE,
  NAVER_NEWS_RECURRING_DISPLAY_ENV,
  NAVER_NEWS_RECURRING_ENABLED_ENV,
  NAVER_NEWS_RECURRING_ENABLED_VALUE,
  NAVER_NEWS_RECURRING_QUERY_ENV,
  NAVER_NEWS_SCHEDULER_SECRET_ENV,
} from '../lib/server/ingestion/naverNewsRecurringSchedulerContracts';
import {
  NAVER_NEWS_SHADOW_RECURRING_ACTIVATION_VERSION,
  readNaverNewsShadowRecurringProtocol,
  runNaverNewsShadowRecurringScheduler,
} from '../lib/server/ingestion/naverNewsShadowRecurringScheduler';
import { handleNaverNewsShadowRecurringSchedulerRequest } from '../app/api/internal/naver-news/shadow-scheduler/route';

const SECRET = 'local-only-shadow-recurring-secret';
const NOW = new Date('2026-09-14T00:34:56.000Z');

function environment(overrides: Readonly<Record<string, string | undefined>> = {}) {
  return {
    [NAVER_NEWS_RECURRING_ENABLED_ENV]: NAVER_NEWS_RECURRING_ENABLED_VALUE,
    [NAVER_NEWS_RECURRING_DEPLOYMENT_ENV]: NAVER_NEWS_RECURRING_DEPLOYMENT_VALUE,
    [NAVER_NEWS_SCHEDULER_SECRET_ENV]: SECRET,
    [NAVER_NEWS_RECURRING_QUERY_ENV]: '아이유 IU',
    [NAVER_NEWS_RECURRING_DISPLAY_ENV]: '100',
    ...overrides,
  };
}

function fakeDispatch(calls: any[]) {
  return async (input: any) => {
    calls.push(input);
    return {
      mode: 'scheduler-dispatch' as const,
      dispatchVersion: 'v126_naver_news_scheduler_dispatch_v1' as const,
      schedulerVersion: 'v125_naver_news_scheduler_v1' as const,
      slotStart: '2026-09-14T00:00:00.000Z',
      nextSlotStart: '2026-09-14T01:00:00.000Z',
      collectionKey: 'sched-v125-naver-news-20260914t000000z-abcdef123456',
      workerId: 'scheduler-v125-20260914t000000z-abcdef123456',
      production: { status: 'applied' },
    } as any;
  };
}

test('shadow protocol is pinned to canonical IU query and display 100', () => {
  const protocol = readNaverNewsShadowRecurringProtocol(environment());
  assert.deepEqual(protocol, {
    canonicalArtistId: 'iu',
    query: '아이유 IU',
    display: 100,
  });
});

test('legacy IU query is rejected before dispatch', async () => {
  const calls: any[] = [];
  await assert.rejects(
    runNaverNewsShadowRecurringScheduler(
      environment({ [NAVER_NEWS_RECURRING_QUERY_ENV]: '아이유' }),
      `Bearer ${SECRET}`,
      { now: () => NOW, dispatch: fakeDispatch(calls) },
    ),
    /naver_news_shadow_recurring_scheduler_rejected/,
  );
  assert.equal(calls.length, 0);
});

test('legacy display 5 is rejected before dispatch', async () => {
  const calls: any[] = [];
  await assert.rejects(
    runNaverNewsShadowRecurringScheduler(
      environment({ [NAVER_NEWS_RECURRING_DISPLAY_ENV]: '5' }),
      `Bearer ${SECRET}`,
      { now: () => NOW, dispatch: fakeDispatch(calls) },
    ),
    /naver_news_shadow_recurring_scheduler_rejected/,
  );
  assert.equal(calls.length, 0);
});

test('inactive gates and invalid auth never dispatch', async () => {
  for (const candidate of [
    environment({ [NAVER_NEWS_RECURRING_ENABLED_ENV]: 'wrong' }),
    environment({ [NAVER_NEWS_RECURRING_DEPLOYMENT_ENV]: 'preview' }),
  ]) {
    const calls: any[] = [];
    await assert.rejects(
      runNaverNewsShadowRecurringScheduler(candidate, `Bearer ${SECRET}`, {
        now: () => NOW,
        dispatch: fakeDispatch(calls),
      }),
    );
    assert.equal(calls.length, 0);
  }

  const calls: any[] = [];
  await assert.rejects(
    runNaverNewsShadowRecurringScheduler(environment(), 'Bearer wrong', {
      now: () => NOW,
      dispatch: fakeDispatch(calls),
    }),
  );
  assert.equal(calls.length, 0);
});

test('valid shadow config delegates exactly once with canonical protocol', async () => {
  const calls: any[] = [];
  const result = await runNaverNewsShadowRecurringScheduler(
    environment(),
    `Bearer ${SECRET}`,
    { now: () => NOW, dispatch: fakeDispatch(calls) },
  );

  assert.equal(result.activationVersion, NAVER_NEWS_SHADOW_RECURRING_ACTIVATION_VERSION);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].query, '아이유 IU');
  assert.equal(calls[0].display, 100);
  assert.equal(result.protocol.canonicalArtistId, 'iu');
  assert.equal(result.recurring.dispatch.slotStart, '2026-09-14T00:00:00.000Z');
});

test('shadow route ignores request query/display overrides and returns bounded success', async () => {
  const calls: any[] = [];
  const request = new Request(
    'https://example.test/api/internal/naver-news/shadow-scheduler?query=아이유&display=5',
    {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: '아이유', display: 5 }),
    },
  );
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    request,
    environment(),
    { now: () => NOW, dispatch: fakeDispatch(calls) },
  );
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].query, '아이유 IU');
  assert.equal(calls[0].display, 100);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.mode, 'shadow-recurring-scheduler');
  assert.equal(body.canonicalArtistId, 'iu');
  assert.equal(body.query, '아이유 IU');
  assert.equal(body.display, 100);
});

test('shadow route redacts activation and dispatch failures', async () => {
  const badConfig = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST', headers: { authorization: `Bearer ${SECRET}` },
    }),
    environment({ [NAVER_NEWS_RECURRING_DISPLAY_ENV]: '5' }),
    { dispatch: fakeDispatch([]) },
  );
  assert.equal(badConfig.status, 403);
  assert.deepEqual(await badConfig.json(), {
    ok: false,
    code: 'naver_news_shadow_recurring_scheduler_rejected',
  });

  const sensitive = 'postgresql://secret@example.test/neondb NAVER_NEWS_CLIENT_SECRET raw_payload SQL';
  const failedDispatch = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST', headers: { authorization: `Bearer ${SECRET}` },
    }),
    environment(),
    { dispatch: (async () => { throw new Error(sensitive); }) as any },
  );
  assert.equal(failedDispatch.status, 403);
  const text = await failedDispatch.text();
  assert.deepEqual(JSON.parse(text), {
    ok: false,
    code: 'naver_news_shadow_recurring_scheduler_rejected',
  });
  assert.equal(text.includes('secret'), false);
  assert.equal(text.includes('raw_payload'), false);
});

test('shadow activation source contains no timer, cron, GET handler, or request override path', async () => {
  const fs = await import('node:fs/promises');
  const route = await fs.readFile(
    new URL('../app/api/internal/naver-news/shadow-scheduler/route.ts', import.meta.url),
    'utf8',
  );
  const orchestrator = await fs.readFile(
    new URL('../lib/server/ingestion/naverNewsShadowRecurringScheduler.ts', import.meta.url),
    'utf8',
  );
  const source = `${route}\n${orchestrator}`;
  assert.doesNotMatch(source, /setInterval|setTimeout|cron\.schedule|vercel\.json|searchParams|request\.json/i);
  assert.doesNotMatch(source, /export\s+async\s+function\s+GET/);
});
