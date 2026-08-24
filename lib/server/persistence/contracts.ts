import { createHash } from 'node:crypto';

export const MAX_SERIALIZATION_RETRIES = 3;
export const OUTBOX_MAX_ATTEMPTS = 8;
export const V112_SCHEMA_VERSION = 'v112_postgresql_schema_v1';
export const V112_V113_FOUNDATION_LINEAGE = Object.freeze({
  v112SchemaManifestDigest: '43a21a2bd9f7c48dfed78bb945ac6dfc8af03e00e911d851a56ada5509af83d0',
  v112MigrationPlanDigest: '3fc7891174e383153a9760c944fee1984f86409896438cf8d3d27067b1cae7cd',
  v112AtomicTransactionPlanDigest: 'd2bbd16891eb6e3b500be8d0154024723ed8cc25a8762ebea2c4a9ee61c39e53',
  v112RollbackPlanDigest: '46b3cbd0b3a3ed9a9ede14228b51727e433780cf143ec7fa5e403a1aad498956',
  v112IdempotencyKey: 'c177aa26b45692bdb3c442bc8f361f04d834c9d5108d90a6bcbd3e0e68ce7465',
  v113ProviderDescriptorDigest: '2b86b1730dcf4910dbcef05ae60a84a6214b424c810b5278b8fd3d2d630e2cc6',
});

export type PersistenceResultStatus =
  | 'applied'
  | 'idempotent_existing_result'
  | 'rejected_conflict'
  | 'rejected_stale_state'
  | 'failed_rolled_back';

export type QueryResultLike<T = Record<string, unknown>> = {
  rowCount: number | null;
  rows: T[];
};

export type Queryable = {
  query<T = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<QueryResultLike<T>>;
};

export type PersistenceBundle = {
  requestId: string;
  internalSourceId: string;
  idempotencyKey: string;
  canonicalPayloadDigest: string;
  v108ApplicationRecordDigest: string;
  v110ClosureRecordDigest: string;
  foundationLineage: typeof V112_V113_FOUNDATION_LINEAGE;
  expectedNormalizedVersion: number;
  expectedNormalizedDigest: string;
  expectedRequestVersion: number;
  expectedRequestDigest: string;
  normalizedPostDigest: string;
  requestPostDigest: string;
  normalized: {
    provider: string;
    sourceType: string;
    officeCode: string;
    articleId: string;
    title: string;
    summary: string;
    authorOrPublisher: string;
    displayedSourceTimestamp: string;
    normalizedProviderTimestamp: string;
    contentSha256: string;
    recordVersion: number;
  };
  evidence: {
    sourceUrl: string;
    exactHeadline: string;
    publisher: string;
    journalistByline: string;
    normalizedJournalist: string;
    evidenceSha256: string;
    evidenceWidth: number;
    evidenceHeight: number;
    verificationLineage: Record<string, unknown>;
    acceptanceLineage: Record<string, unknown>;
  };
  request: {
    requestedFields: ['content_context', 'source_attribution'];
    closureRecordReference: string;
    recordVersion: number;
  };
  outbox: {
    eventType: string;
    payload: Record<string, unknown>;
  };
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Canonical(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

export function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

export function buildV112CanonicalWriteSet(bundle: PersistenceBundle) {
  return {
    normalized: {
      '/title': bundle.normalized.title,
      '/summary': bundle.normalized.summary,
      '/author_or_publisher': bundle.normalized.authorOrPublisher,
    },
    provenance: {
      source_url: bundle.evidence.sourceUrl,
      exact_headline: bundle.evidence.exactHeadline,
      publisher: bundle.evidence.publisher,
      journalist_byline: bundle.evidence.journalistByline,
      normalized_journalist: bundle.evidence.normalizedJournalist,
      semantic_roles: {
        publisher: 'publisher',
        journalist_byline: 'journalist/byline',
        author_inferred: false,
      },
      displayed_source_timestamp: bundle.normalized.displayedSourceTimestamp,
      normalized_provider_timestamp: bundle.normalized.normalizedProviderTimestamp,
      evidence_sha256: bundle.evidence.evidenceSha256,
      evidence_dimensions: [bundle.evidence.evidenceWidth, bundle.evidence.evidenceHeight],
    },
    request: {
      persistent_fulfilled: true,
      request_state: 'closed',
      persistent_closed: true,
      closure_record_reference: bundle.v110ClosureRecordDigest,
    },
  };
}

export function derivePersistenceIdempotencyKey(bundle: PersistenceBundle): string {
  const writeSetDigest = sha256Canonical(buildV112CanonicalWriteSet(bundle));
  return sha256Canonical({
    request_id: bundle.requestId,
    internal_source_id: bundle.internalSourceId,
    v108_application_record_sha256: bundle.v108ApplicationRecordDigest,
    v110_closure_record_sha256: bundle.v110ClosureRecordDigest,
    schema_version: V112_SCHEMA_VERSION,
    canonical_write_set_sha256: writeSetDigest,
  });
}

export function buildCanonicalPersistencePayload(bundle: PersistenceBundle) {
  return {
    requestId: bundle.requestId,
    internalSourceId: bundle.internalSourceId,
    expectedNormalizedVersion: bundle.expectedNormalizedVersion,
    expectedNormalizedDigest: bundle.expectedNormalizedDigest,
    expectedRequestVersion: bundle.expectedRequestVersion,
    expectedRequestDigest: bundle.expectedRequestDigest,
    normalizedPostDigest: bundle.normalizedPostDigest,
    requestPostDigest: bundle.requestPostDigest,
    normalized: bundle.normalized,
    evidence: bundle.evidence,
    request: bundle.request,
    outbox: bundle.outbox,
    v108ApplicationRecordDigest: bundle.v108ApplicationRecordDigest,
    v110ClosureRecordDigest: bundle.v110ClosureRecordDigest,
    foundationLineage: bundle.foundationLineage,
  };
}

export function validatePersistenceBundle(bundle: PersistenceBundle): void {
  const digests = [
    bundle.idempotencyKey,
    bundle.canonicalPayloadDigest,
    bundle.v108ApplicationRecordDigest,
    bundle.v110ClosureRecordDigest,
    bundle.expectedNormalizedDigest,
    bundle.expectedRequestDigest,
    bundle.normalizedPostDigest,
    bundle.requestPostDigest,
    bundle.normalized.contentSha256,
    bundle.evidence.evidenceSha256,
    ...Object.values(bundle.foundationLineage),
  ];
  if (!digests.every(isSha256)) throw new Error('invalid_persistence_digest');
  if (derivePersistenceIdempotencyKey(bundle) !== bundle.idempotencyKey) throw new Error('invalid_idempotency_key');
  if (sha256Canonical(buildCanonicalPersistencePayload(bundle)) !== bundle.canonicalPayloadDigest) throw new Error('invalid_canonical_payload_digest');
  if (bundle.request.requestedFields.join(',') !== 'content_context,source_attribution') throw new Error('invalid_requested_fields');
  if (bundle.normalized.title.split('…').length !== 2 || bundle.normalized.title.includes('...')) throw new Error('invalid_u2026_title');
  if (bundle.normalized.authorOrPublisher !== bundle.evidence.publisher) throw new Error('publisher_binding_mismatch');
  if (bundle.evidence.publisher === bundle.evidence.normalizedJournalist) throw new Error('publisher_byline_role_conflation');
  if (bundle.normalized.contentSha256 !== bundle.normalizedPostDigest) throw new Error('normalized_post_digest_mismatch');
  if (canonicalJson(bundle.foundationLineage) !== canonicalJson(V112_V113_FOUNDATION_LINEAGE)) throw new Error('invalid_v112_v113_foundation_lineage');
  if (bundle.expectedNormalizedVersion < 1 || bundle.expectedRequestVersion < 1 || bundle.normalized.recordVersion < 1 || bundle.request.recordVersion < 1) throw new Error('invalid_record_version');
}

export function classifyPersistenceReplay(
  existingPayloadDigest: string,
  candidatePayloadDigest: string,
  existingStatus: string,
): PersistenceResultStatus {
  if (existingPayloadDigest !== candidatePayloadDigest) return 'rejected_conflict';
  return existingStatus === 'applied' ? 'idempotent_existing_result' : 'rejected_conflict';
}

export function isSerializationFailure(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === '40001');
}

export async function withSerializableRetries<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (!isSerializationFailure(error) || attempt === MAX_SERIALIZATION_RETRIES) throw error;
    }
  }
  throw new Error('serialization_retry_exhausted');
}

export function requireDatabaseUrl(environment: NodeJS.ProcessEnv, key: 'DATABASE_URL' | 'DATABASE_URL_UNPOOLED'): string {
  const value = environment[key];
  if (!value) throw new Error(`${key}_is_required`);
  return value;
}

export function redactDatabaseError(error: unknown): { code: string } {
  if (isSerializationFailure(error)) return { code: 'serialization_failure' };
  return { code: 'database_operation_failed' };
}
