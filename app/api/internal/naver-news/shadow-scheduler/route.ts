import 'server-only';
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { observeNaverNewsDispatchStage } from '@/lib/server/ingestion/naverNewsDispatchDiagnostics';

import {
  readNaverNewsShadowRecurringProtocol,
  runNaverNewsShadowRecurringScheduler,
  type NaverNewsShadowRecurringResult,
} from '@/lib/server/ingestion/naverNewsShadowRecurringScheduler';
import type { NaverNewsRecurringDependencies } from '@/lib/server/ingestion/naverNewsRecurringScheduler';
import {
  NAVER_NEWS_BLOB_MIRROR_MODE_ENV,
  NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE,
} from '@/lib/server/ingestion/naverNewsBlobMirrorRuntime';
import {
  isNaverNewsRecurringAuthorizationValid,
  readNaverNewsRecurringConfig,
} from '@/lib/server/ingestion/naverNewsRecurringSchedulerContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ShadowRecurringRouteDependencies = NaverNewsRecurringDependencies & Readonly<{
  resolveOidcToken?: () => string | undefined | Promise<string | undefined>;
}>;

type ShadowRecurringFailureClass =
  | 'config_rejected'
  | 'protocol_rejected'
  | 'authorization_rejected'
  | 'dispatch_failed';

async function resolveRuntimeBlobEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: ShadowRecurringRouteDependencies,
): Promise<Readonly<Record<string, string | undefined>>> {
  const mode = environment[NAVER_NEWS_BLOB_MIRROR_MODE_ENV]?.trim();
  if (mode !== NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE) return environment;

  const storeId = environment.BLOB_STORE_ID?.trim();
  if (!storeId) throw new Error('naver_news_blob_runtime_unavailable');

  const persistedOidcToken = environment.VERCEL_OIDC_TOKEN?.trim();
  if (persistedOidcToken) {
    return Object.freeze({
      ...environment,
      VERCEL_OIDC_TOKEN: persistedOidcToken,
      BLOB_STORE_ID: storeId,
    });
  }

  if (!dependencies.resolveOidcToken) {
    throw new Error('naver_news_blob_runtime_unavailable');
  }

  const resolvedOidcToken = (await dependencies.resolveOidcToken())?.trim();
  if (!resolvedOidcToken) {
    throw new Error('naver_news_blob_runtime_unavailable');
  }

  return Object.freeze({
    ...environment,
    VERCEL_OIDC_TOKEN: resolvedOidcToken,
    BLOB_STORE_ID: storeId,
  });
}

function rejected(errorClass: ShadowRecurringFailureClass): Response {
  // Log only the fixed class, never the caught error, request, or environment.
  // Observability must not change the rejection response or cause a retry.
  try {
    console.warn(`FANDEX_NAVER_RECURRING_ERROR_CLASS=${errorClass}`);
  } catch {
    // Preserve fail-closed behavior even when the logging sink is unavailable.
  }
  return Response.json(
    {
      ok: false,
      code: 'naver_news_shadow_recurring_scheduler_rejected',
      errorClass,
    },
    { status: 403 },
  );
}

export async function handleNaverNewsShadowRecurringSchedulerRequest(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: ShadowRecurringRouteDependencies = {},
): Promise<Response> {
  let config: ReturnType<typeof readNaverNewsRecurringConfig>;
  try {
    config = readNaverNewsRecurringConfig(environment);
  } catch {
    return rejected('config_rejected');
  }

  try {
    readNaverNewsShadowRecurringProtocol(environment);
  } catch {
    return rejected('protocol_rejected');
  }

  if (!isNaverNewsRecurringAuthorizationValid(
    request.headers.get('authorization'),
    config.secret,
  )) {
    return rejected('authorization_rejected');
  }

  let runtimeEnvironment: Readonly<Record<string, string | undefined>>;
  try {
    runtimeEnvironment = await observeNaverNewsDispatchStage('runtime_oidc',
      () => resolveRuntimeBlobEnvironment(environment, dependencies));
  } catch {
    return rejected('dispatch_failed');
  }

  try {
    const result: NaverNewsShadowRecurringResult = await runNaverNewsShadowRecurringScheduler(
      runtimeEnvironment,
      request.headers.get('authorization'),
      dependencies,
    );
    return Response.json({
      ok: true,
      mode: 'shadow-recurring-scheduler',
      activationVersion: result.activationVersion,
      canonicalArtistId: result.protocol.canonicalArtistId,
      query: result.protocol.query,
      display: result.protocol.display,
      recurringVersion: result.recurring.recurringVersion,
      schedulerVersion: result.recurring.dispatch.schedulerVersion,
      slotStart: result.recurring.dispatch.slotStart,
      collectionKey: result.recurring.dispatch.collectionKey,
      status: result.recurring.dispatch.production.status,
    });
  } catch {
    return rejected('dispatch_failed');
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleNaverNewsShadowRecurringSchedulerRequest(request, process.env, {
    resolveOidcToken: () => getVercelOidcToken(),
  });
}
