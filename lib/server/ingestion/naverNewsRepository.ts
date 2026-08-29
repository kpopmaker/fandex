import {
  canonicalJson,
  isSha256,
  NAVER_NEWS_CLAIM_LEASE_SECONDS,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_JOB_MAX_ATTEMPTS,
  NAVER_NEWS_PROVIDER,
  sha256Canonical,
  validateNaverNewsIngestionWritePlan,
  type NaverNewsIngestionWritePlan,
  type NaverNewsJobIdentity,
} from './naverNewsContracts';

type QueryResultLike<T> = { rowCount: number | null; rows: T[] };
type Queryable = {
  query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResultLike<T>>;
};
type TransactionClient = Queryable & { release(): void };
export type NaverNewsIngestionPool = { connect(): Promise<TransactionClient> };

type JobRow = {
  job_id: string;
  idempotency_key: string;
  request_sha256: string;
  request_contract: unknown;
  status: 'pending' | 'running' | 'succeeded' | 'retryable_failed' | 'dead_letter';
  attempt_count: number | string;
  max_attempts: number | string;
  claim_token: string | null;
  lease_owner: string | null;
  lease_expires_at: string | Date | null;
  result_sha256: string | null;
};

export type EnsureNaverNewsJobResult =
  | Readonly<{ status: 'created' | 'existing' }>
  | Readonly<{ status: 'idempotent_succeeded'; resultSha256: string }>
  | Readonly<{ status: 'dead_letter' | 'conflict' }>;

export type ClaimNaverNewsJobResult =
  | Readonly<{ status: 'claimed'; claimToken: string; attempt: number; leaseExpiresAt: string }>
  | Readonly<{ status: 'idempotent_succeeded'; resultSha256: string }>
  | Readonly<{ status: 'busy' | 'dead_letter' | 'conflict' }>;

export type CompleteNaverNewsJobResult =
  | Readonly<{ status: 'applied' | 'idempotent_succeeded'; resultSha256: string }>
  | Readonly<{ status: 'conflict' | 'claim_lost' }>;

export type FailNaverNewsJobResult = Readonly<{
  status: 'retryable_failed' | 'dead_letter' | 'claim_lost';
}>;

export interface NaverNewsIngestionRepository {
  ensureJob(identity: NaverNewsJobIdentity, now: string): Promise<EnsureNaverNewsJobResult>;
  claimJob(identity: NaverNewsJobIdentity, workerId: string, now: string): Promise<ClaimNaverNewsJobResult>;
  completeJob(
    identity: NaverNewsJobIdentity,
    workerId: string,
    claimToken: string,
    plan: NaverNewsIngestionWritePlan,
    now: string,
  ): Promise<CompleteNaverNewsJobResult>;
  failJob(
    identity: NaverNewsJobIdentity,
    workerId: string,
    claimToken: string,
    errorCode: string,
    now: string,
  ): Promise<FailNaverNewsJobResult>;
}

const JOB_SELECT = `SELECT
  job_id, idempotency_key, request_sha256, request_contract, status,
  attempt_count, max_attempts, claim_token, lease_owner, lease_expires_at, result_sha256
FROM fandex.source_ingestion_jobs
WHERE job_id = $1 OR idempotency_key = $2 OR (provider = $3 AND collection_key = $4)
FOR UPDATE`;

function normalizeIso(value: string, errorCode: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(errorCode);
  return new Date(timestamp).toISOString();
}

function validateWorkerId(workerId: string): void {
  if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/.test(workerId)) throw new Error('naver_news_worker_id_invalid');
}

function rowMatchesIdentity(row: JobRow, identity: NaverNewsJobIdentity): boolean {
  return row.job_id === identity.jobId
    && row.idempotency_key === identity.idempotencyKey
    && row.request_sha256 === identity.requestSha256
    && canonicalJson(row.request_contract) === canonicalJson(identity.request);
}

function asAttempt(row: JobRow): number {
  const value = Number(row.attempt_count);
  const maximum = Number(row.max_attempts);
  if (!Number.isInteger(value) || value < 0 || maximum !== NAVER_NEWS_JOB_MAX_ATTEMPTS || value > maximum) {
    throw new Error('naver_news_job_state_invalid');
  }
  return value;
}

async function nextAuditSequence(client: Queryable, jobId: string): Promise<number> {
  const result = await client.query<{ next_sequence: number | string }>(
    'SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM fandex.source_ingestion_audit_events WHERE job_id = $1',
    [jobId],
  );
  const sequence = Number(result.rows[0]?.next_sequence);
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error('naver_news_audit_sequence_invalid');
  return sequence;
}

async function appendAudit(
  client: Queryable,
  jobId: string,
  sequence: number,
  eventType: string,
  boundedPayload: Readonly<Record<string, string | number>>,
  eventSha256 = sha256Canonical({ eventType, boundedPayload }),
): Promise<void> {
  if (!isSha256(eventSha256) || Buffer.byteLength(canonicalJson(boundedPayload), 'utf8') > 4096) {
    throw new Error('naver_news_audit_event_invalid');
  }
  await client.query(
    `INSERT INTO fandex.source_ingestion_audit_events
      (job_id, sequence, event_type, event_sha256, bounded_payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [jobId, sequence, eventType, eventSha256, JSON.stringify(boundedPayload)],
  );
}

async function withTransaction<T>(pool: NaverNewsIngestionPool, operation: (client: TransactionClient) => Promise<T>): Promise<T> {
  const client = await pool.connect().catch(() => {
    throw new Error('naver_news_repository_operation_failed');
  });
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* fail closed below */ }
    if (error instanceof Error && /^naver_news_[a-z_]+$/.test(error.message)) throw error;
    throw new Error('naver_news_repository_operation_failed');
  } finally {
    client.release();
  }
}

async function lockedJob(client: Queryable, identity: NaverNewsJobIdentity): Promise<JobRow | null> {
  const result = await client.query<JobRow>(JOB_SELECT, [
    identity.jobId,
    identity.idempotencyKey,
    NAVER_NEWS_PROVIDER,
    identity.request.collectionKey,
  ]);
  if (result.rows.length > 1) throw new Error('naver_news_job_identity_collision');
  return result.rows[0] ?? null;
}

export function createPostgresNaverNewsIngestionRepository(
  pool: NaverNewsIngestionPool,
): NaverNewsIngestionRepository {
  const repository: NaverNewsIngestionRepository = {
    async ensureJob(identity, now) {
      const createdAt = normalizeIso(now, 'naver_news_worker_time_invalid');
      return withTransaction(pool, async (client) => {
        const inserted = await client.query<{ job_id: string }>(
          `INSERT INTO fandex.source_ingestion_jobs
            (job_id, idempotency_key, request_sha256, contract_version, provider, collection_key,
             request_contract, status, attempt_count, max_attempts, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'pending', 0, $8, $9, $9)
           ON CONFLICT DO NOTHING
           RETURNING job_id`,
          [
            identity.jobId,
            identity.idempotencyKey,
            identity.requestSha256,
            NAVER_NEWS_INGESTION_CONTRACT_VERSION,
            NAVER_NEWS_PROVIDER,
            identity.request.collectionKey,
            JSON.stringify(identity.request),
            NAVER_NEWS_JOB_MAX_ATTEMPTS,
            createdAt,
          ],
        );
        if (inserted.rowCount === 1) {
          const payload = Object.freeze({ requestSha256: identity.requestSha256 });
          await appendAudit(client, identity.jobId, 1, 'job_enqueued', payload);
          return { status: 'created' as const };
        }
        const row = await lockedJob(client, identity);
        if (!row || !rowMatchesIdentity(row, identity)) return { status: 'conflict' as const };
        asAttempt(row);
        if (row.status === 'succeeded') {
          if (!isSha256(row.result_sha256)) throw new Error('naver_news_job_state_invalid');
          return { status: 'idempotent_succeeded' as const, resultSha256: row.result_sha256 };
        }
        if (row.status === 'dead_letter') return { status: 'dead_letter' as const };
        return { status: 'existing' as const };
      });
    },

    async claimJob(identity, workerId, now) {
      validateWorkerId(workerId);
      const claimedAt = normalizeIso(now, 'naver_news_worker_time_invalid');
      return withTransaction(pool, async (client) => {
        const row = await lockedJob(client, identity);
        if (!row || !rowMatchesIdentity(row, identity)) return { status: 'conflict' as const };
        const attempt = asAttempt(row);
        if (row.status === 'succeeded') {
          if (!isSha256(row.result_sha256)) throw new Error('naver_news_job_state_invalid');
          return { status: 'idempotent_succeeded' as const, resultSha256: row.result_sha256 };
        }
        if (row.status === 'dead_letter') return { status: 'dead_letter' as const };
        const leaseIsCurrent = row.status === 'running'
          && row.lease_expires_at !== null
          && Date.parse(String(row.lease_expires_at)) > Date.parse(claimedAt);
        if (leaseIsCurrent) return { status: 'busy' as const };
        if (attempt >= NAVER_NEWS_JOB_MAX_ATTEMPTS) {
          await client.query(
            `UPDATE fandex.source_ingestion_jobs
             SET status = 'dead_letter', claim_token = NULL, lease_owner = NULL, lease_expires_at = NULL,
                 bounded_error_metadata = $2::jsonb, updated_at = $3
             WHERE job_id = $1`,
            [identity.jobId, JSON.stringify({ code: 'claim_attempts_exhausted' }), claimedAt],
          );
          const sequence = await nextAuditSequence(client, identity.jobId);
          await appendAudit(client, identity.jobId, sequence, 'job_dead_lettered', { attempt, code: 'claim_attempts_exhausted' });
          return { status: 'dead_letter' as const };
        }
        const nextAttempt = attempt + 1;
        const leaseExpiresAt = new Date(Date.parse(claimedAt) + NAVER_NEWS_CLAIM_LEASE_SECONDS * 1000).toISOString();
        const claimToken = sha256Canonical({
          contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
          jobId: identity.jobId,
          workerId,
          attempt: nextAttempt,
          claimedAt,
        });
        await client.query(
          `UPDATE fandex.source_ingestion_jobs
           SET status = 'running', attempt_count = $2, claim_token = $3, lease_owner = $4,
               lease_expires_at = $5, bounded_error_metadata = NULL, updated_at = $6
           WHERE job_id = $1`,
          [identity.jobId, nextAttempt, claimToken, workerId, leaseExpiresAt, claimedAt],
        );
        const sequence = await nextAuditSequence(client, identity.jobId);
        await appendAudit(client, identity.jobId, sequence, 'job_claimed', {
          attempt: nextAttempt,
          claimTokenSha256: sha256Canonical(claimToken),
        });
        return { status: 'claimed' as const, claimToken, attempt: nextAttempt, leaseExpiresAt };
      });
    },

    async completeJob(identity, workerId, claimToken, plan, now) {
      validateWorkerId(workerId);
      if (!isSha256(claimToken) || canonicalJson(plan.identity) !== canonicalJson(identity)) {
        throw new Error('naver_news_completion_input_invalid');
      }
      validateNaverNewsIngestionWritePlan(plan);
      const completedAt = normalizeIso(now, 'naver_news_worker_time_invalid');
      return withTransaction(pool, async (client) => {
        const row = await lockedJob(client, identity);
        if (!row || !rowMatchesIdentity(row, identity)) return { status: 'conflict' as const };
        if (row.status === 'succeeded') {
          return row.result_sha256 === plan.resultSha256
            ? { status: 'idempotent_succeeded' as const, resultSha256: plan.resultSha256 }
            : { status: 'conflict' as const };
        }
        const leaseExpiry = row.lease_expires_at === null ? Number.NaN : Date.parse(String(row.lease_expires_at));
        if (row.status !== 'running' || row.claim_token !== claimToken || row.lease_owner !== workerId
            || !Number.isFinite(leaseExpiry) || leaseExpiry <= Date.parse(completedAt)) {
          return { status: 'claim_lost' as const };
        }

        for (const evidence of plan.rawEvidence) {
          await client.query(
            `INSERT INTO fandex.source_ingestion_raw_evidence
              (evidence_id, job_id, item_index, observed_at, raw_payload, raw_payload_sha256,
               normalization_outcome, normalized_record_id, rejection_code)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
            [
              evidence.evidenceId,
              evidence.jobId,
              evidence.itemIndex,
              evidence.observedAt,
              JSON.stringify(evidence.rawPayload),
              evidence.rawPayloadSha256,
              evidence.normalizationOutcome,
              evidence.normalizedRecordId,
              evidence.rejectionCode,
            ],
          );
        }

        for (const record of plan.normalizedRecords) {
          const inserted = await client.query<{ record_id: string }>(
            `INSERT INTO fandex.source_ingestion_normalized_records
              (record_id, raw_evidence_id, provider, source_type, source_url, naver_url, source_host,
               title, summary, published_at, collected_at, content_sha256, record_sha256, normalized_payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
             ON CONFLICT (record_id) DO NOTHING
             RETURNING record_id`,
            [
              record.recordId,
              record.rawEvidenceId,
              record.provider,
              record.sourceType,
              record.sourceUrl,
              record.naverUrl,
              record.sourceHost,
              record.title,
              record.summary,
              record.publishedAt,
              record.collectedAt,
              record.contentSha256,
              record.recordSha256,
              JSON.stringify(record.normalizedPayload),
            ],
          );
          if (inserted.rowCount === 0) {
            const existing = await client.query<{ record_sha256: string; normalized_payload: unknown }>(
              `SELECT record_sha256, normalized_payload
               FROM fandex.source_ingestion_normalized_records
               WHERE record_id = $1`,
              [record.recordId],
            );
            if (existing.rows[0]?.record_sha256 !== record.recordSha256
                || canonicalJson(existing.rows[0]?.normalized_payload) !== canonicalJson(record.normalizedPayload)) {
              throw new Error('naver_news_normalized_record_conflict');
            }
          }
        }

        await client.query(
          `UPDATE fandex.source_ingestion_jobs
           SET status = 'succeeded', result_sha256 = $2,
               raw_evidence_count = $3, normalized_record_count = $4,
               duplicate_record_count = $5, rejected_item_count = $6,
               claim_token = NULL, lease_owner = NULL, lease_expires_at = NULL,
               bounded_error_metadata = NULL, updated_at = $7
           WHERE job_id = $1`,
          [
            identity.jobId,
            plan.resultSha256,
            plan.counts.rawEvidence,
            plan.counts.normalizedRecords,
            plan.counts.duplicateRecords,
            plan.counts.rejectedItems,
            completedAt,
          ],
        );
        let sequence = await nextAuditSequence(client, identity.jobId);
        for (const event of plan.audit) {
          await appendAudit(client, identity.jobId, sequence, event.eventType, event.boundedPayload, event.eventSha256);
          sequence += 1;
        }
        return { status: 'applied' as const, resultSha256: plan.resultSha256 };
      });
    },

    async failJob(identity, workerId, claimToken, errorCode, now) {
      validateWorkerId(workerId);
      if (!isSha256(claimToken) || !/^[a-z0-9_]{1,64}$/.test(errorCode)) {
        throw new Error('naver_news_failure_input_invalid');
      }
      const failedAt = normalizeIso(now, 'naver_news_worker_time_invalid');
      return withTransaction(pool, async (client) => {
        const row = await lockedJob(client, identity);
        if (!row || !rowMatchesIdentity(row, identity) || row.status !== 'running'
            || row.claim_token !== claimToken || row.lease_owner !== workerId) {
          return { status: 'claim_lost' as const };
        }
        const attempt = asAttempt(row);
        const deadLetter = attempt >= NAVER_NEWS_JOB_MAX_ATTEMPTS;
        const status = deadLetter ? 'dead_letter' as const : 'retryable_failed' as const;
        await client.query(
          `UPDATE fandex.source_ingestion_jobs
           SET status = $2, claim_token = NULL, lease_owner = NULL, lease_expires_at = NULL,
               bounded_error_metadata = $3::jsonb, updated_at = $4
           WHERE job_id = $1`,
          [identity.jobId, status, JSON.stringify({ code: errorCode }), failedAt],
        );
        const sequence = await nextAuditSequence(client, identity.jobId);
        await appendAudit(
          client,
          identity.jobId,
          sequence,
          deadLetter ? 'job_dead_lettered' : 'job_retryable_failed',
          { attempt, code: errorCode },
        );
        return { status };
      });
    },
  };
  return Object.freeze(repository);
}
