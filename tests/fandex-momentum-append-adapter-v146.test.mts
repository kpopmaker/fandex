import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyFandexMomentumAppendAdapterResearch,
  FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumAppendAdapterResearch';
import type {
  FandexMomentumCategoricalCarrierRepository,
  FandexMomentumCategoricalCarrierStoredRecord,
} from '../lib/intelligence/fandexMomentumCategoricalCarrierResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';

function result(input: Readonly<{
  cutoff?: string;
  direction?: 'direction-corroborated-up' | 'direction-corroborated-down' | 'direction-conflicted';
  persistence?: 'one-direction-repeated' | 'persistence-not-applicable';
  digest?: string;
}> = {}): FandexMomentumOutputFormEligibilityResearchResult {
  return {
    contractVersion: 'v143_fandex_momentum_output_form_eligibility_research_v1',
    sourceContractVersion: 'v142_fandex_momentum_cross_family_combination_research_v1',
    state: 'categorical-research-output-only',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: input.cutoff ?? '2026-09-20T01:59:13.000Z',
    currentResearchOutput: {
      outputForm: 'structured-categorical-evidence',
      directionalConsensus: input.direction ?? 'direction-conflicted',
      persistenceConsensus: input.persistence ?? 'persistence-not-applicable',
      qualitativeDirectionEvidenceUsable: false,
      levelPercentileSpreadDiagnostic: 50,
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
      previewFallbackExample: null,
      categoricalEvidenceFitsCurrentMomentumSlot: false,
    },
    researchCarrier: {
      observationContractVersion: 'fandex-observation-v1',
      categoricalRawValueSupported: true,
      recommendedVariableId: 'momentum.cross-family-evidence-state.research',
      registryBindingEstablished: false,
      productMetricBindingEstablished: false,
    },
    blockers: [],
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
  let insertCalls = 0;
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
      insertCalls += 1;
      if (records.has(record.recordId)) return 'already-exists';
      records.set(record.recordId, record);
      return 'inserted';
    },
  };
  return {
    repository,
    records,
    insertCalls: () => insertCalls,
  };
}

test('v146 remains research-only and Product-isolated', () => {
  assert.equal(FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_DESCRIPTOR.exactReplayAppendAllowed, false);
  assert.equal(FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_DESCRIPTOR.blockedDecisionWriteAllowed, false);
  assert.equal(FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_DESCRIPTOR.productMetricReadAllowed, false);
  assert.equal(FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_DESCRIPTOR.previewFallbackReadAllowed, false);
  assert.equal(FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_DESCRIPTOR.mainSchemaMigrationPerformed, false);
  assert.equal(FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_DESCRIPTOR.productionEligible, false);
});

test('v146 appends first eligible observation through v144 writer', async () => {
  const store = memoryRepository();
  const applied = await applyFandexMomentumAppendAdapterResearch({
    result: result(),
    collectedAt: '2026-09-20T02:10:00.000Z',
    repository: store.repository,
  });

  assert.equal(applied.state, 'appended');
  assert.equal(applied.decision.changeKind, 'initial-observation');
  assert.equal(applied.recordCountBefore, 0);
  assert.equal(applied.recordCountAfter, 1);
  assert.equal(applied.effects.carrierWrites, 1);
  assert.equal(store.insertCalls(), 1);
});

test('v146 exact replay performs zero carrier writes', async () => {
  const store = memoryRepository();
  const first = await applyFandexMomentumAppendAdapterResearch({
    result: result(),
    collectedAt: '2026-09-20T02:10:00.000Z',
    repository: store.repository,
  });

  const replay = await applyFandexMomentumAppendAdapterResearch({
    result: result(),
    collectedAt: '2026-09-20T03:10:00.000Z',
    repository: store.repository,
  });

  assert.equal(first.state, 'appended');
  assert.equal(replay.state, 'no-op');
  assert.equal(replay.decision.changeKind, 'exact-replay');
  assert.equal(replay.effects.carrierWrites, 0);
  assert.equal(replay.recordCountAfter, 1);
  assert.equal(store.insertCalls(), 1);
});

test('v146 later cutoff appends and exposes explicit previous lineage', async () => {
  const store = memoryRepository();
  const first = await applyFandexMomentumAppendAdapterResearch({
    result: result(),
    collectedAt: '2026-09-20T02:10:00.000Z',
    repository: store.repository,
  });
  const second = await applyFandexMomentumAppendAdapterResearch({
    result: result({
      cutoff: '2026-09-21T01:59:13.000Z',
      digest: 'b'.repeat(64),
    }),
    collectedAt: '2026-09-21T02:10:00.000Z',
    repository: store.repository,
  });

  assert.equal(second.state, 'appended');
  assert.equal(second.decision.changeKind, 'cutoff-advanced-same-state');
  assert.equal(second.previousRecordId, first.resultingRecord?.recordId ?? null);
  assert.equal(second.decision.previousObservationId, first.resultingRecord?.observationId ?? null);
  assert.equal(second.recordCountBefore, 1);
  assert.equal(second.recordCountAfter, 2);
  assert.equal(store.insertCalls(), 2);
});

test('v146 preserves direction and persistence change classification on append', async () => {
  const store = memoryRepository();
  await applyFandexMomentumAppendAdapterResearch({
    result: result(),
    collectedAt: '2026-09-20T02:10:00.000Z',
    repository: store.repository,
  });
  const changed = await applyFandexMomentumAppendAdapterResearch({
    result: result({
      cutoff: '2026-09-21T01:59:13.000Z',
      direction: 'direction-corroborated-down',
      persistence: 'one-direction-repeated',
      digest: 'b'.repeat(64),
    }),
    collectedAt: '2026-09-21T02:10:00.000Z',
    repository: store.repository,
  });

  assert.equal(changed.state, 'appended');
  assert.equal(changed.decision.changeKind, 'direction-and-persistence-changed');
  assert.equal(changed.decision.directionalConsensusChanged, true);
  assert.equal(changed.decision.persistenceConsensusChanged, true);
});

test('v146 blocks same-cutoff changed lineage before carrier write', async () => {
  const store = memoryRepository();
  await applyFandexMomentumAppendAdapterResearch({
    result: result(),
    collectedAt: '2026-09-20T02:10:00.000Z',
    repository: store.repository,
  });

  await assert.rejects(
    () => applyFandexMomentumAppendAdapterResearch({
      result: result({ digest: 'b'.repeat(64) }),
      collectedAt: '2026-09-20T03:10:00.000Z',
      repository: store.repository,
    }),
    /momentum_v146_change_blocked:same-cutoff-conflict/,
  );
  assert.equal(store.insertCalls(), 1);
});

test('v146 blocks regressed cutoff before carrier write', async () => {
  const store = memoryRepository();
  await applyFandexMomentumAppendAdapterResearch({
    result: result(),
    collectedAt: '2026-09-20T02:10:00.000Z',
    repository: store.repository,
  });

  await assert.rejects(
    () => applyFandexMomentumAppendAdapterResearch({
      result: result({
        cutoff: '2026-09-19T01:59:13.000Z',
        digest: 'b'.repeat(64),
      }),
      collectedAt: '2026-09-20T03:10:00.000Z',
      repository: store.repository,
    }),
    /momentum_v146_change_blocked:out-of-order-cutoff/,
  );
  assert.equal(store.insertCalls(), 1);
});
