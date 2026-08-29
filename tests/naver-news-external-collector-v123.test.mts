import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_PROVIDER,
  type NaverNewsApiResponse,
  type NaverNewsCollection,
  type NaverNewsIngestionCommand,
  type NaverNewsRequestContract,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  createNaverNewsExternalCollector,
  FANDEX_NAVER_NEWS_CLIENT_ID_ENV,
  FANDEX_NAVER_NEWS_CLIENT_SECRET_ENV,
  NAVER_NEWS_EXTERNAL_ENDPOINT_ENV,
  type NaverNewsExternalFetch,
} from '../lib/server/ingestion/naverNewsExternalCollector';
import {
  buildExternalCollectionSummary,
  NAVER_NEWS_V123_APPROVAL_ENV,
  NAVER_NEWS_V123_APPROVAL_VALUE,
} from '../scripts/ingestion/collect-naver-news-v123.mjs';
import {
  buildDryRunReport,
  parseDryRunCommand,
} from '../scripts/ingestion/plan-naver-news-v121.mjs';

const fixturePath = new URL('../scripts/ingestion/fixtures/naver-news-v121-dry-run.json', import.meta.url);
const cliPath = new URL('../scripts/ingestion/collect-naver-news-v123.mts', import.meta.url);
const packagePath = new URL('../package.json', import.meta.url);
const endpoint = 'https://openapi.naver.com/v1/search/news.json';
const clientId = 'synthetic-client-id-not-a-real-credential';
const clientSecret = 'synthetic-client-secret-not-a-real-credential';
const fetchedAt = '2026-08-29T06:00:00.000Z';

const command: NaverNewsIngestionCommand = Object.freeze({
  provider: NAVER_NEWS_PROVIDER,
  collectionKey: 'manual-v123-external-collection-test',
  query: 'FANDEX v123 exact query',
  display: 4,
  start: 7,
  sort: 'sim',
});

function environment(approved = false): Record<string, string> {
  return {
    [NAVER_NEWS_EXTERNAL_ENDPOINT_ENV]: endpoint,
    [FANDEX_NAVER_NEWS_CLIENT_ID_ENV]: clientId,
    [FANDEX_NAVER_NEWS_CLIENT_SECRET_ENV]: clientSecret,
    ...(approved ? { [NAVER_NEWS_V123_APPROVAL_ENV]: NAVER_NEWS_V123_APPROVAL_VALUE } : {}),
  };
}

function apiResponse(request: NaverNewsRequestContract): NaverNewsApiResponse {
  return {
    lastBuildDate: 'Sat, 29 Aug 2026 15:00:00 +0900',
    total: 1,
    start: request.start,
    display: 1,
    items: [{
      title: '<b>FANDEX</b> v123 synthetic item',
      originallink: 'https://news.example.test/articles/fandex-v123',
      link: 'https://n.news.naver.com/mnews/article/001/0000000123',
      description: 'Synthetic response only.',
      pubDate: 'Sat, 29 Aug 2026 14:59:00 +0900',
    }],
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function trackedResponse(options: Readonly<{
  status?: number;
  contentType?: string;
  contentLength?: string;
  cancelRejects?: boolean;
}> = {}): { response: Response; cancelCalls(): number } {
  let cancellations = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"unread":"synthetic"}'));
    },
    cancel() {
      cancellations += 1;
      if (options.cancelRejects) throw new Error(`cleanup ${clientSecret}`);
    },
  });
  const headers = new Headers({ 'content-type': options.contentType ?? 'application/json' });
  if (options.contentLength !== undefined) headers.set('content-length', options.contentLength);
  return {
    response: new Response(body, { status: options.status ?? 200, headers }),
    cancelCalls: () => cancellations,
  };
}

async function errorFrom(operation: Promise<unknown>): Promise<Error> {
  try {
    await operation;
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }
  throw new Error('expected_test_rejection');
}

test('external collector fails closed when endpoint or credentials are missing', () => {
  for (const missing of [
    NAVER_NEWS_EXTERNAL_ENDPOINT_ENV,
    FANDEX_NAVER_NEWS_CLIENT_ID_ENV,
    FANDEX_NAVER_NEWS_CLIENT_SECRET_ENV,
  ]) {
    const values: Record<string, string | undefined> = environment();
    delete values[missing];
    assert.throws(
      () => createNaverNewsExternalCollector({ environment: values, fetch: async () => jsonResponse({}) }),
      { message: 'naver_news_external_config_invalid' },
    );
  }
  assert.throws(() => createNaverNewsExternalCollector({
    environment: { ...environment(), [NAVER_NEWS_EXTERNAL_ENDPOINT_ENV]: 'https://user:secret@openapi.naver.com/v1/search/news.json' },
  }), { message: 'naver_news_external_config_invalid' });
});

test('request contract is transferred exactly and success returns a bounded collection', async () => {
  const identity = buildNaverNewsJobIdentity(command);
  const requests: Array<{ url: URL; headers: Headers }> = [];
  const syntheticFetch: NaverNewsExternalFetch = async (input, init) => {
    requests.push({ url: new URL(input), headers: new Headers(init?.headers) });
    assert.equal(init?.method, 'GET');
    assert.equal(init?.cache, 'no-store');
    assert.ok(init?.signal instanceof AbortSignal);
    return jsonResponse(apiResponse(identity.request));
  };
  const collector = createNaverNewsExternalCollector({
    environment: environment(),
    fetch: syntheticFetch,
    now: () => new Date(fetchedAt),
  });

  const collection = await collector.collect(identity.request);
  const request = requests[0];

  assert.equal(collector.mode, 'external');
  assert.ok(request);
  assert.equal(request.url.searchParams.get('query'), identity.request.query);
  assert.equal(request.url.searchParams.get('display'), String(identity.request.display));
  assert.equal(request.url.searchParams.get('start'), String(identity.request.start));
  assert.equal(request.url.searchParams.get('sort'), identity.request.sort);
  assert.deepEqual([...request.url.searchParams.keys()].sort(), ['display', 'query', 'sort', 'start']);
  assert.equal(request.headers.get('X-Naver-Client-Id'), clientId);
  assert.equal(request.headers.get('X-Naver-Client-Secret'), clientSecret);
  assert.equal(collection.fetchedAt, fetchedAt);
  assert.deepEqual(collection.response, apiResponse(identity.request));
  assert.ok(Object.isFrozen(collection));
  assert.ok(Object.isFrozen(collection.response.items));
  assert.doesNotMatch(JSON.stringify(collection), new RegExp(`${clientId}|${clientSecret}`));
});

test('malformed JSON, content type, shape, item types, and bounds fail closed', async () => {
  const request = buildNaverNewsJobIdentity(command).request;
  const responses = [
    new Response('{malformed', { headers: { 'content-type': 'application/json' } }),
    new Response(JSON.stringify(apiResponse(request)), { headers: { 'content-type': 'text/plain' } }),
    jsonResponse({ ...apiResponse(request), unexpected: true }),
    jsonResponse({ ...apiResponse(request), items: [{ title: 123 }] }),
    jsonResponse({ ...apiResponse(request), items: [{ title: 'x'.repeat(2_049) }] }),
    jsonResponse({ ...apiResponse(request), lastBuildDate: 'not-a-date' }),
    new Response('', {
      headers: { 'content-type': 'application/json', 'content-length': '2500001' },
    }),
  ];
  for (const response of responses) {
    const collector = createNaverNewsExternalCollector({
      environment: environment(),
      fetch: async () => response,
      now: () => new Date(fetchedAt),
    });
    await assert.rejects(collector.collect(request), { message: 'naver_news_external_response_invalid' });
  }

  let calls = 0;
  const collector = createNaverNewsExternalCollector({
    environment: environment(),
    fetch: async () => { calls += 1; return jsonResponse(apiResponse(request)); },
  });
  await assert.rejects(collector.collect({ ...request, query: 'x'.repeat(513) }), {
    message: 'naver_news_external_request_invalid',
  });
  assert.equal(calls, 0);
});

test('HTTP non-2xx response cancels its unread body', async () => {
  const request = buildNaverNewsJobIdentity(command).request;
  const tracked = trackedResponse({ status: 503 });
  const collector = createNaverNewsExternalCollector({
    environment: environment(),
    fetch: async () => tracked.response,
  });

  await assert.rejects(collector.collect(request), { message: 'naver_news_external_http_failed' });
  assert.equal(tracked.cancelCalls(), 1);
});

test('invalid content-type response cancels its unread body', async () => {
  const request = buildNaverNewsJobIdentity(command).request;
  const tracked = trackedResponse({ contentType: 'text/plain' });
  const collector = createNaverNewsExternalCollector({
    environment: environment(),
    fetch: async () => tracked.response,
  });

  await assert.rejects(collector.collect(request), { message: 'naver_news_external_response_invalid' });
  assert.equal(tracked.cancelCalls(), 1);
});

test('oversized declared Content-Length cancels the unread body', async () => {
  const request = buildNaverNewsJobIdentity(command).request;
  const tracked = trackedResponse({ contentLength: '2500001' });
  const collector = createNaverNewsExternalCollector({
    environment: environment(),
    fetch: async () => tracked.response,
  });

  await assert.rejects(collector.collect(request), { message: 'naver_news_external_response_invalid' });
  assert.equal(tracked.cancelCalls(), 1);
});

test('response cleanup failure preserves the original bounded error', async () => {
  const request = buildNaverNewsJobIdentity(command).request;
  const tracked = trackedResponse({ status: 502, cancelRejects: true });
  const collector = createNaverNewsExternalCollector({
    environment: environment(),
    fetch: async () => tracked.response,
  });

  const error = await errorFrom(collector.collect(request));
  assert.equal(tracked.cancelCalls(), 1);
  assert.equal(error.message, 'naver_news_external_http_failed');
  assert.doesNotMatch(error.message, new RegExp(`${clientSecret}|cleanup`));
});

test('HTTP and transport failures expose only bounded error codes', async () => {
  const request = buildNaverNewsJobIdentity(command).request;
  const httpError = await errorFrom(createNaverNewsExternalCollector({
    environment: environment(),
    fetch: async () => new Response(`raw ${clientSecret}`, {
      status: 503,
      statusText: `endpoint=${endpoint}`,
      headers: { 'content-type': 'text/plain', 'x-secret': clientSecret },
    }),
  }).collect(request));
  assert.equal(httpError.message, 'naver_news_external_http_failed');

  const requestError = await errorFrom(createNaverNewsExternalCollector({
    environment: environment(),
    fetch: async () => { throw new Error(`${endpoint} ${clientId} ${clientSecret}`); },
  }).collect(request));
  assert.equal(requestError.message, 'naver_news_external_request_failed');
  assert.doesNotMatch(
    [httpError.message, requestError.message].join(' '),
    new RegExp(`${clientId}|${clientSecret}|openapi\\.naver\\.com`),
  );
});

test('timeout aborts the synthetic fetch and fails closed', async () => {
  const request = buildNaverNewsJobIdentity(command).request;
  let abortObserved = false;
  const collector = createNaverNewsExternalCollector({
    environment: environment(),
    timeoutMilliseconds: 5,
    fetch: async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        abortObserved = true;
        reject(new DOMException(`aborted ${clientSecret}`, 'AbortError'));
      }, { once: true });
    }),
  });

  await assert.rejects(collector.collect(request), { message: 'naver_news_external_request_failed' });
  assert.equal(abortObserved, true);
});

test('external collection feeds the existing plan with v121-identical duplicate and rejection behavior', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as NaverNewsCollection;
  const fixtureCommand: NaverNewsIngestionCommand = {
    provider: NAVER_NEWS_PROVIDER,
    collectionKey: 'manual-v121-dry-run-2026-08-29',
    query: 'FANDEX v121 NAVER News dry run',
    display: 4,
    start: 1,
    sort: 'date',
  };
  const identity = buildNaverNewsJobIdentity(fixtureCommand);
  const externalCollection = await createNaverNewsExternalCollector({
    environment: environment(),
    fetch: async () => jsonResponse(fixture.response),
    now: () => new Date(fixture.fetchedAt),
  }).collect(identity.request);
  const externalPlan = buildNaverNewsIngestionWritePlan(identity, externalCollection);
  const fixturePlan = buildNaverNewsIngestionWritePlan(identity, fixture);

  assert.equal(externalPlan.contractVersion, NAVER_NEWS_INGESTION_CONTRACT_VERSION);
  assert.equal(externalPlan.planSha256, fixturePlan.planSha256);
  assert.equal(externalPlan.resultSha256, fixturePlan.resultSha256);
  assert.deepEqual(externalPlan.counts, {
    received: 4,
    rawEvidence: 4,
    normalizedRecords: 2,
    duplicateRecords: 1,
    rejectedItems: 1,
  });
  assert.deepEqual(
    externalPlan.rawEvidence.map(({ normalizationOutcome, rejectionCode }) => ({ normalizationOutcome, rejectionCode })),
    fixturePlan.rawEvidence.map(({ normalizationOutcome, rejectionCode }) => ({ normalizationOutcome, rejectionCode })),
  );
});

test('live CLI approval gate prevents fetch and emits only a bounded summary after approval', async () => {
  const argv = [
    '--query', command.query,
    '--collection-key', command.collectionKey,
    '--display', String(command.display),
    '--start', String(command.start),
    '--sort', command.sort,
  ];
  let syntheticCalls = 0;
  const syntheticFetch: NaverNewsExternalFetch = async () => {
    syntheticCalls += 1;
    return jsonResponse(apiResponse(buildNaverNewsJobIdentity(command).request));
  };
  await assert.rejects(buildExternalCollectionSummary(argv, environment(), {
    fetch: syntheticFetch,
    now: () => new Date(fetchedAt),
  }), { message: 'naver_news_external_approval_required' });
  assert.equal(syntheticCalls, 0);

  const summary = await buildExternalCollectionSummary(argv, environment(true), {
    fetch: syntheticFetch,
    now: () => new Date(fetchedAt),
  });
  assert.deepEqual(Object.keys(summary), [
    'mode', 'contractVersion', 'requestSha256', 'planSha256', 'resultSha256',
    'receivedCount', 'normalizedCount', 'duplicateCount', 'rejectedCount', 'fetchedAt',
  ]);
  assert.equal(summary.mode, 'external-collection');
  assert.equal(summary.receivedCount, 1);
  assert.equal(summary.normalizedCount, 1);
  assert.equal(syntheticCalls, 1);
  assert.doesNotMatch(
    JSON.stringify(summary),
    new RegExp(`${clientId}|${clientSecret}|originallink|description|synthetic item|${command.query}`),
  );
});

test('v121 dry-run remains fixture-only with zero API and database effects and live flags blocked', async () => {
  const report = await buildDryRunReport([]);
  assert.equal(report.effects.apiCalls, 0);
  assert.equal(report.effects.databaseConnections, 0);
  assert.equal(report.effects.databaseQueries, 0);
  assert.equal(report.effects.databaseWrites, 0);
  assert.throws(() => parseDryRunCommand(['--live']), /live_mode_forbidden/);
  assert.throws(() => parseDryRunCommand(['--use-api']), /live_mode_forbidden/);
  assert.throws(() => parseDryRunCommand(['--apply']), /live_mode_forbidden/);

  const [cliSource, packageJson] = await Promise.all([
    readFile(cliPath, 'utf8'),
    readFile(packagePath, 'utf8'),
  ]);
  assert.doesNotMatch(cliSource, /naverNewsWorker|naverNewsRepository|source_ingestion_|postgres|database/i);
  assert.match(packageJson, /"test:ingestion:v123": "tsx --test tests\/naver-news-external-collector-v123\.test\.mts"/);
  assert.match(packageJson, /"ingestion:naver-news:collect": "tsx scripts\/ingestion\/collect-naver-news-v123\.mts"/);
});
