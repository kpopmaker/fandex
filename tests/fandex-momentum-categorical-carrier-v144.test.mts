import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getFandexVariableDefinition,
} from '../lib/intelligence/variableRegistry';
import {
  FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR,
  FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID,
  inspectFandexMomentumPreviewIsolation,
  readFandexMomentumCategoricalCarrierResearch,
  writeFandexMomentumCategoricalCarrierResearch,
  type FandexMomentumCategoricalCarrierRepository,
  type FandexMomentumCategoricalCarrierStoredRecord,
} from '../lib/intelligence/fandexMomentumCategoricalCarrierResearch';
import {
  FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
  type FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';

function result(
  input: Readonly<{
    cutoff?: string;
    direction?: 'direction-corroborated-up' | 'direction-corroborated-down';
    digest?: string;
  }> = {},
): FandexMomentumOutputFormEligibilityResearchResult {
  return {
    contractVersion: FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
    sourceContractVersion:
      'v142_fandex_momentum_cross_family_combination_research_v1',
    state: 'categorical-research-output-only',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: input.cutoff ?? '2026-09-19T01:56:03.000Z',
    currentResearchOutput: {
      outputForm: 'structured-categorical-evidence',
      directionalConsensus:
        input.direction ?? 'direction-corroborated-down',
      persistenceConsensus: 'one-direction-repeated',
      qualitativeDirectionEvidenceUsable: true,
      levelPercentileSpreadDiagnostic: 97.058823529412,
      productMomentumScore: null,
    },
    numericEligibility: {
      status: 'not-eligible',
      unmetRequirements: [
        'numeric-estimand-defined',
        'independent-calibration-target-established',
        'non-circular-observed-calibration-dataset-available',
        'data-derived-mapping-or-weights-established',
        'out-of-sample-validation-passed',
        'conflict-and-missingness-numeric-policy-validated',
        'product-schema-migration-prevents-preview-fallback',
      ],
      numericEstimand: null,
      calibrationTarget: null,
      mappingOrWeights: null,
      outOfSampleValidation: null,
      additionalFamiliesAloneSufficient: false,
      legacyPreviewSeedCalibrationAllowed: false,
    },
    currentProductSchema: {
      metricValueKind: 'number-or-null',
      weightedScoreRequiresNumericValue: true,
      currentMomentumSourceStage: 'derived_signal',
      currentMomentumQualityLabel: 'preview',
      previewFallbackEnabled: true,
      previewFallbackExample: {
        artistId: 'aespa',
        month: '2025-07',
        origin: 'preview-seed',
        score: 431,
        weightedScore: 30.17,
      },
      categoricalEvidenceFitsCurrentMomentumSlot: false,
    },
    researchCarrier: {
      observationContractVersion: 'fandex-observation-v1',
      categoricalRawValueSupported: true,
      recommendedVariableId:
        'momentum.cross-family-evidence-state.research',
      registryBindingEstablished: false,
      productMetricBindingEstablished: false,
    },
    blockers: [
      'current-product-momentum-slot-numeric-only',
      'categorical-research-output-not-product-registered',
      'legacy-preview-fallback-would-mask-real-momentum-state',
    ],
    digest: input.digest ?? 'a'.repeat(64),
    effects: {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    },
  };
}

function memoryRepository() {
  const records = new Map<string, FandexMomentumCategoricalCarrierStoredRecord>();
  const repository: FandexMomentumCategoricalCarrierRepository = {
    async findByRecordId(recordId) {
      return records.get(recordId) ?? null;
    },
    async listByArtist(canonicalArtistId) {
      return [...records.values()].filter(
        (record) => record.canonicalArtistId === canonicalArtistId,
      );
    },
    async insert(record) {
      if (records.has(record.recordId)) return 'already-exists';
      records.set(record.recordId, record);
      return 'inserted';
    },
  };
  return { repository, records };
}

test('v144 carrier is explicitly isolated from Product metric and preview paths', () => {
  assert.equal(
    FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR.storageMode,
    'append-only-research-carrier',
  );
  assert.equal(
    FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR.productMetricReadAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR.previewFallbackReadAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR.mainSchemaMigrationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR.productionEligible,
    false,
  );
});

test('v144 writes a deterministic categorical research observation without Product reads/writes', async () => {
  const { repository } = memoryRepository();
  const written = await writeFandexMomentumCategoricalCarrierResearch({
    result: result(),
    collectedAt: '2026-09-19T02:10:00.000Z',
    repository,
  });

  assert.equal(written.state, 'inserted');
  assert.equal(
    written.record.variableId,
    FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID,
  );
  assert.equal(
    written.record.payload.value.rawValue,
    'direction-corroborated-down',
  );
  assert.equal(written.record.payload.value.missingState, 'observed');
  assert.equal(written.record.payload.lifecycle.state, 'research');
  assert.equal(written.record.payload.lifecycle.materialClass, 'real');
  assert.equal(written.effects.productMetricReads, 0);
  assert.equal(written.effects.productMetricWrites, 0);
  assert.equal(written.effects.previewSeedReads, 0);
  assert.equal(written.effects.previewSeedWrites, 0);
});

test('v144 replay is idempotent and conflicting same-id payload fails closed', async () => {
  const { repository, records } = memoryRepository();
  const first = await writeFandexMomentumCategoricalCarrierResearch({
    result: result(),
    collectedAt: '2026-09-19T02:10:00.000Z',
    repository,
  });
  const second = await writeFandexMomentumCategoricalCarrierResearch({
    result: result(),
    collectedAt: '2026-09-19T02:10:00.000Z',
    repository,
  });
  assert.equal(second.state, 'idempotent-existing');
  assert.equal(second.record.recordId, first.record.recordId);

  const tampered = {
    ...first.record,
    observationDigest: 'f'.repeat(64),
  } as FandexMomentumCategoricalCarrierStoredRecord;
  records.set(first.record.recordId, tampered);

  await assert.rejects(
    () => writeFandexMomentumCategoricalCarrierResearch({
      result: result(),
      collectedAt: '2026-09-19T02:10:00.000Z',
      repository,
    }),
    /idempotency_conflict/,
  );
});

test('v144 isolated read model returns latest categorical record and never resolves Product fallback', async () => {
  const { repository } = memoryRepository();
  await writeFandexMomentumCategoricalCarrierResearch({
    result: result({
      cutoff: '2026-09-18T01:56:03.000Z',
      direction: 'direction-corroborated-up',
      digest: 'b'.repeat(64),
    }),
    collectedAt: '2026-09-18T02:10:00.000Z',
    repository,
  });
  await writeFandexMomentumCategoricalCarrierResearch({
    result: result({
      cutoff: '2026-09-19T01:56:03.000Z',
      direction: 'direction-corroborated-down',
      digest: 'c'.repeat(64),
    }),
    collectedAt: '2026-09-19T02:10:00.000Z',
    repository,
  });

  const read = await readFandexMomentumCategoricalCarrierResearch({
    canonicalArtistId: 'iu',
    repository,
  });

  assert.equal(read.state, 'available');
  assert.equal(read.recordCount, 2);
  assert.equal(
    read.latestRecord?.directionalConsensus,
    'direction-corroborated-down',
  );
  assert.equal(read.productMomentumScore, null);
  assert.equal(read.previewFallbackUsed, false);
  assert.equal(read.productMetricReadPerformed, false);
});

test('v144 rejects corrupted stored observation before returning read model', async () => {
  const { repository, records } = memoryRepository();
  const write = await writeFandexMomentumCategoricalCarrierResearch({
    result: result(),
    collectedAt: '2026-09-19T02:10:00.000Z',
    repository,
  });
  const corrupted = {
    ...write.record,
    payload: {
      ...write.record.payload,
      value: {
        ...write.record.payload.value,
        rawValue: 'direction-corroborated-up',
      },
    },
  } as FandexMomentumCategoricalCarrierStoredRecord;
  records.set(write.record.recordId, corrupted);

  await assert.rejects(
    () => readFandexMomentumCategoricalCarrierResearch({
      canonicalArtistId: 'iu',
      repository,
    }),
    /stored_record_invalid/,
  );
});

test('v144 research variable remains unregistered and cannot silently become a Product variable', () => {
  assert.equal(
    getFandexVariableDefinition(
      FANDEX_MOMENTUM_CATEGORICAL_CARRIER_VARIABLE_ID,
    ),
    null,
  );
  assert.equal(
    FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR.variableRegistryMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_CATEGORICAL_CARRIER_RESEARCH_DESCRIPTOR.productMetricMutationAllowed,
    false,
  );
});

test('v144 isolation diagnostic proves Product fallback exists but research path does not consume it', () => {
  const isolated = inspectFandexMomentumPreviewIsolation({
    canonicalArtistId: 'aespa',
    month: '2025-07',
  });

  assert.equal(isolated.productMetricKey, 'momentum');
  assert.equal(isolated.productPathOrigin, 'preview-seed');
  assert.equal(typeof isolated.productPathScore, 'number');
  assert.equal(isolated.researchPathUsesProductValue, false);
  assert.equal(isolated.researchPathUsesPreviewFallback, false);
  assert.equal(isolated.isolated, true);
});
