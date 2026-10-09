import { getVercelOidcToken } from '@vercel/functions/oidc';
import {
  createNaverNewsBlobReadStageTimer,
} from './naverNewsBlobReadStageTiming';

import {
  getArtistProductVariableRealReadModel,
  type ProductVariableRealReadRuntime,
} from '../../product/queries/getArtistProductVariableRealReadModel';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
} from '../ingestion/naverNewsIssuePointFrozenMethodology';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
} from '../ingestion/naverNewsShadowFirstSeenSeries';
import {
  resolveLatestOfficialNaverNewsShadowThroughSlotStart,
} from '../ingestion/naverNewsLatestOfficialShadowSlot';
import {
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
  MAX_CONCURRENT_MIRROR_CANONICAL_READS,
  MAX_CONCURRENT_MIRROR_EVIDENCE_READS,
  type NaverNewsMirrorCanonicalReadPhaseStats,
  type NaverNewsMirrorReadConcurrency,
} from '../ingestion/naverNewsStoredEvidenceMirror';
import {
  createProductionNaverNewsBlobEvidenceReadStore,
} from '../ingestion/naverNewsBlobMirrorRuntime';
import type {
  ImmutableTextObjectStore,
} from '../storage/immutableTextObjectStore';

export const NAVER_NEWS_ISSUE_POINT_BLOB_RUNTIME_READ_VERSION =
  'naver-news-issue-point-blob-runtime-read-v1' as const;

export const FANDEX_PRODUCT_RUNTIME_ENV =
  'FANDEX_PRODUCT_RUNTIME_ENV' as const;

export const FANDEX_NAVER_NEWS_VERCEL_PROJECT_ID =
  'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const;
export const FANDEX_NAVER_NEWS_VERCEL_TEAM_ID =
  'team_OrRPxuBxMwCYU3kk0r76AfOs' as const;

function isProductionRuntime(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  return (
    environment[FANDEX_PRODUCT_RUNTIME_ENV]?.trim() === 'production'
    || environment.VERCEL_ENV?.trim() === 'production'
    || environment.VERCEL_TARGET_ENV?.trim() === 'production'
  );
}

type ReadOnlyStore = Pick<
  ImmutableTextObjectStore,
  'readText' | 'listPathnames'
>;

let cachedProjectOidc:
  | Readonly<{
      token: string;
      expiresAtMs: number;
    }>
  | null = null;

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function jwtExpiryMs(token: string): number | null {
  try {
    const segments = token.split('.');
    if (segments.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(segments[1] ?? '', 'base64url').toString('utf8'),
    ) as { exp?: unknown };
    return typeof payload.exp === 'number'
      && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
}

function resolveExactVercelBinding(
  environment: Readonly<Record<string, string | undefined>>,
): Readonly<{
  projectId: typeof FANDEX_NAVER_NEWS_VERCEL_PROJECT_ID;
  teamId: typeof FANDEX_NAVER_NEWS_VERCEL_TEAM_ID;
}> {
  const projectId =
    clean(environment.FANDEX_VERCEL_PROJECT_ID)
    ?? clean(environment.VERCEL_PROJECT_ID)
    ?? FANDEX_NAVER_NEWS_VERCEL_PROJECT_ID;
  const teamId =
    clean(environment.FANDEX_VERCEL_TEAM_ID)
    ?? clean(environment.VERCEL_TEAM_ID)
    ?? FANDEX_NAVER_NEWS_VERCEL_TEAM_ID;

  if (projectId !== FANDEX_NAVER_NEWS_VERCEL_PROJECT_ID) {
    throw new Error('naver_news_blob_runtime_vercel_project_binding_invalid');
  }
  if (teamId !== FANDEX_NAVER_NEWS_VERCEL_TEAM_ID) {
    throw new Error('naver_news_blob_runtime_vercel_team_binding_invalid');
  }

  return Object.freeze({
    projectId: FANDEX_NAVER_NEWS_VERCEL_PROJECT_ID,
    teamId: FANDEX_NAVER_NEWS_VERCEL_TEAM_ID,
  });
}

export async function mintNaverNewsVercelProjectOidcToken(
  environment: Readonly<Record<string, string | undefined>>,
): Promise<string | undefined> {
  const accessToken = clean(environment.VERCEL_TOKEN);
  if (!accessToken) return undefined;

  const { projectId, teamId } =
    resolveExactVercelBinding(environment);

  const now = Date.now();
  if (
    cachedProjectOidc
    && cachedProjectOidc.expiresAtMs > now + 60_000
  ) {
    return cachedProjectOidc.token;
  }
  const url = new URL(
    `https://api.vercel.com/v1/projects/${encodeURIComponent(
      projectId,
    )}/token`,
  );
  url.searchParams.set('teamId', teamId);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'fandex:naver-news-product-runtime-read-v1',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `naver_news_blob_runtime_project_oidc_mint_failed:${response.status}`,
    );
  }

  const payload = await response.json() as { token?: unknown };
  const token =
    typeof payload.token === 'string'
      ? payload.token.trim()
      : '';

  if (token.length < 32 || /\s/.test(token)) {
    throw new Error(
      'naver_news_blob_runtime_project_oidc_response_invalid',
    );
  }

  cachedProjectOidc = Object.freeze({
    token,
    expiresAtMs:
      jwtExpiryMs(token) ?? (now + 5 * 60_000),
  });

  return token;
}

export async function resolveNaverNewsRuntimeOidcToken(
  environment: Readonly<Record<string, string | undefined>>,
  resolveVercelNativeOidcToken: () =>
    string | undefined | Promise<string | undefined> =
      () => getVercelOidcToken(),
): Promise<string | undefined> {
  try {
    const vercelOidc = clean(
      await resolveVercelNativeOidcToken(),
    );
    if (vercelOidc) return vercelOidc;
  } catch {
    // Non-Vercel hosts can throw before returning an OIDC token.
    // Fall through to the verified project-scoped mint path.
  }

  return mintNaverNewsVercelProjectOidcToken(environment);
}

export type NaverNewsIssuePointBlobRuntimeDependencies =
  Readonly<{
    createReadStore?: (
      environment: Readonly<Record<string, string | undefined>>,
    ) => ReadOnlyStore;
    resolveOidcToken?: () =>
      string | undefined | Promise<string | undefined>;
  }>;

async function runtimeEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
  resolveOidcToken: () =>
    string | undefined | Promise<string | undefined>,
): Promise<Readonly<Record<string, string | undefined>>> {
  if (environment.BLOB_READ_WRITE_TOKEN?.trim()) {
    return environment;
  }

  const storeId =
    environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID?.trim()
    || environment.BLOB_STORE_ID?.trim();
  if (!storeId) {
    throw new Error('naver_news_blob_runtime_store_missing');
  }

  const existingOidc = environment.VERCEL_OIDC_TOKEN?.trim();
  if (existingOidc) {
    return Object.freeze({
      ...environment,
      BLOB_STORE_ID: storeId,
      VERCEL_OIDC_TOKEN: existingOidc,
    });
  }

  const oidcToken = (await resolveOidcToken())?.trim();
  if (!oidcToken) {
    throw new Error('naver_news_blob_runtime_oidc_missing');
  }

  return Object.freeze({
    ...environment,
    BLOB_STORE_ID: storeId,
    VERCEL_OIDC_TOKEN: oidcToken,
  });
}

function diagnostic(reason: string): void {
  console.warn(
    `FANDEX_NAVER_NEWS_BLOB_RUNTIME_DIAGNOSTIC=${reason}`,
  );
}

function runtime(
  store: ReadOnlyStore,
  stageTimer: ReturnType<typeof createNaverNewsBlobReadStageTimer>,
  emitCanonicalReadPhases: boolean,
  canonicalReadConcurrency: NaverNewsMirrorReadConcurrency,
): ProductVariableRealReadRuntime {
  return Object.freeze({
    async readNewsIssuePointFrozenMethodology(input) {
      const repository =
        createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
          store,
          {
            // The metadata-only diagnostic flag never changes the worker cap.
            // Explicit Production opt-in is resolved separately at the entry.
            maxConcurrentReads: canonicalReadConcurrency,
            ...(emitCanonicalReadPhases
              ? {
                  onBatchReadPhaseStats: (
                    record: NaverNewsMirrorCanonicalReadPhaseStats
                  ) => console.info(
                    'FANDEX_NAVER_NEWS_BLOB_CANONICAL_READ_PHASE='
                      + JSON.stringify(record),
                  ),
                }
              : {}),
          },
        );
      const profiledRepository = Object.freeze({
        ...repository,
        ...(repository.readJobEvidenceBatch
          ? {
              readJobEvidenceBatch: (jobIds: readonly string[]) =>
                stageTimer.measure(
                  'canonical-evidence-batch',
                  () => repository.readJobEvidenceBatch!(jobIds),
                ),
            }
          : {}),
      });
      let series;
      try {
        series = await stageTimer.measure(
          'series-assembly',
          () => assembleOfficialNaverNewsShadowFirstSeenSeries(
            {
              canonicalArtistId: input.canonicalArtistId,
              throughSlotStart: input.throughSlotStart,
            },
            profiledRepository,
          ),
        );
      } catch {
        diagnostic('canonical-evidence-read-failed');
        throw new Error('naver_news_blob_canonical_evidence_read_failed');
      }
      try {
        return await stageTimer.measure(
          'methodology-evaluation',
          () => evaluateNaverNewsIssuePointFrozenMethodology(series),
        );
      } catch {
        diagnostic('methodology-evaluation-failed');
        throw new Error('naver_news_blob_methodology_evaluation_failed');
      }
    },
  });
}

export async function getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
  environment: Readonly<Record<string, string | undefined>> =
    process.env,
  dependencies: NaverNewsIssuePointBlobRuntimeDependencies = {},
) {
  const stageTimingEnabled =
    isProductionRuntime(environment)
    && environment.FANDEX_NAVER_NEWS_STAGE_TIMINGS?.trim() === '1';
  // Fail closed to the original eight-worker ceiling on all non-Production
  // runtimes, unset flags, and unexpected values. Diagnostics are independent.
  const canonicalReadConcurrency: NaverNewsMirrorReadConcurrency =
    isProductionRuntime(environment)
    && environment.FANDEX_NAVER_NEWS_CANONICAL_READ_CONCURRENCY?.trim() === '12'
      ? MAX_CONCURRENT_MIRROR_CANONICAL_READS
      : MAX_CONCURRENT_MIRROR_EVIDENCE_READS;
  const stageTimer = createNaverNewsBlobReadStageTimer({
    // Opt-in is required even on the Production host; no default log noise.
    enabled: stageTimingEnabled,
  });
  if (!isProductionRuntime(environment)) {
    diagnostic('production-runtime-gate-failed');
    return getArtistProductVariableRealReadModel(
      {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
        throughSlotStart: null,
      },
      Object.freeze({
        async readNewsIssuePointFrozenMethodology() {
          throw new Error(
            'naver_news_blob_runtime_not_production',
          );
        },
      }),
    );
  }

  let store: ReadOnlyStore;
  try {
    const resolvedEnvironment = await stageTimer.measure(
      'credential-resolution',
      () => runtimeEnvironment(
        environment,
        dependencies.resolveOidcToken
          ?? (() => resolveNaverNewsRuntimeOidcToken(environment)),
      ),
    );
    store = await stageTimer.measure(
      'store-initialization',
      () => (
        dependencies.createReadStore
        ?? createProductionNaverNewsBlobEvidenceReadStore
      )(resolvedEnvironment),
    );
  } catch {
    diagnostic('blob-store-init-failed');
    return getArtistProductVariableRealReadModel(
      {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
        throughSlotStart: null,
      },
      Object.freeze({
        async readNewsIssuePointFrozenMethodology() {
          throw new Error(
            'naver_news_blob_runtime_unavailable',
          );
        },
      }),
    );
  }

  const profiledStore = Object.freeze({
    readText: (pathname: string) => store.readText(pathname),
    listPathnames: (prefix: string) =>
      stageTimer.measure(
        'manifest-list',
        () => store.listPathnames(prefix),
      ),
  });
  const latestRepository =
    createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
      profiledStore,
    );
  const profiledLatestRepository = Object.freeze({
    readSucceededSchedulerJobs: () =>
      stageTimer.measure(
        'manifest-load',
        () => latestRepository.readSucceededSchedulerJobs(),
      ),
  });
  const latest = await stageTimer.measure(
    'latest-slot-resolution',
    () => resolveLatestOfficialNaverNewsShadowThroughSlotStart(
      profiledLatestRepository,
    ),
  );
  if (latest.status !== 'ok') {
    diagnostic(latest.reason);
  }
  const throughSlotStart =
    latest.status === 'ok' ? latest.throughSlotStart : null;

  return getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart,
    },
    runtime(store, stageTimer, stageTimingEnabled, canonicalReadConcurrency),
  );
}
