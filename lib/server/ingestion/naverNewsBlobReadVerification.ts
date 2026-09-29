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
const check = (condition: unknown) => { if (!condition) throw new ProbeFailure('integrity_failed'); };

function validJob(body: string, path: string) {
  const job = decodeJobEnvelope(body);
  check(path === `${JOB_PREFIX}${job.jobId}.json`);
  check(job.requestContract.query === '아이유 IU' && job.requestContract.display === 100);
  check(/^sched-v125-naver-news-\d{8}t\d{6}z-[0-9a-f]{12}$/.test(job.collectionKey));
  const parsed = JSON.parse(body);
  const { payloadDigest, ...payload } = parsed;
  check(payloadDigest === sha256Canonical(payload));
  check(isSha256(job.resultSha256));
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
    async function read(path: string) {
      try { return await reader.readText(path); }
      catch { throw new ProbeFailure('get_failed'); }
    }
    if (postManifests.length) {
      const selected = [...postManifests].sort((a, b) => b.pathname.localeCompare(a.pathname))[0];
      const body = await read(selected.pathname);
      check(body !== null);
      const manifest = decodeManifestEnvelope(body!);
      check(selected.pathname === `${MANIFEST_PREFIX}${manifest.collectionKey}/${manifest.jobId}.json`);
      check(manifest.jobObjectPath === `${JOB_PREFIX}${manifest.jobId}.json`);
      check(postJobs.some((row) => row.pathname === manifest.jobObjectPath));
      const jobBody = await read(manifest.jobObjectPath);
      check(jobBody !== null);
      const job = validJob(jobBody!, manifest.jobObjectPath);
      check(manifest.jobId === job.jobId && manifest.collectionKey === job.collectionKey);
      check(canonicalJson(manifest.requestContract) === canonicalJson(job.requestContract));
      check(manifest.jobPayloadDigest === job.payloadDigest);
      const { payloadDigest, ...payload } = JSON.parse(body!);
      check(payloadDigest === sha256Canonical(payload));
      return { ...base, ok: true, classification: 'POST_ACTIVATION_BLOB_MIRROR_VERIFIED', latest: {
        jobId: job.jobId, collectionKey: job.collectionKey, resultSha256: job.resultSha256,
        jobPayloadDigest: job.payloadDigest, manifestPayloadDigest: manifest.payloadDigest,
      } };
    }
    if (postJobs.length) {
      const selected = [...postJobs].sort((a, b) => b.uploadedAt - a.uploadedAt || b.pathname.localeCompare(a.pathname))[0];
      const body = await read(selected.pathname);
      check(body !== null);
      const job = validJob(body!, selected.pathname);
      const manifestPath = `${MANIFEST_PREFIX}${job.collectionKey}/${job.jobId}.json`;
      check(!manifests.some((row) => row.pathname === manifestPath));
      // A finalize racing the inventory is ambiguous, never a stage-only success.
      check(await read(manifestPath) === null);
      return { ...base, ok: true, classification: 'POST_ACTIVATION_JOB_STAGED_BUT_NOT_FINALIZED', latest: {
        jobId: job.jobId, collectionKey: job.collectionKey, resultSha256: job.resultSha256,
        jobPayloadDigest: job.payloadDigest,
      } };
    }
    return { ...base, ok: true, classification: 'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND' };
  } catch (error) {
    return { ...base, ok: false, classification: 'POST_ACTIVATION_BLOB_READ_FAILED',
      errorClass: error instanceof ProbeFailure ? error.errorClass : phase };
  }
}

export type BlobProbeDependencies = Readonly<{
  createReader(environment: Readonly<Record<string, string | undefined>>): BlobVerificationReader;
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
  if (environment.VERCEL_ENV !== 'production' || !environment.VERCEL_OIDC_TOKEN?.trim()
    || !environment.BLOB_STORE_ID?.trim()) return failed(503, 'runtime_unavailable');
  try {
    const result = await verifyNaverBlobSnapshot(dependencies.createReader(environment), observationCutoffAt);
    return Response.json(result, { status: result.ok ? 200 : 502, headers });
  } catch { return failed(503, 'runtime_unavailable'); }
}
