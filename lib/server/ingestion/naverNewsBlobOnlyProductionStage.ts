import type { ImmutableTextObjectStore } from '../storage/immutableTextObjectStore';
import {
  runNaverNewsBlobOnlyCollectionStage,
  type NaverNewsBlobOnlyCollectionStageSummary,
} from './naverNewsBlobOnlyCollectionStage';
import {
  isNaverNewsRecurringAuthorizationValid,
  readNaverNewsRecurringConfig,
} from './naverNewsRecurringSchedulerContracts';

export const NAVER_NEWS_BLOB_ONLY_PRODUCTION_EXECUTION_ID =
  'ops-naver-blob-only-stage-20261001-v1' as const;
export const NAVER_NEWS_BLOB_ONLY_PRODUCTION_SOURCE =
  'github-actions-manual-v1' as const;
export const NAVER_NEWS_BLOB_ONLY_PRODUCTION_MODE =
  'naver-production-blob-only-collection-stage' as const;

type ErrorClass =
  | 'request_rejected'
  | 'config_rejected'
  | 'runtime_unavailable'
  | 'collection_stage_failed';

export type NaverNewsBlobOnlyProductionDependencies = Readonly<{
  resolveOidcToken?: () => string | undefined | Promise<string | undefined>;
  createStore(
    environment: Readonly<Record<string, string | undefined>>,
  ): ImmutableTextObjectStore;
  runStage?: typeof runNaverNewsBlobOnlyCollectionStage;
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

function failure(status: number, errorClass: ErrorClass): Response {
  return Response.json(
    {
      ok: false,
      mode: NAVER_NEWS_BLOB_ONLY_PRODUCTION_MODE,
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

function boundedSuccess(
  result: NaverNewsBlobOnlyCollectionStageSummary,
): Response {
  return Response.json(
    {
      ok: true,
      mode: NAVER_NEWS_BLOB_ONLY_PRODUCTION_MODE,
      contractVersion: result.contractVersion,
      schedulerVersion: result.schedulerVersion,
      slotStart: result.slotStart,
      collectionKey: result.collectionKey,
      jobId: result.jobId,
      resultSha256: result.resultSha256,
      stagedObjectStatus: result.stagedObjectStatus,
      counts: result.counts,
      databaseWrites: result.safety.databaseWrites,
      schedulerManifestFinalized:
        result.safety.schedulerManifestFinalized,
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

function configuredStoreId(
  environment: Readonly<Record<string, string | undefined>>,
): string | null {
  const specific =
    environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID?.trim();
  if (specific) return specific;
  const generic = environment.BLOB_STORE_ID?.trim();
  return generic || null;
}

export async function handleNaverNewsBlobOnlyProductionStage(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsBlobOnlyProductionDependencies,
): Promise<Response> {
  if (request.method !== 'POST') {
    return failure(405, 'request_rejected');
  }

  if (new URL(request.url).search || !await hasEmptyBody(request)) {
    return failure(400, 'request_rejected');
  }

  let config: ReturnType<typeof readNaverNewsRecurringConfig>;
  try {
    config = readNaverNewsRecurringConfig(environment);
  } catch {
    return failure(503, 'config_rejected');
  }

  if (
    request.headers.get('x-fandex-blob-only-stage-id')
      !== NAVER_NEWS_BLOB_ONLY_PRODUCTION_EXECUTION_ID
    || request.headers.get('x-fandex-scheduler-source')
      !== NAVER_NEWS_BLOB_ONLY_PRODUCTION_SOURCE
    || !isNaverNewsRecurringAuthorizationValid(
      request.headers.get('authorization'),
      config.secret,
    )
  ) {
    return failure(403, 'request_rejected');
  }

  const storeId = configuredStoreId(environment);
  if (environment.VERCEL_ENV !== 'production' || !storeId) {
    return failure(503, 'runtime_unavailable');
  }

  let oidcToken = environment.VERCEL_OIDC_TOKEN?.trim();
  if (!oidcToken && dependencies.resolveOidcToken) {
    try {
      oidcToken = (await dependencies.resolveOidcToken())?.trim();
    } catch {
      return failure(503, 'runtime_unavailable');
    }
  }
  if (!oidcToken) {
    return failure(503, 'runtime_unavailable');
  }

  const runtimeEnvironment = Object.freeze({
    ...environment,
    VERCEL_OIDC_TOKEN: oidcToken,
    ...(environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID?.trim()
      ? {}
      : { BLOB_STORE_ID: storeId }),
  });

  let store: ImmutableTextObjectStore;
  try {
    store = dependencies.createStore(runtimeEnvironment);
  } catch {
    return failure(503, 'runtime_unavailable');
  }

  try {
    const runStage =
      dependencies.runStage ?? runNaverNewsBlobOnlyCollectionStage;
    const result = await runStage(
      {
        query: config.query,
        display: config.display,
        environment: runtimeEnvironment,
      },
      {
        store,
        ...(dependencies.now ? { now: dependencies.now } : {}),
      },
    );
    return boundedSuccess(result);
  } catch {
    return failure(502, 'collection_stage_failed');
  }
}
