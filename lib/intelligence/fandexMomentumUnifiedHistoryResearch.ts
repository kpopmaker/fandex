import { sha256Canonical } from '../shared/canonicalDigest';
import {
  createFandexObservation,
} from '../server/intelligence/fandexObservationFactory';
import {
  FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
  buildFandexMomentumCategoricalResearchObservation,
  type FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';
import type {
  FandexMomentumCarrierChangeDecision,
  FandexMomentumCarrierChangeKind,
} from './fandexMomentumCarrierChangeResearch';
import type {
  FandexObservationV1,
} from './observationContracts';

export const FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_VERSION =
  'v147_fandex_momentum_unified_history_research_v1' as const;

export const FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    storageForm: 'append-only-jsonl-hash-chain' as const,
    carriesDirectionalConsensus: true as const,
    carriesPersistenceConsensus: true as const,
    carriesChangeSemantics: true as const,
    carriesSourceLineage: true as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    mainSchemaMigrationPerformed: false as const,
    variableRegistryMutationPerformed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumUnifiedHistoryRecord = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_VERSION;
  sequence: number;
  recordedAt: string;
  canonicalArtistId: string;
  alignmentCutoffAt: string;
  directionalConsensus:
    FandexMomentumOutputFormEligibilityResearchResult['currentResearchOutput']['directionalConsensus'];
  persistenceConsensus:
    FandexMomentumOutputFormEligibilityResearchResult['currentResearchOutput']['persistenceConsensus'];
  sourceContractVersion:
    typeof FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION;
  sourceV143Digest: string;
  changeKind: FandexMomentumCarrierChangeKind;
  previousSourceV143Digest: string | null;
  previousRecordDigest: string | null;
  observation: FandexObservationV1;
  isolation: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
  }>;
  recordDigest: string;
}>;

function validIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function assertSha(value: string, error: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(error);
}

function payload(
  record: Omit<FandexMomentumUnifiedHistoryRecord, 'recordDigest'>,
) {
  return {
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    recordedAt: record.recordedAt,
    canonicalArtistId: record.canonicalArtistId,
    alignmentCutoffAt: record.alignmentCutoffAt,
    directionalConsensus: record.directionalConsensus,
    persistenceConsensus: record.persistenceConsensus,
    sourceContractVersion: record.sourceContractVersion,
    sourceV143Digest: record.sourceV143Digest,
    changeKind: record.changeKind,
    previousSourceV143Digest: record.previousSourceV143Digest,
    previousRecordDigest: record.previousRecordDigest,
    observation: record.observation,
    isolation: record.isolation,
  };
}

export function buildFandexMomentumUnifiedHistoryRecord(
  input: Readonly<{
    result: FandexMomentumOutputFormEligibilityResearchResult;
    decision: FandexMomentumCarrierChangeDecision;
    sequence: number;
    recordedAt: string;
    previousRecord?: FandexMomentumUnifiedHistoryRecord | null;
  }>,
): FandexMomentumUnifiedHistoryRecord {
  const previous = input.previousRecord ?? null;
  if (
    input.result.contractVersion
      !== FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION
    || input.result.state !== 'categorical-research-output-only'
    || !input.result.alignmentCutoffAt
  ) {
    throw new Error('momentum_v147_source_invalid');
  }
  if (input.decision.state !== 'append' || !input.decision.appendRequired) {
    throw new Error('momentum_v147_append_decision_required');
  }
  if (!Number.isSafeInteger(input.sequence) || input.sequence <= 0) {
    throw new Error('momentum_v147_sequence_invalid');
  }
  if (!validIso(input.recordedAt)) {
    throw new Error('momentum_v147_recorded_at_invalid');
  }
  assertSha(input.result.digest, 'momentum_v147_source_digest_invalid');

  if (input.sequence === 1 && previous !== null) {
    throw new Error('momentum_v147_first_previous_forbidden');
  }
  if (input.sequence > 1) {
    if (!previous) throw new Error('momentum_v147_previous_required');
    if (previous.sequence !== input.sequence - 1) {
      throw new Error('momentum_v147_previous_sequence_invalid');
    }
    if (previous.canonicalArtistId !== input.result.canonicalArtistId) {
      throw new Error('momentum_v147_artist_mismatch');
    }
    if (Date.parse(input.result.alignmentCutoffAt) <= Date.parse(previous.alignmentCutoffAt)) {
      throw new Error('momentum_v147_cutoff_not_monotonic');
    }
  }

  if (
    input.decision.canonicalArtistId !== input.result.canonicalArtistId
    || input.decision.nextAlignmentCutoffAt !== input.result.alignmentCutoffAt
    || input.decision.changeKind === 'exact-replay'
    || input.decision.changeKind === 'same-cutoff-conflict'
    || input.decision.changeKind === 'out-of-order-cutoff'
  ) {
    throw new Error('momentum_v147_decision_mismatch');
  }

  if (previous) {
    if (
      input.decision.previousAlignmentCutoffAt !== previous.alignmentCutoffAt
      || input.decision.previousRecordId === null
    ) {
      throw new Error('momentum_v147_previous_lineage_mismatch');
    }
  } else if (
    input.decision.previousAlignmentCutoffAt !== null
    || input.decision.changeKind !== 'initial-observation'
  ) {
    throw new Error('momentum_v147_initial_decision_invalid');
  }

  const observation = createFandexObservation(
    buildFandexMomentumCategoricalResearchObservation({
      result: input.result,
      collectedAt: input.recordedAt,
    }),
  );

  if (
    observation.value.rawValue !== input.result.currentResearchOutput.directionalConsensus
    || observation.time.observedAt !== input.result.alignmentCutoffAt
    || observation.lifecycle.state !== 'research'
    || observation.lifecycle.materialClass !== 'real'
    || Object.prototype.hasOwnProperty.call(observation.value, 'normalizedValue')
  ) {
    throw new Error('momentum_v147_observation_boundary_invalid');
  }

  const base = Object.freeze({
    contractVersion: FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_VERSION,
    sequence: input.sequence,
    recordedAt: input.recordedAt,
    canonicalArtistId: input.result.canonicalArtistId,
    alignmentCutoffAt: input.result.alignmentCutoffAt,
    directionalConsensus: input.result.currentResearchOutput.directionalConsensus,
    persistenceConsensus: input.result.currentResearchOutput.persistenceConsensus,
    sourceContractVersion:
      FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
    sourceV143Digest: input.result.digest,
    changeKind: input.decision.changeKind,
    previousSourceV143Digest: previous?.sourceV143Digest ?? null,
    previousRecordDigest: previous?.recordDigest ?? null,
    observation,
    isolation: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
    }),
  });

  return Object.freeze({
    ...base,
    recordDigest: sha256Canonical(payload(base)),
  });
}

export function validateFandexMomentumUnifiedHistoryRecord(
  record: FandexMomentumUnifiedHistoryRecord,
): void {
  if (record.contractVersion !== FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_VERSION) {
    throw new Error('momentum_v147_contract_invalid');
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence <= 0) {
    throw new Error('momentum_v147_sequence_invalid');
  }
  if (!validIso(record.recordedAt) || !validIso(record.alignmentCutoffAt)) {
    throw new Error('momentum_v147_time_invalid');
  }
  assertSha(record.sourceV143Digest, 'momentum_v147_source_digest_invalid');
  assertSha(record.recordDigest, 'momentum_v147_record_digest_invalid');
  if (record.previousSourceV143Digest !== null) {
    assertSha(record.previousSourceV143Digest, 'momentum_v147_previous_source_digest_invalid');
  }
  if (record.previousRecordDigest !== null) {
    assertSha(record.previousRecordDigest, 'momentum_v147_previous_record_digest_invalid');
  }
  if (
    record.isolation.productMetricReads !== 0
    || record.isolation.productMetricWrites !== 0
    || record.isolation.previewFallbackReads !== 0
    || record.isolation.databaseWrites !== 0
  ) {
    throw new Error('momentum_v147_isolation_invalid');
  }
  if (
    record.observation.value.rawValue !== record.directionalConsensus
    || record.observation.time.observedAt !== record.alignmentCutoffAt
    || record.observation.lifecycle.state !== 'research'
    || record.observation.lifecycle.materialClass !== 'real'
    || Object.prototype.hasOwnProperty.call(record.observation.value, 'normalizedValue')
  ) {
    throw new Error('momentum_v147_observation_invalid');
  }
  const expected = sha256Canonical(payload({
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    recordedAt: record.recordedAt,
    canonicalArtistId: record.canonicalArtistId,
    alignmentCutoffAt: record.alignmentCutoffAt,
    directionalConsensus: record.directionalConsensus,
    persistenceConsensus: record.persistenceConsensus,
    sourceContractVersion: record.sourceContractVersion,
    sourceV143Digest: record.sourceV143Digest,
    changeKind: record.changeKind,
    previousSourceV143Digest: record.previousSourceV143Digest,
    previousRecordDigest: record.previousRecordDigest,
    observation: record.observation,
    isolation: record.isolation,
  }));
  if (expected !== record.recordDigest) {
    throw new Error('momentum_v147_record_digest_mismatch');
  }
}

export function serializeFandexMomentumUnifiedHistoryRecord(
  record: FandexMomentumUnifiedHistoryRecord,
): string {
  validateFandexMomentumUnifiedHistoryRecord(record);
  return JSON.stringify(record);
}

export function parseFandexMomentumUnifiedHistoryJsonl(
  jsonl: string,
): readonly FandexMomentumUnifiedHistoryRecord[] {
  const records = jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new Error(`momentum_v147_json_invalid_${index}`);
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`momentum_v147_shape_invalid_${index}`);
      }
      const record = parsed as FandexMomentumUnifiedHistoryRecord;
      validateFandexMomentumUnifiedHistoryRecord(record);
      return record;
    });

  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];
    if (current.sequence !== index + 1) {
      throw new Error('momentum_v147_append_sequence_invalid');
    }
    if (index === 0) {
      if (
        current.previousRecordDigest !== null
        || current.previousSourceV143Digest !== null
        || current.changeKind !== 'initial-observation'
      ) {
        throw new Error('momentum_v147_first_record_invalid');
      }
      continue;
    }
    const previous = records[index - 1];
    if (current.previousRecordDigest !== previous.recordDigest) {
      throw new Error('momentum_v147_hash_chain_invalid');
    }
    if (current.previousSourceV143Digest !== previous.sourceV143Digest) {
      throw new Error('momentum_v147_source_lineage_invalid');
    }
    if (current.canonicalArtistId !== previous.canonicalArtistId) {
      throw new Error('momentum_v147_artist_chain_invalid');
    }
    if (Date.parse(current.alignmentCutoffAt) <= Date.parse(previous.alignmentCutoffAt)) {
      throw new Error('momentum_v147_cutoff_chain_invalid');
    }
  }

  return Object.freeze(records);
}
