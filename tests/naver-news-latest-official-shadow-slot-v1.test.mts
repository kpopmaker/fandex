import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPostgresNaverNewsLatestOfficialShadowSlotRepository,
  resolveLatestOfficialNaverNewsShadowThroughSlotStart,
  type NaverNewsLatestOfficialShadowSlotReadRepository,
  type NaverNewsSucceededSchedulerJob,
} from '../lib/server/ingestion/naverNewsLatestOfficialShadowSlot';
import {
  buildNaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  bindCanonicalArtistToNaverNews,
} from '../lib/server/ingestion/naverNewsArtistBinding';
import {
  buildNaverNewsSchedulerPlan,
} from '../lib/server/ingestion/naverNewsScheduler';
import type {
  NaverNewsIngestionPool,
} from '../lib/server/ingestion/naverNewsRepository';

function officialJob(slotStart: string): NaverNewsSucceededSchedulerJob {
  const binding = bindCanonicalArtistToNaverNews('iu');
  const plan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: slotStart,
    display: 100,
  });
  const identity = buildNaverNewsJobIdentity(plan.command);
  return {
    jobId: identity.jobId,
    collectionKey: plan.collectionKey,
    requestContract: identity.request,
  };
}

function repository(
  jobs: readonly NaverNewsSucceededSchedulerJob[],
): NaverNewsLatestOfficialShadowSlotReadRepository {
  return Object.freeze({
    async readSucceededSchedulerJobs() {
      return jobs;
    },
  });
}

test('resolver chooses the latest exact official succeeded slot independent of row order', async () => {
  const result =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
      repository([
        officialJob('2026-09-15T18:00:00.000Z'),
        officialJob('2026-09-15T16:00:00.000Z'),
        officialJob('2026-09-15T17:00:00.000Z'),
      ]),
    );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.throughSlotStart, '2026-09-15T18:00:00.000Z');
  assert.equal(result.protocolStart, '2026-09-15T16:00:00.000Z');
  assert.equal(result.jobId, officialJob('2026-09-15T18:00:00.000Z').jobId);
});

test('resolver ignores succeeded scheduler jobs that do not exactly match the IU protocol', async () => {
  const valid = officialJob('2026-09-15T17:00:00.000Z');
  const other = officialJob('2026-09-15T18:00:00.000Z');
  const mismatched = {
    ...other,
    requestContract: {
      ...(other.requestContract as Record<string, unknown>),
      query: 'different artist',
    },
  };

  const result =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
      repository([valid, mismatched]),
    );

  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(result.throughSlotStart, '2026-09-15T17:00:00.000Z');
  }
});

test('resolver never selects a canonical slot before the official epoch', async () => {
  const result =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
      repository([
        officialJob('2026-09-15T15:00:00.000Z'),
        officialJob('2026-09-15T16:00:00.000Z'),
      ]),
    );

  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(result.throughSlotStart, '2026-09-15T16:00:00.000Z');
  }
});

test('resolver fails closed when no exact official succeeded slot exists', async () => {
  const other = officialJob('2026-09-15T18:00:00.000Z');
  const result =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
      repository([
        {
          ...other,
          requestContract: {
            ...(other.requestContract as Record<string, unknown>),
            display: 99,
          },
        },
      ]),
    );

  assert.deepEqual(result, {
    contractVersion: 'v1_naver_news_latest_official_shadow_slot',
    status: 'data-issue',
    canonicalArtistId: 'iu',
    reason: 'latest-slot-not-found',
  });
});

test('resolver fails closed on repository read failure', async () => {
  const result =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart({
      async readSucceededSchedulerJobs() {
        throw new Error('database-unavailable');
      },
    });

  assert.equal(result.status, 'data-issue');
  if (result.status === 'data-issue') {
    assert.equal(result.reason, 'latest-slot-repository-read-failed');
  }
});

test('Postgres repository is read-only and selects only succeeded NAVER scheduler jobs', async () => {
  const job = officialJob('2026-09-15T16:00:00.000Z');
  const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  let released = false;

  const pool: NaverNewsIngestionPool = {
    async connect() {
      return {
        async query<T = Record<string, unknown>>(
          sql: string,
          values?: readonly unknown[],
        ) {
          calls.push({ sql, values });
          if (sql.startsWith('SELECT')) {
            return {
              rowCount: 1,
              rows: [
                {
                  job_id: job.jobId,
                  collection_key: job.collectionKey,
                  request_contract: job.requestContract,
                } as T,
              ],
            };
          }
          return { rowCount: 0, rows: [] as T[] };
        },
        release() {
          released = true;
        },
      };
    },
  };

  const reader =
    createPostgresNaverNewsLatestOfficialShadowSlotRepository(pool);
  const jobs = await reader.readSucceededSchedulerJobs();

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].jobId, job.jobId);
  assert.equal(calls[0].sql, 'BEGIN READ ONLY');
  assert.match(calls[1].sql, /FROM fandex\.source_ingestion_jobs/);
  assert.match(calls[1].sql, /status = 'succeeded'/);
  assert.deepEqual(calls[1].values, [
    'naver-news',
    'sched-v125-naver-news-%',
  ]);
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  assert.equal(
    calls.some(({ sql }) => /\b(INSERT|UPDATE|DELETE)\b/.test(sql)),
    false,
  );
  assert.equal(released, true);
});
