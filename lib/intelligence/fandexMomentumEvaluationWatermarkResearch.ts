import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumCommonCutoffAdvancementGateResult,
  FandexMomentumCommonCutoffEvaluationBoundary,
} from './fandexMomentumCommonCutoffAdvancementGateResearch';

export const FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION =
  'v151_fandex_momentum_evaluation_watermark_research_v1' as const;

export const FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    storageForm: 'append-only-jsonl-hash-chain' as const,
    stateRole: 'latest-v150-evaluation-boundary' as const,
    separateFromCategoricalHistory: true as const,
    exactEvaluationReplayCreatesRecord: false as const,
    sourceAdvanceCutoffUnchangedCreatesRecord: true as const,
    commonCutoffAdvanceCreatesRecord: true as const,
    blockedGateCreatesRecord: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    categoricalHistoryWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumEvaluationWatermarkRecord = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION;
  sequence: number;
  canonicalArtistId: string;
  evaluatedAt: string;
  gateState:
    | 'source-advanced-cutoff-unchanged'
    | 'common-cutoff-advanced-categorical-replay'
    | 'common-cutoff-advanced-categorical-change';
  sourceV150Digest: string;
  semanticBoundaryDigest: string;
  evaluationBoundary: FandexMomentumCommonCutoffEvaluationBoundary;
  previousRecordDigest: string | null;
  isolation: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
    categoricalHistoryWrites: 0;
  }>;
  recordDigest: string;
}>;

export type FandexMomentumEvaluationWatermarkPersistenceResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION;
  state: 'appended' | 'no-op' | 'blocked';
  gateState: FandexMomentumCommonCutoffAdvancementGateResult['state'];
  priorRecordCount: number;
  resultingRecordCount: number;
  priorLatestRecordDigest: string | null;
  resultingLatestRecordDigest: string | null;
  watermarkJsonl: string;
  latestEvaluationBoundary: FandexMomentumCommonCutoffEvaluationBoundary | null;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
    categoricalHistoryWrites: 0;
    watermarkWrites: 0 | 1;
  }>;
}>;

function timestamp(value: string, error: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(error);
  }
  return parsed;
}

function assertSha(value: string, error: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(error);
}

function semanticBoundaryPayload(
  boundary: FandexMomentumCommonCutoffEvaluationBoundary,
) {
  return {
    canonicalArtistId: boundary.canonicalArtistId,
    commonAlignmentCutoffAt: boundary.commonAlignmentCutoffAt,
    sourceV143Digest: boundary.sourceV143Digest,
    directionalConsensus: boundary.directionalConsensus,
    persistenceConsensus: boundary.persistenceConsensus,
    sourceEvidence: boundary.sourceEvidence,
  };
}

export function digestFandexMomentumEvaluationBoundarySemanticState(
  boundary: FandexMomentumCommonCutoffEvaluationBoundary,
): string {
  return sha256Canonical(semanticBoundaryPayload(boundary));
}

function recordPayload(
  record: Omit<FandexMomentumEvaluationWatermarkRecord, 'recordDigest'>,
) {
  return {
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    canonicalArtistId: record.canonicalArtistId,
    evaluatedAt: record.evaluatedAt,
    gateState: record.gateState,
    sourceV150Digest: record.sourceV150Digest,
    semanticBoundaryDigest: record.semanticBoundaryDigest,
    evaluationBoundary: record.evaluationBoundary,
    previousRecordDigest: record.previousRecordDigest,
    isolation: record.isolation,
  };
}

function validateBoundary(
  boundary: FandexMomentumCommonCutoffEvaluationBoundary,
): void {
  if (!boundary.canonicalArtistId) {
    throw new Error('momentum_v151_boundary_artist_invalid');
  }
  timestamp(boundary.evaluatedAt, 'momentum_v151_boundary_evaluated_at_invalid');
  timestamp(
    boundary.commonAlignmentCutoffAt,
    'momentum_v151_boundary_cutoff_invalid',
  );
  timestamp(
    boundary.sourceEvidence.lastfmLatestComponentEndAt,
    'momentum_v151_boundary_lastfm_end_invalid',
  );
  timestamp(
    boundary.sourceEvidence.naverThroughSlotStart,
    'momentum_v151_boundary_naver_through_invalid',
  );
  if (
    !boundary.sourceEvidence.lastfmEvidenceId
    || !boundary.sourceEvidence.naverEvidenceId
  ) {
    throw new Error('momentum_v151_boundary_evidence_id_invalid');
  }
  assertSha(
    boundary.sourceV143Digest,
    'momentum_v151_boundary_v143_digest_invalid',
  );
}

function assertBoundaryNonRegressed(
  previous: FandexMomentumCommonCutoffEvaluationBoundary,
  current: FandexMomentumCommonCutoffEvaluationBoundary,
): void {
  const previousCutoff = timestamp(
    previous.commonAlignmentCutoffAt,
    'momentum_v151_previous_cutoff_invalid',
  );
  const currentCutoff = timestamp(
    current.commonAlignmentCutoffAt,
    'momentum_v151_current_cutoff_invalid',
  );
  if (currentCutoff < previousCutoff) {
    throw new Error('momentum_v151_boundary_cutoff_regressed');
  }

  const previousLastfm = timestamp(
    previous.sourceEvidence.lastfmLatestComponentEndAt,
    'momentum_v151_previous_lastfm_end_invalid',
  );
  const currentLastfm = timestamp(
    current.sourceEvidence.lastfmLatestComponentEndAt,
    'momentum_v151_current_lastfm_end_invalid',
  );
  const previousNaver = timestamp(
    previous.sourceEvidence.naverThroughSlotStart,
    'momentum_v151_previous_naver_through_invalid',
  );
  const currentNaver = timestamp(
    current.sourceEvidence.naverThroughSlotStart,
    'momentum_v151_current_naver_through_invalid',
  );
  if (currentLastfm < previousLastfm || currentNaver < previousNaver) {
    throw new Error('momentum_v151_boundary_source_watermark_regressed');
  }
}

export function validateFandexMomentumEvaluationWatermarkRecord(
  record: FandexMomentumEvaluationWatermarkRecord,
): void {
  if (
    record.contractVersion
      !== FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION
  ) {
    throw new Error('momentum_v151_contract_invalid');
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence <= 0) {
    throw new Error('momentum_v151_sequence_invalid');
  }
  validateBoundary(record.evaluationBoundary);
  if (
    record.canonicalArtistId !== record.evaluationBoundary.canonicalArtistId
    || record.evaluatedAt !== record.evaluationBoundary.evaluatedAt
  ) {
    throw new Error('momentum_v151_boundary_projection_mismatch');
  }
  if (
    record.gateState !== 'source-advanced-cutoff-unchanged'
    && record.gateState !== 'common-cutoff-advanced-categorical-replay'
    && record.gateState !== 'common-cutoff-advanced-categorical-change'
  ) {
    throw new Error('momentum_v151_gate_state_invalid');
  }
  assertSha(record.sourceV150Digest, 'momentum_v151_v150_digest_invalid');
  assertSha(
    record.semanticBoundaryDigest,
    'momentum_v151_semantic_boundary_digest_invalid',
  );
  if (
    record.semanticBoundaryDigest
      !== digestFandexMomentumEvaluationBoundarySemanticState(
        record.evaluationBoundary,
      )
  ) {
    throw new Error('momentum_v151_semantic_boundary_digest_mismatch');
  }
  if (record.previousRecordDigest !== null) {
    assertSha(
      record.previousRecordDigest,
      'momentum_v151_previous_record_digest_invalid',
    );
  }
  if (
    record.isolation.productMetricReads !== 0
    || record.isolation.productMetricWrites !== 0
    || record.isolation.previewFallbackReads !== 0
    || record.isolation.databaseWrites !== 0
    || record.isolation.categoricalHistoryWrites !== 0
  ) {
    throw new Error('momentum_v151_isolation_invalid');
  }
  assertSha(record.recordDigest, 'momentum_v151_record_digest_invalid');
  const expected = sha256Canonical(recordPayload({
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    canonicalArtistId: record.canonicalArtistId,
    evaluatedAt: record.evaluatedAt,
    gateState: record.gateState,
    sourceV150Digest: record.sourceV150Digest,
    semanticBoundaryDigest: record.semanticBoundaryDigest,
    evaluationBoundary: record.evaluationBoundary,
    previousRecordDigest: record.previousRecordDigest,
    isolation: record.isolation,
  }));
  if (expected !== record.recordDigest) {
    throw new Error('momentum_v151_record_digest_mismatch');
  }
}

export function parseFandexMomentumEvaluationWatermarkJsonl(
  jsonl: string,
): readonly FandexMomentumEvaluationWatermarkRecord[] {
  const records = jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new Error(`momentum_v151_json_invalid_${index}`);
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`momentum_v151_shape_invalid_${index}`);
      }
      const record = parsed as FandexMomentumEvaluationWatermarkRecord;
      validateFandexMomentumEvaluationWatermarkRecord(record);
      return record;
    });

  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];
    if (current.sequence !== index + 1) {
      throw new Error('momentum_v151_append_sequence_invalid');
    }
    if (index === 0) {
      if (current.previousRecordDigest !== null) {
        throw new Error('momentum_v151_first_record_invalid');
      }
      continue;
    }
    const previous = records[index - 1];
    if (current.previousRecordDigest !== previous.recordDigest) {
      throw new Error('momentum_v151_hash_chain_invalid');
    }
    if (current.canonicalArtistId !== previous.canonicalArtistId) {
      throw new Error('momentum_v151_artist_chain_invalid');
    }
    assertBoundaryNonRegressed(
      previous.evaluationBoundary,
      current.evaluationBoundary,
    );
  }
  return Object.freeze(records);
}

export function latestFandexMomentumEvaluationBoundaryResearch(
  jsonl: string,
): FandexMomentumCommonCutoffEvaluationBoundary | null {
  const records = parseFandexMomentumEvaluationWatermarkJsonl(jsonl);
  return records.at(-1)?.evaluationBoundary ?? null;
}

function buildRecord(
  input: Readonly<{
    gate: FandexMomentumCommonCutoffAdvancementGateResult;
    sequence: number;
    previousRecord: FandexMomentumEvaluationWatermarkRecord | null;
  }>,
): FandexMomentumEvaluationWatermarkRecord {
  const { gate, previousRecord } = input;
  if (
    gate.state !== 'source-advanced-cutoff-unchanged'
    && gate.state !== 'common-cutoff-advanced-categorical-replay'
    && gate.state !== 'common-cutoff-advanced-categorical-change'
  ) {
    throw new Error('momentum_v151_append_gate_state_invalid');
  }
  assertSha(gate.digest, 'momentum_v151_v150_digest_invalid');
  validateBoundary(gate.nextEvaluationBoundary);
  if (
    gate.canonicalArtistId !== gate.nextEvaluationBoundary.canonicalArtistId
  ) {
    throw new Error('momentum_v151_gate_boundary_artist_mismatch');
  }
  if (!Number.isSafeInteger(input.sequence) || input.sequence <= 0) {
    throw new Error('momentum_v151_sequence_invalid');
  }
  if (previousRecord) {
    if (previousRecord.sequence !== input.sequence - 1) {
      throw new Error('momentum_v151_previous_sequence_invalid');
    }
    if (
      gate.previousEvaluationCutoffAt
        !== previousRecord.evaluationBoundary.commonAlignmentCutoffAt
    ) {
      throw new Error('momentum_v151_previous_evaluation_boundary_mismatch');
    }
    assertBoundaryNonRegressed(
      previousRecord.evaluationBoundary,
      gate.nextEvaluationBoundary,
    );
  } else if (input.sequence !== 1) {
    throw new Error('momentum_v151_first_sequence_invalid');
  }

  const semanticBoundaryDigest =
    digestFandexMomentumEvaluationBoundarySemanticState(
      gate.nextEvaluationBoundary,
    );
  if (
    previousRecord
    && previousRecord.semanticBoundaryDigest === semanticBoundaryDigest
  ) {
    throw new Error('momentum_v151_duplicate_semantic_boundary');
  }

  const base = Object.freeze({
    contractVersion: FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION,
    sequence: input.sequence,
    canonicalArtistId: gate.canonicalArtistId,
    evaluatedAt: gate.nextEvaluationBoundary.evaluatedAt,
    gateState: gate.state,
    sourceV150Digest: gate.digest,
    semanticBoundaryDigest,
    evaluationBoundary: gate.nextEvaluationBoundary,
    previousRecordDigest: previousRecord?.recordDigest ?? null,
    isolation: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      categoricalHistoryWrites: 0 as const,
    }),
  });

  return Object.freeze({
    ...base,
    recordDigest: sha256Canonical(recordPayload(base)),
  });
}

export function persistFandexMomentumEvaluationWatermarkResearch(
  input: Readonly<{
    watermarkJsonl: string;
    gate: FandexMomentumCommonCutoffAdvancementGateResult;
  }>,
): FandexMomentumEvaluationWatermarkPersistenceResult {
  const records = parseFandexMomentumEvaluationWatermarkJsonl(
    input.watermarkJsonl,
  );
  const previous = records.at(-1) ?? null;

  if (
    previous
    && previous.canonicalArtistId !== input.gate.canonicalArtistId
  ) {
    throw new Error('momentum_v151_artist_mismatch');
  }

  if (input.gate.state === 'exact-evaluation-replay') {
    if (!previous) {
      throw new Error('momentum_v151_exact_replay_without_prior_watermark');
    }
    const currentSemantic =
      digestFandexMomentumEvaluationBoundarySemanticState(
        input.gate.nextEvaluationBoundary,
      );
    if (currentSemantic !== previous.semanticBoundaryDigest) {
      throw new Error('momentum_v151_exact_replay_boundary_mismatch');
    }
    return Object.freeze({
      contractVersion: FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION,
      state: 'no-op' as const,
      gateState: input.gate.state,
      priorRecordCount: records.length,
      resultingRecordCount: records.length,
      priorLatestRecordDigest: previous.recordDigest,
      resultingLatestRecordDigest: previous.recordDigest,
      watermarkJsonl: input.watermarkJsonl,
      latestEvaluationBoundary: previous.evaluationBoundary,
      effects: Object.freeze({
        productMetricReads: 0 as const,
        productMetricWrites: 0 as const,
        previewFallbackReads: 0 as const,
        databaseWrites: 0 as const,
        categoricalHistoryWrites: 0 as const,
        watermarkWrites: 0 as const,
      }),
    });
  }

  if (
    input.gate.state === 'same-cutoff-conflict'
    || input.gate.state === 'out-of-order-cutoff'
    || input.gate.state === 'blocked'
  ) {
    return Object.freeze({
      contractVersion: FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION,
      state: 'blocked' as const,
      gateState: input.gate.state,
      priorRecordCount: records.length,
      resultingRecordCount: records.length,
      priorLatestRecordDigest: previous?.recordDigest ?? null,
      resultingLatestRecordDigest: previous?.recordDigest ?? null,
      watermarkJsonl: input.watermarkJsonl,
      latestEvaluationBoundary: previous?.evaluationBoundary ?? null,
      effects: Object.freeze({
        productMetricReads: 0 as const,
        productMetricWrites: 0 as const,
        previewFallbackReads: 0 as const,
        databaseWrites: 0 as const,
        categoricalHistoryWrites: 0 as const,
        watermarkWrites: 0 as const,
      }),
    });
  }

  const next = buildRecord({
    gate: input.gate,
    sequence: records.length + 1,
    previousRecord: previous,
  });
  const delimiter =
    input.watermarkJsonl.length === 0 || input.watermarkJsonl.endsWith('\n')
      ? ''
      : '\n';
  const watermarkJsonl =
    input.watermarkJsonl
    + delimiter
    + JSON.stringify(next)
    + '\n';

  const verified = parseFandexMomentumEvaluationWatermarkJsonl(watermarkJsonl);
  const latest = verified.at(-1) ?? null;
  if (
    verified.length !== records.length + 1
    || latest?.recordDigest !== next.recordDigest
  ) {
    throw new Error('momentum_v151_append_postcondition_failed');
  }

  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_VERSION,
    state: 'appended' as const,
    gateState: input.gate.state,
    priorRecordCount: records.length,
    resultingRecordCount: verified.length,
    priorLatestRecordDigest: previous?.recordDigest ?? null,
    resultingLatestRecordDigest: next.recordDigest,
    watermarkJsonl,
    latestEvaluationBoundary: next.evaluationBoundary,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      categoricalHistoryWrites: 0 as const,
      watermarkWrites: 1 as const,
    }),
  });
}
