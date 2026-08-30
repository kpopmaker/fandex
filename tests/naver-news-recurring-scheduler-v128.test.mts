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
