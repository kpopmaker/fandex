import { bindCanonicalArtistToNaverNews, type CanonicalNaverNewsArtistBinding } from './naverNewsArtistBinding';
import {
  buildNaverNewsJobIdentity,
  canonicalJson,
  isSha256,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_PROVIDER,
  sha256Canonical,
  type NaverNewsNormalizedRecord,
  type NaverNewsRequestContract,
} from './naverNewsContracts';
import {
  buildNaverNewsCollectionCompletenessReadModel,
  type NaverNewsCollectionCompletenessReadResult,
  type NaverNewsCollectionCompletenessStoredEvidence,
} from './naverNewsCollectionCompletenessReadModel';
import { collapseCanonicalNaverNewsObservationCandidates, type CanonicalNaverNewsObservationCandidate } from './naverNewsObservationCandidate';
import { verifyNaverNewsArtistRelevance, type NaverNewsArtistRelevanceVerification } from './naverNewsArtistRelevance';
import { promoteCanonicalNaverNewsObservation, type CanonicalNaverNewsObservation } from './naverNewsCanonicalObservation';
import {
  evaluateCanonicalObservationSetCoverage,
  type CanonicalObservationSetCoverage,
  type NaverNewsEligibleNormalizedRecord,
} from './naverNewsObservationSetCoverage';
import type { NaverNewsIngestionPool } from './naverNewsRepository';

type QueryResultLike<T> = { rowCount: number | null; rows: T[] };
type Queryable = { query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResultLike<T>> };

export type NaverNewsCanonicalJobEvidenceReadRepository = Readonly<{
  readJobEvidence(jobId: string): Promise<NaverNewsCanonicalJobStoredEvidence | null>;
}>;

export type NaverNewsCanonicalJobStoredEvidence = Readonly<{
  job: Readonly<{
    jobId: string;
    idempotencyKey: string;
    requestSha256: string;
    request: NaverNewsRequestContract;
    provider: string;
    status: string;
    normalizedRecordCount: number;
  }>;
  completenessEvidence: NaverNewsCollectionCompletenessStoredEvidence;
  normalizedRecords: readonly NaverNewsNormalizedRecord[];
}>;

type JobDbRow = {
  job_id: unknown;
  idempotency_key: unknown;
  request_sha256: unknown;
  request_contract: unknown;
  provider: unknown;
  status: unknown;
  normalized_record_count: unknown;
  raw_evidence_count: unknown;
  collection_received_job_id: unknown;
  collection_received_payload: unknown;
};

type NormalizedDbRow = {
  record_id: unknown;
  raw_evidence_id: unknown;
  raw_job_id: unknown;
  normalization_outcome: unknown;
  normalized_record_id: unknown;
  provider: unknown;
  source_type: unknown;
  source_url: unknown;
  naver_url: unknown;
  source_host: unknown;
  title: unknown;
  summary: unknown;
  published_at: unknown;
  collected_at: unknown;
  content_sha256: unknown;
  record_sha256: unknown;
  normalized_payload: unknown;
};

const JOB_EVIDENCE_SQL = `SELECT
  jobs.job_id, jobs.idempotency_key, jobs.request_sha256, jobs.request_contract,
  jobs.provider, jobs.status, jobs.normalized_record_count, jobs.raw_evidence_count,
  audit.job_id AS collection_received_job_id,
  audit.bounded_payload AS collection_received_payload
FROM fandex.source_ingestion_jobs AS jobs
LEFT JOIN fandex.source_ingestion_audit_events AS audit
  ON audit.job_id = jobs.job_id
  AND audit.event_type = 'collection_received'
WHERE jobs.job_id = $1 AND jobs.provider = $2`;

const NORMALIZED_RECORDS_SQL = `SELECT
  nr.record_id, nr.raw_evidence_id,
  raw.job_id AS raw_job_id, raw.normalization_outcome, raw.normalized_record_id,
  nr.provider, nr.source_type, nr.source_url, nr.naver_url, nr.source_host,
  nr.title, nr.summary, nr.published_at, nr.collected_at,
  nr.content_sha256, nr.record_sha256, nr.normalized_payload
FROM fandex.source_ingestion_normalized_records AS nr
JOIN fandex.source_ingestion_raw_evidence AS raw
  ON raw.evidence_id = nr.raw_evidence_id
WHERE raw.job_id = $1 AND raw.normalization_outcome = 'normalized'
ORDER BY nr.record_id`;

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown, errorCode: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(errorCode);
  return value;
}

function asInteger(value: unknown, errorCode: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(errorCode);
  return number;
}

function asIso(value: unknown, errorCode: string): string {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(String(value));
  if (!Number.isFinite(timestamp)) throw new Error(errorCode);
  return new Date(timestamp).toISOString();
}

function asRequest(value: unknown): NaverNewsRequestContract {
  const request = asObject(value);
  if (!request || request.contractVersion !== NAVER_NEWS_INGESTION_CONTRACT_VERSION
      || request.provider !== NAVER_NEWS_PROVIDER || typeof request.collectionKey !== 'string'
      || typeof request.query !== 'string' || typeof request.display !== 'number'
      || typeof request.start !== 'number' || (request.sort !== 'date' && request.sort !== 'sim')) {
    throw new Error('naver_news_canonical_job_request_invalid');
  }
  return request as NaverNewsRequestContract;
}

function rehydrateNormalizedRecord(row: NormalizedDbRow, jobId: string): NaverNewsNormalizedRecord {
  const recordId = asString(row.record_id, 'naver_news_canonical_job_record_invalid');
  const rawEvidenceId = asString(row.raw_evidence_id, 'naver_news_canonical_job_record_invalid');
  const provider = asString(row.provider, 'naver_news_canonical_job_record_invalid');
  const sourceType = asString(row.source_type, 'naver_news_canonical_job_record_invalid');
  const sourceUrl = asString(row.source_url, 'naver_news_canonical_job_record_invalid');
  const naverUrl = row.naver_url === null ? null : asString(row.naver_url, 'naver_news_canonical_job_record_invalid');
  const sourceHost = asString(row.source_host, 'naver_news_canonical_job_record_invalid');
  const title = asString(row.title, 'naver_news_canonical_job_record_invalid');
  const summary = asString(row.summary, 'naver_news_canonical_job_record_invalid');
  const publishedAt = asIso(row.published_at, 'naver_news_canonical_job_record_invalid');
  const collectedAt = asIso(row.collected_at, 'naver_news_canonical_job_record_invalid');
  const contentSha256 = asString(row.content_sha256, 'naver_news_canonical_job_record_invalid');
  const recordSha256 = asString(row.record_sha256, 'naver_news_canonical_job_record_invalid');
  const payload = asObject(row.normalized_payload);
  const expectedPayload: NaverNewsNormalizedRecord['normalizedPayload'] = { provider: NAVER_NEWS_PROVIDER, sourceType: 'news_article', sourceUrl, naverUrl, sourceHost, title, summary, publishedAt };
  if (row.raw_job_id !== jobId || row.normalization_outcome !== 'normalized' || row.normalized_record_id !== recordId
      || provider !== NAVER_NEWS_PROVIDER || sourceType !== 'news_article'
      || !isSha256(recordId) || !isSha256(rawEvidenceId) || !isSha256(contentSha256) || !isSha256(recordSha256)
      || !payload || canonicalJson(payload) !== canonicalJson(expectedPayload)
      || contentSha256 !== sha256Canonical({ title, summary, sourceUrl, naverUrl, publishedAt })
      || recordSha256 !== sha256Canonical(expectedPayload)
      || recordId !== sha256Canonical({ contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION, provider: NAVER_NEWS_PROVIDER, recordSha256 })) {
    throw new Error('naver_news_canonical_job_record_invalid');
  }
  return Object.freeze({ recordId, rawEvidenceId, provider: NAVER_NEWS_PROVIDER, sourceType: 'news_article', sourceUrl, naverUrl, sourceHost, title, summary, publishedAt, collectedAt, contentSha256, recordSha256, normalizedPayload: Object.freeze(expectedPayload) });
}

export function createPostgresNaverNewsCanonicalJobEvidenceReadRepository(
  pool: NaverNewsIngestionPool,
): NaverNewsCanonicalJobEvidenceReadRepository {
  return Object.freeze({
    async readJobEvidence(jobId) {
      if (!isSha256(jobId)) throw new Error('naver_news_canonical_job_id_invalid');
      const client: Queryable & { release(): void } = await pool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        const jobResult = await client.query<JobDbRow>(JOB_EVIDENCE_SQL, [jobId, NAVER_NEWS_PROVIDER]);
        if (jobResult.rows.length > 1) throw new Error('naver_news_canonical_job_evidence_ambiguous');
        const row = jobResult.rows[0];
        if (!row) {
          await client.query('ROLLBACK');
          return null;
        }
        const request = asRequest(row.request_contract);
        const identity = buildNaverNewsJobIdentity(request);
        const normalizedResult = await client.query<NormalizedDbRow>(NORMALIZED_RECORDS_SQL, [jobId]);
        await client.query('ROLLBACK');
        const normalizedRecordCount = asInteger(row.normalized_record_count, 'naver_news_canonical_job_state_invalid');
        if (asString(row.job_id, 'naver_news_canonical_job_state_invalid') !== jobId
            || asString(row.provider, 'naver_news_canonical_job_state_invalid') !== NAVER_NEWS_PROVIDER
            || asString(row.status, 'naver_news_canonical_job_state_invalid') !== 'succeeded'
            || canonicalJson(request) !== canonicalJson(identity.request)
            || asString(row.idempotency_key, 'naver_news_canonical_job_state_invalid') !== identity.idempotencyKey
            || asString(row.request_sha256, 'naver_news_canonical_job_state_invalid') !== identity.requestSha256
            || identity.jobId !== jobId || normalizedRecordCount !== normalizedResult.rows.length) {
          throw new Error('naver_news_canonical_job_state_invalid');
        }
        const normalizedRecords = Object.freeze(normalizedResult.rows.map((record) => rehydrateNormalizedRecord(record, jobId)));
        return Object.freeze({
          job: Object.freeze({ jobId, idempotencyKey: identity.idempotencyKey, requestSha256: identity.requestSha256, request: identity.request, provider: NAVER_NEWS_PROVIDER, status: 'succeeded', normalizedRecordCount }),
          completenessEvidence: Object.freeze({
            jobId, provider: NAVER_NEWS_PROVIDER, requestContract: identity.request,
            rawEvidenceCount: row.raw_evidence_count,
            collectionReceived: row.collection_received_job_id === null ? null : Object.freeze({ jobId: asString(row.collection_received_job_id, 'naver_news_canonical_job_audit_invalid'), boundedPayload: row.collection_received_payload }),
          }),
          normalizedRecords,
        });
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* fail closed below */ }
        if (error instanceof Error && /^naver_news_canonical_job_[a-z_]+$/.test(error.message)) throw error;
        throw new Error('naver_news_canonical_job_read_failed');
      } finally {
        client.release();
      }
    },
  });
}

export type NaverNewsCanonicalJobEvidenceAssembly = Readonly<{
  canonicalArtistId: string;
  jobId: string;
  binding: CanonicalNaverNewsArtistBinding;
  request: NaverNewsRequestContract;
  completeness: NaverNewsCollectionCompletenessReadResult;
  eligibleNormalizedRecordIds: readonly string[];
  eligibleNormalizedRecords: readonly NaverNewsEligibleNormalizedRecord[];
  candidates: readonly CanonicalNaverNewsObservationCandidate[];
  verifications: readonly NaverNewsArtistRelevanceVerification[];
  observations: readonly CanonicalNaverNewsObservation[];
  observationSetCoverage: CanonicalObservationSetCoverage;
}>;

export async function assembleNaverNewsCanonicalJobEvidence(
  input: Readonly<{ canonicalArtistId: string; jobId: string }>,
  repository: NaverNewsCanonicalJobEvidenceReadRepository,
): Promise<NaverNewsCanonicalJobEvidenceAssembly> {
  const binding = bindCanonicalArtistToNaverNews(input.canonicalArtistId);
  const stored = await repository.readJobEvidence(input.jobId);
  if (!stored) throw new Error('naver_news_canonical_job_not_found');
  if (stored.job.provider !== binding.provider || stored.job.request.provider !== binding.provider
      || stored.job.request.query !== binding.query) {
    throw new Error('naver_news_canonical_job_artist_binding_mismatch');
  }
  const completeness = buildNaverNewsCollectionCompletenessReadModel(stored.completenessEvidence);
  const candidates = collapseCanonicalNaverNewsObservationCandidates(input.canonicalArtistId, stored.normalizedRecords);
  const verifications = Object.freeze(candidates.map((candidate) => verifyNaverNewsArtistRelevance(candidate)));
  const observations = Object.freeze(candidates.flatMap((candidate, index) => verifications[index].status === 'accepted'
    ? [promoteCanonicalNaverNewsObservation(candidate, verifications[index])]
    : []));
  const eligibleNormalizedRecords = Object.freeze(stored.normalizedRecords.map((record) => Object.freeze({
    recordId: record.recordId, rawEvidenceId: record.rawEvidenceId, jobId: input.jobId, provider: record.provider, sourceType: record.sourceType,
  })));
  const observationSetCoverage = evaluateCanonicalObservationSetCoverage({
    canonicalArtistId: input.canonicalArtistId, jobId: input.jobId,
    eligibleNormalizedRecords: { status: 'available', records: eligibleNormalizedRecords },
    candidates, verifications, observations,
  });
  return Object.freeze({
    canonicalArtistId: input.canonicalArtistId, jobId: input.jobId, binding, request: stored.job.request, completeness,
    eligibleNormalizedRecordIds: Object.freeze(stored.normalizedRecords.map((record) => record.recordId)),
    eligibleNormalizedRecords, candidates, verifications, observations, observationSetCoverage,
  });
}
