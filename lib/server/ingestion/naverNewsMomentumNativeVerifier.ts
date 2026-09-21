import 'server-only';

import { createHash } from 'node:crypto';
import { Pool } from 'pg';

import type {
  FandexMomentumStoredEvidenceVerifierOutput,
} from '../../intelligence/fandexMomentumVerifierOutputAttestationAdapterResearch';
import type {
  FandexMomentumNaverSourceSnapshotEvidence,
} from '../../intelligence/fandexMomentumSourceProvenanceResearch';
import { requireRuntimeDatabaseUrl } from '../persistence/contracts';
import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import {
  buildNaverNewsJobIdentity,
  canonicalJson,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_PROVIDER,
  sha256Canonical,
} from './naverNewsContracts';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from './naverNewsScheduler';
import type { NaverNewsIngestionPool } from './naverNewsRepository';

export const NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_VERSION =
  'v161_naver_news_momentum_native_verifier_output_v1' as const;

export const NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_DESCRIPTOR =
  Object.freeze({
    contractVersion: NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_VERSION,
    lifecycle: 'research' as const,
    downstreamVerifierOutputContract:
      'v160_fandex_momentum_stored_evidence_verifier_output_v1' as const,
    transactionMode: 'read-only' as const,
    exactSchedulerBoundaryRequired: true as const,
    validatesRawPayloadHashes: true as const,
    validatesRawEvidenceIdentity: true as const,
    validatesNormalizedPayloadHashes: true as const,
    materializesRawAndNormalizedPayloads: true as const,
    emitsVerifierGeneratedExecutionId: true as const,
    databaseWriteAllowed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    productionEligible: false as const,
  });

export type NaverNewsMomentumNativeVerifierCommand = Readonly<{
  canonicalArtistId: string;
  throughSlotStart: string;
}>;

export type NaverNewsMomentumNativeVerifierResult = Readonly<{
  contractVersion:
    typeof NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_VERSION;
  lifecycle: 'research';
  canonicalArtistId: string;
  snapshot: FandexMomentumNaverSourceSnapshotEvidence;
  verifierOutput: FandexMomentumStoredEvidenceVerifierOutput;
  effects: Readonly<{
    databaseReads: 2;
    databaseWrites: 0;
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
  }>;
  digest: string;
}>;

type QueryResultLike<T> = { rowCount: number | null; rows: T[] };
type Queryable = {
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<QueryResultLike<T>>;
};

type VerifierPool = NaverNewsIngestionPool & { end(): Promise<void> };

export type NaverNewsMomentumNativeVerifierDependencies = Readonly<{
  poolFactory?: (config: Readonly<{
    connectionString: string;
    max: 1;
    connectionTimeoutMillis: 5_000;
    query_timeout: 15_000;
    statement_timeout: 15_000;
    ssl: Readonly<{ rejectUnauthorized: true }>;
  }>) => VerifierPool;
  now?: () => Date;
}>;

type JobRow = {
  job_id: unknown;
  collection_key: unknown;
  request_contract: unknown;
  status: unknown;
  raw_evidence_count: unknown;
  normalized_record_count: unknown;
  duplicate_record_count: unknown;
  rejected_item_count: unknown;
};

type EvidenceRow = {
  evidence_id: unknown;
  item_index: unknown;
  raw_payload: unknown;
  raw_payload_sha256: unknown;
  normalization_outcome: unknown;
  normalized_record_id: unknown;
  record_id: unknown;
  record_sha256: unknown;
  normalized_payload: unknown;
};

const JOB_SQL = `SELECT
  job_id,
  collection_key,
  request_contract,
  status,
  raw_evidence_count,
  normalized_record_count,
  duplicate_record_count,
  rejected_item_count
FROM fandex.source_ingestion_jobs
WHERE job_id = $1 AND provider = $2`;

const EVIDENCE_SQL = `SELECT
  raw.evidence_id,
  raw.item_index,
  raw.raw_payload,
  raw.raw_payload_sha256,
  raw.normalization_outcome,
  raw.normalized_record_id,
  nr.record_id,
  nr.record_sha256,
  nr.normalized_payload
FROM fandex.source_ingestion_raw_evidence AS raw
LEFT JOIN fandex.source_ingestion_normalized_records AS nr
  ON nr.record_id = raw.normalized_record_id
WHERE raw.job_id = $1
ORDER BY raw.item_index`;

function defaultPool(
  config: Parameters<NonNullable<
    NaverNewsMomentumNativeVerifierDependencies['poolFactory']
  >>[0],
): VerifierPool {
  return new Pool(config) as unknown as VerifierPool;
}

function exactIso(value: string, errorCode: string): string {
  const timestamp = Date.parse(value);
  if (
    !Number.isFinite(timestamp)
    || new Date(timestamp).toISOString() !== value
  ) {
    throw new Error(errorCode);
  }
  return value;
}

function asObject(
  value: unknown,
  errorCode: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(errorCode);
  }
  return value as Readonly<Record<string, unknown>>;
}

function asString(value: unknown, errorCode: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(errorCode);
  }
  return value;
}

function asInteger(value: unknown, errorCode: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(errorCode);
  }
  return parsed;
}

function md5Canonical(value: unknown): string {
  return createHash('md5').update(canonicalJson(value), 'utf8').digest('hex');
}

function distinctCount(values: readonly string[]): number {
  return new Set(values).size;
}

export function parseNaverNewsMomentumNativeVerifierCommand(
  input: Readonly<{
    canonicalArtistId: string;
    throughSlotStart: string;
  }>,
): NaverNewsMomentumNativeVerifierCommand {
  if (
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(input.canonicalArtistId)
  ) {
    throw new Error('naver_news_momentum_native_verifier_artist_invalid');
  }
  exactIso(
    input.throughSlotStart,
    'naver_news_momentum_native_verifier_slot_invalid',
  );

  const binding = bindCanonicalArtistToNaverNews(input.canonicalArtistId);
  const plan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: input.throughSlotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (plan.slotStart !== input.throughSlotStart) {
    throw new Error('naver_news_momentum_native_verifier_slot_invalid');
  }

  return Object.freeze({
    canonicalArtistId: binding.canonicalArtistId,
    throughSlotStart: plan.slotStart,
  });
}

export async function runNaverNewsMomentumNativeVerifier(
  commandInput: Readonly<{
    canonicalArtistId: string;
    throughSlotStart: string;
  }>,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsMomentumNativeVerifierDependencies = {},
): Promise<NaverNewsMomentumNativeVerifierResult> {
  const command = parseNaverNewsMomentumNativeVerifierCommand(commandInput);
  const binding = bindCanonicalArtistToNaverNews(command.canonicalArtistId);
  const plan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: command.throughSlotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  const identity = buildNaverNewsJobIdentity(plan.command);
  const executedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  exactIso(
    executedAt,
    'naver_news_momentum_native_verifier_execution_time_invalid',
  );

  let pool: VerifierPool | null = null;
  let client: (Queryable & { release(): void }) | null = null;
  let failed = false;

  try {
    const connectionString = requireRuntimeDatabaseUrl(environment);
    pool = (dependencies.poolFactory ?? defaultPool)({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,
      statement_timeout: 15_000,
      ssl: { rejectUnauthorized: true },
    });
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');

    const jobResult = await client.query<JobRow>(JOB_SQL, [
      identity.jobId,
      NAVER_NEWS_PROVIDER,
    ]);
    if (jobResult.rows.length !== 1) {
      throw new Error('naver_news_momentum_native_verifier_job_missing');
    }
    const job = jobResult.rows[0];
    const rawEvidenceCount = asInteger(
      job.raw_evidence_count,
      'naver_news_momentum_native_verifier_job_invalid',
    );
    const normalizedRecordCount = asInteger(
      job.normalized_record_count,
      'naver_news_momentum_native_verifier_job_invalid',
    );
    const duplicateRecordCount = asInteger(
      job.duplicate_record_count,
      'naver_news_momentum_native_verifier_job_invalid',
    );
    const rejectedItemCount = asInteger(
      job.rejected_item_count,
      'naver_news_momentum_native_verifier_job_invalid',
    );
    if (
      asString(
        job.job_id,
        'naver_news_momentum_native_verifier_job_invalid',
      ) !== identity.jobId
      || asString(
        job.collection_key,
        'naver_news_momentum_native_verifier_job_invalid',
      ) !== plan.collectionKey
      || asString(
        job.status,
        'naver_news_momentum_native_verifier_job_invalid',
      ) !== 'succeeded'
      || canonicalJson(
        asObject(
          job.request_contract,
          'naver_news_momentum_native_verifier_job_invalid',
        ),
      ) !== canonicalJson(identity.request)
      || rawEvidenceCount
        !== normalizedRecordCount
          + duplicateRecordCount
          + rejectedItemCount
    ) {
      throw new Error('naver_news_momentum_native_verifier_job_invalid');
    }

    const evidenceResult = await client.query<EvidenceRow>(EVIDENCE_SQL, [
      identity.jobId,
    ]);
    if (evidenceResult.rows.length !== rawEvidenceCount) {
      throw new Error(
        'naver_news_momentum_native_verifier_row_count_mismatch',
      );
    }

    const rawMaterialized: Array<Readonly<{
      itemIndex: number;
      evidenceId: string;
      rawPayloadSha256: string;
      rawPayload: Readonly<Record<string, unknown>>;
      normalizationOutcome: string;
      normalizedRecordId: string | null;
    }>> = [];
    const normalizedMaterialized: Array<Readonly<{
      itemIndex: number;
      evidenceId: string;
      recordId: string;
      recordSha256: string;
      normalizedPayload: Readonly<Record<string, unknown>>;
    }>> = [];

    let normalizedOutcomes = 0;
    let missingNormalizedIds = 0;
    let missingNormalizedRecords = 0;
    let joinedPayloadRows = 0;

    for (const row of evidenceResult.rows) {
      const itemIndex = asInteger(
        row.item_index,
        'naver_news_momentum_native_verifier_evidence_invalid',
      );
      const evidenceId = asString(
        row.evidence_id,
        'naver_news_momentum_native_verifier_evidence_invalid',
      );
      const rawPayload = asObject(
        row.raw_payload,
        'naver_news_momentum_native_verifier_evidence_invalid',
      );
      const rawPayloadSha256 = asString(
        row.raw_payload_sha256,
        'naver_news_momentum_native_verifier_evidence_invalid',
      );
      const normalizationOutcome = asString(
        row.normalization_outcome,
        'naver_news_momentum_native_verifier_evidence_invalid',
      );
      const normalizedRecordId = row.normalized_record_id === null
        ? null
        : asString(
          row.normalized_record_id,
          'naver_news_momentum_native_verifier_evidence_invalid',
        );

      if (
        itemIndex >= rawEvidenceCount
        || rawPayloadSha256 !== sha256Canonical(rawPayload)
        || evidenceId !== sha256Canonical({
          contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
          jobId: identity.jobId,
          itemIndex,
          rawPayloadSha256,
        })
      ) {
        throw new Error(
          'naver_news_momentum_native_verifier_evidence_invalid',
        );
      }

      rawMaterialized.push(Object.freeze({
        itemIndex,
        evidenceId,
        rawPayloadSha256,
        rawPayload,
        normalizationOutcome,
        normalizedRecordId,
      }));

      if (normalizationOutcome === 'normalized') {
        normalizedOutcomes += 1;
      }
      if (normalizedRecordId === null) {
        missingNormalizedIds += 1;
        continue;
      }

      if (
        row.record_id === null
        || row.record_sha256 === null
        || row.normalized_payload === null
      ) {
        missingNormalizedRecords += 1;
        continue;
      }

      const recordId = asString(
        row.record_id,
        'naver_news_momentum_native_verifier_normalized_invalid',
      );
      const recordSha256 = asString(
        row.record_sha256,
        'naver_news_momentum_native_verifier_normalized_invalid',
      );
      const normalizedPayload = asObject(
        row.normalized_payload,
        'naver_news_momentum_native_verifier_normalized_invalid',
      );

      if (
        recordId !== normalizedRecordId
        || recordSha256 !== sha256Canonical(normalizedPayload)
        || recordId !== sha256Canonical({
          contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
          provider: NAVER_NEWS_PROVIDER,
          recordSha256,
        })
      ) {
        throw new Error(
          'naver_news_momentum_native_verifier_normalized_invalid',
        );
      }

      joinedPayloadRows += 1;
      normalizedMaterialized.push(Object.freeze({
        itemIndex,
        evidenceId,
        recordId,
        recordSha256,
        normalizedPayload,
      }));
    }

    const indexes = rawMaterialized.map((row) => row.itemIndex);
    const evidenceIds = rawMaterialized.map((row) => row.evidenceId);
    const recordIds = normalizedMaterialized.map((row) => row.recordId);
    const rawPayloadText = canonicalJson(
      rawMaterialized.map((row) => row.rawPayload),
    );
    const normalizedPayloadText = canonicalJson(
      normalizedMaterialized.map((row) => row.normalizedPayload),
    );

    const snapshot = Object.freeze({
      canonicalArtistId: command.canonicalArtistId,
      naverEvidenceId: identity.jobId,
      naverCollectionKey: plan.collectionKey,
      naverThroughSlotStart: plan.slotStart,
      naverStatus: 'succeeded' as const,
      naverRawEvidenceCount: rawEvidenceCount,
      naverNormalizedRecordCount: normalizedRecordCount,
      naverDuplicateRecordCount: duplicateRecordCount,
      naverRejectedItemCount: rejectedItemCount,
    });

    const rawLinkageSetAuditMd5 = md5Canonical(
      rawMaterialized.map((row) => ({
        evidenceId: row.evidenceId,
        itemIndex: row.itemIndex,
        normalizationOutcome: row.normalizationOutcome,
        normalizedRecordId: row.normalizedRecordId,
        rawPayloadSha256: row.rawPayloadSha256,
      })),
    );
    const normalizedSetAuditMd5 = md5Canonical(
      normalizedMaterialized.map((row) => ({
        evidenceId: row.evidenceId,
        itemIndex: row.itemIndex,
        recordId: row.recordId,
        recordSha256: row.recordSha256,
      })),
    );
    const rawPayloadMaterializedAuditMd5 = createHash('md5')
      .update(rawPayloadText, 'utf8')
      .digest('hex');
    const normalizedPayloadMaterializedAuditMd5 = createHash('md5')
      .update(normalizedPayloadText, 'utf8')
      .digest('hex');

    const executionId = sha256Canonical({
      contractVersion: NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_VERSION,
      canonicalArtistId: command.canonicalArtistId,
      naverEvidenceId: identity.jobId,
      naverThroughSlotStart: plan.slotStart,
      executedAt,
      rawLinkageSetAuditMd5,
      normalizedSetAuditMd5,
      rawPayloadMaterializedAuditMd5,
      normalizedPayloadMaterializedAuditMd5,
    });

    const verifierOutput = Object.freeze({
      contractVersion:
        'v160_fandex_momentum_stored_evidence_verifier_output_v1' as const,
      verifier: 'neon-read-only-reproducer' as const,
      executionId,
      executedAt,
      accessMode: 'neon-read-only' as const,
      databaseReadOnly: true as const,
      databaseWritesObserved: 0 as const,
      canonicalArtistId: command.canonicalArtistId,
      naverEvidenceId: identity.jobId,
      naverCollectionKey: plan.collectionKey,
      naverThroughSlotStart: plan.slotStart,
      naverStatus: 'succeeded' as const,
      jobRowReproduced: true as const,
      evidenceRows: rawMaterialized.length,
      distinctEvidenceIds: distinctCount(evidenceIds),
      distinctItemIndexes: new Set(indexes).size,
      minItemIndex: indexes.length === 0 ? 0 : Math.min(...indexes),
      maxItemIndex: indexes.length === 0 ? 0 : Math.max(...indexes),
      normalizedOutcomes,
      missingNormalizedIds,
      missingNormalizedRecords,
      distinctNormalizedRecords: distinctCount(recordIds),
      joinedPayloadRows,
      rawPayloadTextBytes: Buffer.byteLength(rawPayloadText, 'utf8'),
      normalizedPayloadTextBytes:
        Buffer.byteLength(normalizedPayloadText, 'utf8'),
      rawLinkageSetAuditMd5,
      normalizedSetAuditMd5,
      rawPayloadMaterializedAuditMd5,
      normalizedPayloadMaterializedAuditMd5,
      auditFingerprintPurpose:
        'read-integrity-only-not-methodology' as const,
    });

    await client.query('ROLLBACK');
    client.release();
    client = null;
    await pool.end();
    pool = null;

    const payload = {
      contractVersion: NAVER_NEWS_MOMENTUM_NATIVE_VERIFIER_OUTPUT_VERSION,
      lifecycle: 'research' as const,
      canonicalArtistId: command.canonicalArtistId,
      snapshot,
      verifierOutput,
      effects: Object.freeze({
        databaseReads: 2 as const,
        databaseWrites: 0 as const,
        productMetricReads: 0 as const,
        productMetricWrites: 0 as const,
        previewFallbackReads: 0 as const,
      }),
    };

    return Object.freeze({
      ...payload,
      digest: sha256Canonical(payload),
    });
  } catch (error) {
    failed = true;
    if (
      error instanceof Error
      && /^naver_news_momentum_native_verifier_[a-z_]+$/.test(error.message)
    ) {
      throw error;
    }
    throw new Error('naver_news_momentum_native_verifier_failed');
  } finally {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        failed = true;
      }
      client.release();
    }
    if (pool) {
      try {
        await pool.end();
      } catch {
        failed = true;
      }
    }
    void failed;
  }
}
