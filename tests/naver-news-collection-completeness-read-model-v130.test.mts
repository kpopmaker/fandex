import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNaverNewsCollectionCompletenessReadModel,
  createPostgresNaverNewsCollectionCompletenessReadRepository,
  type NaverNewsCollectionCompletenessStoredEvidence,
} from '../lib/server/ingestion/naverNewsCollectionCompletenessReadModel';
import { evaluateNaverNewsCollectionCompleteness } from '../lib/server/ingestion/naverNewsCollectionCompleteness';

const jobId = 'a'.repeat(64);

function storedEvidence(
  providerTotal: number,
  received: number,
  start = 1,
): NaverNewsCollectionCompletenessStoredEvidence {
  return {
    jobId,
    provider: 'naver-news',
    requestContract: {
      contractVersion: 'v121_naver_news_ingestion_v1', provider: 'naver-news', collectionKey: 'test-collection',
      query: 'IU', display: 100, start, sort: 'date',
    },
    rawEvidenceCount: received,
    collectionReceived: { jobId, boundedPayload: { providerTotal, received } },
  };
}

for (const count of [0, 1, 73, 100]) {
  test(`numeric count ${count} preserves complete collection evidence`, () => {
    const result = buildNaverNewsCollectionCompletenessReadModel(storedEvidence(count, count));
    assert.equal(result.status, 'available');
    if (result.status !== 'available') return;
    assert.equal(result.readModel.providerTotal, count);
    assert.equal(result.readModel.received, count);
    assert.deepEqual(result.readModel.completeness, {
      status: 'complete', reason: 'provider_total_covered_by_first_request',
    });
  });
}

const invalidCounts: readonly (readonly [string, unknown])[] = [
  ['null', null],
  ['undefined', undefined],
  ['empty string', ''],
  ['single space', ' '],
  ['whitespace', '   '],
  ['false', false],
  ['true', true],
  ['empty array', []],
  ['numeric array', [0]],
  ['object', {}],
  ['coercible object', { valueOf: () => 0 }],
  ['symbol', Symbol('count')],
  ['bigint', BigInt(0)],
  ['NaN', Number.NaN],
  ['Infinity', Infinity],
  ['negative Infinity', -Infinity],
  ['negative integer', -1],
  ['fractional number', 0.5],
  ['positive fractional number', 1.5],
  ['unsafe integer', Number.MAX_SAFE_INTEGER + 1],
  ['non-numeric text', 'not-a-count'],
  ['mixed numeric text', '1x'],
  ['hexadecimal text', '0x0'],
  ['exponent text', '0e0'],
  ['padded numeric text', ' 0 '],
  ['leading-zero text', '00'],
  ['numeric zero string', '0'],
  ['numeric positive string', '1'],
  ['numeric seventy-three string', '73'],
  ['numeric hundred string', '100'],
];

for (const field of ['rawEvidenceCount', 'providerTotal', 'received'] as const) {
  for (const [label, value] of invalidCounts) {
    test(`${field} rejects ${label} instead of coercing stored count evidence`, () => {
      const base = storedEvidence(0, 0);
      const evidence = field === 'rawEvidenceCount'
        ? { ...base, rawEvidenceCount: value }
        : { ...base, collectionReceived: { jobId, boundedPayload: { providerTotal: 0, received: 0, [field]: value } } };
      assert.deepEqual(buildNaverNewsCollectionCompletenessReadModel(evidence), {
        status: 'evidence_unavailable', reason: 'stored_evidence_invalid',
      });
    });
  }
}

test('safe integer provider totals retain truncated collection evidence', () => {
  const result = buildNaverNewsCollectionCompletenessReadModel(storedEvidence(Number.MAX_SAFE_INTEGER, 100));
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.readModel.providerTotal, Number.MAX_SAFE_INTEGER);
  assert.equal(result.readModel.completeness.status, 'truncated');
});

test('missing job and missing audit remain distinct from invalid stored counts', () => {
  assert.deepEqual(buildNaverNewsCollectionCompletenessReadModel(null), { status: 'not_found' });
  assert.deepEqual(buildNaverNewsCollectionCompletenessReadModel({
    ...storedEvidence(0, 0), rawEvidenceCount: null, collectionReceived: null,
  }), { status: 'evidence_unavailable', reason: 'collection_received_audit_missing' });
});

test('stored first-page evidence produces a complete read model', () => {
  const result = buildNaverNewsCollectionCompletenessReadModel(storedEvidence(73, 73));
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.readModel.completeness.status, 'complete');
  assert.equal(result.readModel.providerTotal, 73);
  assert.equal(result.readModel.received, 73);
});

test('stored first-page evidence produces a truncated read model', () => {
  const result = buildNaverNewsCollectionCompletenessReadModel(storedEvidence(843, 100));
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.readModel.completeness.status, 'truncated');
});

test('stored non-first-page evidence remains unknown when whole coverage is unproven', () => {
  const result = buildNaverNewsCollectionCompletenessReadModel(storedEvidence(50, 50, 101));
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.readModel.completeness.status, 'unknown');
});

test('the read model delegates classification to the official evaluator', () => {
  const result = buildNaverNewsCollectionCompletenessReadModel(storedEvidence(843, 100));
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.deepEqual(result.readModel.completeness, evaluateNaverNewsCollectionCompleteness({
    providerTotal: 843,
    counts: { received: 100 },
    identity: { request: result.readModel.request },
  } as Parameters<typeof evaluateNaverNewsCollectionCompleteness>[0]));
});

test('missing or cross-job collection evidence is unavailable rather than inferred', () => {
  assert.deepEqual(buildNaverNewsCollectionCompletenessReadModel({
    ...storedEvidence(73, 73), collectionReceived: null,
  }), { status: 'evidence_unavailable', reason: 'collection_received_audit_missing' });
  assert.deepEqual(buildNaverNewsCollectionCompletenessReadModel({
    ...storedEvidence(73, 73), collectionReceived: { jobId: 'b'.repeat(64), boundedPayload: { providerTotal: 73, received: 73 } },
  }), { status: 'evidence_unavailable', reason: 'stored_evidence_invalid' });
});

test('the PostgreSQL reader is read-only and joins audit evidence by the same job id', async () => {
  const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  const pool = {
    async connect() {
      return {
        async query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]) {
          calls.push({ sql, values });
          if (sql.includes('FROM fandex.source_ingestion_jobs')) {
            return { rowCount: 1, rows: [{
              job_id: jobId, provider: 'naver-news', raw_evidence_count: 73,
              request_contract: storedEvidence(73, 73).requestContract,
              collection_received_job_id: jobId,
              collection_received_payload: { providerTotal: 73, received: 73 },
            }] as T[] };
          }
          return { rowCount: 0, rows: [] as T[] };
        },
        release() {},
      };
    },
  };
  const evidence = await createPostgresNaverNewsCollectionCompletenessReadRepository(pool)
    .readCollectionCompletenessEvidence(jobId);
  assert.equal(evidence?.collectionReceived?.jobId, jobId);
  assert.ok(calls.some(({ sql }) => sql === 'BEGIN READ ONLY'));
  assert.ok(calls.some(({ sql }) => sql.includes('audit.job_id = jobs.job_id')));
  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.equal(calls.some(({ sql }) => /\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/.test(sql)), false);
});
