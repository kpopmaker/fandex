import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  NAVER_NEWS_V124_APPROVAL_ENV,
  NAVER_NEWS_V124_APPROVAL_VALUE,
  type NaverNewsProductionWriteSummary,
} from '../scripts/ingestion/write-naver-news-v124.mjs';
import {
  NAVER_NEWS_V126_APPROVAL_ENV,
  NAVER_NEWS_V126_APPROVAL_VALUE,
  NAVER_NEWS_V126_DISPATCH_VERSION,
  parseSchedulerDispatchCommand,
  runNaverNewsSchedulerDispatch,
} from '../scripts/ingestion/dispatch-naver-news-scheduler-v126.mjs';

const AT = '2026-08-30T10:23:45.678Z';
const scriptPath = new URL('../scripts/ingestion/dispatch-naver-news-scheduler-v126.mts', import.meta.url);
const packagePath = new URL('../package.json', import.meta.url);

function approvedEnvironment(): Record<string, string> {
  return {
    [NAVER_NEWS_V126_APPROVAL_ENV]: NAVER_NEWS_V126_APPROVAL_VALUE,
    FANDEX_RUNTIME_DATABASE_URL: 'postgresql://fandex_runtime:synthetic@safe-pooler.example.test/neondb',
    FANDEX_NAVER_NEWS_API_ENDPOINT: 'https://openapi.naver.com/v1/search/news.json',
    FANDEX_NAVER_NEWS_CLIENT_ID: 'synthetic-client-id',
    FANDEX_NAVER_NEWS_CLIENT_SECRET: 'synthetic-client-secret',
  };
}

function appliedSummary(): NaverNewsProductionWriteSummary {
  return Object.freeze({
    mode: 'production-write',
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    status: 'applied',
    requestSha256: '1'.repeat(64),
    resultSha256: '2'.repeat(64),
    attempt: 1,
    counts: Object.freeze({
      rawEvidence: 5,
      normalizedRecords: 5,
      duplicateRecords: 0,
      rejectedItems: 0,
    }),
  });
}

test('v126 dispatch approval fails before delegated production execution', async () => {
  let calls = 0;
  await assert.rejects(
    runNaverNewsSchedulerDispatch(
      ['--apply', '--query', '아이유'],
      {},
      {
        now: () => new Date(AT),
        productionWrite: async () => {
          calls += 1;
          return appliedSummary();
        },
      },
    ),
    /naver_news_scheduler_dispatch_approval_required/,
  );
  assert.equal(calls, 0);
});

test('v126 dispatch requires explicit apply and rejects catch-up time overrides', () => {
  assert.throws(
    () => parseSchedulerDispatchCommand(['--query', '아이유']),
    /naver_news_scheduler_dispatch_apply_required/,
  );
  assert.throws(
    () => parseSchedulerDispatchCommand(['--apply', '--query', '아이유', '--at', AT]),
    /naver_news_scheduler_dispatch_argument_invalid/,
  );
});

test('v126 dispatch parser rejects unknown, duplicate, missing, and invalid display flags', () => {
  const invalid = [
    ['--apply'],
    ['--apply', '--unknown', 'x', '--query', '아이유'],
    ['--apply', '--query', '아이유', '--query', '아이유'],
    ['--apply', '--query', '아이유', '--display', '0'],
    ['--apply', '--query', '아이유', '--display', 'not-a-number'],
  ];
  for (const argv of invalid) {
    assert.throws(() => parseSchedulerDispatchCommand(argv));
  }
});

test('v126 dispatch delegates exactly once with the current deterministic slot identity', async () => {
  const environment = approvedEnvironment();
  let calls = 0;
  let delegatedArgv: readonly string[] = [];
  let delegatedEnvironment: Readonly<Record<string, string | undefined>> = {};

  const result = await runNaverNewsSchedulerDispatch(
    ['--apply', '--query', '  아이유  ', '--display', '5'],
    environment,
    {
      now: () => new Date(AT),
      productionWrite: async (argv, delegated) => {
        calls += 1;
        delegatedArgv = [...argv];
        delegatedEnvironment = delegated;
        return appliedSummary();
      },
    },
  );

  assert.equal(calls, 1);
  assert.equal(result.mode, 'scheduler-dispatch');
  assert.equal(result.dispatchVersion, NAVER_NEWS_V126_DISPATCH_VERSION);
  assert.equal(result.activation, 'manual-only');
  assert.equal(result.slotStart, '2026-08-30T10:00:00.000Z');
  assert.equal(result.nextSlotStart, '2026-08-30T11:00:00.000Z');
  assert.match(result.collectionKey, /^sched-v125-naver-news-20260830t100000z-[0-9a-f]{12}$/);
  assert.match(result.workerId, /^scheduler-v125-20260830t100000z-[0-9a-f]{12}$/);
  assert.deepEqual(delegatedArgv, [
    '--apply',
    '--query', '아이유',
    '--collection-key', result.collectionKey,
    '--display', '5',
    '--start', '1',
    '--sort', 'date',
    '--worker-id', result.workerId,
  ]);
  assert.equal(delegatedEnvironment[NAVER_NEWS_V124_APPROVAL_ENV], NAVER_NEWS_V124_APPROVAL_VALUE);
  assert.equal(environment[NAVER_NEWS_V124_APPROVAL_ENV], undefined);
  assert.equal(result.production.status, 'applied');
});

test('v126 dispatch reuses the same slot identity without scheduler-level retries', async () => {
  const environment = approvedEnvironment();
  const seen: string[][] = [];
  const productionWrite = async (argv: readonly string[]) => {
    seen.push([...argv]);
    return appliedSummary();
  };

  const left = await runNaverNewsSchedulerDispatch(
    ['--apply', '--query', '아이유', '--display', '5'],
    environment,
    { now: () => new Date(AT), productionWrite },
  );
  const right = await runNaverNewsSchedulerDispatch(
    ['--apply', '--query', '아이유', '--display', '5'],
    environment,
    { now: () => new Date('2026-08-30T10:59:59.999Z'), productionWrite },
  );

  assert.equal(left.collectionKey, right.collectionKey);
  assert.equal(left.workerId, right.workerId);
  assert.equal(seen.length, 2);
  assert.deepEqual(seen[0], seen[1]);
});

test('v126 dispatch binds display changes to a different idempotency identity', async () => {
  const environment = approvedEnvironment();
  const productionWrite = async () => appliedSummary();
  const left = await runNaverNewsSchedulerDispatch(
    ['--apply', '--query', '아이유', '--display', '5'],
    environment,
    { now: () => new Date(AT), productionWrite },
  );
  const right = await runNaverNewsSchedulerDispatch(
    ['--apply', '--query', '아이유', '--display', '100'],
    environment,
    { now: () => new Date(AT), productionWrite },
  );
  assert.notEqual(left.collectionKey, right.collectionKey);
  assert.notEqual(left.workerId, right.workerId);
});

test('v126 dispatch rejects an invalid clock before delegated production execution', async () => {
  let calls = 0;
  await assert.rejects(
    runNaverNewsSchedulerDispatch(
      ['--apply', '--query', '아이유'],
      approvedEnvironment(),
      {
        now: () => new Date('invalid'),
        productionWrite: async () => {
          calls += 1;
          return appliedSummary();
        },
      },
    ),
    /naver_news_scheduler_dispatch_clock_invalid/,
  );
  assert.equal(calls, 0);
});

test('v126 dispatch redacts delegated production failures and never retries them', async () => {
  let calls = 0;
  await assert.rejects(
    runNaverNewsSchedulerDispatch(
      ['--apply', '--query', '아이유'],
      approvedEnvironment(),
      {
        now: () => new Date(AT),
        productionWrite: async () => {
          calls += 1;
          throw new Error('postgresql://secret@private-host/neondb');
        },
      },
    ),
    { message: 'naver_news_scheduler_dispatch_failed' },
  );
  assert.equal(calls, 1);
});

test('v126 source remains manual-only with no cron, timer, or environment mutation path', async () => {
  const [source, packageJson] = await Promise.all([
    readFile(scriptPath, 'utf8'),
    readFile(packagePath, 'utf8'),
  ]);

  assert.match(source, /runNaverNewsProductionWrite/);
  assert.match(source, /activation: 'manual-only'/);
  assert.match(source, /FANDEX_APPROVE_V126_NAVER_NEWS_SCHEDULER_DISPATCH/);
  assert.doesNotMatch(source, /setInterval\(|setTimeout\(|node-cron|cron\.schedule|scheduleJob\(|vercel\.json|process\.env\s*\[/i);
  assert.match(packageJson, /"test:ingestion:v126": "tsx --test tests\/naver-news-scheduler-dispatch-v126\.test\.mts"/);
  assert.match(packageJson, /"ingestion:naver-news:scheduler-dispatch": "tsx scripts\/ingestion\/dispatch-naver-news-scheduler-v126\.mts"/);
});
