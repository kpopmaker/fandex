import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NAVER_NEWS_DIRECT_RECURRING_APPROVAL_ENV,
  NAVER_NEWS_DIRECT_RECURRING_APPROVAL_VALUE,
  runNaverNewsDirectRecurring,
} from '../scripts/ingestion/run-naver-news-recurring-direct-v1.mjs';
import {
  NAVER_NEWS_RECURRING_DEPLOYMENT_ENV,
  NAVER_NEWS_RECURRING_DEPLOYMENT_VALUE,
  NAVER_NEWS_RECURRING_DISPLAY_ENV,
  NAVER_NEWS_RECURRING_ENABLED_ENV,
  NAVER_NEWS_RECURRING_ENABLED_VALUE,
  NAVER_NEWS_RECURRING_QUERY_ENV,
  NAVER_NEWS_SCHEDULER_SECRET_ENV,
} from '../lib/server/ingestion/naverNewsRecurringSchedulerContracts';

const secret = 'synthetic-direct-recurring-secret';
const workflowPath = new URL(
  '../.github/workflows/naver-news-direct-recurring-production-v1.yml',
  import.meta.url,
);
const sourcePath = new URL(
  '../scripts/ingestion/run-naver-news-recurring-direct-v1.mts',
  import.meta.url,
);

function environment(approved = true): Record<string, string> {
  return {
    [NAVER_NEWS_RECURRING_ENABLED_ENV]: NAVER_NEWS_RECURRING_ENABLED_VALUE,
    [NAVER_NEWS_RECURRING_DEPLOYMENT_ENV]: NAVER_NEWS_RECURRING_DEPLOYMENT_VALUE,
    [NAVER_NEWS_RECURRING_QUERY_ENV]: '아이유 IU',
    [NAVER_NEWS_RECURRING_DISPLAY_ENV]: '100',
    [NAVER_NEWS_SCHEDULER_SECRET_ENV]: secret,
    ...(approved
      ? {
          [NAVER_NEWS_DIRECT_RECURRING_APPROVAL_ENV]:
            NAVER_NEWS_DIRECT_RECURRING_APPROVAL_VALUE,
        }
      : {}),
  };
}

test('direct recurring gate fails before scheduler dispatch', async () => {
  let dispatchCalls = 0;
  await assert.rejects(
    runNaverNewsDirectRecurring(environment(false), {
      dispatch: async () => {
        dispatchCalls += 1;
        throw new Error('must_not_dispatch');
      },
    }),
    { message: 'naver_news_direct_recurring_approval_required' },
  );
  assert.equal(dispatchCalls, 0);
});

test('approved direct recurring reuses the existing recurring scheduler exactly once', async () => {
  let dispatchCalls = 0;
  const summary = await runNaverNewsDirectRecurring(environment(), {
    now: () => new Date('2026-09-30T13:17:00.000Z'),
    dispatch: async (input) => {
      dispatchCalls += 1;
      assert.equal(input.query, '아이유 IU');
      assert.equal(input.display, 100);
      assert.equal(input.environment[NAVER_NEWS_SCHEDULER_SECRET_ENV], secret);
      return {
        mode: 'scheduler-dispatch',
        dispatchVersion: 'v126_naver_news_scheduler_dispatch_v1',
        schedulerVersion: 'v125_naver_news_scheduler_v1',
        slotStart: '2026-09-30T13:00:00.000Z',
        nextSlotStart: '2026-09-30T14:00:00.000Z',
        collectionKey: 'sched-v125-naver-news-20260930t130000z-synthetic001',
        workerId: 'scheduler-v125-20260930t130000z-synthetic001',
        production: {
          mode: 'production-write',
          contractVersion: 'v124_naver_news_operational_ingestion',
          status: 'applied',
          requestSha256: '0'.repeat(64),
          resultSha256: '1'.repeat(64),
          attempt: 1,
          counts: {
            rawEvidence: 1,
            normalizedRecords: 1,
            duplicateRecords: 0,
            rejectedItems: 0,
          },
        },
      };
    },
  });

  assert.equal(dispatchCalls, 1);
  assert.equal(summary.mode, 'github-actions-direct-recurring');
  assert.equal(summary.canonicalArtistId, 'iu');
  assert.equal(summary.status, 'applied');
  assert.doesNotMatch(JSON.stringify(summary), new RegExp(secret));
});

test('manual Production workflow has no Vercel HTTP dependency and remains explicit-approval only', async () => {
  const [workflow, source] = await Promise.all([
    readFile(workflowPath, 'utf8'),
    readFile(sourcePath, 'utf8'),
  ]);

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.match(workflow, /execution_approval/);
  assert.match(workflow, /approved-github-actions-direct-v1/);
  assert.match(workflow, /secrets\.FANDEX_RUNTIME_DATABASE_URL/);
  assert.match(workflow, /secrets\.FANDEX_NAVER_NEWS_CLIENT_ID/);
  assert.match(workflow, /secrets\.FANDEX_NAVER_NEWS_CLIENT_SECRET/);
  assert.match(workflow, /secrets\.FANDEX_NAVER_NEWS_SCHEDULER_SECRET/);
  assert.doesNotMatch(workflow, /fandex-eta\.vercel\.app|curl\s|BLOB_READ_WRITE_TOKEN|VERCEL_OIDC_TOKEN/);
  assert.match(source, /runNaverNewsShadowRecurringScheduler/);
  assert.doesNotMatch(source, /fetch\(|fandex-eta\.vercel\.app|curl\s/i);
});
