import { sha256Canonical } from '../shared/canonicalDigest';
import {
  createFandexObservation,
} from '../server/intelligence/fandexObservationFactory';
import {
  FANDEX_OBSERVATION_CONTRACT_VERSION,
  type FandexObservationV1,
} from './observationContracts';
import {
  FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
  buildFandexMomentumCategoricalResearchObservation,
  type FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';

export const FANDEX_MOMENTUM_RESEARCH_CARRIER_VERSION =
  'v144_fandex_momentum_research_carrier_v1' as const;

export const FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR = Object.freeze({
  contractVersion: FANDEX_MOMENTUM_RESEARCH_CARRIER_VERSION,
  lifecycle: 'research' as const,
  storageForm: 'append-only-jsonl-artifact' as const,
  runtimeDatabaseWriteRequired: false as const,
  mainSchemaMigrationRequired: false as const,
  productMetricResolverCalled: false as const,
  previewFallbackConsulted: false as const,
  productMetricSlotWritten: false as const,
  productMetricSchemaModified: false as const,
  variableRegistryModified: false as const,
  normalizedNumericValueAllowed: false as const,
  categoricalRawValueOnly: true as const,
  productActivationAllowed: false as const,
  productionEligible: false as const,
});

export const FANDEX_MOMENTUM_RESEARCH_CARRIER_VARIABLE_ID =
  'momentum.cross-family-evidence-state.research' as const;

export const FANDEX_MOMENTUM_RESEARCH_CARRIER_STATES = Object.freeze([
  'direction-corroborated-up',
  'direction-corroborated-down',
  'flat-corroborated',
  'direction-conflicted',
  'direction-insufficient',
] as const);

export type FandexMomentumResearchCarrierState =
  typeof FANDEX_MOMENTUM_RESEARCH_CARRIER_STATES[number];

export type FandexMomentumResearchCarrierRecord = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_RESEARCH_CARRIER_VERSION;
  sequence: number;
  recordedAt: string;
  sourceV143Digest: string;
  sourceContractVersion:
    typeof FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION;
  observation: FandexObservationV1;
  isolation: Readonly<{
    productMetricResolverCalled: false;
    previewFallbackConsulted: false;
    productMetricSlotWritten: false;
    productMetricSchemaModified: false;
    variableRegistryModified: false;
  }>;
  recordDigest: string;
}>;

export type FandexMomentumResearchCarrierReadResult = Readonly<{
  state: 'available' | 'empty' | 'blocked';
  latest: FandexMomentumResearchCarrierRecord | null;
  recordCount: number;
  previewFallbackConsulted: false;
  productMetricResolverCalled: false;
  productMetricSlotRead: false;
  productMetricSlotWritten: false;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function assertSha256(value: string, error: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(error);
}

function validateState(value: unknown): asserts value is FandexMomentumResearchCarrierState {
  if (
    typeof value !== 'string'
    || !FANDEX_MOMENTUM_RESEARCH_CARRIER_STATES.includes(
      value as FandexMomentumResearchCarrierState,
    )
  ) {
    throw new Error('momentum_v144_state_invalid');
  }
}

function validateCarrierObservation(
  observation: FandexObservationV1,
  sourceDigest: string,
): void {
  if (observation.contractVersion !== FANDEX_OBSERVATION_CONTRACT_VERSION) {
    throw new Error('momentum_v144_observation_contract_invalid');
  }
  if (observation.providerId !== 'fandex-derived') {
    throw new Error('momentum_v144_provider_invalid');
  }
  if (
    observation.entity.entityType !== 'artist'
    || !observation.entity.entityId
    || observation.entity.identityState !== 'canonical'
  ) {
    throw new Error('momentum_v144_entity_invalid');
  }
  if (
    observation.variable.variableId !== FANDEX_MOMENTUM_RESEARCH_CARRIER_VARIABLE_ID
    || observation.variable.metricFamily !== 'momentum'
    || observation.variable.role !== 'diagnostic'
  ) {
    throw new Error('momentum_v144_variable_invalid');
  }
  validateState(observation.value.rawValue);
  if (
    Object.prototype.hasOwnProperty.call(observation.value, 'normalizedValue')
    || observation.value.unit !== null
  ) {
    throw new Error('momentum_v144_numeric_value_forbidden');
  }
  if (
    observation.value.rawValue === 'direction-insufficient'
      ? observation.value.missingState !== 'insufficient'
      : observation.value.missingState !== 'observed'
  ) {
    throw new Error('momentum_v144_missing_state_invalid');
  }
  if (
    observation.lifecycle.state !== 'research'
    || observation.lifecycle.materialClass !== 'real'
  ) {
    throw new Error('momentum_v144_lifecycle_invalid');
  }
  if (
    observation.evidence.evidenceRef !==
      `fandex:momentum:v143:${sourceDigest}`
  ) {
    throw new Error('momentum_v144_lineage_invalid');
  }
}

function recordDigestPayload(
  record: Omit<FandexMomentumResearchCarrierRecord, 'recordDigest'>,
) {
  return {
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    recordedAt: record.recordedAt,
    sourceV143Digest: record.sourceV143Digest,
    sourceContractVersion: record.sourceContractVersion,
    observation: record.observation,
    isolation: record.isolation,
  };
}

export function buildFandexMomentumResearchCarrierRecord(
  input: Readonly<{
    result: FandexMomentumOutputFormEligibilityResearchResult;
    sequence: number;
    recordedAt: string;
  }>,
): FandexMomentumResearchCarrierRecord {
  if (
    input.result.contractVersion
      !== FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION
    || input.result.state !== 'categorical-research-output-only'
  ) {
    throw new Error('momentum_v144_v143_source_invalid');
  }
  if (!Number.isSafeInteger(input.sequence) || input.sequence <= 0) {
    throw new Error('momentum_v144_sequence_invalid');
  }
  if (!validIso(input.recordedAt)) {
    throw new Error('momentum_v144_recorded_at_invalid');
  }
  assertSha256(input.result.digest, 'momentum_v144_source_digest_invalid');

  const observationDraft = buildFandexMomentumCategoricalResearchObservation({
    result: input.result,
    collectedAt: input.recordedAt,
  });
  const observation = createFandexObservation(observationDraft);
  validateCarrierObservation(observation, input.result.digest);

  const base = Object.freeze({
    contractVersion: FANDEX_MOMENTUM_RESEARCH_CARRIER_VERSION,
    sequence: input.sequence,
    recordedAt: input.recordedAt,
    sourceV143Digest: input.result.digest,
    sourceContractVersion:
      FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
    observation,
    isolation: Object.freeze({
      productMetricResolverCalled: false as const,
      previewFallbackConsulted: false as const,
      productMetricSlotWritten: false as const,
      productMetricSchemaModified: false as const,
      variableRegistryModified: false as const,
    }),
  });

  return Object.freeze({
    ...base,
    recordDigest: sha256Canonical(recordDigestPayload(base)),
  });
}

export function serializeFandexMomentumResearchCarrierRecord(
  record: FandexMomentumResearchCarrierRecord,
): string {
  validateFandexMomentumResearchCarrierRecord(record);
  return JSON.stringify(record);
}

export function validateFandexMomentumResearchCarrierRecord(
  record: FandexMomentumResearchCarrierRecord,
): void {
  if (record.contractVersion !== FANDEX_MOMENTUM_RESEARCH_CARRIER_VERSION) {
    throw new Error('momentum_v144_contract_invalid');
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence <= 0) {
    throw new Error('momentum_v144_sequence_invalid');
  }
  if (!validIso(record.recordedAt)) {
    throw new Error('momentum_v144_recorded_at_invalid');
  }
  assertSha256(record.sourceV143Digest, 'momentum_v144_source_digest_invalid');
  assertSha256(record.recordDigest, 'momentum_v144_record_digest_invalid');
  if (
    record.sourceContractVersion
      !== FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION
  ) {
    throw new Error('momentum_v144_source_contract_invalid');
  }
  if (
    record.isolation.productMetricResolverCalled !== false
    || record.isolation.previewFallbackConsulted !== false
    || record.isolation.productMetricSlotWritten !== false
    || record.isolation.productMetricSchemaModified !== false
    || record.isolation.variableRegistryModified !== false
  ) {
    throw new Error('momentum_v144_isolation_boundary_invalid');
  }
  validateCarrierObservation(record.observation, record.sourceV143Digest);

  const expected = sha256Canonical(recordDigestPayload({
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    recordedAt: record.recordedAt,
    sourceV143Digest: record.sourceV143Digest,
    sourceContractVersion: record.sourceContractVersion,
    observation: record.observation,
    isolation: record.isolation,
  }));
  if (expected !== record.recordDigest) {
    throw new Error('momentum_v144_record_digest_mismatch');
  }
}

export function parseFandexMomentumResearchCarrierJsonl(
  jsonl: string,
): readonly FandexMomentumResearchCarrierRecord[] {
  const lines = jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records = lines.map((line, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`momentum_v144_json_invalid_${index}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`momentum_v144_record_shape_invalid_${index}`);
    }
    const record = parsed as FandexMomentumResearchCarrierRecord;
    validateFandexMomentumResearchCarrierRecord(record);
    return record;
  });

  for (let index = 0; index < records.length; index += 1) {
    if (records[index].sequence !== index + 1) {
      throw new Error('momentum_v144_append_sequence_invalid');
    }
    if (
      index > 0
      && Date.parse(records[index].recordedAt)
        < Date.parse(records[index - 1].recordedAt)
    ) {
      throw new Error('momentum_v144_recorded_at_order_invalid');
    }
  }

  return Object.freeze(records);
}

export function readLatestFandexMomentumResearchCarrier(
  jsonl: string,
): FandexMomentumResearchCarrierReadResult {
  let records: readonly FandexMomentumResearchCarrierRecord[];
  try {
    records = parseFandexMomentumResearchCarrierJsonl(jsonl);
  } catch {
    return Object.freeze({
      state: 'blocked' as const,
      latest: null,
      recordCount: 0,
      previewFallbackConsulted: false as const,
      productMetricResolverCalled: false as const,
      productMetricSlotRead: false as const,
      productMetricSlotWritten: false as const,
      blockers: Object.freeze(['research-carrier-validation-failed']),
    });
  }

  if (records.length === 0) {
    return Object.freeze({
      state: 'empty' as const,
      latest: null,
      recordCount: 0,
      previewFallbackConsulted: false as const,
      productMetricResolverCalled: false as const,
      productMetricSlotRead: false as const,
      productMetricSlotWritten: false as const,
      blockers: Object.freeze(['research-carrier-empty']),
    });
  }

  return Object.freeze({
    state: 'available' as const,
    latest: records.at(-1) ?? null,
    recordCount: records.length,
    previewFallbackConsulted: false as const,
    productMetricResolverCalled: false as const,
    productMetricSlotRead: false as const,
    productMetricSlotWritten: false as const,
    blockers: Object.freeze([]),
  });
}
