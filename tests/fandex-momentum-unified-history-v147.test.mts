import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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


test('committed real IU v147 unified history validates exact two-record transition', async () => {
  const jsonl = await readFile(
    new URL('../data/momentum-research/iu_cross_family_evidence_state_v147.jsonl', import.meta.url),
    'utf8',
  );
  const records = parseFandexMomentumUnifiedHistoryJsonl(jsonl);

  assert.equal(records.length, 2);

  assert.equal(
    records[0].sourceV143Digest,
    '121343630db936fa265f546523b28977614ce1658c13e68a7857344c4b3add28',
  );
  assert.equal(
    records[0].recordDigest,
    'cfd672eafde59bf5a2e70788398688b08142b069a360ecb2b76f6c30007fcce1',
  );
  assert.equal(
    records[0].observation.observationId,
    '38f9fdd4a5cd3717ce7c4e9267728e880b2e5b981c8e3846a4db0f8aab3761db',
  );
  assert.equal(records[0].directionalConsensus, 'direction-corroborated-down');
  assert.equal(records[0].persistenceConsensus, 'one-direction-repeated');
  assert.equal(records[0].changeKind, 'initial-observation');

  assert.equal(
    records[1].sourceV143Digest,
    '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
  );
  assert.equal(
    records[1].recordDigest,
    '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd',
  );
  assert.equal(
    records[1].observation.observationId,
    'cede964d6e37f42272f44682b5b600b39f200a3c04028d9e5c60f00f31534b9c',
  );
  assert.equal(records[1].directionalConsensus, 'direction-conflicted');
  assert.equal(records[1].persistenceConsensus, 'persistence-not-applicable');
  assert.equal(records[1].changeKind, 'direction-and-persistence-changed');

  assert.equal(records[1].previousRecordDigest, records[0].recordDigest);
  assert.equal(records[1].previousSourceV143Digest, records[0].sourceV143Digest);

  for (const record of records) {
    assert.equal(record.isolation.productMetricReads, 0);
    assert.equal(record.isolation.productMetricWrites, 0);
    assert.equal(record.isolation.previewFallbackReads, 0);
    assert.equal(record.isolation.databaseWrites, 0);
  }
});

test('legacy committed v144 artifact remains byte-separate and historically unchanged', async () => {
  const legacy = await readFile(
    new URL('../data/momentum-research/iu_cross_family_evidence_state_v1.jsonl', import.meta.url),
    'utf8',
  );
  assert.match(
    legacy,
    /"recordDigest":"478b36e2008a7bfb3df24236d3e9c5487d30c7217eca3f8566e3da09879f5033"/,
  );
  assert.doesNotMatch(legacy, /v147_fandex_momentum_unified_history_research_v1/);
});
