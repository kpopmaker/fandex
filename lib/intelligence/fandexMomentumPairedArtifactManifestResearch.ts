import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumDualArtifactCoordinatorResult,
  FandexMomentumDualArtifactCoordinatorState,
} from './fandexMomentumDualArtifactCoordinatorResearch';

export const FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_VERSION =
  'v154_fandex_momentum_paired_artifact_persistence_manifest_research_v1' as const;

export const FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    upstreamContract:
      'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1' as const,
    storageForm: 'append-only-jsonl-hash-chain' as const,
    purpose:
      'bind-prior-and-resulting-dual-artifact-digests-before-physical-persistence' as const,
    detectsPartialWrite: true as const,
    detectsOneSidedWrite: true as const,
    detectsStaleBase: true as const,
    detectsManifestReordering: true as const,
    requiresObservedPostwriteVerification: true as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumPairedArtifactWritePlan = Readonly<{
  historyWrites: 0 | 1;
  watermarkWrites: 0 | 1;
}>;

export type FandexMomentumPairedArtifactManifestRecord = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_VERSION;
  sequence: number;
  manifestedAt: string;
  coordinatorContractVersion:
    'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1';
  coordinatorDigest: string;
  coordinatorState: FandexMomentumDualArtifactCoordinatorState;
  priorHistoryRecordCount: number;
  resultingHistoryRecordCount: number;
  priorWatermarkRecordCount: number;
  resultingWatermarkRecordCount: number;
  priorHistoryDigest: string;
  resultingHistoryDigest: string;
  priorWatermarkDigest: string;
  resultingWatermarkDigest: string;
  expectedWrites: FandexMomentumPairedArtifactWritePlan;
  previousManifestDigest: string | null;
  isolation: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
  }>;
  manifestDigest: string;
}>;

export type FandexMomentumPairedArtifactAcceptanceState =
  | 'accepted-resulting-pair'
  | 'expected-no-write-pair'
  | 'writes-not-applied'
  | 'partial-history-only'
  | 'partial-watermark-only'
  | 'unexpected-artifact-state';

export type FandexMomentumPairedArtifactAcceptanceResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_VERSION;
  state: FandexMomentumPairedArtifactAcceptanceState;
  manifestDigest: string;
  observedHistoryDigest: string;
  observedWatermarkDigest: string;
  historyAtPrior: boolean;
  historyAtResult: boolean;
  watermarkAtPrior: boolean;
  watermarkAtResult: boolean;
  readyForNextEvaluation: boolean;
  blockers: readonly string[];
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
  }>;
  digest: string;
}>;

type CoordinatorProjection = Pick<
  FandexMomentumDualArtifactCoordinatorResult,
  | 'contractVersion'
  | 'state'
  | 'priorHistoryRecordCount'
  | 'resultingHistoryRecordCount'
  | 'priorWatermarkRecordCount'
  | 'resultingWatermarkRecordCount'
  | 'priorHistoryDigest'
  | 'resultingHistoryDigest'
  | 'priorWatermarkDigest'
  | 'resultingWatermarkDigest'
  | 'effects'
  | 'digest'
>;

function exactIso(value: string, error: string): void {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error(error);
  }
}

function assertSha256(value: string, error: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(error);
}

function artifactDigest(jsonl: string): string {
  return sha256Canonical({ artifactJsonl: jsonl });
}

function expectedWritesForState(
  state: FandexMomentumDualArtifactCoordinatorState,
): FandexMomentumPairedArtifactWritePlan {
  if (state === 'watermark-only-appended') {
    return Object.freeze({
      historyWrites: 0 as const,
      watermarkWrites: 1 as const,
    });
  }
  if (state === 'dual-appended') {
    return Object.freeze({
      historyWrites: 1 as const,
      watermarkWrites: 1 as const,
    });
  }
  return Object.freeze({
    historyWrites: 0 as const,
    watermarkWrites: 0 as const,
  });
}

function manifestPayload(
  record: Omit<FandexMomentumPairedArtifactManifestRecord, 'manifestDigest'>,
) {
  return {
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    manifestedAt: record.manifestedAt,
    coordinatorContractVersion: record.coordinatorContractVersion,
    coordinatorDigest: record.coordinatorDigest,
    coordinatorState: record.coordinatorState,
    priorHistoryRecordCount: record.priorHistoryRecordCount,
    resultingHistoryRecordCount: record.resultingHistoryRecordCount,
    priorWatermarkRecordCount: record.priorWatermarkRecordCount,
    resultingWatermarkRecordCount: record.resultingWatermarkRecordCount,
    priorHistoryDigest: record.priorHistoryDigest,
    resultingHistoryDigest: record.resultingHistoryDigest,
    priorWatermarkDigest: record.priorWatermarkDigest,
    resultingWatermarkDigest: record.resultingWatermarkDigest,
    expectedWrites: record.expectedWrites,
    previousManifestDigest: record.previousManifestDigest,
    isolation: record.isolation,
  };
}

function validateCountTransition(
  prior: number,
  resulting: number,
  writes: 0 | 1,
  error: string,
): void {
  if (
    !Number.isSafeInteger(prior)
    || prior < 0
    || !Number.isSafeInteger(resulting)
    || resulting < 0
    || resulting !== prior + writes
  ) {
    throw new Error(error);
  }
}

export function validateFandexMomentumPairedArtifactManifestRecord(
  record: FandexMomentumPairedArtifactManifestRecord,
): void {
  if (
    record.contractVersion
      !== FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_VERSION
  ) {
    throw new Error('momentum_v154_contract_invalid');
  }
  if (
    record.coordinatorContractVersion
      !== 'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1'
  ) {
    throw new Error('momentum_v154_coordinator_contract_invalid');
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence <= 0) {
    throw new Error('momentum_v154_sequence_invalid');
  }
  exactIso(record.manifestedAt, 'momentum_v154_manifested_at_invalid');

  for (const [value, error] of [
    [record.coordinatorDigest, 'momentum_v154_coordinator_digest_invalid'],
    [record.priorHistoryDigest, 'momentum_v154_prior_history_digest_invalid'],
    [record.resultingHistoryDigest, 'momentum_v154_result_history_digest_invalid'],
    [record.priorWatermarkDigest, 'momentum_v154_prior_watermark_digest_invalid'],
    [record.resultingWatermarkDigest, 'momentum_v154_result_watermark_digest_invalid'],
    [record.manifestDigest, 'momentum_v154_manifest_digest_invalid'],
  ] as const) {
    assertSha256(value, error);
  }
  if (record.previousManifestDigest !== null) {
    assertSha256(
      record.previousManifestDigest,
      'momentum_v154_previous_manifest_digest_invalid',
    );
  }

  const expectedWrites = expectedWritesForState(record.coordinatorState);
  if (
    record.expectedWrites.historyWrites !== expectedWrites.historyWrites
    || record.expectedWrites.watermarkWrites !== expectedWrites.watermarkWrites
  ) {
    throw new Error('momentum_v154_write_plan_state_mismatch');
  }

  validateCountTransition(
    record.priorHistoryRecordCount,
    record.resultingHistoryRecordCount,
    record.expectedWrites.historyWrites,
    'momentum_v154_history_count_transition_invalid',
  );
  validateCountTransition(
    record.priorWatermarkRecordCount,
    record.resultingWatermarkRecordCount,
    record.expectedWrites.watermarkWrites,
    'momentum_v154_watermark_count_transition_invalid',
  );

  if (
    (record.expectedWrites.historyWrites === 0
      && record.priorHistoryDigest !== record.resultingHistoryDigest)
    || (record.expectedWrites.historyWrites === 1
      && record.priorHistoryDigest === record.resultingHistoryDigest)
  ) {
    throw new Error('momentum_v154_history_digest_transition_invalid');
  }
  if (
    (record.expectedWrites.watermarkWrites === 0
      && record.priorWatermarkDigest !== record.resultingWatermarkDigest)
    || (record.expectedWrites.watermarkWrites === 1
      && record.priorWatermarkDigest === record.resultingWatermarkDigest)
  ) {
    throw new Error('momentum_v154_watermark_digest_transition_invalid');
  }

  if (
    record.isolation.productMetricReads !== 0
    || record.isolation.productMetricWrites !== 0
    || record.isolation.previewFallbackReads !== 0
    || record.isolation.databaseWrites !== 0
  ) {
    throw new Error('momentum_v154_isolation_invalid');
  }

  const expectedDigest = sha256Canonical(manifestPayload({
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    manifestedAt: record.manifestedAt,
    coordinatorContractVersion: record.coordinatorContractVersion,
    coordinatorDigest: record.coordinatorDigest,
    coordinatorState: record.coordinatorState,
    priorHistoryRecordCount: record.priorHistoryRecordCount,
    resultingHistoryRecordCount: record.resultingHistoryRecordCount,
    priorWatermarkRecordCount: record.priorWatermarkRecordCount,
    resultingWatermarkRecordCount: record.resultingWatermarkRecordCount,
    priorHistoryDigest: record.priorHistoryDigest,
    resultingHistoryDigest: record.resultingHistoryDigest,
    priorWatermarkDigest: record.priorWatermarkDigest,
    resultingWatermarkDigest: record.resultingWatermarkDigest,
    expectedWrites: record.expectedWrites,
    previousManifestDigest: record.previousManifestDigest,
    isolation: record.isolation,
  }));
  if (expectedDigest !== record.manifestDigest) {
    throw new Error('momentum_v154_manifest_digest_mismatch');
  }
}

export function buildFandexMomentumPairedArtifactManifestResearch(
  input: Readonly<{
    coordinator: CoordinatorProjection;
    sequence: number;
    manifestedAt: string;
    previousManifest: FandexMomentumPairedArtifactManifestRecord | null;
  }>,
): FandexMomentumPairedArtifactManifestRecord {
  const { coordinator, previousManifest } = input;
  if (
    coordinator.contractVersion
      !== 'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1'
  ) {
    throw new Error('momentum_v154_source_contract_invalid');
  }
  assertSha256(
    coordinator.digest,
    'momentum_v154_coordinator_digest_invalid',
  );
  exactIso(input.manifestedAt, 'momentum_v154_manifested_at_invalid');
  if (!Number.isSafeInteger(input.sequence) || input.sequence <= 0) {
    throw new Error('momentum_v154_sequence_invalid');
  }

  const expectedWrites = expectedWritesForState(coordinator.state);
  if (
    coordinator.effects.historyWrites !== expectedWrites.historyWrites
    || coordinator.effects.watermarkWrites !== expectedWrites.watermarkWrites
  ) {
    throw new Error('momentum_v154_coordinator_write_plan_mismatch');
  }

  if (previousManifest) {
    validateFandexMomentumPairedArtifactManifestRecord(previousManifest);
    if (input.sequence !== previousManifest.sequence + 1) {
      throw new Error('momentum_v154_manifest_sequence_gap');
    }
    if (
      coordinator.priorHistoryDigest
        !== previousManifest.resultingHistoryDigest
      || coordinator.priorWatermarkDigest
        !== previousManifest.resultingWatermarkDigest
      || coordinator.priorHistoryRecordCount
        !== previousManifest.resultingHistoryRecordCount
      || coordinator.priorWatermarkRecordCount
        !== previousManifest.resultingWatermarkRecordCount
    ) {
      throw new Error('momentum_v154_stale_base');
    }
  } else if (input.sequence !== 1) {
    throw new Error('momentum_v154_first_sequence_invalid');
  }

  const base = Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_VERSION,
    sequence: input.sequence,
    manifestedAt: input.manifestedAt,
    coordinatorContractVersion:
      'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1' as const,
    coordinatorDigest: coordinator.digest,
    coordinatorState: coordinator.state,
    priorHistoryRecordCount: coordinator.priorHistoryRecordCount,
    resultingHistoryRecordCount: coordinator.resultingHistoryRecordCount,
    priorWatermarkRecordCount: coordinator.priorWatermarkRecordCount,
    resultingWatermarkRecordCount: coordinator.resultingWatermarkRecordCount,
    priorHistoryDigest: coordinator.priorHistoryDigest,
    resultingHistoryDigest: coordinator.resultingHistoryDigest,
    priorWatermarkDigest: coordinator.priorWatermarkDigest,
    resultingWatermarkDigest: coordinator.resultingWatermarkDigest,
    expectedWrites,
    previousManifestDigest: previousManifest?.manifestDigest ?? null,
    isolation: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
    }),
  });

  const record = Object.freeze({
    ...base,
    manifestDigest: sha256Canonical(manifestPayload(base)),
  });
  validateFandexMomentumPairedArtifactManifestRecord(record);
  return record;
}

export function serializeFandexMomentumPairedArtifactManifestRecord(
  record: FandexMomentumPairedArtifactManifestRecord,
): string {
  validateFandexMomentumPairedArtifactManifestRecord(record);
  return JSON.stringify(record);
}

export function parseFandexMomentumPairedArtifactManifestJsonl(
  jsonl: string,
): readonly FandexMomentumPairedArtifactManifestRecord[] {
  const records = jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new Error(`momentum_v154_json_invalid_${index}`);
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`momentum_v154_shape_invalid_${index}`);
      }
      const record = parsed as FandexMomentumPairedArtifactManifestRecord;
      validateFandexMomentumPairedArtifactManifestRecord(record);
      return record;
    });

  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];
    if (current.sequence !== index + 1) {
      throw new Error('momentum_v154_manifest_order_invalid');
    }
    if (index === 0) {
      if (current.previousManifestDigest !== null) {
        throw new Error('momentum_v154_first_manifest_link_invalid');
      }
      continue;
    }
    const previous = records[index - 1];
    if (current.previousManifestDigest !== previous.manifestDigest) {
      throw new Error('momentum_v154_manifest_hash_chain_invalid');
    }
    if (
      current.priorHistoryDigest !== previous.resultingHistoryDigest
      || current.priorWatermarkDigest !== previous.resultingWatermarkDigest
      || current.priorHistoryRecordCount
        !== previous.resultingHistoryRecordCount
      || current.priorWatermarkRecordCount
        !== previous.resultingWatermarkRecordCount
    ) {
      throw new Error('momentum_v154_manifest_stale_base_chain');
    }
  }

  return Object.freeze(records);
}

export function evaluateFandexMomentumPairedArtifactAcceptanceResearch(
  input: Readonly<{
    manifest: FandexMomentumPairedArtifactManifestRecord;
    observedHistoryJsonl: string;
    observedWatermarkJsonl: string;
  }>,
): FandexMomentumPairedArtifactAcceptanceResult {
  validateFandexMomentumPairedArtifactManifestRecord(input.manifest);
  const observedHistoryDigest = artifactDigest(input.observedHistoryJsonl);
  const observedWatermarkDigest = artifactDigest(input.observedWatermarkJsonl);

  const historyAtPrior =
    observedHistoryDigest === input.manifest.priorHistoryDigest;
  const historyAtResult =
    observedHistoryDigest === input.manifest.resultingHistoryDigest;
  const watermarkAtPrior =
    observedWatermarkDigest === input.manifest.priorWatermarkDigest;
  const watermarkAtResult =
    observedWatermarkDigest === input.manifest.resultingWatermarkDigest;

  let state: FandexMomentumPairedArtifactAcceptanceState;
  let blockers: readonly string[];

  if (
    input.manifest.expectedWrites.historyWrites === 0
    && input.manifest.expectedWrites.watermarkWrites === 0
    && historyAtResult
    && watermarkAtResult
  ) {
    state = 'expected-no-write-pair';
    blockers = Object.freeze([]);
  } else if (historyAtResult && watermarkAtResult) {
    state = 'accepted-resulting-pair';
    blockers = Object.freeze([]);
  } else if (
    historyAtPrior
    && watermarkAtPrior
    && (
      input.manifest.expectedWrites.historyWrites === 1
      || input.manifest.expectedWrites.watermarkWrites === 1
    )
  ) {
    state = 'writes-not-applied';
    blockers = Object.freeze(['paired-artifact-writes-not-applied']);
  } else if (
    input.manifest.expectedWrites.historyWrites === 1
    && historyAtResult
    && watermarkAtPrior
  ) {
    state = 'partial-history-only';
    blockers = Object.freeze(['paired-artifact-watermark-write-missing']);
  } else if (
    input.manifest.expectedWrites.watermarkWrites === 1
    && watermarkAtResult
    && historyAtPrior
  ) {
    state = input.manifest.expectedWrites.historyWrites === 0
      ? 'accepted-resulting-pair'
      : 'partial-watermark-only';
    blockers = state === 'accepted-resulting-pair'
      ? Object.freeze([])
      : Object.freeze(['paired-artifact-history-write-missing']);
  } else {
    state = 'unexpected-artifact-state';
    blockers = Object.freeze(['paired-artifact-state-unexpected']);
  }

  const readyForNextEvaluation =
    state === 'accepted-resulting-pair'
    || state === 'expected-no-write-pair';

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_PAIRED_ARTIFACT_MANIFEST_RESEARCH_VERSION,
    state,
    manifestDigest: input.manifest.manifestDigest,
    observedHistoryDigest,
    observedWatermarkDigest,
    historyAtPrior,
    historyAtResult,
    watermarkAtPrior,
    watermarkAtResult,
    readyForNextEvaluation,
    blockers,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
