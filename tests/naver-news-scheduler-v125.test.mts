import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  NAVER_NEWS_SCHEDULER_IMMEDIATE_RETRIES,
  NAVER_NEWS_SCHEDULER_MAX_CATCHUP_SLOTS,
  NAVER_NEWS_SCHEDULER_VERSION,
} from '../lib/server/ingestion/naverNewsScheduler';
import {
  buildSchedulerPlanReport,
  parseSchedulerPlanCommand,
} from '../scripts/ingestion/plan-naver-news-scheduler-v125.mjs';

const AT = '2026-08-30T06:23:45.678Z';

test('v125 scheduler plan is deterministic within the same UTC hour', () => {
  const left = buildNaverNewsSchedulerPlan({ query: '아이유', at: AT });
  const right = buildNaverNewsSchedulerPlan({ query: '아이유', at: '2026-08-30T06:59:59.999Z' });

  assert.equal(left.schedulerVersion, NAVER_NEWS_SCHEDULER_VERSION);
  assert.equal(left.activation, 'disabled');
  assert.equal(left.cadenceMinutes, NAVER_NEWS_SCHEDULER_CADENCE_MINUTES);
  assert.equal(left.slotStart, '2026-08-30T06:00:00.000Z');
  assert.equal(left.nextSlotStart, '2026-08-30T07:00:00.000Z');
  assert.equal(left.collectionKey, right.collectionKey);
  assert.equal(left.workerId, right.workerId);
  assert.match(left.collectionKey, /^sched-v125-naver-news-20260830t060000z-[0-9a-f]{12}$/);
  assert.match(left.workerId, /^scheduler-v125-20260830t060000z-[0-9a-f]{12}$/);
});

test('v125 scheduler advances to a new deterministic key on the next hour', () => {
  const current = buildNaverNewsSchedulerPlan({ query: '아이유', at: AT });
  const next = buildNaverNewsSchedulerPlan({ query: '아이유', at: '2026-08-30T07:00:00.000Z' });

  assert.notEqual(current.collectionKey, next.collectionKey);
  assert.notEqual(current.workerId, next.workerId);
  assert.equal(next.slotStart, '2026-08-30T07:00:00.000Z');
});

test('v125 scheduler normalizes query whitespace before deriving identity', () => {
  const compact = buildNaverNewsSchedulerPlan({ query: '아이유', at: AT });
  const spaced = buildNaverNewsSchedulerPlan({ query: '  아이유\n\t ', at: AT });

  assert.equal(spaced.command.query, '아이유');
  assert.equal(compact.collectionKey, spaced.collectionKey);
  assert.equal(compact.workerId, spaced.workerId);
});

test('v125 scheduler binds per-slot identity to the bounded command shape', () => {
  const defaultDisplay = buildNaverNewsSchedulerPlan({ query: '아이유', at: AT });
  const displayFive = buildNaverNewsSchedulerPlan({ query: '아이유', at: AT, display: 5 });

  assert.notEqual(defaultDisplay.collectionKey, displayFive.collectionKey);
  assert.notEqual(defaultDisplay.workerId, displayFive.workerId);
  assert.equal(displayFive.command.display, 5);
});

test('v125 scheduler uses bounded production-safe defaults without dispatching', () => {
  const plan = buildNaverNewsSchedulerPlan({ query: '아이유', at: AT });

  assert.equal(plan.command.provider, 'naver-news');
  assert.equal(plan.command.display, NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY);
  assert.equal(plan.command.start, 1);
  assert.equal(plan.command.sort, 'date');
  assert.equal(plan.retryPolicy.schedulerImmediateRetries, NAVER_NEWS_SCHEDULER_IMMEDIATE_RETRIES);
  assert.equal(plan.retryPolicy.repositoryMaxAttempts, 8);
  assert.equal(plan.catchUpPolicy.maxCatchUpSlots, NAVER_NEWS_SCHEDULER_MAX_CATCHUP_SLOTS);
  assert.deepEqual(plan.effects, {
    apiCalls: 0,
    databaseConnections: 0,
    databaseQueries: 0,
    databaseWrites: 0,
    schedulesActivated: 0,
    environmentMutations: 0,
  });
});

test('v125 scheduler accepts an explicit bounded display', () => {
  const plan = buildNaverNewsSchedulerPlan({ query: '아이유', at: AT, display: 5 });
  assert.equal(plan.command.display, 5);
});

test('v125 scheduler rejects invalid time, query, and display inputs', () => {
  assert.throws(
    () => buildNaverNewsSchedulerPlan({ query: '아이유', at: 'not-a-date' }),
    /naver_news_scheduler_time_invalid/,
  );
  assert.throws(
    () => buildNaverNewsSchedulerPlan({ query: '   ', at: AT }),
    /naver_news_scheduler_query_invalid/,
  );
  assert.throws(
    () => buildNaverNewsSchedulerPlan({ query: '아이유', at: AT, display: 0 }),
    /naver_news_scheduler_display_invalid/,
  );
  assert.throws(
    () => buildNaverNewsSchedulerPlan({ query: '아이유', at: AT, display: 101 }),
    /naver_news_scheduler_display_invalid/,
  );
});

test('v125 scheduler CLI parser rejects unknown, duplicate, and missing flags', () => {
  assert.throws(() => parseSchedulerPlanCommand([]), /naver_news_scheduler_plan_argument_invalid/);
  assert.throws(
    () => parseSchedulerPlanCommand(['--unknown', 'x', '--query', '아이유']),
    /naver_news_scheduler_plan_argument_invalid/,
  );
  assert.throws(
    () => parseSchedulerPlanCommand(['--query', '아이유', '--query', '아이유']),
    /naver_news_scheduler_plan_argument_invalid/,
  );
  assert.throws(
    () => parseSchedulerPlanCommand(['--query']),
    /naver_news_scheduler_plan_argument_invalid/,
  );
});

test('v125 scheduler CLI parser uses an injected clock only when --at is omitted', () => {
  const implicit = parseSchedulerPlanCommand(['--query', '아이유'], () => new Date(AT));
  let explicitClockCalled = false;
  const explicit = parseSchedulerPlanCommand(
    ['--query', '아이유', '--at', '2026-08-30T08:00:00.000Z', '--display', '5'],
    () => {
      explicitClockCalled = true;
      return new Date('invalid');
    },
  );

  assert.equal(implicit.at, AT);
  assert.equal(explicit.at, '2026-08-30T08:00:00.000Z');
  assert.equal(explicit.display, 5);
  assert.equal(explicitClockCalled, false);
});

test('v125 scheduler rejects an invalid injected clock when --at is omitted', () => {
  assert.throws(
    () => parseSchedulerPlanCommand(['--query', '아이유'], () => new Date('invalid')),
    /naver_news_scheduler_plan_clock_invalid/,
  );
});

test('v125 scheduler report remains a zero-side-effect disabled plan', () => {
  const report = buildSchedulerPlanReport({ query: '아이유', at: AT, display: 5 });

  assert.equal(report.mode, 'scheduler-plan');
  assert.equal(report.activation, 'disabled');
  assert.equal(report.effects.apiCalls, 0);
  assert.equal(report.effects.databaseWrites, 0);
  assert.equal(report.effects.schedulesActivated, 0);
});
