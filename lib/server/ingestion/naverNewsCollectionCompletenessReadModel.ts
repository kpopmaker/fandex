import {
  evaluateNaverNewsCollectionCompleteness,
  type NaverNewsCollectionCompleteness,
} from './naverNewsCollectionCompleteness';
import {
  isSha256,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_PROVIDER,
  type NaverNewsRequestContract,
} from './naverNewsContracts';
import type { NaverNewsIngestionPool } from './naverNewsRepository';

type QueryResultLike<T> = { rows: T[] };
type Queryable = { query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResultLike<T>> };

export type NaverNewsCollectionCompletenessStoredEvidence = Readonly<{
  jobId: string;
  provider: string;
  requestContract: unknown;
  rawEvidenceCount: unknown;
  collectionReceived: Readonly<{
    jobId: string;
    boundedPayload: unknown;
  }> | null;
}>;

export type NaverNewsCollectionCompletenessReadModel = Readonly<{
  jobId: string;
  provider: typeof NAVER_NEWS_PROVIDER;
  request: NaverNewsRequestContract;
  providerTotal: number;
  received: number;
  completeness: NaverNewsCollectionCompleteness;
}>;

export type NaverNewsCollectionCompletenessReadResult =
  | Readonly<{ status: 'available'; readModel: NaverNewsCollectionCompletenessReadModel }>
  | Readonly<{ status: 'not_found' }>
  | Readonly<{
    status: 'evidence_unavailable';
    reason: 'collection_received_audit_missing' | 'stored_evidence_invalid';
  }>;

export type NaverNewsCollectionCompletenessReadRepository = Readonly<{
  readCollectionCompletenessEvidence(jobId: string): Promise<NaverNewsCollectionCompletenessStoredEvidence | null>;
}>;

type EvidenceDbRow = {
  job_id: unknown;
  provider: unknown;
  request_contract: unknown;
  raw_evidence_count: unknown;
  collection_received_job_id: unknown;
  collection_received_payload: unknown;
};

const COMPLETENESS_EVIDENCE_SQL = `SELECT
  jobs.job_id, jobs.provider, jobs.request_contract, jobs.raw_evidence_count,
  audit.job_id AS collection_received_job_id,
  audit.bounded_payload AS collection_received_payload
FROM fandex.source_ingestion_jobs AS jobs
LEFT JOIN fandex.source_ingestion_audit_events AS audit
  ON audit.job_id = jobs.job_id
  AND audit.event_type = 'collection_received'
WHERE jobs.job_id = $1 AND jobs.provider = $2`;

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asSafeNonNegativeInteger(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
}

function asRequestContract(value: unknown): NaverNewsRequestContract | null {
  const request = asObject(value);
  if (!request || request.contractVersion !== NAVER_NEWS_INGESTION_CONTRACT_VERSION
      || request.provider !== NAVER_NEWS_PROVIDER || typeof request.collectionKey !== 'string'
      || typeof request.query !== 'string' || typeof request.display !== 'number'
      || typeof request.start !== 'number' || (request.sort !== 'date' && request.sort !== 'sim')) {
    return null;
  }
  return request as NaverNewsRequestContract;
}

function readModelFromStoredEvidence(
  evidence: NaverNewsCollectionCompletenessStoredEvidence,
): NaverNewsCollectionCompletenessReadResult {
  if (!evidence.collectionReceived) {
    return Object.freeze({ status: 'evidence_unavailable', reason: 'collection_received_audit_missing' });
  }
  const request = asRequestContract(evidence.requestContract);
  const rawEvidenceCount = asSafeNonNegativeInteger(evidence.rawEvidenceCount);
  const payload = asObject(evidence.collectionReceived.boundedPayload);
  const providerTotal = asSafeNonNegativeInteger(payload?.providerTotal);
  const received = asSafeNonNegativeInteger(payload?.received);
  if (!isSha256(evidence.jobId) || evidence.provider !== NAVER_NEWS_PROVIDER
      || evidence.collectionReceived.jobId !== evidence.jobId || !request
      || rawEvidenceCount === null || providerTotal === null || received === null
      || rawEvidenceCount !== received) {
    return Object.freeze({ status: 'evidence_unavailable', reason: 'stored_evidence_invalid' });
  }

  try {
    const completeness = evaluateNaverNewsCollectionCompleteness({
      providerTotal,
      counts: { received },
      identity: { request },
    } as Parameters<typeof evaluateNaverNewsCollectionCompleteness>[0]);
    return Object.freeze({
      status: 'available',
      readModel: Object.freeze({
        jobId: evidence.jobId,
        provider: NAVER_NEWS_PROVIDER,
        request,
        providerTotal,
        received,
        completeness,
      }),
    });
  } catch {
    return Object.freeze({ status: 'evidence_unavailable', reason: 'stored_evidence_invalid' });
  }
}

export function buildNaverNewsCollectionCompletenessReadModel(
  evidence: NaverNewsCollectionCompletenessStoredEvidence | null,
): NaverNewsCollectionCompletenessReadResult {
  return evidence === null ? Object.freeze({ status: 'not_found' }) : readModelFromStoredEvidence(evidence);
}

export function createPostgresNaverNewsCollectionCompletenessReadRepository(
  pool: NaverNewsIngestionPool,
): NaverNewsCollectionCompletenessReadRepository {
  return Object.freeze({
    async readCollectionCompletenessEvidence(jobId) {
      if (!isSha256(jobId)) throw new Error('naver_news_completeness_job_id_invalid');
      const client: Queryable & { release(): void } = await pool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        const result = await client.query<EvidenceDbRow>(COMPLETENESS_EVIDENCE_SQL, [jobId, NAVER_NEWS_PROVIDER]);
        if (result.rows.length > 1) throw new Error('naver_news_completeness_evidence_ambiguous');
        await client.query('ROLLBACK');
        const row = result.rows[0];
        if (!row) return null;
        const auditJobId = typeof row.collection_received_job_id === 'string'
          ? row.collection_received_job_id
          : null;
        return Object.freeze({
          jobId: String(row.job_id),
          provider: String(row.provider),
          requestContract: row.request_contract,
          rawEvidenceCount: row.raw_evidence_count,
          collectionReceived: auditJobId === null ? null : Object.freeze({
            jobId: auditJobId,
            boundedPayload: row.collection_received_payload,
          }),
        });
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* fail closed below */ }
        if (error instanceof Error && /^naver_news_completeness_[a-z_]+$/.test(error.message)) throw error;
        throw new Error('naver_news_completeness_read_failed');
      } finally {
        client.release();
      }
    },
  });
}
