import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumCarrierChangeResearch,
  FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumCarrierChangeResearch';
import type {
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

function previous(input: Readonly<{
  cutoff?: string;
  direction?: string;
  persistence?: string;
  digest?: string;
}> = {}): FandexMomentumCategoricalCarrierStoredRecord {
  return {
    recordId: '1'.repeat(64),
    observationId: '2'.repeat(64),
    canonicalArtistId: 'iu',
    variableId: 'momentum.cross-family-evidence-state.research',
    alignmentCutoffAt: input.cutoff ?? '2026-09-20T01:59:13.000Z',
    directionalConsensus: input.direction ?? 'direction-conflicted',
    persistenceConsensus: input.persistence ?? 'persistence-not-applicable',
    sourceV143Digest: input.digest ?? 'a'.repeat(64),
    observationDigest: '3'.repeat(64),
    payload: {} as FandexMomentumCategoricalCarrierStoredRecord['payload'],
  };
}

test('v145 remains research-only and Product-isolated', () => {
  assert.equal(FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_DESCRIPTOR.storageMutationPerformed, false);
  assert.equal(FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_DESCRIPTOR.mainSchemaMigrationPerformed, false);
  assert.equal(FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_DESCRIPTOR.productMetricReadAllowed, false);
  assert.equal(FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_DESCRIPTOR.previewFallbackReadAllowed, false);
  assert.equal(FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_DESCRIPTOR.productionEligible, false);
});

test('v145 appends the first eligible observation', () => {
  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: result(),
    previous: null,
  });
  assert.equal(decision.state, 'append');
  assert.equal(decision.changeKind, 'initial-observation');
  assert.equal(decision.appendRequired, true);
});

test('v145 exact replay is an unchanged no-op', () => {
  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: result(),
    previous: previous(),
  });
  assert.equal(decision.state, 'no-op');
  assert.equal(decision.changeKind, 'exact-replay');
  assert.equal(decision.appendRequired, false);
});

test('v145 later cutoff appends even when categorical state is unchanged', () => {
  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: result({ cutoff: '2026-09-21T01:59:13.000Z', digest: 'b'.repeat(64) }),
    previous: previous(),
  });
  assert.equal(decision.state, 'append');
  assert.equal(decision.changeKind, 'cutoff-advanced-same-state');
  assert.equal(decision.sourceDigestChanged, true);
});

test('v145 persistence-only change is preserved as a new append', () => {
  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: result({
      cutoff: '2026-09-21T01:59:13.000Z',
      persistence: 'one-direction-repeated',
      digest: 'b'.repeat(64),
    }),
    previous: previous(),
  });
  assert.equal(decision.state, 'append');
  assert.equal(decision.changeKind, 'persistence-state-changed');
  assert.equal(decision.persistenceConsensusChanged, true);
});

test('v145 direction change is preserved as a new append', () => {
  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: result({
      cutoff: '2026-09-21T01:59:13.000Z',
      direction: 'direction-corroborated-down',
      persistence: 'one-direction-repeated',
      digest: 'b'.repeat(64),
    }),
    previous: previous(),
  });
  assert.equal(decision.state, 'append');
  assert.equal(decision.changeKind, 'direction-and-persistence-changed');
  assert.equal(decision.directionalConsensusChanged, true);
});

test('v145 same-cutoff changed lineage fails closed rather than rewriting history', () => {
  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: result({ digest: 'b'.repeat(64) }),
    previous: previous(),
  });
  assert.equal(decision.state, 'blocked');
  assert.equal(decision.changeKind, 'same-cutoff-conflict');
  assert.deepEqual(decision.blockers, ['same-cutoff-payload-or-lineage-changed']);
});

test('v145 rejects regressed cutoff to preserve monotonic lineage', () => {
  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: result({ cutoff: '2026-09-19T01:59:13.000Z' }),
    previous: previous(),
  });
  assert.equal(decision.state, 'blocked');
  assert.equal(decision.changeKind, 'out-of-order-cutoff');
  assert.deepEqual(decision.blockers, ['alignment-cutoff-regressed']);
});
