import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildNaverNewsJobIdentity, buildNaverNewsIngestionWritePlan, sha256Canonical } from '../lib/server/ingestion/naverNewsContracts';
import { buildNaverNewsSchedulerPlan } from '../lib/server/ingestion/naverNewsScheduler';
import { buildNaverNewsStoredEvidenceMirrorObjects } from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import {
  BLOB_READ_EXECUTION_ID, handleNaverBlobReadVerification, type BlobVerificationReader,
} from '../lib/server/ingestion/naverNewsBlobReadVerification';
import { createVercelBlobTextReadStore } from '../lib/server/storage/vercelBlobImmutableTextObjectStore';
import { validateProbeResponse } from '../scripts/verification/invokeNaverProductionBlobRead.mjs';
import { POST, dynamic, runtime } from '../app/api/internal/naver-news/blob-read-verification/route';

const environment = { VERCEL_ENV: 'production', VERCEL_OIDC_TOKEN: 'private-oidc-sentinel',
  BLOB_STORE_ID: 'private-store-sentinel', FANDEX_NAVER_NEWS_SCHEDULER_SECRET: 'test-secret' };
const now = () => new Date('2026-09-29T04:00:00Z');
const A = 'POST_ACTIVATION_BLOB_MIRROR_VERIFIED';
const B = 'POST_ACTIVATION_JOB_STAGED_BUT_NOT_FINALIZED';
const C = 'POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND';
const FAILED = 'POST_ACTIVATION_BLOB_READ_FAILED';

function request(overrides: { method?: string; bearer?: string; id?: string; body?: string; query?: string } = {}) {
  return new Request(`https://example.test/api/internal/naver-news/blob-read-verification${overrides.query ?? ''}`, {
    method: overrides.method ?? 'POST',
    headers: { authorization: overrides.bearer ?? 'Bearer test-secret',
      'x-fandex-blob-read-verification-id': overrides.id ?? BLOB_READ_EXECUTION_ID },
    ...(overrides.body !== undefined ? { body: overrides.body } : {}),
  });
}

function fixture() {
  const scheduler = buildNaverNewsSchedulerPlan({ query: '아이유 IU', at: '2026-09-29T03:00:00Z', display: 100 });
  const plan = buildNaverNewsIngestionWritePlan(buildNaverNewsJobIdentity(scheduler.command), {
    fetchedAt: '2026-09-29T03:01:00Z', response: {
      total: 1, start: 1, display: 1, lastBuildDate: '2026-09-29T03:00:00Z', items: [{
        title: 'private-title-sentinel', description: 'private-summary-sentinel',
        originallink: 'https://private-source.example.test/article', pubDate: '2026-09-29T02:00:00Z',
      }],
    },
  });
  const objects = buildNaverNewsStoredEvidenceMirrorObjects(plan);
  assert.ok(objects.schedulerManifestPathname && objects.schedulerManifestBody);
  const bodies = new Map([[objects.jobPathname, objects.jobBody],
    [objects.schedulerManifestPathname, objects.schedulerManifestBody]]);
  const rows = [...bodies.keys()].map((pathname) => ({ pathname, uploadedAt: Date.parse('2026-09-29T03:01:01Z') }));
  const reader: BlobVerificationReader = {
    list: async (prefix) => rows.filter((row) => row.pathname.startsWith(prefix)),
    readText: async (path) => bodies.get(path) ?? null,
  };
  return { objects, bodies, rows, reader };
}

async function invoke(reader: BlobVerificationReader, req = request(), env = environment) {
  const response = await handleNaverBlobReadVerification(req, env, { createReader: () => reader, now });
  const body = await response.json();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(validateProbeResponse(body, response.status));
  assert.doesNotMatch(JSON.stringify(body), /private-(?:oidc|store|title|summary|source)|normalizedRecords|https:\/\//);
  return { response, body };
}

test('auth missing, wrong purpose ID and wrong bearer perform no storage access', async () => {
  for (const req of [new Request('https://example.test', { method: 'POST' }),
    request({ id: 'wrong-id' }), request({ bearer: 'Bearer wrong-secret' })]) {
    let created = false;
    const result = await handleNaverBlobReadVerification(req, environment, {
      now, createReader: () => { created = true; throw new Error('must not run'); },
    });
    assert.equal(result.status, 403);
    assert.equal(created, false);
  }
});

test('method rejection and route wiring', async () => {
  const f = fixture();
  const { response } = await invoke(f.reader, request({ method: 'GET' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  assert.equal(dynamic, 'force-dynamic');
  assert.equal(runtime, 'nodejs');
  assert.equal((await POST(new Request('https://example.test', { method: 'POST' }))).status, 403);
});

test('A: valid pair passes decoders, request identity, both digests and minimal response', async () => {
  const f = fixture();
  const { response, body } = await invoke(f.reader);
  assert.equal(response.status, 200);
  assert.equal(body.classification, A);
  assert.deepEqual(Object.keys(body.latest).sort(),
    ['jobId', 'collectionKey', 'resultSha256', 'jobPayloadDigest', 'manifestPayloadDigest'].sort());
  assert.equal(body.latest.jobPayloadDigest, JSON.parse(f.objects.jobBody).payloadDigest);
});

test('B: stage exists, linked manifest absent', async () => {
  const f = fixture();
  f.bodies.delete(f.objects.schedulerManifestPathname!);
  f.rows.splice(1, 1);
  assert.equal((await invoke(f.reader)).body.classification, B);
});

test('C: successful empty list and historical-only inventory', async () => {
  const f = fixture();
  f.rows.splice(0);
  assert.equal((await invoke(f.reader)).body.classification, C);
  const old = fixture();
  old.rows.forEach((row) => { row.uploadedAt = Date.parse('2026-09-28T00:00:00Z'); });
  assert.equal((await invoke(old.reader)).body.classification, C);
});

test('list failure is READ_FAILED without SDK detail', async () => {
  const f = fixture();
  const { body, response } = await invoke({ ...f.reader, list: async () => { throw new Error('private-oidc-sentinel'); } });
  assert.equal(response.status, 502);
  assert.equal(body.classification, FAILED);
  assert.equal(body.errorClass, 'list_failed');
});

test('get failure is READ_FAILED without SDK detail', async () => {
  const f = fixture();
  const { body } = await invoke({ ...f.reader, readText: async () => { throw new Error('private-store-sentinel'); } });
  assert.equal(body.classification, FAILED);
  assert.equal(body.errorClass, 'get_failed');
});

test('tampered job or manifest digest fails integrity', async () => {
  for (const target of ['job', 'manifest']) {
    const f = fixture();
    const path = target === 'job' ? f.objects.jobPathname : f.objects.schedulerManifestPathname!;
    const value = JSON.parse(f.bodies.get(path)!);
    value.payloadDigest = '0'.repeat(64);
    f.bodies.set(path, JSON.stringify(value));
    assert.equal((await invoke(f.reader)).body.errorClass, 'integrity_failed');
  }
});

test('self-consistent manifest/job digest mismatch is rejected', async () => {
  const f = fixture();
  const value = JSON.parse(f.objects.schedulerManifestBody!);
  delete value.payloadDigest;
  value.jobPayloadDigest = '0'.repeat(64);
  value.payloadDigest = sha256Canonical(value);
  f.bodies.set(f.objects.schedulerManifestPathname!, JSON.stringify(value));
  assert.equal((await invoke(f.reader)).body.errorClass, 'integrity_failed');
});

test('job path mismatch cannot redirect a read', async () => {
  const f = fixture();
  const value = JSON.parse(f.objects.schedulerManifestBody!);
  value.jobObjectPath = 'https://private-source.example.test/secret';
  f.bodies.set(f.objects.schedulerManifestPathname!, JSON.stringify(value));
  assert.equal((await invoke(f.reader)).body.errorClass, 'integrity_failed');
});

test('missing object, bad timestamp and finalize race fail closed', async () => {
  const missing = fixture();
  missing.bodies.delete(missing.objects.jobPathname);
  assert.equal((await invoke(missing.reader)).body.classification, FAILED);
  const badTime = fixture();
  badTime.rows[0].uploadedAt = NaN;
  assert.equal((await invoke(badTime.reader)).body.classification, FAILED);
  const raced = fixture();
  raced.rows.splice(1, 1);
  assert.equal((await invoke(raced.reader)).body.classification, FAILED);
});

test('body and query cannot configure storage; truly empty streamed body works', async () => {
  const f = fixture();
  for (const req of [request({ body: '{}' }), request({ query: '?storeId=other' }),
    request({ body: JSON.stringify({ prefix: 'other' }) })]) {
    assert.equal((await invoke(f.reader, req)).response.status, 400);
  }
  assert.equal((await invoke(f.reader, request({ body: '' }))).body.classification, A);
});

test('Preview and missing runtime OIDC fail without a reader; no token fallback', async () => {
  for (const env of [{ ...environment, VERCEL_ENV: 'preview' },
    { ...environment, VERCEL_OIDC_TOKEN: '', BLOB_READ_WRITE_TOKEN: 'not-allowed' },
    { ...environment, BLOB_STORE_ID: '' }]) {
    let created = false;
    const response = await handleNaverBlobReadVerification(request(), env, { now,
      createReader: () => { created = true; return fixture().reader; } });
    assert.equal(response.status, 503);
    assert.equal(created, false);
  }
});

test('read adapter exposes no put/delete capability and runtime imports read SDK only', async () => {
  const reader = createVercelBlobTextReadStore({ get: async () => null,
    list: async () => ({ blobs: [], hasMore: false }) }, { token: null, oidcToken: 'x', storeId: 'y' });
  assert.deepEqual(Object.keys(reader).sort(), ['listPathnames', 'readText']);
  const source = await readFile('lib/server/ingestion/naverNewsBlobReadVerificationRuntime.ts', 'utf8');
  assert.match(source, /import \{ get, list \} from '@vercel\/blob'/);
  assert.doesNotMatch(source, /\b(?:put|del|copy)\s*\(|BLOB_READ_WRITE_TOKEN|FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID/);
});

test('invocation response validator rejects extra private fields and malformed success', () => {
  const base = { ok: true, mode: 'naver-production-blob-read-verification', classification: C,
    observationCutoffAt: now().toISOString() };
  assert.equal(validateProbeResponse(base, 200), true);
  assert.equal(validateProbeResponse({ ...base, token: 'secret' }, 200), false);
  assert.equal(validateProbeResponse({ ...base, classification: A }, 200), undefined);
  assert.equal(validateProbeResponse(base, 500), false);
});

test('invocation workflow is dispatch only and requires separate explicit purpose approval', async () => {
  const workflow = await readFile('.github/workflows/verify-naver-production-blob-read-v1.yml', 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+(?:push|pull_request|schedule):/);
  assert.match(workflow, /default: 'NO'/);
  assert.match(workflow, /FANDEX_NAVER_NEWS_SCHEDULER_SECRET/);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN|BLOB_READ_WRITE_TOKEN|curl|--retry/);
});
