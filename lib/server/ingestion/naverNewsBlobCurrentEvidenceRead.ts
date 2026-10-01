import type {
  ImmutableTextObjectStore,
} from '../storage/immutableTextObjectStore';
import {
  evaluateNaverNewsBlobCurrentEvidenceCoverage,
  projectNaverBlobCoverageToMomentumCurrentEvidence,
} from './naverNewsBlobCurrentEvidenceCoverage';
import {
  isNaverNewsRecurringAuthorizationValid,
} from './naverNewsRecurringSchedulerContracts';

export const NAVER_NEWS_BLOB_CURRENT_EVIDENCE_READ_ID =
  'ops-momentum-blob-current-evidence-read-20261001-v1' as const;
export const NAVER_NEWS_BLOB_CURRENT_EVIDENCE_SOURCE =
  'github-actions-manual-v1' as const;
export const NAVER_NEWS_BLOB_CURRENT_EVIDENCE_MODE =
  'momentum-naver-blob-current-evidence-read' as const;

type ReadOnlyObjectStore = Pick<
  ImmutableTextObjectStore,
  'readText' | 'listPathnames'
>;

type ErrorClass =
  | 'request_rejected'
  | 'runtime_unavailable'
  | 'coverage_failed';

export type NaverNewsBlobCurrentEvidenceReadDependencies =
  Readonly<{
    resolveOidcToken?:
      () => string | undefined | Promise<string | undefined>;
    createReadStore(
      environment: Readonly<Record<string, string | undefined>>,
    ): ReadOnlyObjectStore;
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
      mode: NAVER_NEWS_BLOB_CURRENT_EVIDENCE_MODE,
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

function storeId(
  environment: Readonly<Record<string, string | undefined>>,
): string | null {
  return (
    environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID?.trim()
    || environment.BLOB_STORE_ID?.trim()
    || null
  );
}

export async function handleNaverNewsBlobCurrentEvidenceRead(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsBlobCurrentEvidenceReadDependencies,
): Promise<Response> {
  if (request.method !== 'POST') {
    return failed(405, 'request_rejected');
  }
  if (new URL(request.url).search || !await hasEmptyBody(request)) {
    return failed(400, 'request_rejected');
  }

  if (
    request.headers.get('x-fandex-momentum-blob-current-evidence-id')
      !== NAVER_NEWS_BLOB_CURRENT_EVIDENCE_READ_ID
    || request.headers.get('x-fandex-scheduler-source')
      !== NAVER_NEWS_BLOB_CURRENT_EVIDENCE_SOURCE
    || !isNaverNewsRecurringAuthorizationValid(
      request.headers.get('authorization'),
      environment.FANDEX_NAVER_NEWS_SCHEDULER_SECRET ?? '',
    )
  ) {
    return failed(403, 'request_rejected');
  }

  const configuredStoreId = storeId(environment);
  if (
    environment.VERCEL_ENV !== 'production'
    || !configuredStoreId
  ) {
    return failed(503, 'runtime_unavailable');
  }

  let oidcToken = environment.VERCEL_OIDC_TOKEN?.trim();
  if (!oidcToken && dependencies.resolveOidcToken) {
    try {
      oidcToken = (await dependencies.resolveOidcToken())?.trim();
    } catch {
      return failed(503, 'runtime_unavailable');
    }
  }
  if (!oidcToken) {
    return failed(503, 'runtime_unavailable');
  }

  const runtimeEnvironment = Object.freeze({
    ...environment,
    VERCEL_OIDC_TOKEN: oidcToken,
    ...(environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID?.trim()
      ? {}
      : { BLOB_STORE_ID: configuredStoreId }),
  });

  let store: ReadOnlyObjectStore;
  try {
    store = dependencies.createReadStore(runtimeEnvironment);
  } catch {
    return failed(503, 'runtime_unavailable');
  }

  try {
    const coverage =
      await evaluateNaverNewsBlobCurrentEvidenceCoverage(
        {
          canonicalArtistId: 'iu',
          ...(dependencies.now
            ? { now: dependencies.now() }
            : {}),
        },
        store,
      );
    const momentumProjection =
      projectNaverBlobCoverageToMomentumCurrentEvidence(coverage);

    return Response.json(
      {
        ok: true,
        mode: NAVER_NEWS_BLOB_CURRENT_EVIDENCE_MODE,
        contractVersion: coverage.contractVersion,
        canonicalArtistId: coverage.canonicalArtistId,
        exactOfficialProtocol: coverage.exactOfficialProtocol,
        evidenceSource: coverage.evidenceSource,
        schedulerCompletionClaimed:
          coverage.schedulerCompletionClaimed,
        protocolStart: coverage.protocolStart,
        throughSlotStart: coverage.throughSlotStart,
        latestStagedJobId: coverage.latestStagedJobId,
        latestStagedCollectionKey:
          coverage.latestStagedCollectionKey,
        latestStagedJobValidated:
          coverage.latestStagedJobValidated,
        seriesStatus: coverage.seriesStatus,
        expectedSlotCount: coverage.expectedSlotCount,
        reproducedSnapshotCount:
          coverage.reproducedSnapshotCount,
        missingSlotCount: coverage.missingSlotCount,
        firstMissingSlotStart: coverage.firstMissingSlotStart,
        firstMissingJobId: coverage.firstMissingJobId,
        currentStoredEvidenceReproducedForReadiness:
          coverage.currentStoredEvidenceReproducedForReadiness,
        momentumProjection,
        databaseReads: coverage.databaseReads,
        databaseWrites: coverage.databaseWrites,
        blobWrites: coverage.blobWrites,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      },
    );
  } catch {
    return failed(502, 'coverage_failed');
  }
}
