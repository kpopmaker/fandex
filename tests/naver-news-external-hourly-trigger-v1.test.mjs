import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runExternalNaverTrigger,
} from '../scripts/ops/run-naver-external-hourly-trigger-v1.mjs';

function env(overrides = {}) {
  return {
    FANDEX_NAVER_EXTERNAL_SCHEDULER_SECRET: 'secret-value',
    ...overrides,
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('sends one authenticated canonical hourly request and accepts collected success', async () => {
  let calls = 0;
  const summary = await runExternalNaverTrigger(
    env(),
    {
      async fetchImpl(url, init) {
        calls += 1;
        assert.equal(
          url,
          'https://fandex-eta.vercel.app/api/internal/naver-news/vercel-cron-fallback',
        );
        assert.equal(init.method, 'GET');
        assert.equal(init.headers.authorization, 'Bearer secret-value');
        assert.equal(init.headers['x-vercel-cron-schedule'], '17 * * * *');
        return response({
          ok: true,
          mode: 'naver-news-vercel-cron-blob-only-fallback-v2',
          schedule: '17 * * * *',
          runStatus: 'collected-and-finalized',
          slotStart: '2026-10-02T14:00:00.000Z',
          collectionKey: 'slot',
          providerCalls: 1,
          databaseWrites: 0,
          schedulerManifestFinalized: true,
        });
      },
    },
  );

  assert.equal(calls, 1);
  assert.deepEqual(summary, {
    mode: 'naver-news-vercel-cron-blob-only-fallback-v2',
    runStatus: 'collected-and-finalized',
    slotStart: '2026-10-02T14:00:00.000Z',
    collectionKey: 'slot',
    providerCalls: 1,
    databaseWrites: 0,
    schedulerManifestFinalized: true,
  });
});

test('accepts already-finalized response without a provider call', async () => {
  const summary = await runExternalNaverTrigger(
    env({
      FANDEX_NAVER_EXTERNAL_SCHEDULER_ENDPOINT:
        'https://example.test/api/internal/naver-news/vercel-cron-fallback',
    }),
    {
      async fetchImpl(url) {
        assert.equal(
          url,
          'https://example.test/api/internal/naver-news/vercel-cron-fallback',
        );
        return response({
          ok: true,
          mode: 'naver-news-vercel-cron-blob-only-fallback-v2',
          schedule: '17 * * * *',
          runStatus: 'already-finalized',
          slotStart: '2026-10-02T14:00:00.000Z',
          collectionKey: 'slot',
          providerCalls: 0,
          databaseWrites: 0,
          schedulerManifestFinalized: true,
        });
      },
    },
  );

  assert.equal(summary.runStatus, 'already-finalized');
  assert.equal(summary.providerCalls, 0);
});

test('fails closed when external scheduler secret is missing', async () => {
  await assert.rejects(
    () => runExternalNaverTrigger(
      env({ FANDEX_NAVER_EXTERNAL_SCHEDULER_SECRET: undefined }),
      {
        async fetchImpl() {
          throw new Error('must_not_call');
        },
      },
    ),
    /naver_external_scheduler_secret_required/,
  );
});

test('fails closed on non-2xx, malformed, or unsafe success responses', async () => {
  const cases = [
    response({ ok: false }, 403),
    new Response('not-json', { status: 200 }),
    response({
      ok: true,
      mode: 'naver-news-vercel-cron-blob-only-fallback-v2',
      schedule: '17 * * * *',
      runStatus: 'collected-and-finalized',
      providerCalls: 1,
      databaseWrites: 1,
      schedulerManifestFinalized: true,
    }),
    response({
      ok: true,
      mode: 'naver-news-vercel-cron-blob-only-fallback-v2',
      schedule: '17 * * * *',
      runStatus: 'already-finalized',
      providerCalls: 1,
      databaseWrites: 0,
      schedulerManifestFinalized: true,
    }),
  ];

  for (const candidate of cases) {
    await assert.rejects(
      () => runExternalNaverTrigger(
        env(),
        {
          async fetchImpl() {
            return candidate.clone();
          },
        },
      ),
    );
  }
});
