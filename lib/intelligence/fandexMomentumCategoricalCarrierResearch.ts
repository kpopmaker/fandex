import {
  getResolvedMetricScore,
} from '../../app/data/v4/metrics/metricScoringPipeline';
import { sha256Canonical } from '../shared/canonicalDigest';
import {
  createFandexObservation,
} from '../server/intelligence/fandexObservationFactory';
import type {
  FandexObservationDraft,
  FandexObservationV1,
} from './observationContracts';
import {
  FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
  buildFandexMomentumCategoricalResearchObservation,
  type FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';

export const FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_VERSION =
  'v144_fandex_momentum_categorical_carrier_research_v1' as const;

export const FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID =
  'momentum.cross-family-evidence-state.research' as const;

export const FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    storageMode: 'append-only-research-carrier' as const,
    readMode: 'isolated-research-read-model' as const,
    productMetricKey: 'momentum' as const,
    productMetricReadAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    previewSeedMutationAllowed: false as const,
    productMetricMutationAllowed: false as const,
    variableRegistryMutationPerformed: false as const,
    mainSchemaMigrationPerformed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumCategoricalCarrierStoredRecord = Readonly<{
  recordId: string;
  observationId: string;
  canonicalArtistId: string;
  variableId: typeof FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID;
  alignmentCutoffAt: string;
  directionalConsensus: string;
  persistenceConsensus: string;
  sourceV143Digest: string;
  observationDigest: string;
  payload: FandexObservationV1;
}>;

export type FandexMomentumCategoricalCarrierRepository = Readonly<{
  findByRecordId: (
    recordId: string,
  ) => Promise<FandexMomentumCategoricalCarrierStoredRecord | null>;
  listByArtist: (
    canonicalArtistId: string,
  ) => Promise<readonly FandexMomentumCategoricalCarrierStoredRecord[]>;
  insert: (
    record: FandexMomentumCategoricalCarrierStoredRecord,
  ) => Promise<'inserted' | 'already-exists'>;
}>;

export type FandexMomentumCategoricalCarrierWriteResult = Readonly<{
  state: 'inserted' | 'idempotent-existing';
  record: FandexMomentumCategoricalCarrierStoredRecord;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewSeedReads: 0;
    previewSeedWrites: 0;
  }>;
}>;

export type FandexMomentumCategoricalCarrierReadModel = Readonly<{
  state: 'available' | 'missing';
  canonicalArtistId: string;
  latestRecord: FandexMomentumCategoricalCarrierStoredRecord | null;
  recordCount: number;
  productMomentumScore: null;
  previewFallbackUsed: false;
  productMetricReadPerformed: false;
}>;

function buildStoredRecord(
  result: FandexMomentumOutputFormEligibilityResearchResult,
  collectedAt: string,
): FandexMomentumCategoricalCarrierStoredRecord {
  if (
    result.contractVersion
      !== FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION
    || result.state !== 'categorical-research-output-only'
    || result.currentResearchOutput.productMomentumScore !== null
    || !result.alignmentCutoffAt
  ) {
    throw new Error('momentum_v144_source_not_eligible');
  }

  const draft: FandexObservationDraft =
    buildFandexMomentumCategoricalResearchObservation({
      result,
      collectedAt,
    });
  const observation = createFandexObservation(draft);

  if (
    observation.variable.variableId
      !== FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID
    || observation.variable.metricFamily !== 'momentum'
    || observation.lifecycle.state !== 'research'
    || observation.lifecycle.materialClass !== 'real'
    || typeof observation.value.rawValue !== 'string'
    || Object.prototype.hasOwnProperty.call(observation.value, 'normalizedValue')
  ) {
    throw new Error('momentum_v144_observation_boundary_invalid');
  }

  const observationDigest = sha256Canonical(observation);
  const recordId = sha256Canonical({
    contractVersion: FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_VERSION,
    canonicalArtistId: result.canonicalArtistId,
    variableId: FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID,
    alignmentCutoffAt: result.alignmentCutoffAt,
    sourceV143Digest: result.digest,
    observationId: observation.observationId,
  });

  return Object.freeze({
    recordId,
    observationId: observation.observationId,
    canonicalArtistId: result.canonicalArtistId,
    variableId: FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID,
    alignmentCutoffAt: result.alignmentCutoffAt,
    directionalConsensus:
      result.currentResearchOutput.directionalConsensus,
    persistenceConsensus:
      result.currentResearchOutput.persistenceConsensus,
    sourceV143Digest: result.digest,
    observationDigest,
    payload: observation,
  });
}

export async function writeFandexMomentumCategoricalCarrierResearch(
  input: Readonly<{
    result: FandexMomentumOutputFormEligibilityResearchResult;
    collectedAt: string;
    repository: FandexMomentumCategoricalCarrierRepository;
  }>,
): Promise<FandexMomentumCategoricalCarrierWriteResult> {
  const record = buildStoredRecord(input.result, input.collectedAt);
  const existing = await input.repository.findByRecordId(record.recordId);

  if (existing) {
    if (
      existing.observationDigest !== record.observationDigest
      || existing.sourceV143Digest !== record.sourceV143Digest
      || sha256Canonical(existing.payload) !== record.observationDigest
    ) {
      throw new Error('momentum_v144_idempotency_conflict');
    }

    return Object.freeze({
      state: 'idempotent-existing' as const,
      record: existing,
      effects: Object.freeze({
        productMetricReads: 0 as const,
        productMetricWrites: 0 as const,
        previewSeedReads: 0 as const,
        previewSeedWrites: 0 as const,
      }),
    });
  }

  const inserted = await input.repository.insert(record);
  if (inserted === 'already-exists') {
    const raced = await input.repository.findByRecordId(record.recordId);
    if (
      !raced
      || raced.observationDigest !== record.observationDigest
      || raced.sourceV143Digest !== record.sourceV143Digest
    ) {
      throw new Error('momentum_v144_insert_race_conflict');
    }
    return Object.freeze({
      state: 'idempotent-existing' as const,
      record: raced,
      effects: Object.freeze({
        productMetricReads: 0 as const,
        productMetricWrites: 0 as const,
        previewSeedReads: 0 as const,
        previewSeedWrites: 0 as const,
      }),
    });
  }

  return Object.freeze({
    state: 'inserted' as const,
    record,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewSeedReads: 0 as const,
      previewSeedWrites: 0 as const,
    }),
  });
}

export async function readFandexMomentumCategoricalCarrierResearch(
  input: Readonly<{
    canonicalArtistId: string;
    repository: FandexMomentumCategoricalCarrierRepository;
  }>,
): Promise<FandexMomentumCategoricalCarrierReadModel> {
  const records = [...await input.repository.listByArtist(
    input.canonicalArtistId,
  )]
    .filter(
      (record) =>
        record.canonicalArtistId === input.canonicalArtistId
        && record.variableId
          === FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID,
    )
    .sort((left, right) => {
      const byCutoff = Date.parse(right.alignmentCutoffAt)
        - Date.parse(left.alignmentCutoffAt);
      if (byCutoff !== 0) return byCutoff;
      return right.recordId.localeCompare(left.recordId);
    });

  for (const record of records) {
    if (
      record.payload.variable.variableId
        !== FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID
      || record.payload.lifecycle.state !== 'research'
      || record.payload.lifecycle.materialClass !== 'real'
      || typeof record.payload.value.rawValue !== 'string'
      || record.observationDigest !== sha256Canonical(record.payload)
    ) {
      throw new Error('momentum_v144_stored_record_invalid');
    }
  }

  return Object.freeze({
    state: records.length > 0 ? 'available' as const : 'missing' as const,
    canonicalArtistId: input.canonicalArtistId,
    latestRecord: records[0] ?? null,
    recordCount: records.length,
    productMomentumScore: null,
    previewFallbackUsed: false as const,
    productMetricReadPerformed: false as const,
  });
}

export function inspectFandexMomentumPreviewIsolation(
  input: Readonly<{
    canonicalArtistId: string;
    month: string;
  }>,
): Readonly<{
  isolatedResearchVariableId:
    typeof FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID;
  productMetricKey: 'momentum';
  productPathOrigin: string;
  productPathScore: number | null;
  researchPathUsesProductValue: false;
  researchPathUsesPreviewFallback: false;
  isolated: true;
}> {
  const product = getResolvedMetricScore(
    input.canonicalArtistId,
    'momentum',
    input.month,
  );

  return Object.freeze({
    isolatedResearchVariableId:
      FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID,
    productMetricKey: 'momentum' as const,
    productPathOrigin: product.origin,
    productPathScore: product.score,
    researchPathUsesProductValue: false as const,
    researchPathUsesPreviewFallback: false as const,
    isolated: true as const,
  });
}
