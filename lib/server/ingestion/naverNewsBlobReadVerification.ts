import { canonicalJson, isSha256, sha256Canonical } from './naverNewsContracts';
import {
  decodeJobEnvelope, decodeManifestEnvelope,
  NAVER_NEWS_MIRROR_JOB_PREFIX as JOB_PREFIX,
  NAVER_NEWS_MIRROR_MANIFEST_PREFIX as MANIFEST_PREFIX,
} from './naverNewsStoredEvidenceMirror';
import { isNaverNewsRecurringAuthorizationValid } from './naverNewsRecurringSchedulerContracts';

export const BLOB_READ_EXECUTION_ID = 'ops-naver-blob-read-verification-20260929-v1';
export const BLOB_READ_MODE = 'naver-production-blob-read-verification';
export const BLOB_READ_ACTIVATION_READY = '2026-09-29T00:22:42.680Z';
export const BLOB_READ_CLASSIFICATIONS = [
  'POST_ACTIVATION_BLOB_MIRROR_VERIFIED',
  'POST_ACTIVATION_JOB_STAGED_BUT_NOT_FINALIZED',
  'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND',
  'POST_ACTIVATION_BLOB_READ_FAILED',
] as const;
type Classification = typeof BLOB_READ_CLASSIFICATIONS[number];
type ErrorClass = 'request_rejected' | 'runtime_unavailable' | 'list_failed' | 'get_failed' | 'integrity_failed';
export type BlobReadMetadata = Readonly<{ pathname: string; uploadedAt: number }>;
export type BlobVerificationReader = Readonly<{
  list(prefix: string): Promise<readonly BlobReadMetadata[]>;
  readText(path: string): Promise<string | null>;
}>;
export type BlobReadResult = Readonly<{
  ok: boolean;
  mode: typeof BLOB_READ_MODE;
  classification: Classification;
  observationCutoffAt: string;
  errorClass?: ErrorClass;
  latest?: Readonly<{
    jobId: string; collectionKey: string; resultSha256: string;
    jobPayloadDigest: string; manifestPayloadDigest?: string;
  }>;
}>;
class ProbeFailure extends Error {
  constructor(readonly errorClass: ErrorClass) { super(errorClass); }
}
function check(condition: unknown): asserts condition {
  if (!condition) throw new ProbeFailure('integrity_failed');
}

const SCHEDULER_COLLECTION_KEY_PATTERN =
  /^sched-v125-naver-news-\d{8}t\d{6}z-[0-9a-f]{12}$/;

function parseJobPath(pathname: string): Readonly<{ jobId: string }> {
  check(pathname.startsWith(JOB_PREFIX));
  const match = /^([0-9a-f]{64})\.json$/.exec(pathname.slice(JOB_PREFIX.length));
  check(match);
  return Object.freeze({ jobId: match[1] });
}

function parseManifestPath(pathname: string): Readonly<{
  collectionKey: string;
  jobId: string;
  jobPath: string;
}> {
  check(pathname.startsWith(MANIFEST_PREFIX));
  const match = /^(sched-v125-naver-news-\d{8}t\d{6}z-[0-9a-f]{12})\/([0-9a-f]{64})\.json$/
    .exec(pathname.slice(MANIFEST_PREFIX.length));
  check(match);
  return Object.freeze({
    collectionKey: match[1],
    jobId: match[2],
    jobPath: `${JOB_PREFIX}${match[2]}.json`,
  });
}

function decodeTargetSchedulerJob(body: string, path: string) {
  const job = decodeJobEnvelope(body);
  check(path === `${JOB_PREFIX}${job.jobId}.json`);
  const parsed = JSON.parse(body);
  const { payloadDigest, ...payload } = parsed;
  check(payloadDigest === sha256Canonical(payload));
  check(isSha256(job.resultSha256));
  if (
    job.requestContract.query !== '아이유 IU'
    || job.requestContract.display !== 100
    || !SCHEDULER_COLLECTION_KEY_PATTERN.test(job.collectionKey)
  ) return null;
  return job;
}

export async function verifyNaverBlobSnapshot(
  reader: BlobVerificationReader, observationCutoffAt: string,
): Promise<BlobReadResult> {
  const base = { mode: BLOB_READ_MODE, observationCutoffAt } as const;
  let phase: ErrorClass = 'list_failed';
  try {
    const jobs = await reader.list(JOB_PREFIX);
    const manifests = await reader.list(MANIFEST_PREFIX);
    phase = 'integrity_failed';
    const cutoff = Date.parse(observationCutoffAt);
    const activation = Date.parse(BLOB_READ_ACTIVATION_READY);
    check(Number.isFinite(cutoff) && cutoff > activation);
    function postActivation(rows: readonly BlobReadMetadata[], prefix: string) {
      const seen = new Set<string>();
      for (const row of rows) {
        check(row.pathname.startsWith(prefix) && Number.isFinite(row.uploadedAt));
        check(!seen.has(row.pathname));
        seen.add(row.pathname);
      }
      return rows.filter((row) => row.uploadedAt > activation && row.uploadedAt <= cutoff);
    }
    const postJobs = postActivation(jobs, JOB_PREFIX);
    const postManifests = postActivation(manifests, MANIFEST_PREFIX);
    for (const row of postJobs) parseJobPath(row.pathname);
    const manifestRows = postManifests.map((row) => Object.freeze({
      ...row,
      ...parseManifestPath(row.pathname),
    }));
    const finalizedJobPaths = new Set(manifestRows.map((row) => row.jobPath));
    const unfinalizedJobs = postJobs.filter((row) => !finalizedJobPaths.has(row.pathname));

    async function read(path: string) {
      try { return await reader.readText(path); }
      catch { throw new ProbeFailure('get_failed'); }
    }
    const staged = (job: NonNullable<ReturnType<typeof decodeTargetSchedulerJob>>) =>
      ({ ...base, ok: true, classification: 'POST_ACTIVATION_JOB_STAGED_BUT_NOT_FINALIZED' as const,
        latest: {
          jobId: job.jobId, collectionKey: job.collectionKey, resultSha256: job.resultSha256,
          jobPayloadDigest: job.payloadDigest,
        } });

    if (manifestRows.length) {
      // A must never mask a newer target scheduler stage that has not finalized.
      // With the three-read budget, one unlinked job can be disambiguated safely;
      // more than one is ambiguous and fails closed instead of returning A.
      check(unfinalizedJobs.length <= 1);
      const selected = [...manifestRows].sort((a, b) =>
        b.collectionKey.localeCompare(a.collectionKey) || b.jobId.localeCompare(a.jobId))[0];
      const body = await read(selected.pathname);
      check(body !== null);
      const manifest = decodeManifestEnvelope(body);
      check(selected.collectionKey === manifest.collectionKey && selected.jobId === manifest.jobId);
      check(selected.pathname === `${MANIFEST_PREFIX}${manifest.collectionKey}/${manifest.jobId}.json`);
      check(manifest.jobObjectPath === `${JOB_PREFIX}${manifest.jobId}.json`);
      check(postJobs.some((row) => row.pathname === manifest.jobObjectPath));

      if (unfinalizedJobs.length === 1) {
        const candidateRow = unfinalizedJobs[0];
        const candidateBody = await read(candidateRow.pathname);
        check(candidateBody !== null);
        const candidate = decodeTargetSchedulerJob(candidateBody, candidateRow.pathname);
        if (candidate) {
          check(candidate.collectionKey !== manifest.collectionKey);
          if (candidate.collectionKey > manifest.collectionKey) {
            const candidateManifestPath =
              `${MANIFEST_PREFIX}${candidate.collectionKey}/${candidate.jobId}.json`;
            check(!manifests.some((row) => row.pathname === candidateManifestPath));
            // A finalize racing the inventory is ambiguous, never a stage-only success.
            check(await read(candidateManifestPath) === null);
            return staged(candidate);
          }
        }
      }

      const jobBody = await read(manifest.jobObjectPath);
      check(jobBody !== null);
      const job = decodeTargetSchedulerJob(jobBody, manifest.jobObjectPath);
      check(job !== null);
      check(manifest.jobId === job.jobId && manifest.collectionKey === job.collectionKey);
      check(canonicalJson(manifest.requestContract) === canonicalJson(job.requestContract));
      check(manifest.jobPayloadDigest === job.payloadDigest);
      const { payloadDigest, ...payload } = JSON.parse(body);
      check(payloadDigest === sha256Canonical(payload));
      return { ...base, ok: true, classification: 'POST_ACTIVATION_BLOB_MIRROR_VERIFIED', latest: {
        jobId: job.jobId, collectionKey: job.collectionKey, resultSha256: job.resultSha256,
        jobPayloadDigest: job.payloadDigest, manifestPayloadDigest: manifest.payloadDigest,
      } };
    }

    if (postJobs.length) {
      // Reserve one of the three reads for a direct manifest lookup so a
      // concurrent finalize can never be misclassified as stage-only.
      check(postJobs.length <= 2);
      const candidates = [];
      for (const row of postJobs) {
        const body = await read(row.pathname);
        check(body !== null);
        const candidate = decodeTargetSchedulerJob(body, row.pathname);
        if (candidate) candidates.push(candidate);
      }
      if (candidates.length) {
        const job = [...candidates].sort((a, b) =>
          b.collectionKey.localeCompare(a.collectionKey) || b.jobId.localeCompare(a.jobId))[0];
        const manifestPath = `${MANIFEST_PREFIX}${job.collectionKey}/${job.jobId}.json`;
        check(!manifests.some((row) => row.pathname === manifestPath));
        check(await read(manifestPath) === null);
        return staged(job);
      }
    }
    return { ...base, ok: true, classification: 'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND' };
  } catch (error) {
    return { ...base, ok: false, classification: 'POST_ACTIVATION_BLOB_READ_FAILED',
      errorClass: error instanceof ProbeFailure ? error.errorClass : phase };
  }
}

export type BlobProbeDependencies = Readonly<{
  createReader(environment: Readonly<Record<string, string | undefined>>): BlobVerificationReader;
  resolveOidcToken?: () => string | undefined | Promise<string | undefined>;
  now?: () => Date;
}>;

async function hasEmptyBody(request: Request): Promise<boolean> {
  if (request.body === null) return true;
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        for (let chunks = 0; chunks < 4; chunks++) {
          const chunk = await reader.read();
          if (chunk.done) return true;
          if (chunk.value.byteLength) return false;
        }
        return false;
      })(),
      new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 1000); }),
    ]);
  } catch { return false; }
  finally { clearTimeout(timer); void reader.cancel().catch(() => undefined); }
}

export async function handleNaverBlobReadVerification(
  request: Request, environment: Readonly<Record<string, string | undefined>>,
  dependencies: BlobProbeDependencies,
): Promise<Response> {
  const observationCutoffAt = (dependencies.now?.() ?? new Date()).toISOString();
  const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
  const failed = (status: number, errorClass: ErrorClass) => Response.json({
    ok: false, mode: BLOB_READ_MODE, classification: 'POST_ACTIVATION_BLOB_READ_FAILED',
    observationCutoffAt, errorClass,
  }, { status, headers: { ...headers, ...(status === 405 ? { Allow: 'POST' } : {}) } });
  if (request.method !== 'POST') return failed(405, 'request_rejected');
  if (request.headers.get('x-fandex-blob-read-verification-id') !== BLOB_READ_EXECUTION_ID
    || !isNaverNewsRecurringAuthorizationValid(request.headers.get('authorization'),
      environment.FANDEX_NAVER_NEWS_SCHEDULER_SECRET ?? '')) return failed(403, 'request_rejected');
  if (new URL(request.url).search || !await hasEmptyBody(request)) return failed(400, 'request_rejected');
  const storeId = environment.BLOB_STORE_ID?.trim();
  if (environment.VERCEL_ENV !== 'production' || !storeId) return failed(503, 'runtime_unavailable');

  let oidcToken = environment.VERCEL_OIDC_TOKEN?.trim();
  if (!oidcToken && dependencies.resolveOidcToken) {
    try {
      oidcToken = (await dependencies.resolveOidcToken())?.trim();
    } catch {
      return failed(503, 'runtime_unavailable');
    }
  }
  if (!oidcToken) return failed(503, 'runtime_unavailable');

  const runtimeEnvironment = Object.freeze({
    ...environment,
    VERCEL_OIDC_TOKEN: oidcToken,
    BLOB_STORE_ID: storeId,
  });
  try {
    const result = await verifyNaverBlobSnapshot(
      dependencies.createReader(runtimeEnvironment),
      observationCutoffAt,
    );
    return Response.json(result, { status: result.ok ? 200 : 502, headers });
  } catch { return failed(503, 'runtime_unavailable'); }
}
