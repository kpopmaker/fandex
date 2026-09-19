import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION,
  type FandexMomentumTemporalNormalizationResearchResult,
} from '../lib/intelligence/fandexMomentumTemporalNormalizationResearch';
import {
  FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_DESCRIPTOR,
  FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
  evaluateFandexMomentumCrossFamilyCombinationResearch,
} from '../lib/intelligence/fandexMomentumCrossFamilyCombinationResearch';

function source(input?: Readonly<{
  leftDirection?: 'up' | 'down' | 'flat' | null;
  rightDirection?: 'up' | 'down' | 'flat' | null;
  leftRun?: number;
  rightRun?: number;
  leftPercentile?: number | null;
  rightPercentile?: number | null;
}>): FandexMomentumTemporalNormalizationResearchResult {
  const leftDirection = input?.leftDirection ?? 'down';
  const rightDirection = input?.rightDirection ?? 'down';
  const leftRun = input?.leftRun ?? 1;
  const rightRun = input?.rightRun ?? 2;
  const leftPercentile = input?.leftPercentile ?? 97.058823529412;
  const rightPercentile = input?.rightPercentile ?? 0;

  return {
    contractVersion: FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION,
    state: 'aligned-normalized-research',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: '2026-09-19T01:56:03.000Z',
    alignmentPolicy: 'latest-common-component-end-cutoff-without-lookahead',
    normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE_WITHIN_ARTIST_FAMILY',
    components: [
      {
        family: 'audience-consumption',
        canonicalArtistId: 'iu',
        sourceValueKind: 'lastfm-historical-normalized-growth-point',
        nativeCadenceHours: 24,
        selectedKey: '2026-09-19',
        selectedComponentEndAt: '2026-09-19T10:56:03+09:00',
        alignmentCutoffAt: '2026-09-19T01:56:03.000Z',
        freshnessLagHours: 0,
        freshnessWithinNativeCadence: true,
        nativeValue: 15.5,
        priorDefinedCount: 34,
        priorLessThanCurrentCount: 33,
        priorEqualToCurrentCount: 0,
        priorGreaterThanCurrentCount: 1,
        historicalStrictExceedanceShare: leftPercentile,
        previousNativeValue: 15.55,
        nativeDelta: leftDirection === null ? null : leftDirection === 'up' ? 0.05 : leftDirection === 'down' ? -0.05 : 0,
        direction: leftDirection,
        latestDirectionalRunTransitionCount: leftRun,
        latestDirectionalRunDurationHours: leftRun * 24,
        missingAsZeroApplied: false,
        missingAsStableApplied: false,
      },
      {
        family: 'media-attention',
        canonicalArtistId: 'iu',
        sourceValueKind: 'naver-current-activity-rate',
        nativeCadenceHours: 8,
        selectedKey: '2026-09-19T01:00:00.000Z',
        selectedComponentEndAt: '2026-09-19T01:00:00.000Z',
        alignmentCutoffAt: '2026-09-19T01:56:03.000Z',
        freshnessLagHours: 0.934167,
        freshnessWithinNativeCadence: true,
        nativeValue: 0,
        priorDefinedCount: 4,
        priorLessThanCurrentCount: 0,
        priorEqualToCurrentCount: 0,
        priorGreaterThanCurrentCount: 4,
        historicalStrictExceedanceShare: rightPercentile,
        previousNativeValue: 0.0025,
        nativeDelta: rightDirection === null ? null : rightDirection === 'up' ? 0.0025 : rightDirection === 'down' ? -0.0025 : 0,
        direction: rightDirection,
        latestDirectionalRunTransitionCount: rightRun,
        latestDirectionalRunDurationHours: rightRun * 8,
        missingAsZeroApplied: false,
        missingAsStableApplied: false,
      },
    ],
    componentCount: 2,
    normalizedComponentCount:
      [leftPercentile, rightPercentile].filter((value) => value !== null).length,
    futureEvidenceUsed: false,
    crossFamilyRawAveragingApplied: false,
    crossFamilyNormalizedAveragingApplied: false,
    componentWeights: null,
    compositeScore: null,
    freezeStatus: {
      temporalAlignmentPolicy: 'defined-research',
      componentNormalization: 'defined-research',
      componentWeighting: 'not-frozen',
      compositeScoreFormula: 'not-frozen',
    },
    blockers: [
      'component-normalization-research-not-product-freeze',
      'component-weighting-not-frozen',
      'composite-score-formula-not-frozen',
    ],
    digest: 'synthetic-v141-test-source',
    effects: {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    },
  };
}

test('v142 defines evidence consensus rather than a score formula', () => {
  assert.equal(
    FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_DESCRIPTOR.combinationMode,
    'evidence-consensus-not-score',
  );
  assert.equal(
    FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_DESCRIPTOR.equalWeightsAllowedByDefault,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_DESCRIPTOR.percentileMayBeAveraged,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_DESCRIPTOR.compositeScoreProduced,
    false,
  );
});

test('same non-flat direction creates qualitative cross-family corroboration only', () => {
  const result = evaluateFandexMomentumCrossFamilyCombinationResearch(source());

  assert.equal(
    result.contractVersion,
    FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
  );
  assert.equal(result.state, 'cross-family-direction-corroborated');
  assert.equal(result.directionalConsensus, 'direction-corroborated-down');
  assert.equal(result.persistenceConsensus, 'one-direction-repeated');
  assert.equal(result.combinationDecision.qualitativeDirectionEvidenceUsable, true);
  assert.equal(result.combinationDecision.numericCompositeAllowed, false);
  assert.equal(result.combinationDecision.productMomentumScore, null);
});

test('opposite directions remain visible as conflict and cannot be averaged away', () => {
  const result = evaluateFandexMomentumCrossFamilyCombinationResearch(
    source({ leftDirection: 'up', rightDirection: 'down' }),
  );

  assert.equal(result.state, 'cross-family-direction-conflicted');
  assert.equal(result.directionalConsensus, 'direction-conflicted');
  assert.equal(result.persistenceConsensus, 'persistence-not-applicable');
  assert.ok(result.blockers.includes('cross-family-direction-conflict'));
  assert.equal(result.combinationDecision.qualitativeDirectionEvidenceUsable, false);
  assert.equal(result.combinationDecision.percentileAverageAllowed, false);
});

test('flat is explicit evidence, not missing or zero-filled direction', () => {
  const result = evaluateFandexMomentumCrossFamilyCombinationResearch(
    source({
      leftDirection: 'flat',
      rightDirection: 'flat',
      leftRun: 0,
      rightRun: 0,
    }),
  );

  assert.equal(result.state, 'cross-family-flat-corroborated');
  assert.equal(result.directionalConsensus, 'flat-corroborated');
  assert.equal(result.persistenceConsensus, 'persistence-not-applicable');
  assert.equal(result.combinationDecision.qualitativeDirectionEvidenceUsable, true);
});

test('persistence describes repeated native-cadence direction without creating weights', () => {
  const both = evaluateFandexMomentumCrossFamilyCombinationResearch(
    source({ leftRun: 2, rightRun: 3 }),
  );
  assert.equal(both.persistenceConsensus, 'both-directions-repeated');

  const neither = evaluateFandexMomentumCrossFamilyCombinationResearch(
    source({ leftRun: 1, rightRun: 1 }),
  );
  assert.equal(neither.persistenceConsensus, 'neither-direction-repeated');

  for (const result of [both, neither]) {
    assert.equal(result.combinationDecision.persistenceWeightingAllowed, false);
    assert.equal(result.combinationDecision.equalWeightAverageAllowed, false);
    assert.equal(result.combinationDecision.productMomentumScore, null);
  }
});

test('percentile spread is diagnostic only even when extremely large', () => {
  const result = evaluateFandexMomentumCrossFamilyCombinationResearch(
    source({ leftPercentile: 97.058823529412, rightPercentile: 0 }),
  );

  assert.equal(result.levelDiagnostics.normalizedLevelCount, 2);
  assert.equal(result.levelDiagnostics.lowestHistoricalStrictExceedanceShare, 0);
  assert.equal(
    result.levelDiagnostics.highestHistoricalStrictExceedanceShare,
    97.058823529412,
  );
  assert.equal(
    result.levelDiagnostics.absoluteHistoricalPercentileSpread,
    97.058823529412,
  );
  assert.equal(result.levelDiagnostics.aggregationEligible, false);
  assert.equal(result.combinationDecision.percentileAverageAllowed, false);
});

test('missing direction remains insufficient rather than inferred from percentile level', () => {
  const result = evaluateFandexMomentumCrossFamilyCombinationResearch(
    source({ leftDirection: null }),
  );

  assert.equal(result.state, 'cross-family-direction-insufficient');
  assert.equal(result.directionalConsensus, 'direction-insufficient');
  assert.ok(result.blockers.includes('cross-family-direction-insufficient'));
  assert.equal(result.combinationDecision.productMomentumScore, null);
});

test('v142 blocks malformed v141 state before combination', () => {
  const malformed = {
    ...source(),
    state: 'temporal-alignment-unavailable' as const,
  };

  const result = evaluateFandexMomentumCrossFamilyCombinationResearch(malformed);

  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('v141-aligned-normalized-research-required'));
  assert.equal(result.combinationDecision.numericCompositeAllowed, false);
});
