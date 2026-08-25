import 'server-only';

import type { Pool, PoolClient } from 'pg';

import {
  classifyPersistenceReplay,
  OUTBOX_MAX_ATTEMPTS,
  redactDatabaseError,
  sha256Canonical,
  validatePersistenceBundle,
  withSerializableRetries,
  type PersistenceBundle,
  type PersistenceResultStatus,
} from './contracts';
import { getRuntimeDatabasePool } from './db';

export type PersistentPreState = {
  normalized: { recordVersion: number; stateDigest: string } | null;
  request: { recordVersion: number; stateDigest: string; requestState: 'open' | 'closed' } | null;
};

export type PersistenceTransactionResult = {
  status: PersistenceResultStatus;
  idempotencyKey: string;
  normalizedAfterDigest: string | null;
  requestAfterDigest: string | null;
  error?: { code: string };
};

type PersistencePool = Pick<Pool, 'query' | 'connect'>;

export async function inspectPersistentPreState(
  requestId: string,
  internalSourceId: string,
  pool: PersistencePool = getRuntimeDatabasePool(),
): Promise<PersistentPreState> {
  const [normalized, request] = await Promise.all([
    pool.query<{ record_version: string; content_sha256: string }>(
      'SELECT record_version, content_sha256 FROM fandex.normalized_sources WHERE internal_source_id = $1',
      [internalSourceId],
    ),
    pool.query<{ record_version: string; state_sha256: string; request_state: 'open' | 'closed' }>(
      'SELECT record_version, state_sha256, request_state FROM fandex.historical_enrichment_requests WHERE request_id = $1 AND internal_source_id = $2',
      [requestId, internalSourceId],
    ),
  ]);
  return {
    normalized: normalized.rows[0] ? { recordVersion: Number(normalized.rows[0].record_version), stateDigest: normalized.rows[0].content_sha256 } : null,
    request: request.rows[0] ? { recordVersion: Number(request.rows[0].record_version), stateDigest: request.rows[0].state_sha256, requestState: request.rows[0].request_state } : null,
  };
}

export async function getPersistenceTransactionResult(
  idempotencyKey: string,
  pool: PersistencePool = getRuntimeDatabasePool(),
): Promise<PersistenceTransactionResult | null> {
  const result = await pool.query<{ status: string; after_digests: { normalized?: string; request?: string } | null }>(
    'SELECT status, after_digests FROM fandex.persistence_transactions WHERE idempotency_key = $1',
    [idempotencyKey],
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    status: row.status === 'applied' ? 'applied' : 'failed_rolled_back',
    idempotencyKey,
    normalizedAfterDigest: row.after_digests?.normalized ?? null,
    requestAfterDigest: row.after_digests?.request ?? null,
  };
}

async function applyInTransaction(client: PoolClient, bundle: PersistenceBundle): Promise<PersistenceTransactionResult> {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [bundle.idempotencyKey]);
  const existing = await client.query<{ canonical_payload_digest: string; status: string; after_digests: { normalized?: string; request?: string } | null }>(
    'SELECT canonical_payload_digest, status, after_digests FROM fandex.persistence_transactions WHERE idempotency_key = $1 FOR UPDATE',
    [bundle.idempotencyKey],
  );
  if (existing.rows[0]) {
    const row = existing.rows[0];
    const status = row ? classifyPersistenceReplay(row.canonical_payload_digest, bundle.canonicalPayloadDigest, row.status) : 'rejected_conflict';
    await client.query('ROLLBACK');
    return { status, idempotencyKey: bundle.idempotencyKey, normalizedAfterDigest: row?.after_digests?.normalized ?? null, requestAfterDigest: row?.after_digests?.request ?? null };
  }

  const normalizedBefore = await client.query<{ record_version: string; content_sha256: string }>(
    'SELECT record_version, content_sha256 FROM fandex.normalized_sources WHERE internal_source_id = $1 FOR UPDATE',
    [bundle.internalSourceId],
  );
  const requestBefore = await client.query<{ record_version: string; state_sha256: string; request_state: string }>(
    'SELECT record_version, state_sha256, request_state FROM fandex.historical_enrichment_requests WHERE request_id = $1 AND internal_source_id = $2 FOR UPDATE',
    [bundle.requestId, bundle.internalSourceId],
  );
  const source = normalizedBefore.rows[0];
  const request = requestBefore.rows[0];
  if (bundle.expectedState === 'absent') {
    if (source || request) {
      await client.query('ROLLBACK');
      return { status: 'rejected_stale_state', idempotencyKey: bundle.idempotencyKey, normalizedAfterDigest: null, requestAfterDigest: null };
    }
    await client.query(
      `INSERT INTO fandex.normalized_sources (
        internal_source_id, provider, source_type, office_code, article_id, title, summary,
        author_or_publisher, displayed_source_timestamp, normalized_provider_timestamp,
        content_sha256, record_version
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [bundle.internalSourceId, bundle.normalized.provider, bundle.normalized.sourceType,
        bundle.normalized.officeCode, bundle.normalized.articleId, bundle.normalized.title,
        bundle.normalized.summary, bundle.normalized.authorOrPublisher,
        bundle.normalized.displayedSourceTimestamp, bundle.normalized.normalizedProviderTimestamp,
        bundle.expectedNormalizedDigest, bundle.expectedNormalizedVersion],
    );
    await client.query(
      `INSERT INTO fandex.historical_enrichment_requests (
        request_id, internal_source_id, requested_fields, request_state,
        persistent_fulfilled, persistent_closed, closure_record_reference,
        state_sha256, record_version
      ) VALUES ($1,$2,$3,'open',false,false,NULL,$4,$5)`,
      [bundle.requestId, bundle.internalSourceId, bundle.request.requestedFields,
        bundle.expectedRequestDigest, bundle.expectedRequestVersion],
    );
  }
  const stale = bundle.expectedState === 'present' && (!source || !request || Number(source.record_version) !== bundle.expectedNormalizedVersion || source.content_sha256 !== bundle.expectedNormalizedDigest || Number(request.record_version) !== bundle.expectedRequestVersion || request.state_sha256 !== bundle.expectedRequestDigest || request.request_state !== 'open');
  if (stale) {
    await client.query('ROLLBACK');
    return { status: 'rejected_stale_state', idempotencyKey: bundle.idempotencyKey, normalizedAfterDigest: null, requestAfterDigest: null };
  }

  const inserted = await client.query(
    `INSERT INTO fandex.persistence_transactions (
      idempotency_key, request_id, internal_source_id, canonical_payload_digest,
      expected_normalized_version, expected_normalized_digest,
      expected_request_version, expected_request_digest,
      normalized_application_reference, closure_record_reference, status, before_digests
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'applying',$11::jsonb)
    ON CONFLICT (idempotency_key) DO NOTHING`,
    [bundle.idempotencyKey, bundle.requestId, bundle.internalSourceId, bundle.canonicalPayloadDigest,
      bundle.expectedNormalizedVersion, bundle.expectedNormalizedDigest, bundle.expectedRequestVersion,
      bundle.expectedRequestDigest, bundle.v108ApplicationRecordDigest, bundle.v110ClosureRecordDigest,
      JSON.stringify({ normalized: bundle.expectedState === 'absent' ? null : bundle.expectedNormalizedDigest, request: bundle.expectedState === 'absent' ? null : bundle.expectedRequestDigest })],
  );
  if (inserted.rowCount !== 1) throw new Error('transaction_identity_conflict');

  const normalizedUpdate = await client.query(
    `UPDATE fandex.normalized_sources SET
      title=$1, summary=$2, author_or_publisher=$3, content_sha256=$4,
      record_version=$5, updated_at=CURRENT_TIMESTAMP
    WHERE internal_source_id=$6 AND record_version=$7 AND content_sha256=$8`,
    [bundle.normalized.title, bundle.normalized.summary, bundle.normalized.authorOrPublisher,
      bundle.normalizedPostDigest, bundle.normalized.recordVersion, bundle.internalSourceId,
      bundle.expectedNormalizedVersion, bundle.expectedNormalizedDigest],
  );
  if (normalizedUpdate.rowCount !== 1) throw new Error('normalized_compare_and_swap_failed');

  const provenanceId = sha256Canonical({ internalSourceId: bundle.internalSourceId, evidence: bundle.evidence });
  const provenanceInsert = await client.query(
    `INSERT INTO fandex.source_evidence_provenance (
      provenance_id, internal_source_id, source_url, exact_headline, publisher,
      journalist_byline, normalized_journalist, semantic_roles,
      displayed_source_timestamp, normalized_provider_timestamp, evidence_sha256,
      evidence_width, evidence_height, verification_lineage, acceptance_lineage
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb)
    ON CONFLICT (internal_source_id, evidence_sha256) DO NOTHING`,
    [provenanceId, bundle.internalSourceId, bundle.evidence.sourceUrl, bundle.evidence.exactHeadline,
      bundle.evidence.publisher, bundle.evidence.journalistByline, bundle.evidence.normalizedJournalist,
      JSON.stringify({ publisher: 'publisher', journalist_byline: 'journalist/byline', author_inferred: false }),
      bundle.normalized.displayedSourceTimestamp, bundle.normalized.normalizedProviderTimestamp,
      bundle.evidence.evidenceSha256, bundle.evidence.evidenceWidth, bundle.evidence.evidenceHeight,
      JSON.stringify(bundle.evidence.verificationLineage), JSON.stringify(bundle.evidence.acceptanceLineage)],
  );
  if (provenanceInsert.rowCount !== 1) throw new Error('provenance_append_conflict');

  const requestUpdate = await client.query(
    `UPDATE fandex.historical_enrichment_requests SET
      persistent_fulfilled=true, request_state='closed', persistent_closed=true,
      closure_record_reference=$1, state_sha256=$2, record_version=$3
    WHERE request_id=$4 AND internal_source_id=$5 AND request_state='open'
      AND record_version=$6 AND state_sha256=$7`,
    [bundle.request.closureRecordReference, bundle.requestPostDigest, bundle.request.recordVersion,
      bundle.requestId, bundle.internalSourceId, bundle.expectedRequestVersion, bundle.expectedRequestDigest],
  );
  if (requestUpdate.rowCount !== 1) throw new Error('request_compare_and_swap_failed');

  const auditPayload = { event: 'persistence_bundle_applied', payloadDigest: bundle.canonicalPayloadDigest };
  await client.query(
    'INSERT INTO fandex.persistence_audit_events (idempotency_key, sequence, event_type, event_digest, bounded_payload) VALUES ($1,$2,$3,$4,$5::jsonb)',
    [bundle.idempotencyKey, 1, 'persistence_bundle_applied', sha256Canonical(auditPayload), JSON.stringify(auditPayload)],
  );
  const outboxId = sha256Canonical({ idempotencyKey: bundle.idempotencyKey, eventType: bundle.outbox.eventType });
  const outboxInsert = await client.query(
    `INSERT INTO fandex.ingestion_outbox
      (outbox_id, idempotency_key, status, event_type, bounded_payload, attempt_count, max_attempts, next_attempt_at)
      VALUES ($1,$2,'pending',$3,$4::jsonb,0,$5,CURRENT_TIMESTAMP)
      ON CONFLICT (idempotency_key, event_type) DO NOTHING`,
    [outboxId, bundle.idempotencyKey, bundle.outbox.eventType, JSON.stringify(bundle.outbox.payload), OUTBOX_MAX_ATTEMPTS],
  );
  if (outboxInsert.rowCount !== 1) throw new Error('outbox_append_conflict');
  const afterDigests = { normalized: bundle.normalizedPostDigest, request: bundle.requestPostDigest };
  const transactionUpdate = await client.query(
    `UPDATE fandex.persistence_transactions SET status='applied', after_digests=$1::jsonb, updated_at=CURRENT_TIMESTAMP
     WHERE idempotency_key=$2 AND status='applying'`,
    [JSON.stringify(afterDigests), bundle.idempotencyKey],
  );
  if (transactionUpdate.rowCount !== 1) throw new Error('transaction_finalize_conflict');
  const normalizedAfter = await client.query<{ record_version: string; content_sha256: string }>(
    'SELECT record_version, content_sha256 FROM fandex.normalized_sources WHERE internal_source_id=$1',
    [bundle.internalSourceId],
  );
  const requestAfter = await client.query<{ record_version: string; state_sha256: string; request_state: string; persistent_fulfilled: boolean; persistent_closed: boolean; closure_record_reference: string | null }>(
    `SELECT record_version, state_sha256, request_state, persistent_fulfilled,
      persistent_closed, closure_record_reference
     FROM fandex.historical_enrichment_requests WHERE request_id=$1 AND internal_source_id=$2`,
    [bundle.requestId, bundle.internalSourceId],
  );
  const normalizedPostcondition = normalizedAfter.rows[0];
  const requestPostcondition = requestAfter.rows[0];
  if (!normalizedPostcondition || Number(normalizedPostcondition.record_version) !== bundle.normalized.recordVersion || normalizedPostcondition.content_sha256 !== bundle.normalizedPostDigest) throw new Error('normalized_postcondition_failed');
  if (!requestPostcondition || Number(requestPostcondition.record_version) !== bundle.request.recordVersion || requestPostcondition.state_sha256 !== bundle.requestPostDigest || requestPostcondition.request_state !== 'closed' || !requestPostcondition.persistent_fulfilled || !requestPostcondition.persistent_closed || requestPostcondition.closure_record_reference !== bundle.request.closureRecordReference) throw new Error('request_postcondition_failed');
  await client.query('COMMIT');
  return { status: 'applied', idempotencyKey: bundle.idempotencyKey, normalizedAfterDigest: afterDigests.normalized, requestAfterDigest: afterDigests.request };
}

export async function applyPersistenceBundle(
  bundle: PersistenceBundle,
  pool: PersistencePool = getRuntimeDatabasePool(),
): Promise<PersistenceTransactionResult> {
  try {
    validatePersistenceBundle(bundle);
  } catch {
    return { status: 'rejected_conflict', idempotencyKey: bundle.idempotencyKey, normalizedAfterDigest: null, requestAfterDigest: null };
  }
  try {
    return await withSerializableRetries(async () => {
      const client = await pool.connect();
      try {
        return await applyInTransaction(client, bundle);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
  } catch (error) {
    return { status: 'failed_rolled_back', idempotencyKey: bundle.idempotencyKey, normalizedAfterDigest: null, requestAfterDigest: null, error: redactDatabaseError(error) };
  }
}

export type ClaimedOutboxEvent = { outboxId: string; idempotencyKey: string; eventType: string; payload: Record<string, unknown>; attemptCount: number; leaseOwner: string };

export async function claimOutboxBatch(
  leaseOwner: string,
  limit: number,
  leaseSeconds: number,
  pool: PersistencePool = getRuntimeDatabasePool(),
): Promise<ClaimedOutboxEvent[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const boundedLease = Math.min(Math.max(leaseSeconds, 5), 300);
  const result = await pool.query<{ outbox_id: string; idempotency_key: string; event_type: string; bounded_payload: Record<string, unknown>; attempt_count: number }>(
    `WITH candidates AS (
      SELECT outbox_id FROM fandex.ingestion_outbox
      WHERE (status IN ('pending','retryable_failed') OR (status='processing' AND lease_expires_at <= CURRENT_TIMESTAMP))
        AND attempt_count < max_attempts
        AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
        AND (lease_expires_at IS NULL OR lease_expires_at <= CURRENT_TIMESTAMP)
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $1
    ) UPDATE fandex.ingestion_outbox AS outbox SET
      status='processing', lease_owner=$2,
      lease_expires_at=CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second'),
      attempt_count=outbox.attempt_count + 1, updated_at=CURRENT_TIMESTAMP
    FROM candidates WHERE outbox.outbox_id=candidates.outbox_id
    RETURNING outbox.outbox_id, outbox.idempotency_key, outbox.event_type,
      outbox.bounded_payload, outbox.attempt_count`,
    [boundedLimit, leaseOwner, boundedLease],
  );
  return result.rows.map((row) => ({ outboxId: row.outbox_id, idempotencyKey: row.idempotency_key, eventType: row.event_type, payload: row.bounded_payload, attemptCount: row.attempt_count, leaseOwner }));
}

export async function completeOutboxEvent(outboxId: string, leaseOwner: string, pool: PersistencePool = getRuntimeDatabasePool()): Promise<boolean> {
  const result = await pool.query(
    `UPDATE fandex.ingestion_outbox SET status='applied', lease_owner=NULL,
      lease_expires_at=NULL, bounded_error_metadata=NULL, updated_at=CURRENT_TIMESTAMP
     WHERE outbox_id=$1 AND status='processing' AND lease_owner=$2`,
    [outboxId, leaseOwner],
  );
  return result.rowCount === 1;
}

export async function failOutboxEvent(
  outboxId: string,
  leaseOwner: string,
  errorCode: string,
  retryDelaySeconds: number,
  pool: PersistencePool = getRuntimeDatabasePool(),
): Promise<'retryable_failed' | 'dead_letter' | 'rejected'> {
  const boundedDelay = Math.min(Math.max(retryDelaySeconds, 1), 3_600);
  const result = await pool.query<{ status: 'retryable_failed' | 'dead_letter' }>(
    `UPDATE fandex.ingestion_outbox SET
      status=CASE WHEN attempt_count >= max_attempts THEN 'dead_letter' ELSE 'retryable_failed' END,
      lease_owner=NULL, lease_expires_at=NULL,
      next_attempt_at=CASE WHEN attempt_count >= max_attempts THEN NULL ELSE CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second') END,
      bounded_error_metadata=jsonb_build_object('code',$4::text), updated_at=CURRENT_TIMESTAMP
     WHERE outbox_id=$1 AND status='processing' AND lease_owner=$2
     RETURNING status`,
    [outboxId, leaseOwner, boundedDelay, errorCode.slice(0, 128)],
  );
  return result.rows[0]?.status ?? 'rejected';
}
