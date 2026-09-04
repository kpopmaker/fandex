import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assembleNaverNewsCanonicalJobEvidence,
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
} from '../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
  type NaverNewsIngestionCommand,
  type NaverNewsIngestionWritePlan,
  type NaverNewsApiItem,
  NAVER_NEWS_PROVIDER,
} from '../lib/server/ingestion/naverNewsContracts';
import { buildNaverNewsIngestionCommandFromCanonicalArtist } from '../lib/server/ingestion/naverNewsArtistIngestionCommand';

const command: NaverNewsIngestionCommand = buildNaverNewsIngestionCommandFromCanonicalArtist({
  canonicalArtistId: 'iu', collectionKey: 'run11-fixture', display: 10, start: 1, sort: 'date',
});
const identity = buildNaverNewsJobIdentity(command);

function planFor(items: readonly NaverNewsApiItem[]): NaverNewsIngestionWritePlan {
  return buildNaverNewsIngestionWritePlan(identity, {
    fetchedAt: '2026-09-05T01:00:00.000Z',
    response: { lastBuildDate: '2026-09-05T01:00:00.000Z', total: items.length, start: 1, display: items.length, items },
  });
}

const plan = planFor([
  { title: '아이유 새 소식', originallink: 'https://news.example.test/iu-1', description: '앨범 소식', pubDate: '2026-09-04T00:00:00.000Z' },
  { title: '일반 연예 뉴스', originallink: 'https://news.example.test/other', description: '관련 없는 기사', pubDate: '2026-09-04T01:00:00.000Z' },
]);

function jobRow(value: NaverNewsIngestionWritePlan = plan, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const received = value.audit.find((event) => event.eventType === 'collection_received');
  return {
    job_id: value.identity.jobId, idempotency_key: value.identity.idempotencyKey, request_sha256: value.identity.requestSha256,
    request_contract: value.identity.request, provider: NAVER_NEWS_PROVIDER, status: 'succeeded', normalized_record_count: value.normalizedRecords.length,
    raw_evidence_count: value.rawEvidence.length, collection_received_job_id: value.identity.jobId, collection_received_payload: received?.boundedPayload,
    ...overrides,
  };
}

function normalizedRows(value: NaverNewsIngestionWritePlan = plan, rawJobId = value.identity.jobId): Record<string, unknown>[] {
  return value.normalizedRecords.map((record) => ({
    record_id: record.recordId, raw_evidence_id: record.rawEvidenceId, raw_job_id: rawJobId, normalization_outcome: 'normalized', normalized_record_id: record.recordId,
    provider: record.provider, source_type: record.sourceType, source_url: record.sourceUrl, naver_url: record.naverUrl, source_host: record.sourceHost,
    title: record.title, summary: record.summary, published_at: record.publishedAt, collected_at: record.collectedAt,
    content_sha256: record.contentSha256, record_sha256: record.recordSha256, normalized_payload: record.normalizedPayload,
  }));
}

function repository(options: { job?: Record<string, unknown>; rows?: Record<string, unknown>[] } = {}) {
  const calls: string[] = [];
  const pool = {
    async connect() {
      return {
        async query<T = Record<string, unknown>>(sql: string) {
          calls.push(sql);
          if (sql.includes('FROM fandex.source_ingestion_jobs')) return { rowCount: 1, rows: [(options.job ?? jobRow()) as T] };
          if (sql.includes('source_ingestion_normalized_records')) return { rowCount: (options.rows ?? normalizedRows()).length, rows: (options.rows ?? normalizedRows()) as T[] };
          return { rowCount: 0, rows: [] as T[] };
        },
        release() {},
      };
    },
  };
  return { repository: createPostgresNaverNewsCanonicalJobEvidenceReadRepository(pool), calls };
}

test('valid IU job assembles binding, persisted records, canonical pipeline, coverage, and completeness', async () => {
  const { repository: readRepository } = repository();
  const result = await assembleNaverNewsCanonicalJobEvidence({ canonicalArtistId: 'iu', jobId: identity.jobId }, readRepository);
  assert.equal(result.binding.query, command.query);
  assert.equal(result.request.query, command.query);
  assert.equal(result.eligibleNormalizedRecordIds.length, 2);
  assert.equal(result.candidates.length, 2);
  assert.equal(result.verifications.filter((value) => value.status === 'accepted').length, 1);
  assert.equal(result.observations.length, 1);
  assert.equal(result.completeness.status, 'available');
  assert.equal(result.observationSetCoverage.status, 'proven');
});

test('job query/provider and artist mismatches fail closed', async () => {
  const mismatchedIdentity = buildNaverNewsJobIdentity({ ...command, query: '다른 query' });
  const queryMismatch = repository({ job: jobRow(plan, { request_contract: mismatchedIdentity.request, idempotency_key: mismatchedIdentity.idempotencyKey, request_sha256: mismatchedIdentity.requestSha256 }) });
  await assert.rejects(() => assembleNaverNewsCanonicalJobEvidence({ canonicalArtistId: 'iu', jobId: identity.jobId }, queryMismatch.repository), /naver_news_canonical_job_artist_binding_mismatch/);
  const providerMismatch = repository({ job: jobRow(plan, { provider: 'other-provider' }) });
  await assert.rejects(() => providerMismatch.repository.readJobEvidence(identity.jobId), /naver_news_canonical_job_state_invalid/);
  await assert.rejects(() => assembleNaverNewsCanonicalJobEvidence({ canonicalArtistId: 'unknown-artist', jobId: identity.jobId }, queryMismatch.repository), /naver_news_artist_not_found/);
});

test('cross-job normalized lineage and malformed persisted records fail closed', async () => {
  const crossJob = repository({ rows: normalizedRows(plan, '7'.repeat(64)) });
  await assert.rejects(() => crossJob.repository.readJobEvidence(identity.jobId), /naver_news_canonical_job_record_invalid/);
  const malformed = normalizedRows();
  malformed[0].title = 'tampered';
  const malformedRepository = repository({ rows: malformed });
  await assert.rejects(() => malformedRepository.repository.readJobEvidence(identity.jobId), /naver_news_canonical_job_record_invalid/);
});

test('same-job revisions collapse to one candidate while preserving source lineage', async () => {
  const revisedPlan = planFor([
    { title: '아이유 첫 제목', originallink: 'https://news.example.test/revision', description: '첫 요약', pubDate: '2026-09-04T00:00:00.000Z' },
    { title: '아이유 수정 제목', originallink: 'https://news.example.test/revision', description: '수정 요약', pubDate: '2026-09-04T00:00:00.000Z' },
  ]);
  const { repository: readRepository } = repository({ job: jobRow(revisedPlan), rows: normalizedRows(revisedPlan) });
  const result = await assembleNaverNewsCanonicalJobEvidence({ canonicalArtistId: 'iu', jobId: identity.jobId }, readRepository);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].sourceRecordIds.length, 2);
  assert.equal(result.observations.length, 1);
  assert.equal(result.observationSetCoverage.status, 'proven');
});

test('missing collection audit remains unavailable and is never inferred complete', async () => {
  const { repository: readRepository } = repository({ job: jobRow(plan, { collection_received_job_id: null, collection_received_payload: null }) });
  const result = await assembleNaverNewsCanonicalJobEvidence({ canonicalArtistId: 'iu', jobId: identity.jobId }, readRepository);
  assert.deepEqual(result.completeness, { status: 'evidence_unavailable', reason: 'collection_received_audit_missing' });
  assert.equal(result.observationSetCoverage.status, 'proven');
});

test('reader uses only read-only SQL actions', async () => {
  const { repository: readRepository, calls } = repository();
  await readRepository.readJobEvidence(identity.jobId);
  assert.ok(calls.includes('BEGIN READ ONLY'));
  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.some((sql) => /\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/i.test(sql)), false);
});
