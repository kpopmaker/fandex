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
import {
  classifyNaverNewsRequestSource,
  classifyNaverNewsRuntimeRegion,
  handleNaverNewsShadowRecurringSchedulerRequest,
  preferredRegion,
} from '../app/api/internal/naver-news/shadow-scheduler/route';

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

test('shadow scheduler route is pinned to the Singapore function region', () => {
  assert.equal(preferredRegion, 'sin1');
});

test('runtime region evidence is reduced to a fixed safe class', () => {
  assert.equal(classifyNaverNewsRuntimeRegion('sin1'), 'sin1');
  assert.equal(classifyNaverNewsRuntimeRegion('SIN1'), 'sin1');
  assert.equal(classifyNaverNewsRuntimeRegion('iad1'), 'iad1');
  assert.equal(classifyNaverNewsRuntimeRegion('PRIVATE_REGION_VALUE'), 'other');
  assert.equal(classifyNaverNewsRuntimeRegion(undefined), 'missing');
  assert.equal(classifyNaverNewsRuntimeRegion('   '), 'missing');
});

test('authenticated scheduler request sources reduce to fixed safe classes only', () => {
  const base = 'https://example.test/api/internal/naver-news/shadow-scheduler';
  const cases = [
    [{ 'x-fandex-scheduler-source': 'github-actions-hourly-v1', 'user-agent': 'curl/8.0 PRIVATE_DETAIL' }, 'github_actions_hourly_v1'],
    [{ 'x-fandex-scheduler-source': 'github-actions-manual-v1', 'user-agent': 'curl/8.0 PRIVATE_DETAIL' }, 'github_actions_manual_v1'],
    [{ 'user-agent': 'vercel-cron/1.0 PRIVATE_DETAIL' }, 'vercel_cron'],
    [{ 'user-agent': 'PRIVATE_SERVICE/1.0', 'x-vercel-signature': 'PRIVATE_SIGNATURE' }, 'vercel_signed_service'],
    [{ 'user-agent': 'GitHub-Hookshot/abcdef PRIVATE_DETAIL' }, 'github_webhook'],
    [{ 'user-agent': 'node' }, 'node_client'],
    [{ 'user-agent': 'undici PRIVATE_DETAIL' }, 'node_client'],
    [{ 'user-agent': 'axios/1.7 PRIVATE_DETAIL' }, 'node_client'],
    [{ 'user-agent': 'python-requests/2.32 PRIVATE_DETAIL' }, 'python_requests'],
    [{ 'user-agent': 'Mozilla/5.0 PRIVATE_DETAIL' }, 'browser'],
    [{ 'user-agent': 'curl/8.0 PRIVATE_DETAIL' }, 'curl_unmarked'],
    [{ 'user-agent': 'PRIVATE_CLIENT/1.0' }, 'other'],
  ] as const;

  for (const [headers, expected] of cases) {
    assert.equal(classifyNaverNewsRequestSource(new Request(base, { headers })), expected);
  }
  assert.equal(classifyNaverNewsRequestSource(new Request(base)), 'missing');
});

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
    errorClass: 'protocol_rejected',
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
    errorClass: 'dispatch_failed',
  });
  assert.equal(text.includes('secret'), false);
  assert.equal(text.includes('raw_payload'), false);
});


test('shadow route classifies config and authorization failures without exposing values', async () => {
  const configRejected = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST', headers: { authorization: `Bearer ${SECRET}` },
    }),
    environment({ [NAVER_NEWS_RECURRING_ENABLED_ENV]: 'wrong' }),
    { dispatch: fakeDispatch([]) },
  );
  assert.equal(configRejected.status, 403);
  assert.deepEqual(await configRejected.json(), {
    ok: false,
    code: 'naver_news_shadow_recurring_scheduler_rejected',
    errorClass: 'config_rejected',
  });

  const authRejected = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST', headers: { authorization: 'Bearer wrong' },
    }),
    environment(),
    { dispatch: fakeDispatch([]) },
  );
  assert.equal(authRejected.status, 403);
  assert.deepEqual(await authRejected.json(), {
    ok: false,
    code: 'naver_news_shadow_recurring_scheduler_rejected',
    errorClass: 'authorization_rejected',
  });
});

test('Production source gate rejects unmarked authenticated callers before OIDC or DB dispatch', async (t) => {
  const infoLogs: unknown[][] = [];
  const warnLogs: unknown[][] = [];
  t.mock.method(console, 'info', (...args: unknown[]) => infoLogs.push(args));
  t.mock.method(console, 'warn', (...args: unknown[]) => warnLogs.push(args));

  let dispatches = 0;
  let oidcResolutions = 0;
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'user-agent': 'PRIVATE_CLIENT/1.0',
      },
    }),
    environment({
      FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE: 'shadow-write-v1',
      BLOB_STORE_ID: 'store_123',
    }),
    {
      requireTrustedRequestSource: true,
      dispatch: async () => { dispatches += 1; throw new Error('unexpected dispatch'); },
      resolveOidcToken: () => { oidcResolutions += 1; return 'unexpected-token'; },
    },
  );

  assert.equal(response.status, 403);
  assert.equal(dispatches, 0);
  assert.equal(oidcResolutions, 0);
  assert.deepEqual(infoLogs, [['FANDEX_NAVER_REQUEST_SOURCE_CLASS=other']]);
  assert.deepEqual(warnLogs, [['FANDEX_NAVER_RECURRING_ERROR_CLASS=authorization_rejected']]);
});

test('Production source gate accepts the canonical hourly and manual GitHub markers', async () => {
  const base = 'https://example.test/api/internal/naver-news/shadow-scheduler';
  for (const marker of ['github-actions-hourly-v1', 'github-actions-manual-v1']) {
    const calls: any[] = [];
    const response = await handleNaverNewsShadowRecurringSchedulerRequest(
      new Request(base, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${SECRET}`,
          'x-fandex-scheduler-source': marker,
        },
      }),
      environment(),
      {
        requireTrustedRequestSource: true,
        now: () => NOW,
        dispatch: fakeDispatch(calls),
      },
    );
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
  }
});

test('authenticated request source logging is bounded and never emits raw headers', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'info', (...args: unknown[]) => logs.push(args));
  const calls: any[] = [];
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'user-agent': 'curl/8.0 PRIVATE_USER_AGENT_DETAIL',
      },
    }),
    environment(),
    { now: () => NOW, dispatch: fakeDispatch(calls) },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(logs, [['FANDEX_NAVER_REQUEST_SOURCE_CLASS=curl_unmarked']]);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_USER_AGENT_DETAIL/);
});

test('runtime failure logs contain only the bounded class and preserve dispatch boundaries', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const raw = 'PRIVATE_PROVIDER_PAYLOAD SQL postgresql://secret@example.test/db';
  const cases = [
    { errorClass: 'config_rejected', overrides: { [NAVER_NEWS_RECURRING_ENABLED_ENV]: raw }, auth: `Bearer ${SECRET}`, dispatches: 0 },
    { errorClass: 'protocol_rejected', overrides: { [NAVER_NEWS_RECURRING_QUERY_ENV]: raw }, auth: `Bearer ${SECRET}`, dispatches: 0 },
    { errorClass: 'authorization_rejected', overrides: {}, auth: `Bearer ${raw}`, dispatches: 0 },
    { errorClass: 'dispatch_failed', overrides: {}, auth: `Bearer ${SECRET}`, dispatches: 1 },
    { errorClass: 'dispatch_failed', overrides: { FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE: 'shadow-write-v1', BLOB_STORE_ID: 'store_123' }, auth: `Bearer ${SECRET}`, dispatches: 0 },
  ];
  for (const candidate of cases) {
    logs.length = 0;
    let dispatches = 0;
    const response = await handleNaverNewsShadowRecurringSchedulerRequest(
      new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
        method: 'POST', headers: { authorization: candidate.auth },
      }),
      environment(candidate.overrides),
      {
        dispatch: async () => { dispatches += 1; throw new Error(raw); },
        resolveOidcToken: () => { throw new Error(raw); },
      },
    );
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      ok: false, code: 'naver_news_shadow_recurring_scheduler_rejected', errorClass: candidate.errorClass,
    });
    assert.deepEqual(logs, [
      ...(candidate.overrides.FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE
        ? [['FANDEX_NAVER_DISPATCH_FAILED_STAGE=runtime_oidc']] : []),
      [`FANDEX_NAVER_RECURRING_ERROR_CLASS=${candidate.errorClass}`],
    ]);
    assert.equal(dispatches, candidate.dispatches);
  }
});

test('logging sink failure cannot alter a rejection or cause another dispatch', async (t) => {
  t.mock.method(console, 'warn', () => { throw new Error('logging unavailable'); });
  let dispatches = 0;
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST', headers: { authorization: `Bearer ${SECRET}` },
    }), environment(), {
      dispatch: async () => { dispatches += 1; throw new Error('PRIVATE_PROVIDER_PAYLOAD'); },
    },
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).errorClass, 'dispatch_failed');
  assert.equal(dispatches, 1);
});

test('successful dispatch does not emit failure evidence', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const calls: any[] = [];
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST', headers: { authorization: `Bearer ${SECRET}` },
    }), environment(), { dispatch: fakeDispatch(calls) },
  );
  assert.equal(response.status, 200);
  assert.equal(warn.mock.callCount(), 0);
  assert.equal(calls.length, 1);
});

test('shadow route resolves request-context OIDC for the live Blob mirror before dispatch', async () => {
  const calls: any[] = [];
  let resolverCalls = 0;
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    }),
    environment({
      FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE: 'shadow-write-v1',
      BLOB_STORE_ID: 'store_123',
      VERCEL_OIDC_TOKEN: undefined,
    }),
    {
      now: () => NOW,
      dispatch: fakeDispatch(calls),
      resolveOidcToken: () => {
        resolverCalls += 1;
        return 'runtime-oidc-token';
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal(resolverCalls, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].environment.VERCEL_OIDC_TOKEN, 'runtime-oidc-token');
  assert.equal(calls[0].environment.BLOB_STORE_ID, 'store_123');
});

test('shadow route never resolves OIDC before authorization passes', async () => {
  let resolverCalls = 0;
  const calls: any[] = [];
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
    }),
    environment({
      FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE: 'shadow-write-v1',
      BLOB_STORE_ID: 'store_123',
    }),
    {
      dispatch: fakeDispatch(calls),
      resolveOidcToken: () => {
        resolverCalls += 1;
        return 'runtime-oidc-token';
      },
    },
  );
  assert.equal(response.status, 403);
  assert.equal(resolverCalls, 0);
  assert.equal(calls.length, 0);
  assert.equal((await response.json()).errorClass, 'authorization_rejected');
});

test('shadow route fails closed when live Blob mirror OIDC cannot be resolved', async () => {
  const calls: any[] = [];
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    }),
    environment({
      FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE: 'shadow-write-v1',
      BLOB_STORE_ID: 'store_123',
      VERCEL_OIDC_TOKEN: undefined,
    }),
    {
      dispatch: fakeDispatch(calls),
      resolveOidcToken: async () => undefined,
    },
  );
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: 'naver_news_shadow_recurring_scheduler_rejected',
    errorClass: 'dispatch_failed',
  });
});

test('shadow route preserves an existing runtime OIDC token without calling resolver', async () => {
  const calls: any[] = [];
  let resolverCalls = 0;
  const response = await handleNaverNewsShadowRecurringSchedulerRequest(
    new Request('https://example.test/api/internal/naver-news/shadow-scheduler', {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    }),
    environment({
      FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE: 'shadow-write-v1',
      BLOB_STORE_ID: 'store_123',
      VERCEL_OIDC_TOKEN: 'existing-oidc-token',
    }),
    {
      dispatch: fakeDispatch(calls),
      resolveOidcToken: () => {
        resolverCalls += 1;
        return 'unexpected';
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal(resolverCalls, 0);
  assert.equal(calls[0].environment.VERCEL_OIDC_TOKEN, 'existing-oidc-token');
});

test('recurring workflow suppresses malformed response bodies and only logs bounded failure classes', async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const workflow = await readFile(new URL(
    '../.github/workflows/naver-news-shadow-recurring-production-v1.yml', import.meta.url,
  ), 'utf8');
  const scripts = [...workflow.matchAll(/node <<'NODE'\r?\n([\s\S]*?)\r?\n\s+NODE/g)]
    .map((match) => match[1]);
  assert.equal(scripts.length, 2);
  function evaluate(script: string, body: string) {
    const output: string[] = [];
    let exitCode = 0;
    const stopped = Symbol('exit');
    try {
      runInNewContext(script, {
        require: () => ({ readFileSync: () => body }),
        console: { log: (value: string) => output.push(value) },
        process: { exit: (code: number) => { exitCode = code; throw stopped; } },
      });
    } catch (error) {
      if (error !== stopped) throw error;
    }
    return { exitCode, output };
  }
  for (const script of scripts) {
    for (const body of ['', '<html>PRIVATE_PROVIDER_PAYLOAD</html>', '{"secret":"PRIVATE_TOKEN",']) {
      assert.deepEqual(evaluate(script, body), { exitCode: 2, output: [] });
    }
  }
  for (const errorClass of ['config_rejected', 'protocol_rejected', 'authorization_rejected', 'dispatch_failed']) {
    assert.deepEqual(evaluate(scripts[0], JSON.stringify({
      ok: false, code: 'naver_news_shadow_recurring_scheduler_rejected', errorClass,
      raw: 'PRIVATE_PROVIDER_PAYLOAD',
    })), { exitCode: 0, output: [`FANDEX_NAVER_RECURRING_ERROR_CLASS=${errorClass}`] });
  }
  assert.deepEqual(evaluate(scripts[0], JSON.stringify({
    ok: false, code: 'naver_news_shadow_recurring_scheduler_rejected', errorClass: 'PRIVATE_TOKEN',
  })), { exitCode: 2, output: [] });
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

test('vercel config pins only the NAVER recurring scheduler function to sin1', async () => {
  const fs = await import('node:fs/promises');
  const raw = await fs.readFile(new URL('../vercel.json', import.meta.url), 'utf8');
  const config = JSON.parse(raw) as {
    regions?: unknown;
    functions?: Record<string, { regions?: string[] }>;
  };

  assert.equal(config.regions, undefined);
  assert.deepEqual(
    config.functions?.['app/api/internal/naver-news/shadow-scheduler/route.ts']?.regions,
    ['sin1'],
  );
  assert.equal(Object.keys(config.functions ?? {}).length, 1);
});


test('canonical GitHub scheduler workflows emit only fixed non-secret source markers', async () => {
  const fs = await import('node:fs/promises');
  const hourly = await fs.readFile(new URL(
    '../.github/workflows/naver-news-shadow-recurring-production-v1.yml', import.meta.url,
  ), 'utf8');
  const manual = await fs.readFile(new URL(
    '../.github/workflows/naver-shadow-production-trigger.yml', import.meta.url,
  ), 'utf8');

  assert.match(hourly, /X-Fandex-Scheduler-Source: github-actions-hourly-v1/);
  assert.match(manual, /X-Fandex-Scheduler-Source: github-actions-manual-v1/);
  assert.doesNotMatch(hourly, /X-Fandex-Scheduler-Source:\s*\$\{\{/);
  assert.doesNotMatch(manual, /X-Fandex-Scheduler-Source:\s*\$\{\{/);
});

test('Production POST wrapper requires the trusted request-source gate', async () => {
  const fs = await import('node:fs/promises');
  const route = await fs.readFile(
    new URL('../app/api/internal/naver-news/shadow-scheduler/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(route, /requireTrustedRequestSource:\s*true/);
});
