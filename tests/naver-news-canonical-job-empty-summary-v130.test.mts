import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
} from '../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
  NAVER_NEWS_PROVIDER,
  type NaverNewsIngestionCommand,
} from '../lib/server/ingestion/naverNewsContracts';
import { buildNaverNewsIngestionCommandFromCanonicalArtist } from '../lib/server/ingestion/naverNewsArtistIngestionCommand';

const command: NaverNewsIngestionCommand = buildNaverNewsIngestionCommandFromCanonicalArtist({
  canonicalArtistId: 'iu',
  collectionKey: 'x3-empty-summary-fixture',
  display: 10,
  start: 1,
  sort: 'date',
});

const identity = buildNaverNewsJobIdentity(command);
const plan = buildNaverNewsIngestionWritePlan(identity, {
  fetchedAt: '2026-09-13T12:30:00.000Z',
  response: {
    lastBuildDate: '2026-09-13T12:30:00.000Z',
    total: 1,
    start: 1,
    display: 1,
    items: [
      {
        title: '아이유 새 소식',
        originallink: 'https://news.example.test/iu-empty-summary',
        pubDate: '2026-09-13T12:00:00.000Z',
      },
    ],
  },
});

function repository() {
  const received = plan.audit.find((event) => event.eventType === 'collection_received');
  const record = plan.normalizedRecords[0];
  const evidence = plan.rawEvidence.find((raw) => raw.normalizedRecordId === record.recordId);
  assert.ok(record);
  assert.ok(evidence);
  assert.equal(record.summary, '');

  const job = {
    job_id: identity.jobId,
    idempotency_key: identity.idempotencyKey,
    request_sha256: identity.requestSha256,
    request_contract: identity.request,
    provider: NAVER_NEWS_PROVIDER,
    status: 'succeeded',
    normalized_record_count: 1,
    raw_evidence_count: 1,
    collection_received_job_id: identity.jobId,
    collection_received_payload: received?.boundedPayload,
  };

  const normalizedRow = {
    record_id: record.recordId,
    raw_evidence_id: evidence.evidenceId,
    stored_raw_evidence_id: record.rawEvidenceId,
    raw_item_index: evidence.itemIndex,
    raw_observed_at: evidence.observedAt,
    raw_payload: evidence.rawPayload,
    raw_payload_sha256: evidence.rawPayloadSha256,
    raw_job_id: identity.jobId,
    normalization_outcome: 'normalized',
    normalized_record_id: record.recordId,
    provider: record.provider,
    source_type: record.sourceType,
    source_url: record.sourceUrl,
    naver_url: record.naverUrl,
    source_host: record.sourceHost,
    title: record.title,
    summary: record.summary,
    published_at: record.publishedAt,
    collected_at: record.collectedAt,
    content_sha256: record.contentSha256,
    record_sha256: record.recordSha256,
    normalized_payload: record.normalizedPayload,
  };

  const pool = {
    async connect() {
      return {
        async query<T = Record<string, unknown>>(sql: string) {
          if (sql.includes('FROM fandex.source_ingestion_jobs')) {
            return { rowCount: 1, rows: [job as T] };
          }
          if (sql.includes('source_ingestion_normalized_records')) {
            return { rowCount: 1, rows: [normalizedRow as T] };
          }
          return { rowCount: 0, rows: [] as T[] };
        },
        release() {},
      };
    },
  };

  return createPostgresNaverNewsCanonicalJobEvidenceReadRepository(pool);
}

test('canonical reader accepts an ingestion-valid normalized record with empty summary', async () => {
  const stored = await repository().readJobEvidence(identity.jobId);
  assert.ok(stored);
  assert.equal(stored.normalizedRecords.length, 1);
  assert.equal(stored.normalizedRecords[0].summary, '');
});

test('canonical reader still rejects non-string summary values', async () => {
  const received = plan.audit.find((event) => event.eventType === 'collection_received');
  const record = plan.normalizedRecords[0];
  const evidence = plan.rawEvidence.find((raw) => raw.normalizedRecordId === record.recordId);
  assert.ok(record);
  assert.ok(evidence);

  const pool = {
    async connect() {
      return {
        async query<T = Record<string, unknown>>(sql: string) {
          if (sql.includes('FROM fandex.source_ingestion_jobs')) {
            return {
              rowCount: 1,
              rows: [{
                job_id: identity.jobId,
                idempotency_key: identity.idempotencyKey,
                request_sha256: identity.requestSha256,
                request_contract: identity.request,
                provider: NAVER_NEWS_PROVIDER,
                status: 'succeeded',
                normalized_record_count: 1,
                raw_evidence_count: 1,
                collection_received_job_id: identity.jobId,
                collection_received_payload: received?.boundedPayload,
              } as T],
            };
          }
          if (sql.includes('source_ingestion_normalized_records')) {
            return {
              rowCount: 1,
              rows: [{
                record_id: record.recordId,
                raw_evidence_id: evidence.evidenceId,
                stored_raw_evidence_id: record.rawEvidenceId,
                raw_item_index: evidence.itemIndex,
                raw_observed_at: evidence.observedAt,
                raw_payload: evidence.rawPayload,
                raw_payload_sha256: evidence.rawPayloadSha256,
                raw_job_id: identity.jobId,
                normalization_outcome: 'normalized',
                normalized_record_id: record.recordId,
                provider: record.provider,
                source_type: record.sourceType,
                source_url: record.sourceUrl,
                naver_url: record.naverUrl,
                source_host: record.sourceHost,
                title: record.title,
                summary: null,
                published_at: record.publishedAt,
                collected_at: record.collectedAt,
                content_sha256: record.contentSha256,
                record_sha256: record.recordSha256,
                normalized_payload: record.normalizedPayload,
              } as T],
            };
          }
          return { rowCount: 0, rows: [] as T[] };
        },
        release() {},
      };
    },
  };

  const readRepository = createPostgresNaverNewsCanonicalJobEvidenceReadRepository(pool);
  await assert.rejects(
    () => readRepository.readJobEvidence(identity.jobId),
    /naver_news_canonical_job_record_invalid/,
  );
});
