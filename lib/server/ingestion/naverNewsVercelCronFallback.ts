import {
  NAVER_NEWS_BLOB_MIRROR_MODE_ENV,
  NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE,
} from './naverNewsBlobMirrorRuntime';
import {
  isNaverNewsRecurringAuthorizationValid,
  readNaverNewsRecurringConfig,
} from './naverNewsRecurringSchedulerContracts';
import {
  readNaverNewsShadowRecurringProtocol,
  runNaverNewsShadowRecurringScheduler,
  type NaverNewsShadowRecurringResult,
} from './naverNewsShadowRecurringScheduler';
import type {
  NaverNewsRecurringDependencies,
} from './naverNewsRecurringScheduler';

export const NAVER_NEWS_VERCEL_CRON_FALLBACK_VERSION =
  'naver-news-vercel-cron-fallback-v1' as const;
export const NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE =
  '17 * * * *' as const;
export const NAVER_NEWS_VERCEL_CRON_SECRET_ENV =
  'CRON_SECRET' as const;

type FailureClass =
  | 'request_rejected'
  | 'config_rejected'
  | 'protocol_rejected'
  | 'runtime_unavailable'
  | 'dispatch_failed';

export type NaverNewsVercelCronFallbackDependencies =
  NaverNewsRecurringDependencies & Readonly<{
    resolveOidcToken?:
      () => string | undefined | Promise<string | undefined>;
  }>;

function failure(
  status: number,
  errorClass: FailureClass,
): Response {
  try {
    console.warn(
      `FANDEX_NAVER_VERCEL_CRON_ERROR_CLASS=${errorClass}`,
    );
  } catch {
    // Bounded observability must never alter fail-closed behavior.
  }
  return Response.json(
    {
      ok: false,
      mode: NAVER_NEWS_VERCEL_CRON_FALLBACK_VERSION,
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

async function resolveRuntimeEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsVercelCronFallbackDependencies,
): Promise<Readonly<Record<string, string | undefined>>> {
  const mode =
    environment[NAVER_NEWS_BLOB_MIRROR_MODE_ENV]?.trim();
  if (mode !== NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE) {
    return environment;
  }

  const storeId = environment.BLOB_STORE_ID?.trim();
  if (!storeId) {
    throw new Error('naver_news_vercel_cron_runtime_unavailable');
  }

  const persistedOidcToken =
    environment.VERCEL_OIDC_TOKEN?.trim();
  if (persistedOidcToken) {
    return Object.freeze({
      ...environment,
      VERCEL_OIDC_TOKEN: persistedOidcToken,
      BLOB_STORE_ID: storeId,
    });
  }

  if (!dependencies.resolveOidcToken) {
    throw new Error('naver_news_vercel_cron_runtime_unavailable');
  }

  const resolved =
    (await dependencies.resolveOidcToken())?.trim();
  if (!resolved) {
    throw new Error('naver_news_vercel_cron_runtime_unavailable');
  }

  return Object.freeze({
    ...environment,
    VERCEL_OIDC_TOKEN: resolved,
    BLOB_STORE_ID: storeId,
  });
}

export async function handleNaverNewsVercelCronFallback(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsVercelCronFallbackDependencies = {},
): Promise<Response> {
  if (
    request.method !== 'GET'
    || new URL(request.url).search.length > 0
  ) {
    return failure(405, 'request_rejected');
  }

  const cronSecret =
    environment[NAVER_NEWS_VERCEL_CRON_SECRET_ENV]?.trim();
  if (
    !cronSecret
    || !isNaverNewsRecurringAuthorizationValid(
      request.headers.get('authorization'),
      cronSecret,
    )
    || request.headers.get('x-vercel-cron-schedule')
      !== NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE
  ) {
    return failure(403, 'request_rejected');
  }

  if (environment.VERCEL_ENV !== 'production') {
    return failure(503, 'runtime_unavailable');
  }

  let config: ReturnType<typeof readNaverNewsRecurringConfig>;
  try {
    config = readNaverNewsRecurringConfig(environment);
  } catch {
    return failure(503, 'config_rejected');
  }

  try {
    readNaverNewsShadowRecurringProtocol(environment);
  } catch {
    return failure(503, 'protocol_rejected');
  }

  let runtimeEnvironment:
    Readonly<Record<string, string | undefined>>;
  try {
    runtimeEnvironment = await resolveRuntimeEnvironment(
      environment,
      dependencies,
    );
  } catch {
    return failure(503, 'runtime_unavailable');
  }

  let result: NaverNewsShadowRecurringResult;
  try {
    result = await runNaverNewsShadowRecurringScheduler(
      runtimeEnvironment,
      `Bearer ${config.secret}`,
      dependencies,
    );
  } catch {
    return failure(502, 'dispatch_failed');
  }

  return Response.json(
    {
      ok: true,
      mode: NAVER_NEWS_VERCEL_CRON_FALLBACK_VERSION,
      trigger: 'vercel-cron-authenticated' as const,
      schedule: NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE,
      activationVersion: result.activationVersion,
      canonicalArtistId: result.protocol.canonicalArtistId,
      recurringVersion: result.recurring.recurringVersion,
      schedulerVersion: result.recurring.dispatch.schedulerVersion,
      slotStart: result.recurring.dispatch.slotStart,
      collectionKey: result.recurring.dispatch.collectionKey,
      status: result.recurring.dispatch.production.status,
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
