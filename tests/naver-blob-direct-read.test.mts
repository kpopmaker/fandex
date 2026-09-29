import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildNaverNewsIngestionWritePlan, buildNaverNewsJobIdentity, sha256Canonical } from '../lib/server/ingestion/naverNewsContracts';
import { buildNaverNewsSchedulerPlan } from '../lib/server/ingestion/naverNewsScheduler';
import { buildNaverNewsStoredEvidenceMirrorObjects } from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import { classifySnapshot, validatePair, JOB_PREFIX, MANIFEST_PREFIX } from '../scripts/verification/naverBlobDirectRead.mjs';

const since = Date.parse('2026-09-29T00:22:42.680Z');
const until = Date.parse('2026-09-29T05:00:00Z');
function fixture(slot = '2026-09-29T03:00:00Z') {
  const scheduler = buildNaverNewsSchedulerPlan({ query: '아이유 IU', at: slot, display: 100 });
  const plan = buildNaverNewsIngestionWritePlan(buildNaverNewsJobIdentity(scheduler.command), {
    fetchedAt: '2026-09-29T03:01:00Z',
    response: { total: 1, start: 1, display: 1, lastBuildDate: '2026-09-29T03:00:00Z', items: [{
      title: '아이유 공연', description: 'IU news', originallink: 'https://news.example.test/iu',
      pubDate: '2026-09-29T02:00:00Z',
    }] },
  });
  const objects = buildNaverNewsStoredEvidenceMirrorObjects(plan);
  assert.ok(objects.schedulerManifestPathname && objects.schedulerManifestBody);
  const values = new Map([[objects.jobPathname, objects.jobBody],
    [objects.schedulerManifestPathname, objects.schedulerManifestBody]]);
  return { objects, values,
    jobs: [{ pathname: objects.jobPathname, uploadedAt: '2026-09-29T03:01:01Z' }],
    manifests: [{ pathname: objects.schedulerManifestPathname, uploadedAt: '2026-09-29T03:01:02Z' }],
    read: async (path: string) => values.get(path) ?? null };
}

test('complete object pair passes unchanged repository decoders and cross-object integrity', async () => {
  const f = fixture();
  const result = await classifySnapshot(f.jobs, f.manifests, f.read, since, until);
  assert.equal(result.verdict, 'POST_ACTIVATION_BLOB_MIRROR_VERIFIED');
  assert.equal(result.pair?.integrityPassed, true);
  assert.equal(result.pair?.jobPayloadDigest, result.pair?.jobEvidencePayloadDigest);
});

test('stage only is B; empty and historical-only inventories are C', async () => {
  const f = fixture();
  f.values.delete(f.objects.schedulerManifestPathname!);
  assert.equal((await classifySnapshot(f.jobs, [], f.read, since, until)).verdict,
    'POST_ACTIVATION_JOB_STAGED_BUT_NOT_FINALIZED');
  assert.equal((await classifySnapshot([], [], f.read, since, until)).verdict,
    'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND');
  assert.equal((await classifySnapshot([{ ...f.jobs[0], uploadedAt: '2026-09-28T00:00:00Z' }],
    [], f.read, since, until)).verdict, 'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND');
});

test('job result tampering and manifest digest tampering fail closed', async () => {
  const f = fixture();
  const job = JSON.parse(f.objects.jobBody);
  job.resultSha256 = '0'.repeat(64);
  await assert.rejects(() => validatePair(f.objects.schedulerManifestBody,
    f.objects.schedulerManifestPathname, JSON.stringify(job)));
  const manifest = JSON.parse(f.objects.schedulerManifestBody!);
  manifest.payloadDigest = '0'.repeat(64);
  await assert.rejects(() => validatePair(JSON.stringify(manifest),
    f.objects.schedulerManifestPathname, f.objects.jobBody));
});

test('self-consistent but incorrect manifest link is rejected', async () => {
  const f = fixture();
  const manifest = JSON.parse(f.objects.schedulerManifestBody!);
  manifest.jobPayloadDigest = '0'.repeat(64);
  delete manifest.payloadDigest;
  manifest.payloadDigest = sha256Canonical(manifest);
  await assert.rejects(() => validatePair(JSON.stringify(manifest),
    f.objects.schedulerManifestPathname, f.objects.jobBody), /linked_digest_mismatch/);
});

test('manifest without post-activation job and missing listed body are not classified C', async () => {
  const f = fixture();
  await assert.rejects(() => classifySnapshot([], f.manifests, f.read, since, until));
  f.values.delete(f.objects.jobPathname);
  await assert.rejects(() => classifySnapshot(f.jobs, f.manifests, f.read, since, until));
});

test('finalization racing stage-only scan is not classified B', async () => {
  const f = fixture();
  await assert.rejects(() => classifySnapshot(f.jobs, [], f.read, since, until), /created_during_scan/);
});

test('canonical path binding rejects alternate manifest location', async () => {
  const f = fixture();
  await assert.rejects(() => validatePair(f.objects.schedulerManifestBody,
    MANIFEST_PREFIX + 'wrong.json', f.objects.jobBody), /manifest_path_mismatch/);
  assert.ok(f.objects.jobPathname.startsWith(JOB_PREFIX));
});

test('verifier imports only read operations and never imports worker or DB clients', async () => {
  const source = await readFile('scripts/verification/naverBlobDirectRead.mjs', 'utf8');
  assert.match(source, /import \{ get, list \} from '@vercel\/blob'/);
  assert.doesNotMatch(source, /\b(?:put|del)\s*\(/);
  assert.doesNotMatch(source, /import.*(?:naverNewsWorker|naverNewsBlobMirrorRuntime|from ['"]pg)/);
});
