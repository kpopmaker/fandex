import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
  type FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';
import {
  FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR,
  FANDEX_MOMENTUM_RESEARCH_CARRIER_VERSION,
  buildFandexMomentumResearchCarrierRecord,
  parseFandexMomentumResearchCarrierJsonl,
  readLatestFandexMomentumResearchCarrier,
  serializeFandexMomentumResearchCarrierRecord,
  validateFandexMomentumResearchCarrierRecord,
} from '../lib/intelligence/fandexMomentumResearchCarrier';

function v143(
  state:
    | 'direction-corroborated-up'
    | 'direction-corroborated-down'
    | 'flat-corroborated'
    | 'direction-conflicted'
    | 'direction-insufficient' = 'direction-corroborated-down',
  digest = '1'.repeat(64),
): FandexMomentumOutputFormEligibilityResearchResult {
  return {
    contractVersion: FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
    sourceContractVersion: 'v142_fandex_momentum_cross_family_combination_research_v1',
    state: 'categorical-research-output-only',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: '2026-09-19T01:56:03.000Z',
    currentResearchOutput: {
      outputForm: 'structured-categorical-evidence',
      directionalConsensus: state,
      persistenceConsensus:
        state === 'direction-corroborated-down' || state === 'direction-corroborated-up'
          ? 'one-direction-repeated'
          : 'persistence-not-applicable',
      qualitativeDirectionEvidenceUsable:
        state === 'direction-corroborated-down'
        || state === 'direction-corroborated-up'
        || state === 'flat-corroborated',
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
      recommendedVariableId: 'momentum.cross-family-evidence-state.research',
      registryBindingEstablished: false,
      productMetricBindingEstablished: false,
    },
    blockers: [
      'current-product-momentum-slot-numeric-only',
      'categorical-research-output-not-product-registered',
      'legacy-preview-fallback-would-mask-real-momentum-state',
    ],
    digest,
    effects: {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    },
  };
}

test('v144 is an isolated research artifact carrier, not Product or DB persistence', () => {
  assert.equal(
    FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR.storageForm,
    'append-only-jsonl-artifact',
  );
  assert.equal(
    FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR.runtimeDatabaseWriteRequired,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR.mainSchemaMigrationRequired,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR.productMetricResolverCalled,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR.previewFallbackConsulted,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR.productMetricSlotWritten,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR.variableRegistryModified,
    false,
  );
  assert.equal(FANDEX_MOMENTUM_RESEARCH_CARRIER_DESCRIPTOR.productionEligible, false);
});

test('v144 record carries only categorical research observation with exact v143 lineage', () => {
  const result = v143('direction-corroborated-down');
  const record = buildFandexMomentumResearchCarrierRecord({
    result,
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });

  assert.equal(record.contractVersion, FANDEX_MOMENTUM_RESEARCH_CARRIER_VERSION);
  assert.equal(record.sequence, 1);
  assert.equal(record.previousRecordDigest, null);
  assert.equal(record.sourceV143Digest, result.digest);
  assert.equal(record.observation.variable.variableId, 'momentum.cross-family-evidence-state.research');
  assert.equal(record.observation.value.rawValue, 'direction-corroborated-down');
  assert.equal(record.observation.value.missingState, 'observed');
  assert.equal(
    Object.prototype.hasOwnProperty.call(record.observation.value, 'normalizedValue'),
    false,
  );
  assert.equal(record.observation.lifecycle.state, 'research');
  assert.equal(record.observation.lifecycle.materialClass, 'real');
  assert.match(record.recordDigest, /^[0-9a-f]{64}$/);
  validateFandexMomentumResearchCarrierRecord(record);
});

test('v144 append chain requires exact previous record digest', () => {
  const first = buildFandexMomentumResearchCarrierRecord({
    result: v143('direction-corroborated-down', '1'.repeat(64)),
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });
  const second = buildFandexMomentumResearchCarrierRecord({
    result: v143('direction-corroborated-up', '2'.repeat(64)),
    sequence: 2,
    recordedAt: '2026-09-20T15:26:05.410Z',
    previousRecordDigest: first.recordDigest,
  });

  const jsonl = [
    serializeFandexMomentumResearchCarrierRecord(first),
    serializeFandexMomentumResearchCarrierRecord(second),
    '',
  ].join('\n');
  const parsed = parseFandexMomentumResearchCarrierJsonl(jsonl);
  const latest = readLatestFandexMomentumResearchCarrier(jsonl);

  assert.equal(parsed.length, 2);
  assert.equal(parsed[1].previousRecordDigest, first.recordDigest);
  assert.equal(latest.state, 'available');
  assert.equal(latest.recordCount, 2);
  assert.equal(latest.latest?.recordDigest, second.recordDigest);
  assert.equal(latest.previewFallbackConsulted, false);
  assert.equal(latest.productMetricResolverCalled, false);
  assert.equal(latest.productMetricSlotRead, false);
  assert.equal(latest.productMetricSlotWritten, false);
});

test('v144 detects deleted, reordered, or tampered chain records', () => {
  const first = buildFandexMomentumResearchCarrierRecord({
    result: v143('direction-corroborated-down', '1'.repeat(64)),
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });
  const second = buildFandexMomentumResearchCarrierRecord({
    result: v143('direction-corroborated-up', '2'.repeat(64)),
    sequence: 2,
    recordedAt: '2026-09-20T15:26:05.410Z',
    previousRecordDigest: first.recordDigest,
  });

  assert.throws(
    () => parseFandexMomentumResearchCarrierJsonl(
      serializeFandexMomentumResearchCarrierRecord(second) + '\n',
    ),
    /append_sequence_invalid/,
  );

  assert.throws(
    () => parseFandexMomentumResearchCarrierJsonl([
      serializeFandexMomentumResearchCarrierRecord(second),
      serializeFandexMomentumResearchCarrierRecord(first),
    ].join('\n')),
    /append_sequence_invalid/,
  );

  const tampered = structuredClone(second);
  tampered.observation.value.rawValue = 'direction-conflicted';
  assert.throws(
    () => validateFandexMomentumResearchCarrierRecord(tampered),
    /record_digest_mismatch/,
  );
});

test('v144 forbids normalized numeric value in the categorical carrier', () => {
  const record = structuredClone(buildFandexMomentumResearchCarrierRecord({
    result: v143(),
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  }));
  (record.observation.value as { normalizedValue?: number }).normalizedValue = 50;

  assert.throws(
    () => validateFandexMomentumResearchCarrierRecord(record),
    /numeric_value_forbidden/,
  );
});

test('v144 preserves insufficient and conflict semantics without numeric substitution', () => {
  const insufficient = buildFandexMomentumResearchCarrierRecord({
    result: v143('direction-insufficient'),
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });
  assert.equal(insufficient.observation.value.rawValue, 'direction-insufficient');
  assert.equal(insufficient.observation.value.missingState, 'observed');

  const conflict = buildFandexMomentumResearchCarrierRecord({
    result: v143('direction-conflicted'),
    sequence: 1,
    recordedAt: '2026-09-19T15:26:05.410Z',
  });
  assert.equal(conflict.observation.value.rawValue, 'direction-conflicted');
  assert.equal(conflict.observation.evidence.conflictState, 'cross-family-direction-conflict');
});

test('v144 reader fail-closes malformed artifact without consulting Product fallback', () => {
  const result = readLatestFandexMomentumResearchCarrier('{"bad":true}\n');
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.blockers, ['research-carrier-validation-failed']);
  assert.equal(result.previewFallbackConsulted, false);
  assert.equal(result.productMetricResolverCalled, false);
  assert.equal(result.productMetricSlotRead, false);
});

test('v144 implementation has no Product numeric resolver dependency', async () => {
  const source = await readFile(
    new URL('../lib/intelligence/fandexMomentumResearchCarrier.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /metricScoringPipeline/);
  assert.doesNotMatch(source, /getResolvedMetricScore/);
  assert.doesNotMatch(source, /artistMonthlyMetricSeed/);
});
