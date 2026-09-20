import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexMomentumUnifiedHistoryRecord,
  FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_DESCRIPTOR,
  parseFandexMomentumUnifiedHistoryJsonl,
  serializeFandexMomentumUnifiedHistoryRecord,
  validateFandexMomentumUnifiedHistoryRecord,
} from '../lib/intelligence/fandexMomentumUnifiedHistoryResearch';
import {
  evaluateFandexMomentumCarrierChangeResearch,
} from '../lib/intelligence/fandexMomentumCarrierChangeResearch';
import type {
  FandexMomentumCategoricalCarrierStoredRecord,
} from '../lib/intelligence/fandexMomentumCategoricalCarrierResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';

function result(input: Readonly<{
  cutoff: string;
  direction:
    | 'direction-corroborated-down'
    | 'direction-conflicted';
  persistence:
    | 'one-direction-repeated'
    | 'persistence-not-applicable';
  digest: string;
}>): FandexMomentumOutputFormEligibilityResearchResult {
  return {
    contractVersion: 'v143_fandex_momentum_output_form_eligibility_research_v1',
    sourceContractVersion: 'v142_fandex_momentum_cross_family_combination_research_v1',
    state: 'categorical-research-output-only',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: input.cutoff,
    currentResearchOutput: {
      outputForm: 'structured-categorical-evidence',
      directionalConsensus: input.direction,
      persistenceConsensus: input.persistence,
      qualitativeDirectionEvidenceUsable:
        input.direction === 'direction-corroborated-down',
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
    digest: input.digest,
    effects: {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    },
  };
}

function storedRecord(
  source: FandexMomentumOutputFormEligibilityResearchResult,
): FandexMomentumCategoricalCarrierStoredRecord {
  return {
    recordId: 'a'.repeat(64),
    observationId: 'b'.repeat(64),
    canonicalArtistId: 'iu',
    variableId: 'momentum.cross-family-evidence-state.research',
    alignmentCutoffAt: source.alignmentCutoffAt!,
    directionalConsensus: source.currentResearchOutput.directionalConsensus,
    persistenceConsensus: source.currentResearchOutput.persistenceConsensus,
    sourceV143Digest: source.digest,
    observationDigest: 'c'.repeat(64),
    payload: {} as FandexMomentumCategoricalCarrierStoredRecord['payload'],
  };
}

test('v147 converges persistence, change semantics, lineage and hash-chain isolation', () => {
  assert.equal(
    FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_DESCRIPTOR.storageForm,
    'append-only-jsonl-hash-chain',
  );
  assert.equal(
    FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_DESCRIPTOR.carriesPersistenceConsensus,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_DESCRIPTOR.carriesChangeSemantics,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_DESCRIPTOR.productMetricReadAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_UNIFIED_HISTORY_RESEARCH_DESCRIPTOR.productionEligible,
    false,
  );
});

test('v147 records the real two-state transition with persistence preserved', () => {
  const previousResult = result({
    cutoff: '2026-09-19T01:56:03.000Z',
    direction: 'direction-corroborated-down',
    persistence: 'one-direction-repeated',
    digest: '1'.repeat(64),
  });
  const initialDecision = evaluateFandexMomentumCarrierChangeResearch({
    result: previousResult,
    previous: null,
  });
  const first = buildFandexMomentumUnifiedHistoryRecord({
    result: previousResult,
    decision: initialDecision,
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });

  const currentResult = result({
    cutoff: '2026-09-20T01:59:13.000Z',
    direction: 'direction-conflicted',
    persistence: 'persistence-not-applicable',
    digest: '2'.repeat(64),
  });
  const currentDecision = evaluateFandexMomentumCarrierChangeResearch({
    result: currentResult,
    previous: storedRecord(previousResult),
  });
  const second = buildFandexMomentumUnifiedHistoryRecord({
    result: currentResult,
    decision: currentDecision,
    sequence: 2,
    recordedAt: '2026-09-20T05:30:00.000Z',
    previousRecord: first,
  });

  assert.equal(first.directionalConsensus, 'direction-corroborated-down');
  assert.equal(first.persistenceConsensus, 'one-direction-repeated');
  assert.equal(first.changeKind, 'initial-observation');

  assert.equal(second.directionalConsensus, 'direction-conflicted');
  assert.equal(second.persistenceConsensus, 'persistence-not-applicable');
  assert.equal(second.changeKind, 'direction-and-persistence-changed');
  assert.equal(second.previousSourceV143Digest, first.sourceV143Digest);
  assert.equal(second.previousRecordDigest, first.recordDigest);
  validateFandexMomentumUnifiedHistoryRecord(second);
});

test('v147 serialized history retains exact hash/source lineage', () => {
  const firstResult = result({
    cutoff: '2026-09-19T01:56:03.000Z',
    direction: 'direction-corroborated-down',
    persistence: 'one-direction-repeated',
    digest: '1'.repeat(64),
  });
  const first = buildFandexMomentumUnifiedHistoryRecord({
    result: firstResult,
    decision: evaluateFandexMomentumCarrierChangeResearch({
      result: firstResult,
      previous: null,
    }),
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });

  const secondResult = result({
    cutoff: '2026-09-20T01:59:13.000Z',
    direction: 'direction-conflicted',
    persistence: 'persistence-not-applicable',
    digest: '2'.repeat(64),
  });
  const second = buildFandexMomentumUnifiedHistoryRecord({
    result: secondResult,
    decision: evaluateFandexMomentumCarrierChangeResearch({
      result: secondResult,
      previous: storedRecord(firstResult),
    }),
    sequence: 2,
    recordedAt: '2026-09-20T05:30:00.000Z',
    previousRecord: first,
  });

  const parsed = parseFandexMomentumUnifiedHistoryJsonl([
    serializeFandexMomentumUnifiedHistoryRecord(first),
    serializeFandexMomentumUnifiedHistoryRecord(second),
    '',
  ].join('\n'));

  assert.equal(parsed.length, 2);
  assert.equal(parsed[1].previousRecordDigest, parsed[0].recordDigest);
  assert.equal(parsed[1].previousSourceV143Digest, parsed[0].sourceV143Digest);
  assert.equal(parsed[1].sequence, 2);
});

test('v147 rejects no-op decisions because exact replay must not append', () => {
  const firstResult = result({
    cutoff: '2026-09-19T01:56:03.000Z',
    direction: 'direction-corroborated-down',
    persistence: 'one-direction-repeated',
    digest: '1'.repeat(64),
  });
  const previous = storedRecord(firstResult);
  const noOp = evaluateFandexMomentumCarrierChangeResearch({
    result: firstResult,
    previous,
  });

  assert.equal(noOp.state, 'no-op');
  assert.throws(
    () => buildFandexMomentumUnifiedHistoryRecord({
      result: firstResult,
      decision: noOp,
      sequence: 2,
      recordedAt: '2026-09-20T05:30:00.000Z',
      previousRecord: null,
    }),
    /append_decision_required/,
  );
});

test('v147 rejects tampered persistence even when observation direction is untouched', () => {
  const source = result({
    cutoff: '2026-09-19T01:56:03.000Z',
    direction: 'direction-corroborated-down',
    persistence: 'one-direction-repeated',
    digest: '1'.repeat(64),
  });
  const first = buildFandexMomentumUnifiedHistoryRecord({
    result: source,
    decision: evaluateFandexMomentumCarrierChangeResearch({
      result: source,
      previous: null,
    }),
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });

  const tampered = structuredClone(first) as typeof first;
  (tampered as { persistenceConsensus: string }).persistenceConsensus =
    'persistence-not-applicable';

  assert.throws(
    () => validateFandexMomentumUnifiedHistoryRecord(tampered),
    /record_digest_mismatch/,
  );
});

test('v147 parser rejects deleted or reordered history', () => {
  const firstResult = result({
    cutoff: '2026-09-19T01:56:03.000Z',
    direction: 'direction-corroborated-down',
    persistence: 'one-direction-repeated',
    digest: '1'.repeat(64),
  });
  const first = buildFandexMomentumUnifiedHistoryRecord({
    result: firstResult,
    decision: evaluateFandexMomentumCarrierChangeResearch({
      result: firstResult,
      previous: null,
    }),
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });

  const secondResult = result({
    cutoff: '2026-09-20T01:59:13.000Z',
    direction: 'direction-conflicted',
    persistence: 'persistence-not-applicable',
    digest: '2'.repeat(64),
  });
  const second = buildFandexMomentumUnifiedHistoryRecord({
    result: secondResult,
    decision: evaluateFandexMomentumCarrierChangeResearch({
      result: secondResult,
      previous: storedRecord(firstResult),
    }),
    sequence: 2,
    recordedAt: '2026-09-20T05:30:00.000Z',
    previousRecord: first,
  });

  assert.throws(
    () => parseFandexMomentumUnifiedHistoryJsonl(
      serializeFandexMomentumUnifiedHistoryRecord(second) + '\n',
    ),
    /append_sequence_invalid/,
  );

  assert.throws(
    () => parseFandexMomentumUnifiedHistoryJsonl([
      serializeFandexMomentumUnifiedHistoryRecord(second),
      serializeFandexMomentumUnifiedHistoryRecord(first),
    ].join('\n')),
    /append_sequence_invalid/,
  );
});
