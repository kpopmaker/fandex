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
  isNaverNewsRecurringAuthorizationValid,
} from '../lib/server/ingestion/naverNewsRecurringSchedulerContracts';
import { runNaverNewsRecurringScheduler } from '../lib/server/ingestion/naverNewsRecurringScheduler';
import { runNaverNewsSchedulerDispatchCore } from '../lib/server/ingestion/naverNewsSchedulerDispatch';
import { handleNaverNewsRecurringSchedulerRequest } from '../app/api/internal/naver-news/scheduler/route';
import { NAVER_NEWS_MONITORING_SCHEDULER_ACTIVATION, NAVER_NEWS_MONITORING_SCHEDULER_EXPECTATION } from '../lib/server/ingestion/naverNewsMonitoringContracts';

const SECRET = 'local-only-recurring-secret';
const NOW = new Date('2026-08-30T12:34:56.000Z');
const baseEnvironment = () => ({
  [NAVER_NEWS_RECURRING_ENABLED_ENV]: NAVER_NEWS_RECURRING_ENABLED_VALUE,
  [NAVER_NEWS_RECURRING_DEPLOYMENT_ENV]: NAVER_NEWS_RECURRING_DEPLOYMENT_VALUE,
  [NAVER_NEWS_SCHEDULER_SECRET_ENV]: SECRET,
  [NAVER_NEWS_RECURRING_QUERY_ENV]: '아이유',
  [NAVER_NEWS_RECURRING_DISPLAY_ENV]: '5',
});

function fakeDispatch(calls: unknown[]): any {
  return async (input: any) => {
    calls.push(input);
    return {
      mode: 'scheduler-dispatch' as const,
      dispatchVersion: 'v126_naver_news_scheduler_dispatch_v1' as const,
      schedulerVersion: 'v125_naver_news_scheduler_v1' as const,
      slotStart: '2026-08-30T12:00:00.000Z',
      nextSlotStart: '2026-08-30T13:00:00.000Z',
      collectionKey: 'sched-v125-naver-news-20260830t120000z-abcdef123456',
      workerId: 'scheduler-v125-20260830t120000z-abcdef123456',
      production: { status: 'applied' },
    };
  };
}

test('inactive or non-production gates fail before dispatch', async () => {
  for (const mutate of [
    (env: any) => delete env[NAVER_NEWS_RECURRING_ENABLED_ENV],
    (env: any) => { env[NAVER_NEWS_RECURRING_ENABLED_ENV] = 'wrong'; },
    (env: any) => delete env[NAVER_NEWS_RECURRING_DEPLOYMENT_ENV],
    (env: any) => { env[NAVER_NEWS_RECURRING_DEPLOYMENT_ENV] = 'preview'; },
    (env: any) => delete env[NAVER_NEWS_SCHEDULER_SECRET_ENV],
  ]) {
    const env: any = baseEnvironment(); mutate(env);
    const calls: unknown[] = [];
    await assert.rejects(runNaverNewsRecurringScheduler(env, `Bearer ${SECRET}`, { dispatch: fakeDispatch(calls) }));
    assert.equal(calls.length, 0);
  }
});

test('authorization is strict and timing-safe', () => {
  assert.equal(isNaverNewsRecurringAuthorizationValid(`Bearer ${SECRET}`, SECRET), true);
  for (const value of [undefined, '', 'Basic x', `Bearer ${SECRET},Bearer ${SECRET}`, `Bearer ${SECRET} `, `Bearer wrong`]) {
    assert.equal(isNaverNewsRecurringAuthorizationValid(value, SECRET), false);
  }
  assert.equal(isNaverNewsRecurringAuthorizationValid(`Bearer ${SECRET.slice(0, -1)}x`, SECRET), false);
  assert.equal(isNaverNewsRecurringAuthorizationValid(`Bearer ${SECRET}`, `${SECRET} `), false);
  assert.equal(isNaverNewsRecurringAuthorizationValid(`Bearer ${SECRET}`, `${SECRET}\u0000`), false);
});

test('invalid authentication/config never dispatches', async () => {
  for (const header of [undefined, 'Basic wrong', `Bearer wrong`]) {
    const calls: unknown[] = [];
    await assert.rejects(runNaverNewsRecurringScheduler(baseEnvironment(), header, { dispatch: fakeDispatch(calls) }));
    assert.equal(calls.length, 0);
  }
  for (const mutate of [
    (env: any) => { env[NAVER_NEWS_RECURRING_QUERY_ENV] = '   '; },
    (env: any) => { env[NAVER_NEWS_RECURRING_QUERY_ENV] = '가'.repeat(513); },
    (env: any) => { env[NAVER_NEWS_RECURRING_DISPLAY_ENV] = '0'; },
    (env: any) => { env[NAVER_NEWS_RECURRING_DISPLAY_ENV] = '101'; },
    (env: any) => { env[NAVER_NEWS_RECURRING_DISPLAY_ENV] = '5.5'; },
  ]) {
    const env: any = baseEnvironment(); mutate(env); const calls: unknown[] = [];
    await assert.rejects(runNaverNewsRecurringScheduler(env, `Bearer ${SECRET}`, { dispatch: fakeDispatch(calls) }));
    assert.equal(calls.length, 0);
  }
});

test('valid config normalizes query and dispatches exactly once', async () => {
  const env = baseEnvironment(); env[NAVER_NEWS_RECURRING_QUERY_ENV] = '  아이유\n\t';
  const calls: any[] = [];
  const result = await runNaverNewsRecurringScheduler(env, `Bearer ${SECRET}`, { now: () => NOW, dispatch: fakeDispatch(calls) });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { query: '아이유', display: 5, environment: env });
  assert.equal(result.dispatch.collectionKey, 'sched-v125-naver-news-20260830t120000z-abcdef123456');
});

test('real scheduler core computes deterministic identity with fake production writer', async () => {
  const calls: any[] = [];
  const productionWrite = async (argv: readonly string[], environment: Readonly<Record<string, string | undefined>>) => {
    calls.push({ argv, environment });
    return { mode: 'production-write', contractVersion: 'v121_naver_news_ingestion_v1', status: 'applied', requestSha256: 'a'.repeat(64), resultSha256: 'b'.repeat(64), attempt: 1, counts: { rawEvidence: 0, normalizedRecords: 0, duplicateRecords: 0, rejectedItems: 0 } } as any;
  };
  const input = { query: '  아이유\n', display: 5, environment: {} };
  const first = await runNaverNewsSchedulerDispatchCore(input, { now: () => NOW, productionWrite });
  const second = await runNaverNewsSchedulerDispatchCore(input, { now: () => NOW, productionWrite });
  assert.equal(calls.length, 2);
  assert.equal(first.collectionKey, second.collectionKey);
  assert.equal(first.workerId, second.workerId);
  assert.equal(first.slotStart, second.slotStart);
  assert.match(first.collectionKey, /^sched-v125-naver-news-20260830t120000z-[0-9a-f]{12}$/);
  assert.match(first.workerId, /^scheduler-v125-20260830t120000z-[0-9a-f]{12}$/);
  const changed = await runNaverNewsSchedulerDispatchCore({ ...input, display: 6 }, { now: () => NOW, productionWrite });
  assert.notEqual(first.collectionKey, changed.collectionKey);
});

test('real scheduler core concurrent same-slot calls share identity and each delegate once', async () => {
  const calls: any[] = [];
  const productionWrite = async () => {
    calls.push(true);
    return { mode: 'production-write', contractVersion: 'v121_naver_news_ingestion_v1', status: 'applied', requestSha256: 'a'.repeat(64), resultSha256: 'b'.repeat(64), attempt: 1, counts: { rawEvidence: 0, normalizedRecords: 0, duplicateRecords: 0, rejectedItems: 0 } } as any;
  };
  const [left, right] = await Promise.all([
    runNaverNewsSchedulerDispatchCore({ query: '아이유', display: 5, environment: {} }, { now: () => NOW, productionWrite }),
    runNaverNewsSchedulerDispatchCore({ query: '아이유', display: 5, environment: {} }, { now: () => NOW, productionWrite }),
  ]);
  assert.equal(calls.length, 2);
  assert.equal(left.collectionKey, right.collectionKey);
  assert.equal(left.workerId, right.workerId);
});

test('dispatch failures are bounded and never retried', async () => {
  let calls = 0;
  const failing = async () => { calls += 1; throw new Error(`${SECRET} FANDEX_RUNTIME_DATABASE_URL NAVER_NEWS_CLIENT_SECRET raw_payload SQL DETAIL`); };
  await assert.rejects(runNaverNewsRecurringScheduler(baseEnvironment(), `Bearer ${SECRET}`, { dispatch: failing as any }), (error: any) => {
    assert.equal(error.message, 'naver_news_recurring_scheduler_rejected');
    assert.doesNotMatch(error.message, /SECRET|DATABASE|raw_payload|SQL|DETAIL/);
    return true;
  });
  assert.equal(calls, 1);
});

test('route helper directly enforces gates, ignores request overrides, and returns bounded failure', async () => {
  const request = new Request('https://example.test/api/internal/naver-news/scheduler?query=다른가수&display=100', { method: 'POST', headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify({ query: '본문변경', display: 100 }) });
  const calls: any[] = [];
  const response = await handleNaverNewsRecurringSchedulerRequest(request, baseEnvironment(), { now: () => NOW, dispatch: fakeDispatch(calls) });
  assert.equal(response.status, 200); assert.equal(calls.length, 1);
  assert.equal(calls[0].query, '아이유'); assert.equal(calls[0].display, 5);
  const rejected = await handleNaverNewsRecurringSchedulerRequest(request, { ...baseEnvironment(), [NAVER_NEWS_RECURRING_DEPLOYMENT_ENV]: 'preview' }, { dispatch: fakeDispatch([]) });
  assert.equal(rejected.status, 403); assert.deepEqual(await rejected.json(), { ok: false, code: 'naver_news_recurring_scheduler_rejected' });
});

test('route helper rejects every inactive/auth failure before dispatch', async () => {
  const request = new Request('https://example.test/api/internal/naver-news/scheduler', { method: 'POST' });
  const cases = [
    (env: any) => delete env[NAVER_NEWS_RECURRING_ENABLED_ENV],
    (env: any) => { env[NAVER_NEWS_RECURRING_ENABLED_ENV] = 'wrong'; },
    (env: any) => delete env[NAVER_NEWS_RECURRING_DEPLOYMENT_ENV],
    (env: any) => { env[NAVER_NEWS_RECURRING_DEPLOYMENT_ENV] = 'preview'; },
  ];
  for (const mutate of cases) {
    const env: any = baseEnvironment(); mutate(env); const calls: unknown[] = [];
    const response = await handleNaverNewsRecurringSchedulerRequest(request, env, { dispatch: fakeDispatch(calls) });
    assert.equal(response.status, 403); assert.equal(calls.length, 0);
  }
  for (const header of [undefined, 'Bearer wrong']) {
    const calls: unknown[] = [];
    const response = await handleNaverNewsRecurringSchedulerRequest(
      new Request(request, { headers: header === undefined ? {} : { authorization: header } }),
      baseEnvironment(), { dispatch: fakeDispatch(calls) },
    );
    assert.equal(response.status, 403); assert.equal(calls.length, 0);
  }
});

test('route failure redacts sensitive dispatch errors and never retries', async () => {
  const sensitive = [SECRET, 'postgresql://synthetic-secret@private.example/neondb', 'synthetic-naver-client-id', 'synthetic-naver-client-secret', 'RAW_PAYLOAD_MARKER', 'SELECT secret FROM private_table'];
  let calls = 0;
  const dispatch = async () => { calls += 1; throw new Error(sensitive.join(' ')); };
  const response = await handleNaverNewsRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/scheduler', { method: 'POST', headers: { authorization: `Bearer ${SECRET}` } }),
    baseEnvironment(), { dispatch: dispatch as any },
  );
  assert.equal(response.status, 403);
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), { ok: false, code: 'naver_news_recurring_scheduler_rejected' });
  for (const value of sensitive) assert.equal(text.includes(value), false);
  assert.equal(calls, 1);
});

test('malformed configured secrets fail closed before dispatch', async () => {
  const mutations = [
    (env: any) => { env[NAVER_NEWS_SCHEDULER_SECRET_ENV] = 'contains whitespace'; },
    (env: any) => { env[NAVER_NEWS_SCHEDULER_SECRET_ENV] = `control\u0000secret`; },
    (env: any) => { env[NAVER_NEWS_SCHEDULER_SECRET_ENV] = '가'.repeat(200); },
  ];
  for (const mutate of mutations) {
    const env: any = baseEnvironment(); mutate(env); const calls: unknown[] = [];
    await assert.rejects(runNaverNewsRecurringScheduler(env, `Bearer ${SECRET}`, { dispatch: fakeDispatch(calls) }));
    assert.equal(calls.length, 0);
  }
});

test('same-slot invocation is deterministic and has no scheduler retry/catch-up', async () => {
  const calls: any[] = [];
  const dispatch = fakeDispatch(calls);
  const first = await runNaverNewsRecurringScheduler(baseEnvironment(), `Bearer ${SECRET}`, { now: () => NOW, dispatch });
  const second = await runNaverNewsRecurringScheduler(baseEnvironment(), `Bearer ${SECRET}`, { now: () => NOW, dispatch });
  assert.equal(calls.length, 2);
  assert.equal(first.dispatch.collectionKey, second.dispatch.collectionKey);
  const failing = async () => { throw new Error('opaque failure'); };
  await assert.rejects(runNaverNewsRecurringScheduler(baseEnvironment(), `Bearer ${SECRET}`, { dispatch: failing as any }));
  assert.equal(calls.length, 2);
});

test('v127 monitoring remains manual/on-demand while v128 foundation is disabled by default', () => {
  assert.equal(NAVER_NEWS_MONITORING_SCHEDULER_ACTIVATION, 'manual-only');
  assert.equal(NAVER_NEWS_MONITORING_SCHEDULER_EXPECTATION, 'on_demand');
});

test('source boundaries contain no timer, cron, or public config override', async () => {
  const fs = await import('node:fs/promises');
  const route = await fs.readFile(new URL('../app/api/internal/naver-news/scheduler/route.ts', import.meta.url), 'utf8');
  const orchestrator = await fs.readFile(new URL('../lib/server/ingestion/naverNewsRecurringScheduler.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(`${route}\n${orchestrator}`, /setInterval|setTimeout|cron\.schedule|vercel\.json|request\.json|searchParams/i);
  assert.doesNotMatch(`${route}\n${orchestrator}`, /NAVER_NEWS_CLIENT_ID|NAVER_NEWS_CLIENT_SECRET|DATABASE_URL/);
});
