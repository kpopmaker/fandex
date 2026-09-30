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
export const preferredRegion = 'sin1';
export const dynamic = 'force-dynamic';

type ShadowRecurringRouteDependencies = NaverNewsRecurringDependencies & Readonly<{
  resolveOidcToken?: () => string | undefined | Promise<string | undefined>;
  requireTrustedRequestSource?: boolean;
}>;

type ShadowRecurringFailureClass =
  | 'config_rejected'
  | 'protocol_rejected'
  | 'authorization_rejected'
  | 'dispatch_failed';

type RuntimeRegionClass = 'sin1' | 'iad1' | 'other' | 'missing';
type RequestSourceClass =
  | 'github_actions_hourly_v1'
  | 'github_actions_manual_v1'
  | 'vercel_cron'
  | 'vercel_signed_service'
  | 'github_webhook'
  | 'node_client'
  | 'python_requests'
  | 'browser'
  | 'curl_unmarked'
  | 'other'
  | 'missing';

export function classifyNaverNewsRequestSource(request: Request): RequestSourceClass {
  const marker = request.headers.get('x-fandex-scheduler-source')?.trim();
  if (marker === 'github-actions-hourly-v1') return 'github_actions_hourly_v1';
  if (marker === 'github-actions-manual-v1') return 'github_actions_manual_v1';

  const userAgent = request.headers.get('user-agent')?.trim().toLowerCase();
  if (!userAgent) return 'missing';
  if (userAgent.startsWith('vercel-cron/')) return 'vercel_cron';
  if (request.headers.has('x-vercel-signature')) return 'vercel_signed_service';
  if (userAgent.startsWith('github-hookshot/')) return 'github_webhook';
  if (
    userAgent === 'node'
    || userAgent.startsWith('node/')
    || userAgent.startsWith('undici')
    || userAgent.startsWith('axios/')
  ) return 'node_client';
  if (userAgent.startsWith('python-requests/')) return 'python_requests';
  if (userAgent.startsWith('mozilla/')) return 'browser';
  if (userAgent.startsWith('curl/')) return 'curl_unmarked';
  return 'other';
}

function observeNaverNewsRequestSource(request: Request): RequestSourceClass {
  const sourceClass = classifyNaverNewsRequestSource(request);
  try {
    console.info(`FANDEX_NAVER_REQUEST_SOURCE_CLASS=${sourceClass}`);
  } catch {
    // Request-source evidence must never alter request execution.
  }
  return sourceClass;
}

function isTrustedNaverNewsRequestSource(sourceClass: RequestSourceClass): boolean {
  return sourceClass === 'github_actions_hourly_v1'
    || sourceClass === 'github_actions_manual_v1';
}

export function classifyNaverNewsRuntimeRegion(value: string | undefined): RuntimeRegionClass {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'missing';
  if (normalized === 'sin1' || normalized === 'iad1') return normalized;
  return 'other';
}

function observeNaverNewsRuntimeRegion(value: string | undefined): void {
  const regionClass = classifyNaverNewsRuntimeRegion(value);
  try {
    console.info(`FANDEX_NAVER_RUNTIME_REGION_CLASS=${regionClass}`);
  } catch {
    // Region evidence must never alter request execution.
  }
}

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

  const requestSourceClass = observeNaverNewsRequestSource(request);
  if (
    dependencies.requireTrustedRequestSource
    && !isTrustedNaverNewsRequestSource(requestSourceClass)
  ) {
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
  observeNaverNewsRuntimeRegion(process.env.VERCEL_REGION);
  return handleNaverNewsShadowRecurringSchedulerRequest(request, process.env, {
    resolveOidcToken: () => getVercelOidcToken(),
    requireTrustedRequestSource: true,
  });
}
