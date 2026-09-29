import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { get, list } from '@vercel/blob';
import {
  buildNaverNewsJobIdentity, canonicalJson, isSha256, sha256Canonical,
} from '../../lib/server/ingestion/naverNewsContracts.ts';
import {
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
} from '../../lib/server/ingestion/naverNewsStoredEvidenceMirror.ts';
import { createVercelBlobImmutableTextObjectStore } from '../../lib/server/storage/vercelBlobImmutableTextObjectStore.ts';

export const BASE = '54bb0f0fcdbf6860893cc7fb9e4b021131348d71';
const PROJECT = 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
const TEAM = 'team_OrRPxuBxMwCYU3kk0r76AfOs';
const DEPLOYMENT = 'dpl_FLYKAKV7u7reTGsUzG7XC4BvHnZg';
// Confirmed against the merged source; the runtime source guard below fails on drift.
export const JOB_PREFIX = 'fandex/naver-news/stored-evidence-mirror/v1/jobs/';
export const MANIFEST_PREFIX = 'fandex/naver-news/stored-evidence-mirror/v1/scheduler-manifests/';
const denyWrite = async () => { throw new Error('read_only_write_denied'); };
class SafeVerificationError extends Error {}
function requireCheck(condition, code) { if (!condition) throw new SafeVerificationError(code); }

function readOnlyStore(readText, paths = []) {
  return { readText, listPathnames: async () => paths, putTextIfAbsent: denyWrite };
}

export async function validateJob(body, pathname) {
  const job = JSON.parse(body);
  requireCheck(isSha256(job.jobId), 'job_identity_invalid');
  requireCheck(pathname === `${JOB_PREFIX}${job.jobId}.json`, 'job_path_invalid');
  const stored = await createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
    readOnlyStore(async (path) => path === pathname ? body : null),
  ).readJobEvidence(job.jobId);
  requireCheck(stored !== null, 'job_decoder_failed');
  const identity = buildNaverNewsJobIdentity(job.requestContract);
  requireCheck(identity.jobId === job.jobId, 'job_identity_mismatch');
  requireCheck(job.collectionKey === identity.request.collectionKey, 'collection_key_mismatch');
  requireCheck(job.requestContract.query === '아이유 IU' && job.requestContract.display === 100,
    'official_iu_protocol_mismatch');
  const { payloadDigest, ...payload } = job;
  requireCheck(payloadDigest === sha256Canonical(payload), 'job_digest_mismatch');
  requireCheck(isSha256(job.resultSha256), 'result_sha_invalid');
  return job;
}

export async function validatePair(manifestBody, manifestPath, jobBody) {
  const manifest = JSON.parse(manifestBody);
  const expectedJobPath = `${JOB_PREFIX}${manifest.jobId}.json`;
  requireCheck(manifest.jobObjectPath === expectedJobPath, 'manifest_job_path_mismatch');
  requireCheck(manifestPath === `${MANIFEST_PREFIX}${manifest.collectionKey}/${manifest.jobId}.json`,
    'manifest_path_mismatch');
  await createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
    readOnlyStore(async () => manifestBody, [manifestPath]),
  ).readSucceededSchedulerJobs();
  const job = await validateJob(jobBody, expectedJobPath);
  requireCheck(manifest.jobId === job.jobId && manifest.collectionKey === job.collectionKey,
    'manifest_identity_mismatch');
  requireCheck(canonicalJson(manifest.requestContract) === canonicalJson(job.requestContract),
    'request_contract_mismatch');
  requireCheck(manifest.jobPayloadDigest === job.payloadDigest, 'linked_digest_mismatch');
  const { payloadDigest, ...payload } = manifest;
  requireCheck(payloadDigest === sha256Canonical(payload), 'manifest_digest_mismatch');
  return {
    jobId: job.jobId, collectionKey: job.collectionKey, requestContract: job.requestContract,
    resultSha256: job.resultSha256, jobPayloadDigest: manifest.jobPayloadDigest,
    schedulerManifestPayloadDigest: payloadDigest, jobEvidencePayloadDigest: job.payloadDigest,
    jobObjectPath: expectedJobPath, manifestObjectPath: manifestPath,
    normalizedRecordCount: job.storedEvidence.normalizedRecords.length,
    repositoryDecodersPassed: true, integrityPassed: true,
    resultSha256Verification: 'valid SHA256 bound by job digest and manifest; no independent DB/raw-plan comparison',
  };
}

export async function classifySnapshot(jobs, manifests, readText, since, until) {
  const bounded = (row) => {
    const t = Date.parse(row.uploadedAt);
    requireCheck(Number.isFinite(t), 'object_timestamp_invalid');
    return t > since && t <= until;
  };
  const postJobs = jobs.filter(bounded);
  const postManifests = manifests.filter(bounded);
  const counts = { allJobs: jobs.length, allManifests: manifests.length,
    postActivationJobs: postJobs.length, postActivationManifests: postManifests.length };
  const readRequired = async (path) => {
    const body = await readText(path);
    requireCheck(typeof body === 'string', 'listed_object_missing');
    return body;
  };
  if (postManifests.length) {
    // Collection keys sort by official scheduler slot; upload time breaks ties.
    const selected = [...postManifests].sort((a, b) =>
      b.pathname.localeCompare(a.pathname) || Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))[0];
    const manifestBody = await readRequired(selected.pathname);
    const manifest = JSON.parse(manifestBody);
    requireCheck(isSha256(manifest.jobId), 'manifest_job_id_invalid');
    const expectedPath = `${JOB_PREFIX}${manifest.jobId}.json`;
    requireCheck(manifest.jobObjectPath === expectedPath, 'manifest_job_path_mismatch');
    const jobMetadata = postJobs.find((row) => row.pathname === expectedPath);
    requireCheck(jobMetadata, 'linked_job_not_post_activation');
    const pair = await validatePair(manifestBody, selected.pathname, await readRequired(expectedPath));
    return { verdict: 'POST_ACTIVATION_BLOB_MIRROR_VERIFIED', counts, pair,
      jobUploadedAt: jobMetadata.uploadedAt, manifestUploadedAt: selected.uploadedAt };
  }
  if (postJobs.length) {
    for (const metadata of postJobs) {
      const job = await validateJob(await readRequired(metadata.pathname), metadata.pathname);
      requireCheck(/^sched-v125-naver-news-\d{8}t\d{6}z-[0-9a-f]{12}$/.test(job.collectionKey),
        'staged_job_not_official_scheduler');
      const manifestPath = `${MANIFEST_PREFIX}${job.collectionKey}/${job.jobId}.json`;
      requireCheck(!manifests.some((row) => row.pathname === manifestPath), 'manifest_outside_snapshot');
      // Check the exact path too, to detect a finalize racing the listing.
      requireCheck(await readText(manifestPath) === null, 'manifest_created_during_scan_retry_required');
    }
    return { verdict: 'POST_ACTIVATION_JOB_STAGED_BUT_NOT_FINALIZED', counts,
      stagedObjects: postJobs.map(({ pathname, uploadedAt }) => ({ pathname, uploadedAt })) };
  }
  return { verdict: 'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND', counts };
}

async function run() {
  let phase = 'identity_guard';
  const report = { baseSha: BASE, verificationHead: process.env.GITHUB_SHA,
    activationRun: '36502683565', deploymentId: DEPLOYMENT,
    startedAt: new Date().toISOString(), remoteWrites: 0,
    authenticationException: 'Project OIDC token issuance only', blobWrites: 0, databaseCalls: 0 };
  try {
    requireCheck(process.env.GITHUB_REPOSITORY === 'kpopmaker/fandex', 'repository_guard');
    requireCheck(process.env.GITHUB_REF === 'refs/heads/validation/naver-post-activation-blob-read-20260929-v1', 'branch_guard');
    requireCheck(process.env.GITHUB_RUN_ATTEMPT === '1', 'one_shot_attempt_guard');
    const source = await readFile('lib/server/ingestion/naverNewsStoredEvidenceMirror.ts', 'utf8');
    requireCheck(source.includes("const ROOT = 'fandex/naver-news/stored-evidence-mirror/v1';")
      && source.includes('const JOB_PREFIX = `${ROOT}/jobs/`;')
      && source.includes('const SCHEDULER_MANIFEST_PREFIX = `${ROOT}/scheduler-manifests/`;'), 'source_prefix_drift');
    const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
    const sdkVersion = JSON.parse(await readFile('node_modules/@vercel/blob/package.json', 'utf8')).version;
    requireCheck(sdkVersion === lock.packages['node_modules/@vercel/blob'].version, 'sdk_lock_mismatch');
    report.blobSdkVersion = sdkVersion;
    requireCheck(Boolean(process.env.VERCEL_TOKEN), 'vercel_token_unavailable');
    async function api(path, method = 'GET') {
      requireCheck(method === 'GET' || path === `/v1/projects/${PROJECT}/token`, 'api_write_denied');
      const url = new URL(path, 'https://api.vercel.com');
      url.searchParams.set('teamId', TEAM);
      const response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({ source: 'vercel-cli:pull' }) } : {}) });
      requireCheck(response.ok, `vercel_api_http_${response.status}`);
      return response.json();
    }
    phase = 'deployment_read';
    const deployment = await api(`/v13/deployments/${DEPLOYMENT}`);
    requireCheck(deployment.readyState === 'READY' && deployment.target === 'production'
      && deployment.meta?.githubCommitSha === BASE
      && (deployment.projectId ?? deployment.project?.id) === PROJECT, 'deployment_identity_mismatch');
    const since = deployment.ready;
    requireCheck(Number.isFinite(since), 'deployment_ready_timestamp_missing');
    report.activationReadyAt = new Date(since).toISOString();
    phase = 'project_oidc_issue';
    const issued = await api(`/v1/projects/${PROJECT}/token`, 'POST');
    requireCheck(typeof issued.token === 'string' && issued.token.length > 0, 'oidc_token_missing');
    // No token is logged, put in GITHUB_ENV, or persisted in an artifact.
    const oidcToken = issued.token;
    phase = 'production_env_metadata_read';
    const envResponse = await api(`/v10/projects/${PROJECT}/env?decrypt=false`);
    const envs = envResponse.envs;
    requireCheck(Array.isArray(envs), 'env_metadata_shape_invalid');
    const production = envs.filter((row) => row.target?.includes('production') && !row.gitBranch);
    const storeEntries = production.filter((row) => row.key === 'FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID');
    const fallbackEntries = production.filter((row) => row.key === 'BLOB_STORE_ID');
    const entries = storeEntries.length ? storeEntries : fallbackEntries;
    requireCheck(entries.length === 1, 'production_blob_store_binding_missing_or_ambiguous');
    phase = 'production_blob_store_id_read';
    const storeEnv = await api(`/v1/projects/${PROJECT}/env/${encodeURIComponent(entries[0].id)}`);
    const storeId = storeEnv.value;
    requireCheck(typeof storeId === 'string' && storeId.trim().length > 0, 'blob_store_id_missing');
    report.productionStoreBindingFound = true;
    report.productionOnlyStoreBinding = entries[0].target.length === 1 && entries[0].target[0] === 'production';
    const auth = { oidcToken, storeId };
    const sdk = { get, list, put: denyWrite };
    const adapter = createVercelBlobImmutableTextObjectStore(sdk, { token: null, ...auth });
    // Export only read capabilities; even an accidental adapter write has no SDK writer.
    async function listAll(prefix) {
      const rows = [];
      const cursors = new Set();
      let cursor;
      do {
        const page = await list({ ...auth, prefix, mode: 'expanded', limit: 1000, ...(cursor ? { cursor } : {}) });
        for (const blob of page.blobs) {
          requireCheck(blob.pathname.startsWith(prefix), 'unexpected_blob_prefix');
          rows.push({ pathname: blob.pathname, uploadedAt: blob.uploadedAt.toISOString() });
        }
        if (!page.hasMore) return rows;
        requireCheck(page.cursor && !cursors.has(page.cursor), 'blob_pagination_invalid');
        cursors.add(page.cursor);
        cursor = page.cursor;
      } while (true);
    }
    phase = 'private_blob_list';
    const until = Date.now();
    report.snapshotCutoffAt = new Date(until).toISOString();
    const jobs = await listAll(JOB_PREFIX);
    const manifests = await listAll(MANIFEST_PREFIX);
    phase = 'private_blob_get_and_integrity';
    Object.assign(report, await classifySnapshot(jobs, manifests, adapter.readText, since, until));
    if (report.verdict === 'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND') {
      // Metadata only, deliberately after the direct Blob absence check.
      report.authConfigMetadata = ['CRON_SECRET', 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
        'FANDEX_NAVER_NEWS_RECURRING_ENABLED', 'FANDEX_NAVER_NEWS_RECURRING_DEPLOYMENT',
        'FANDEX_NAVER_NEWS_RECURRING_QUERY', 'FANDEX_NAVER_NEWS_RECURRING_DISPLAY',
        'FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE', 'BLOB_READ_WRITE_TOKEN'].map((key) => ({
          key, entries: production.filter((row) => row.key === key).map((row) => ({
            type: row.type, target: row.target, createdAt: row.createdAt, updatedAt: row.updatedAt,
          })),
        }));
      phase = 'cron_metadata_read';
      const project = await api(`/v9/projects/${PROJECT}`);
      const summarizeCrons = (value) => value ? {
        enabled: value.enabled,
        definitions: (Array.isArray(value) ? value : value.definitions ?? []).map((row) => ({
          path: typeof row.path === 'string' ? row.path.split('?')[0] : null, schedule: row.schedule,
        })),
      } : null;
      report.cronMetadata = { projectCrons: summarizeCrons(project.crons),
        deploymentCrons: summarizeCrons(deployment.crons) };
    }
    report.completedAt = new Date().toISOString();
  } catch (error) {
    // Never expose SDK/API error messages, bodies, URLs, stacks, or credentials.
    report.verdict = 'VERIFICATION_BLOCKED';
    report.blockedPhase = phase;
    report.blockerCode = error instanceof SafeVerificationError ? error.message : 'redacted_external_or_decoder_failure';
    process.exitCode = 1;
  }
  await mkdir('verification', { recursive: true });
  const output = JSON.stringify(report, null, 2);
  await writeFile('verification/naver-blob-direct-read-result.json', output + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### NAVER direct Blob read\n\n\`\`\`json\n${output}\n\`\`\`\n`);
  }
  console.log(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(() => { console.error('verification_report_write_failed'); process.exitCode = 1; });
}
