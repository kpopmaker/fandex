import assert from 'node:assert/strict';
import test from 'node:test';

import { artistMonthlyMetricSeed } from '../app/data/v4/metrics/artistMonthlyMetricSeed';
import { getResolvedMetricScore } from '../app/data/v4/metrics/metricScoringPipeline';
import {
  FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
  type FandexMomentumCrossFamilyCombinationResearchResult,
} from '../lib/intelligence/fandexMomentumCrossFamilyCombinationResearch';
import {
  FANDEX_MOMENTUM_NUMERIC_ELIGIBILITY_REQUIREMENTS,
  FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_DESCRIPTOR,
  FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
  buildFandexMomentumCategoricalResearchObservation,
  evaluateFandexMomentumOutputFormEligibilityResearch,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';

function source(
  directionalConsensus:
    | 'direction-corroborated-up'
    | 'direction-corroborated-down'
    | 'flat-corroborated'
    | 'direction-conflicted'
    | 'direction-insufficient' = 'direction-corroborated-down',
): FandexMomentumCrossFamilyCombinationResearchResult {
  const state =
    directionalConsensus === 'direction-conflicted'
      ? 'cross-family-direction-conflicted'
      : directionalConsensus === 'direction-insufficient'
        ? 'cross-family-direction-insufficient'
        : directionalConsensus === 'flat-corroborated'
          ? 'cross-family-flat-corroborated'
          : 'cross-family-direction-corroborated';

  return {
    contractVersion: FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
    sourceContractVersion: 'v141_fandex_momentum_temporal_normalization_research_v1',
    state,
    canonicalArtistId: 'iu',
    alignmentCutoffAt: '2026-09-19T01:56:03.000Z',
    directionalConsensus,
    persistenceConsensus:
      state === 'cross-family-direction-corroborated'
        ? 'one-direction-repeated'
        : 'persistence-not-applicable',
    familyEvidence: [
      {
        family: 'audience-consumption',
        direction:
          directionalConsensus === 'direction-insufficient'
            ? null
            : directionalConsensus === 'direction-conflicted'
              ? 'up'
              : directionalConsensus === 'flat-corroborated'
                ? 'flat'
                : directionalConsensus === 'direction-corroborated-up'
                  ? 'up'
                  : 'down',
        nativeDelta: -0.05,
        repeatedDirection: false,
        directionalRunTransitionCount: 1,
        directionalRunDurationHours: 24,
        historicalStrictExceedanceShare: 97.058823529412,
      },
      {
        family: 'media-attention',
        direction:
          directionalConsensus === 'direction-conflicted'
            ? 'down'
            : directionalConsensus === 'flat-corroborated'
              ? 'flat'
              : directionalConsensus === 'direction-corroborated-up'
                ? 'up'
                : directionalConsensus === 'direction-insufficient'
                  ? 'down'
                  : 'down',
        nativeDelta: -0.0025,
        repeatedDirection:
          state === 'cross-family-direction-corroborated',
        directionalRunTransitionCount: 2,
        directionalRunDurationHours: 16,
        historicalStrictExceedanceShare: 0,
      },
    ],
    levelDiagnostics: {
      normalizedLevelCount: 2,
      lowestHistoricalStrictExceedanceShare: 0,
      highestHistoricalStrictExceedanceShare: 97.058823529412,
      absoluteHistoricalPercentileSpread: 97.058823529412,
      aggregationEligible: false,
    },
    combinationDecision: {
      qualitativeDirectionEvidenceUsable:
        state === 'cross-family-direction-corroborated'
        || state === 'cross-family-flat-corroborated',
      numericCompositeAllowed: false,
      equalWeightAverageAllowed: false,
      percentileAverageAllowed: false,
      persistenceWeightingAllowed: false,
      productMomentumScore: null,
    },
    freezeStatus: {
      crossFamilyDirectionRule: 'defined-research',
      crossFamilyPersistenceDescription: 'defined-research',
      percentileAggregation: 'not-authorized',
      componentWeighting: 'not-frozen',
      compositeScoreFormula: 'not-frozen',
    },
    blockers: [
      'percentile-levels-diagnostic-only',
      'component-weighting-not-frozen',
      'composite-score-formula-not-frozen',
    ],
    digest: 'v142-test-digest',
    effects: {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    },
  };
}

test('v143 recommends structured categorical evidence and blocks numeric Product scoring', () => {
  const result = evaluateFandexMomentumOutputFormEligibilityResearch(source());

  assert.equal(
    result.contractVersion,
    FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
  );
  assert.equal(result.state, 'categorical-research-output-only');
  assert.equal(
    result.currentResearchOutput.outputForm,
    'structured-categorical-evidence',
  );
  assert.equal(
    result.currentResearchOutput.directionalConsensus,
    'direction-corroborated-down',
  );
  assert.equal(
    result.currentResearchOutput.persistenceConsensus,
    'one-direction-repeated',
  );
  assert.equal(result.currentResearchOutput.productMomentumScore, null);
  assert.equal(result.numericEligibility.status, 'not-eligible');
  assert.equal(result.numericEligibility.numericEstimand, null);
  assert.equal(result.numericEligibility.calibrationTarget, null);
  assert.equal(result.numericEligibility.mappingOrWeights, null);
  assert.equal(result.numericEligibility.outOfSampleValidation, null);
});

test('v143 numeric eligibility requires empirical non-circular calibration rather than arbitrary mapping', () => {
  const result = evaluateFandexMomentumOutputFormEligibilityResearch(source());

  assert.deepEqual(
    result.numericEligibility.unmetRequirements,
    FANDEX_MOMENTUM_NUMERIC_ELIGIBILITY_REQUIREMENTS,
  );
  for (const requirement of [
    'numeric-estimand-defined',
    'independent-calibration-target-established',
    'non-circular-observed-calibration-dataset-available',
    'data-derived-mapping-or-weights-established',
    'out-of-sample-validation-passed',
    'conflict-and-missingness-numeric-policy-validated',
    'product-schema-migration-prevents-preview-fallback',
  ]) {
    assert.ok(result.blockers.includes(requirement));
  }
  assert.equal(
    result.numericEligibility.additionalFamiliesAloneSufficient,
    false,
  );
  assert.equal(
    result.numericEligibility.legacyPreviewSeedCalibrationAllowed,
    false,
  );
});

test('current Product momentum pipeline is numeric and demonstrates preview-seed fallback', () => {
  const previewPoint = artistMonthlyMetricSeed.find(
    (point) => typeof point.variables.momentum === 'number',
  );
  assert.ok(previewPoint);

  const resolved = getResolvedMetricScore(
    previewPoint.artistId,
    'momentum',
    previewPoint.month,
  );
  assert.equal(resolved.origin, 'preview-seed');
  assert.equal(typeof resolved.score, 'number');
  assert.equal(typeof resolved.weightedScore, 'number');

  const result = evaluateFandexMomentumOutputFormEligibilityResearch(source());
  assert.equal(result.currentProductSchema.metricValueKind, 'number-or-null');
  assert.equal(result.currentProductSchema.weightedScoreRequiresNumericValue, true);
  assert.equal(result.currentProductSchema.currentMomentumSourceStage, 'derived_signal');
  assert.equal(result.currentProductSchema.currentMomentumQualityLabel, 'preview');
  assert.equal(result.currentProductSchema.previewFallbackEnabled, true);
  assert.ok(result.currentProductSchema.previewFallbackExample);
  assert.equal(
    result.currentProductSchema.categoricalEvidenceFitsCurrentMomentumSlot,
    false,
  );
  assert.ok(
    result.blockers.includes(
      'legacy-preview-fallback-would-mask-real-momentum-state',
    ),
  );
});

test('v143 categorical state can be carried as a research observation string without Product binding', () => {
  const result = evaluateFandexMomentumOutputFormEligibilityResearch(source());
  const observation = buildFandexMomentumCategoricalResearchObservation({
    result,
    collectedAt: '2026-09-19T02:10:00.000Z',
  });

  assert.equal(observation.providerId, 'fandex-derived');
  assert.equal(observation.variable.metricFamily, 'momentum');
  assert.equal(
    observation.variable.variableId,
    'momentum.cross-family-evidence-state.research',
  );
  assert.equal(observation.value.rawValue, 'direction-corroborated-down');
  assert.equal(observation.value.unit, null);
  assert.equal(observation.value.missingState, 'observed');
  assert.equal(observation.lifecycle.state, 'research');
  assert.equal(observation.lifecycle.materialClass, 'real');
  assert.equal(result.researchCarrier.registryBindingEstablished, false);
  assert.equal(result.researchCarrier.productMetricBindingEstablished, false);
});

test('direction conflict remains categorical evidence and never becomes a numeric compromise', () => {
  const result = evaluateFandexMomentumOutputFormEligibilityResearch(
    source('direction-conflicted'),
  );
  assert.equal(result.state, 'categorical-research-output-only');
  assert.equal(
    result.currentResearchOutput.directionalConsensus,
    'direction-conflicted',
  );
  assert.equal(
    result.currentResearchOutput.qualitativeDirectionEvidenceUsable,
    false,
  );
  assert.equal(result.currentResearchOutput.productMomentumScore, null);

  const observation = buildFandexMomentumCategoricalResearchObservation({
    result,
    collectedAt: '2026-09-19T02:10:00.000Z',
  });
  assert.equal(observation.value.rawValue, 'direction-conflicted');
  assert.equal(
    observation.evidence.conflictState,
    'cross-family-direction-conflict',
  );
});

test('direction-insufficient is explicit insufficient evidence, not zero or flat', () => {
  const result = evaluateFandexMomentumOutputFormEligibilityResearch(
    source('direction-insufficient'),
  );
  const observation = buildFandexMomentumCategoricalResearchObservation({
    result,
    collectedAt: '2026-09-19T02:10:00.000Z',
  });

  assert.equal(observation.value.rawValue, 'direction-insufficient');
  assert.equal(observation.value.missingState, 'insufficient');
  assert.equal(result.currentResearchOutput.productMomentumScore, null);
});

test('v143 descriptor forbids ordinal number mapping and premature Product activation', () => {
  assert.equal(
    FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_DESCRIPTOR.ordinalStateToNumberMappingAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_DESCRIPTOR.equalWeightsAllowedByDefault,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_DESCRIPTOR.percentileAverageAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_DESCRIPTOR.productActivationAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_DESCRIPTOR.productionEligible,
    false,
  );
});
