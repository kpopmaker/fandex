import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_ID,
  FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_MODE,
  FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_SOURCE,
  handleFandexProductRuntimeReadinessProbe,
} from '../lib/server/product/fandexCurrentRuntimeReadinessProbe';
import type {
  FandexCurrentRuntimeAssemblyReadiness,
} from '../lib/product/runtime/fandexCurrentRuntimeAssemblyReadiness';

const SECRET = 'runtime-probe-secret';

function request(input: Readonly<{
  method?: string;
  url?: string;
  authorized?: boolean;
  body?: string;
}> = {}): Request {
  const authorized = input.authorized ?? true;

  return new Request(
    input.url
      ?? 'https://example.test/api/internal/fandex/product-runtime-readiness',
    {
      method: input.method ?? 'POST',
      headers: authorized
        ? {
            authorization: `Bearer ${SECRET}`,
            'x-fandex-product-runtime-probe-id':
              FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_ID,
            'x-fandex-probe-source':
              FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_SOURCE,
          }
        : {},
      ...(input.body === undefined ? {} : { body: input.body }),
    },
  );
}

function blockedReadiness():
  FandexCurrentRuntimeAssemblyReadiness {
  return Object.freeze({
    contractVersion:
      'fandex-current-runtime-assembly-readiness-v1' as const,
    canonicalArtistId: 'iu' as const,
    status: 'blocked' as const,
    variableStates: Object.freeze([
      Object.freeze({
        variableId: 'musicAlbumPoint' as const,
        sourceState: 'resolved' as const,
        adapterState: 'ok' as const,
        reason: null,
      }),
      Object.freeze({
        variableId: 'brandFitPoint' as const,
        sourceState: 'runtime-source-unavailable' as const,
        adapterState: 'not-run' as const,
        reason: 'durable-stored-evidence-not-found',
      }),
    ]),
    resolvedVariableIds: Object.freeze([
      'musicAlbumPoint' as const,
    ]),
    blockedVariableIds: Object.freeze([
      'brandFitPoint' as const,
    ]),
    records: Object.freeze([]),
    assembly: null,
    scoreCalculated: false as const,
    methodologyFinalized: false as const,
    publicRouteActivated: false as const,
  });
}

const environment = Object.freeze({
  VERCEL_ENV: 'production',
  FANDEX_NAVER_NEWS_SCHEDULER_SECRET: SECRET,
});

test('runtime readiness probe rejects non-POST requests', async () => {
  const response =
    await handleFandexProductRuntimeReadinessProbe(
      request({ method: 'GET' }),
      environment,
      {
        read: async () => blockedReadiness(),
      },
    );

  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), {
    ok: false,
    mode: FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_MODE,
    errorClass: 'request_rejected',
  });
});

test('runtime readiness probe rejects missing authorization', async () => {
  const response =
    await handleFandexProductRuntimeReadinessProbe(
      request({ authorized: false }),
      environment,
      {
        read: async () => blockedReadiness(),
      },
    );

  assert.equal(response.status, 403);
});

test('runtime readiness probe rejects query strings and request bodies', async () => {
  const queryResponse =
    await handleFandexProductRuntimeReadinessProbe(
      request({
        url:
          'https://example.test/api/internal/fandex/product-runtime-readiness?debug=1',
      }),
      environment,
      {
        read: async () => blockedReadiness(),
      },
    );
  assert.equal(queryResponse.status, 400);

  const bodyResponse =
    await handleFandexProductRuntimeReadinessProbe(
      request({ body: '{}' }),
      environment,
      {
        read: async () => blockedReadiness(),
      },
    );
  assert.equal(bodyResponse.status, 400);
});

test('runtime readiness probe is production-only', async () => {
  const response =
    await handleFandexProductRuntimeReadinessProbe(
      request(),
      {
        ...environment,
        VERCEL_ENV: 'preview',
      },
      {
        read: async () => blockedReadiness(),
      },
    );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    mode: FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_MODE,
    errorClass: 'runtime_unavailable',
  });
});

test('runtime readiness probe returns only sanitized structural readiness', async () => {
  const fixedNow = new Date('2026-10-04T12:30:00.000Z');

  const response =
    await handleFandexProductRuntimeReadinessProbe(
      request(),
      environment,
      {
        read: async () => blockedReadiness(),
        now: () => fixedNow,
      },
    );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');

  const body = await response.json();
  assert.deepEqual(body, {
    ok: true,
    mode: FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_MODE,
    contractVersion:
      'fandex-current-runtime-assembly-readiness-v1',
    canonicalArtistId: 'iu',
    generatedAt: '2026-10-04T12:30:00.000Z',
    status: 'blocked',
    resolvedVariableIds: ['musicAlbumPoint'],
    blockedVariableIds: ['brandFitPoint'],
    variableStates: [
      {
        variableId: 'musicAlbumPoint',
        sourceState: 'resolved',
        adapterState: 'ok',
        reason: null,
      },
      {
        variableId: 'brandFitPoint',
        sourceState: 'runtime-source-unavailable',
        adapterState: 'not-run',
        reason: 'durable-stored-evidence-not-found',
      },
    ],
    assemblyStatus: null,
    scoreCalculated: false,
    methodologyFinalized: false,
    publicRouteActivated: false,
    providerExecutionPerformed: false,
    writeOperationsAuthorized: false,
  });

  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes('evidenceRefs'), false);
  assert.equal(serialized.includes('records'), false);
  assert.equal(serialized.includes('sourceUrl'), false);
});

test('runtime readiness probe fails closed when the runtime read throws', async () => {
  const response =
    await handleFandexProductRuntimeReadinessProbe(
      request(),
      environment,
      {
        read: async () => {
          throw new Error('runtime-read-failed');
        },
      },
    );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    ok: false,
    mode: FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_MODE,
    errorClass: 'runtime_read_failed',
  });
});
