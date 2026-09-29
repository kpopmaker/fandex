import { pathToFileURL } from 'node:url';

const MODE = 'naver-production-blob-read-verification';
const ID = 'ops-naver-blob-read-verification-20260929-v1';
const A = 'POST_ACTIVATION_BLOB_MIRROR_VERIFIED';
const B = 'POST_ACTIVATION_JOB_STAGED_BUT_NOT_FINALIZED';
const C = 'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND';
const FAILED = 'POST_ACTIVATION_BLOB_READ_FAILED';
const sha = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

export function validateProbeResponse(body, status) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some((key) => !['ok', 'mode', 'classification', 'observationCutoffAt', 'latest', 'errorClass'].includes(key))
    || body.mode !== MODE || ![A, B, C, FAILED].includes(body.classification)
    || typeof body.observationCutoffAt !== 'string' || !Number.isFinite(Date.parse(body.observationCutoffAt))) return false;
  if (body.classification === FAILED) return body.ok === false && status >= 400
    && body.latest === undefined && ['request_rejected', 'runtime_unavailable', 'list_failed', 'get_failed', 'integrity_failed'].includes(body.errorClass);
  if (body.ok !== true || status !== 200 || body.errorClass !== undefined) return false;
  if (body.classification === C) return body.latest === undefined;
  const latest = body.latest;
  return latest && typeof latest === 'object' && !Array.isArray(latest)
    && Object.keys(latest).every((key) => ['jobId', 'collectionKey', 'resultSha256', 'jobPayloadDigest', 'manifestPayloadDigest'].includes(key))
    && sha(latest.jobId) && sha(latest.resultSha256) && sha(latest.jobPayloadDigest)
    && /^sched-v125-naver-news-\d{8}t\d{6}z-[0-9a-f]{12}$/.test(latest.collectionKey)
    && (body.classification === A ? sha(latest.manifestPayloadDigest) : latest.manifestPayloadDigest === undefined);
}

async function main() {
  let classification = FAILED;
  try {
    if (process.env.GITHUB_REPOSITORY !== 'kpopmaker/fandex'
      || process.env.GITHUB_REF !== 'refs/heads/main'
      || process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
      || process.env.GITHUB_RUN_ATTEMPT !== '1'
      || process.env.EXECUTION_APPROVAL !== ID
      || !process.env.FANDEX_NAVER_NEWS_SCHEDULER_SECRET) throw new Error('guard');
    const response = await fetch('https://fandex-eta.vercel.app/api/internal/naver-news/blob-read-verification', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25_000),
      headers: {
        Authorization: `Bearer ${process.env.FANDEX_NAVER_NEWS_SCHEDULER_SECRET}`,
        'x-fandex-blob-read-verification-id': ID,
      },
    });
    if (!response.body) throw new Error('empty');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 8192) throw new Error('size');
        chunks.push(Buffer.from(chunk.value));
      }
    } finally { await reader.cancel().catch(() => undefined); }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!validateProbeResponse(body, response.status)) throw new Error('contract');
    classification = body.classification;
  } catch { /* Only an allowlisted classification may reach logs. */ }
  console.log(classification);
  if (classification === FAILED) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.log(FAILED); process.exitCode = 1; });
}
