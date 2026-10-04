import 'server-only';

import {
  isNaverNewsRecurringAuthorizationValid,
} from '../ingestion/naverNewsRecurringSchedulerContracts';
import {
  getFandexCurrentRuntimeAssemblyReadinessForIU,
} from './fandexCurrentRuntimeAssemblyReadiness';
import type {
  FandexCurrentRuntimeAssemblyReadiness,
} from '../../product/runtime/fandexCurrentRuntimeAssemblyReadiness';

export const FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_ID =
  'ops-fandex-product-runtime-readiness-20261004-v1' as const;
export const FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_SOURCE =
  'github-actions-manual-v1' as const;
export const FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_MODE =
  'fandex-product-runtime-readiness-probe' as const;

type ErrorClass =
  | 'request_rejected'
  | 'runtime_unavailable'
  | 'runtime_read_failed';

export type FandexProductRuntimeReadinessProbeDependencies =
  Readonly<{
    read?: (input?: Readonly<{ generatedAt?: string }>) =>
      Promise<FandexCurrentRuntimeAssemblyReadiness>;
    now?: () => Date;
  }>;

async function hasEmptyBody(request: Request): Promise<boolean> {
  if (request.body === null) return true;

  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      (async () => {
        for (let chunks = 0; chunks < 4; chunks += 1) {
          const chunk = await reader.read();
          if (chunk.done) return true;
          if (chunk.value.byteLength > 0) return false;
        }
        return false;
      })(),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), 1_000);
      }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
  }
}

function failed(status: number, errorClass: ErrorClass): Response {
  return Response.json(
    {
      ok: false,
      mode: FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_MODE,
      errorClass,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  );
}

export async function handleFandexProductRuntimeReadinessProbe(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: FandexProductRuntimeReadinessProbeDependencies = {},
): Promise<Response> {
  if (request.method !== 'POST') {
    return failed(405, 'request_rejected');
  }

  if (new URL(request.url).search || !await hasEmptyBody(request)) {
    return failed(400, 'request_rejected');
  }

  if (
    request.headers.get('x-fandex-product-runtime-probe-id')
      !== FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_ID
    || request.headers.get('x-fandex-probe-source')
      !== FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_SOURCE
    || !isNaverNewsRecurringAuthorizationValid(
      request.headers.get('authorization'),
      environment.FANDEX_NAVER_NEWS_SCHEDULER_SECRET ?? '',
    )
  ) {
    return failed(403, 'request_rejected');
  }

  if (environment.VERCEL_ENV !== 'production') {
    return failed(503, 'runtime_unavailable');
  }

  const read =
    dependencies.read ?? getFandexCurrentRuntimeAssemblyReadinessForIU;
  const generatedAt =
    (dependencies.now?.() ?? new Date()).toISOString();

  let result: FandexCurrentRuntimeAssemblyReadiness;
  try {
    result = await read({ generatedAt });
  } catch {
    return failed(502, 'runtime_read_failed');
  }

  return Response.json(
    {
      ok: true,
      mode: FANDEX_PRODUCT_RUNTIME_READINESS_PROBE_MODE,
      contractVersion: result.contractVersion,
      canonicalArtistId: result.canonicalArtistId,
      generatedAt,
      status: result.status,
      resolvedVariableIds: result.resolvedVariableIds,
      blockedVariableIds: result.blockedVariableIds,
      variableStates: result.variableStates.map((entry) => ({
        variableId: entry.variableId,
        sourceState: entry.sourceState,
        adapterState: entry.adapterState,
        reason: entry.reason,
      })),
      assemblyStatus: result.assembly?.status ?? null,
      scoreCalculated: result.scoreCalculated,
      methodologyFinalized: result.methodologyFinalized,
      publicRouteActivated: result.publicRouteActivated,
      providerExecutionPerformed: false,
      writeOperationsAuthorized: false,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  );
}
