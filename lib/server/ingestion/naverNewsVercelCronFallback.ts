import {
  NAVER_NEWS_BLOB_ONLY_COLLECTION_STAGE_VERSION,
  runNaverNewsBlobOnlyCollectionStage,
  type NaverNewsBlobOnlyCollectionStageSummary,
} from './naverNewsBlobOnlyCollectionStage';
import {
  readNaverNewsRecurringConfig,
  isNaverNewsRecurringAuthorizationValid,
} from './naverNewsRecurringSchedulerContracts';
import {
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
  finalizeNaverNewsStoredEvidenceMirrorByJobId,
} from './naverNewsStoredEvidenceMirror';
import {
  buildNaverNewsSchedulerPlan,
} from './naverNewsScheduler';
import {
  buildNaverNewsJobIdentity,
  canonicalJson,
} from './naverNewsContracts';
import type {
  NaverNewsSucceededSchedulerJob,
} from './naverNewsLatestOfficialShadowSlot';
import {
  readNaverNewsShadowRecurringProtocol,
} from './naverNewsShadowRecurringScheduler';
import type {
  ImmutableTextObjectStore,
} from '../storage/immutableTextObjectStore';

export const NAVER_NEWS_VERCEL_CRON_FALLBACK_VERSION =
  'naver-news-vercel-cron-blob-only-fallback-v2' as const;
export const NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE =
  '17 * * * *' as const;
export const NAVER_NEWS_VERCEL_CRON_HOBBY_DAILY_SCHEDULES =
  Object.freeze(
    Array.from(
      { length: 24 },
      (_, hour) => `17 ${hour} * * *`,
    ),
  );
export const NAVER_NEWS_VERCEL_CRON_SECRET_ENV =
  'CRON_SECRET' as const;

type FailureClass =
  | 'request_rejected'
  | 'config_rejected'
  | 'protocol_rejected'
  | 'runtime_unavailable'
  | 'preflight_failed'
  | 'collection_stage_failed'
  | 'manifest_finalize_failed';

export type NaverNewsVercelCronFallbackDependencies = Readonly<{
  resolveOidcToken?:
    () => string | undefined | Promise<string | undefined>;
  createStore(
    environment: Readonly<Record<string, string | undefined>>,
  ): ImmutableTextObjectStore;
  runStage?: typeof runNaverNewsBlobOnlyCollectionStage;
  finalizeManifest?: typeof finalizeNaverNewsStoredEvidenceMirrorByJobId;
  readSucceededSchedulerJobs?: (
    store: ImmutableTextObjectStore,
  ) => Promise<readonly NaverNewsSucceededSchedulerJob[]>;
  now?: () => Date;
}>;

function isAcceptedDeliverySchedule(value: string | null): boolean {
  if (value === NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE) {
    return true;
  }
  return value !== null
    && NAVER_NEWS_VERCEL_CRON_HOBBY_DAILY_SCHEDULES.includes(value);
}

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
  const storeId =
    environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID?.trim()
    || environment.BLOB_STORE_ID?.trim();
  if (!storeId) {
    throw new Error('naver_news_vercel_cron_runtime_unavailable');
  }

  const persistedOidcToken =
    environment.VERCEL_OIDC_TOKEN?.trim();
  let oidcToken = persistedOidcToken;

  if (!oidcToken) {
    if (!dependencies.resolveOidcToken) {
      throw new Error('naver_news_vercel_cron_runtime_unavailable');
    }
    oidcToken = (await dependencies.resolveOidcToken())?.trim();
  }

  if (!oidcToken) {
    throw new Error('naver_news_vercel_cron_runtime_unavailable');
  }

  return Object.freeze({
    ...environment,
    VERCEL_OIDC_TOKEN: oidcToken,
    ...(environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID?.trim()
      ? {}
      : { BLOB_STORE_ID: storeId }),
  });
}

type NaverNewsVercelCronFallbackSuccess = Readonly<{
  runStatus: 'collected-and-finalized' | 'already-finalized';
  contractVersion: typeof NAVER_NEWS_BLOB_ONLY_COLLECTION_STAGE_VERSION;
  schedulerVersion: NaverNewsBlobOnlyCollectionStageSummary['schedulerVersion'];
  slotStart: string;
  collectionKey: string;
  jobId: string;
  resultSha256: string | null;
  stagedObjectStatus:
    | NaverNewsBlobOnlyCollectionStageSummary['stagedObjectStatus']
    | null;
  counts: NaverNewsBlobOnlyCollectionStageSummary['counts'] | null;
  providerCalls: 0 | 1;
  databaseWrites: 0;
}>;

function success(
  summary: NaverNewsVercelCronFallbackSuccess,
): Response {
  return Response.json(
    {
      ok: true,
      mode: NAVER_NEWS_VERCEL_CRON_FALLBACK_VERSION,
      trigger: 'vercel-cron-authenticated' as const,
      schedule: NAVER_NEWS_VERCEL_CRON_FALLBACK_SCHEDULE,
      ...summary,
      schedulerManifestFinalized: true as const,
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

export async function handleNaverNewsVercelCronFallback(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsVercelCronFallbackDependencies,
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
    || !isAcceptedDeliverySchedule(
      request.headers.get('x-vercel-cron-schedule'),
    )
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

  let protocol: ReturnType<typeof readNaverNewsShadowRecurringProtocol>;
  try {
    protocol = readNaverNewsShadowRecurringProtocol(environment);
  } catch {
    return failure(503, 'protocol_rejected');
  }

  if (
    protocol.query !== config.query
    || protocol.display !== config.display
  ) {
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

  let store: ImmutableTextObjectStore;
  try {
    store = dependencies.createStore(runtimeEnvironment);
  } catch {
    return failure(503, 'runtime_unavailable');
  }

  const now = dependencies.now ?? (() => new Date());
  let instant: Date;
  try {
    instant = now();
  } catch {
    return failure(502, 'preflight_failed');
  }

  let schedulerPlan: ReturnType<typeof buildNaverNewsSchedulerPlan>;
  let expectedIdentity: ReturnType<typeof buildNaverNewsJobIdentity>;
  try {
    schedulerPlan = buildNaverNewsSchedulerPlan({
      query: config.query,
      display: config.display,
      at: instant,
    });
    expectedIdentity = buildNaverNewsJobIdentity(schedulerPlan.command);
  } catch {
    return failure(502, 'preflight_failed');
  }

  try {
    const readSucceededSchedulerJobs =
      dependencies.readSucceededSchedulerJobs
      ?? ((candidateStore: ImmutableTextObjectStore) =>
        createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
          candidateStore,
        ).readSucceededSchedulerJobs());
    const jobs = await readSucceededSchedulerJobs(store);
    const currentOfficialJob = jobs.find((job) =>
      job.collectionKey === schedulerPlan.collectionKey
    );
    if (currentOfficialJob) {
      if (
        currentOfficialJob.jobId !== expectedIdentity.jobId
        || canonicalJson(currentOfficialJob.requestContract)
          !== canonicalJson(expectedIdentity.request)
      ) {
        return failure(502, 'preflight_failed');
      }
      return success(Object.freeze({
        runStatus: 'already-finalized' as const,
        contractVersion: NAVER_NEWS_BLOB_ONLY_COLLECTION_STAGE_VERSION,
        schedulerVersion: schedulerPlan.schedulerVersion,
        slotStart: schedulerPlan.slotStart,
        collectionKey: schedulerPlan.collectionKey,
        jobId: currentOfficialJob.jobId,
        resultSha256: null,
        stagedObjectStatus: null,
        counts: null,
        providerCalls: 0 as const,
        databaseWrites: 0 as const,
      }));
    }
  } catch {
    return failure(502, 'preflight_failed');
  }

  const runStage =
    dependencies.runStage ?? runNaverNewsBlobOnlyCollectionStage;
  let result: NaverNewsBlobOnlyCollectionStageSummary;
  try {
    result = await runStage(
      {
        query: config.query,
        display: config.display,
        environment: runtimeEnvironment,
      },
      {
        store,
        now: () => instant,
      },
    );
  } catch {
    return failure(502, 'collection_stage_failed');
  }

  const finalizeManifest = dependencies.finalizeManifest
    ?? finalizeNaverNewsStoredEvidenceMirrorByJobId;
  try {
    const finalized = await finalizeManifest(
      result.jobId,
      result.resultSha256,
      store,
    );
    if (finalized.schedulerManifest === null) {
      return failure(502, 'manifest_finalize_failed');
    }
  } catch {
    return failure(502, 'manifest_finalize_failed');
  }

  return success(Object.freeze({
    runStatus: 'collected-and-finalized' as const,
    contractVersion: result.contractVersion,
    schedulerVersion: result.schedulerVersion,
    slotStart: result.slotStart,
    collectionKey: result.collectionKey,
    jobId: result.jobId,
    resultSha256: result.resultSha256,
    stagedObjectStatus: result.stagedObjectStatus,
    counts: result.counts,
    providerCalls: 1 as const,
    databaseWrites: result.safety.databaseWrites,
  }));
}
