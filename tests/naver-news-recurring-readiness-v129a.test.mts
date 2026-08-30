import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNaverNewsRecurringExpectedSlots,
  evaluateNaverNewsRecurringActivationReadiness,
  type NaverNewsRecurringPlatformCapabilities,
} from '../lib/server/ingestion/naverNewsRecurringActivationReadiness';
import {
  NAVER_NEWS_RECURRING_DEPLOYMENT_ENV,
  NAVER_NEWS_RECURRING_ENABLED_ENV,
  NAVER_NEWS_RECURRING_QUERY_ENV,
  NAVER_NEWS_RECURRING_DISPLAY_ENV,
  NAVER_NEWS_SCHEDULER_SECRET_ENV,
} from '../lib/server/ingestion/naverNewsRecurringSchedulerContracts';
import { NAVER_NEWS_MANUAL_MONITORING_POLICY, createNaverNewsRecurringMonitoringPolicy, evaluateNaverNewsRecurringMonitoringSeverity } from '../lib/server/ingestion/naverNewsMonitoringPolicy';
import { NAVER_NEWS_MONITORING_SCHEDULER_ACTIVATION, NAVER_NEWS_MONITORING_SCHEDULER_EXPECTATION } from '../lib/server/ingestion/naverNewsMonitoringContracts';

const environment = (): Record<string, string> => ({
  [NAVER_NEWS_RECURRING_ENABLED_ENV]: 'approved-v128-recurring-foundation',
  [NAVER_NEWS_RECURRING_DEPLOYMENT_ENV]: 'production',
  [NAVER_NEWS_SCHEDULER_SECRET_ENV]: 'synthetic-secret',
  [NAVER_NEWS_RECURRING_QUERY_ENV]: '아이유',
  [NAVER_NEWS_RECURRING_DISPLAY_ENV]: '5',
  FANDEX_NAVER_NEWS_API_ENDPOINT: 'https://api.example.test/v1/search',
  FANDEX_NAVER_NEWS_CLIENT_ID: 'synthetic-client-id',
  FANDEX_NAVER_NEWS_CLIENT_SECRET: 'synthetic-client-secret',
  FANDEX_RUNTIME_DATABASE_URL: 'postgresql://runtime:secret@db.example.test/fandex',
});

const verifiedPlatform = (): NaverNewsRecurringPlatformCapabilities => ({
  requestMethod: 'post', authentication: 'bearer', hourlySchedule: 'verified',
  duplicateDelivery: 'possible', retryBehavior: 'possible', timeoutBehavior: 'verified',
});

function evaluate(overrides: Partial<Parameters<typeof evaluateNaverNewsRecurringActivationReadiness>[0]> = {}) {
  return evaluateNaverNewsRecurringActivationReadiness({ environment: environment(), platform: verifiedPlatform(), previewIsolation: 'verified', monitoringPolicyReady: true, ...overrides });
}

test('unknown or incompatible platform capabilities block readiness', () => {
  const unknown = evaluate({ platform: { ...verifiedPlatform(), requestMethod: 'unknown', authentication: 'unknown', hourlySchedule: 'unverified', timeoutBehavior: 'unknown', retryBehavior: 'unknown', duplicateDelivery: 'not_documented' } });
  assert.equal(unknown.ready, false);
  assert.ok(unknown.blockers.includes('platform_request_method_unverified'));
  assert.ok(unknown.blockers.includes('platform_authentication_unverified'));
  assert.ok(unknown.blockers.includes('hourly_schedule_unverified'));
  const incompatible = evaluate({ platform: { ...verifiedPlatform(), requestMethod: 'get', authentication: 'trusted-adapter' } });
  assert.ok(incompatible.blockers.includes('platform_method_incompatible'));
  assert.ok(incompatible.blockers.includes('platform_authentication_incompatible'));
});

test('fully verified synthetic platform/runtime is ready without exposing values', () => {
  const result = evaluate();
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  const serialized = JSON.stringify(result);
  for (const value of ['synthetic-secret', 'postgresql://runtime:secret@db.example.test/fandex', 'synthetic-client-id', 'synthetic-client-secret', '아이유']) assert.equal(serialized.includes(value), false);
  assert.equal(result.runtime.recurring.enabled, true);
  assert.equal(result.runtime.operational.databaseUrl, true);
});

test('unverified schedule or preview isolation blocks readiness', () => {
  assert.ok(evaluate({ platform: { ...verifiedPlatform(), hourlySchedule: 'unverified' } }).blockers.includes('hourly_schedule_unverified'));
  assert.ok(evaluate({ previewIsolation: 'unverified' }).blockers.includes('preview_isolation_unverified'));
  assert.ok(evaluate({ monitoringPolicyReady: false }).blockers.includes('monitoring_policy_not_ready'));
});

test('recurring and operational env validation is presence/format only', () => {
  for (const mutate of [
    (env: Record<string, string>) => delete env[NAVER_NEWS_RECURRING_ENABLED_ENV],
    (env: Record<string, string>) => { env[NAVER_NEWS_RECURRING_DEPLOYMENT_ENV] = 'preview'; },
    (env: Record<string, string>) => { env[NAVER_NEWS_SCHEDULER_SECRET_ENV] = 'bad secret'; },
    (env: Record<string, string>) => { env[NAVER_NEWS_RECURRING_QUERY_ENV] = '   '; },
    (env: Record<string, string>) => { env[NAVER_NEWS_RECURRING_DISPLAY_ENV] = '101'; },
    (env: Record<string, string>) => { delete env.FANDEX_NAVER_NEWS_API_ENDPOINT; },
    (env: Record<string, string>) => { env.FANDEX_NAVER_NEWS_API_ENDPOINT = 'http://insecure.example.test'; },
    (env: Record<string, string>) => { delete env.FANDEX_RUNTIME_DATABASE_URL; },
  ]) {
    const env = environment(); mutate(env);
    const result = evaluate({ environment: env });
    assert.equal(result.ready, false);
  }
});

test('manual approval envs are not recurring readiness prerequisites', () => {
  const env = environment();
  const result = evaluate({ environment: env });
  assert.equal(result.ready, true);
  assert.equal(result.runtime.recurring.enabled, true);
});

test('expected slots reuse v125 hourly identity', () => {
  const slots = buildNaverNewsRecurringExpectedSlots({ observedAt: '2026-08-30T12:34:56.000Z', query: '아이유', display: 5 });
  assert.equal(slots.currentSlotStart, '2026-08-30T12:00:00.000Z');
  assert.equal(slots.previousSlotStart, '2026-08-30T11:00:00.000Z');
  assert.match(slots.currentCollectionKey, /^sched-v125-naver-news-20260830t120000z-[0-9a-f]{12}$/);
  assert.match(slots.previousCollectionKey, /^sched-v125-naver-news-20260830t110000z-[0-9a-f]{12}$/);
  assert.throws(() => buildNaverNewsRecurringExpectedSlots({ observedAt: 'invalid', query: '아이유', display: 5 }), /naver_news_scheduler_time_invalid/);
});

test('manual default remains unchanged and recurring policy is explicit', () => {
  assert.deepEqual(NAVER_NEWS_MANUAL_MONITORING_POLICY, { activation: 'manual-only', expectation: 'on_demand' });
  assert.equal(NAVER_NEWS_MONITORING_SCHEDULER_ACTIVATION, 'manual-only');
  assert.equal(NAVER_NEWS_MONITORING_SCHEDULER_EXPECTATION, 'on_demand');
  const policy = createNaverNewsRecurringMonitoringPolicy(10, 60);
  assert.deepEqual(policy, { activation: 'recurring', expectation: 'hourly', graceMinutes: 10, freshnessMinutes: 60 });
});

test('recurring severity honors grace-derived signals and critical invariants', () => {
  const policy = createNaverNewsRecurringMonitoringPolicy(10, 60);
  const base = { hasJobs: true, currentSlotNotRun: false, previousSlotAbsent: false, freshnessStale: false, expiredRunning: false, retryableFailed: false, deadLetter: false, malformedSchedulerKey: false, danglingNormalizedReference: false, consistencyMismatch: false };
  assert.equal(evaluateNaverNewsRecurringMonitoringSeverity(policy, { ...base, currentSlotNotRun: true }), 'healthy');
  assert.equal(evaluateNaverNewsRecurringMonitoringSeverity(policy, { ...base, previousSlotAbsent: true }), 'attention');
  assert.equal(evaluateNaverNewsRecurringMonitoringSeverity(policy, { ...base, freshnessStale: true }), 'attention');
  assert.equal(evaluateNaverNewsRecurringMonitoringSeverity(policy, { ...base, retryableFailed: true }), 'attention');
  assert.equal(evaluateNaverNewsRecurringMonitoringSeverity(policy, { ...base, expiredRunning: true }), 'attention');
  for (const key of ['deadLetter', 'malformedSchedulerKey', 'danglingNormalizedReference', 'consistencyMismatch'] as const) assert.equal(evaluateNaverNewsRecurringMonitoringSeverity(policy, { ...base, [key]: true }), 'critical');
  assert.equal(evaluateNaverNewsRecurringMonitoringSeverity(policy, { ...base, hasJobs: false }), 'no_data');
});

test('monitoring policy rejects unbounded grace/freshness values', () => {
  assert.throws(() => createNaverNewsRecurringMonitoringPolicy(0, 60));
  assert.throws(() => createNaverNewsRecurringMonitoringPolicy(10_081, 60));
  assert.throws(() => createNaverNewsRecurringMonitoringPolicy(10, 0));
});
