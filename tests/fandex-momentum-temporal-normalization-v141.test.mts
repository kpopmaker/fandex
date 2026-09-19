import assert from 'node:assert/strict';
import test from 'node:test';

import type { NaverNewsIssuePointFrozenMethodologyResult } from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
} from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
} from '../lib/intelligence/naverNewsIssuePointConstruct';
import {
  deriveFandexNaverMediaAttentionMomentumResearch,
} from '../lib/intelligence/fandexNaverMediaAttentionMomentumResearch';
import {
  FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR,
  FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION,
  evaluateFandexMomentumTemporalNormalizationResearch,
} from '../lib/intelligence/fandexMomentumTemporalNormalizationResearch';
import {
  LASTFM_CANONICAL_IDENTITIES,
} from '../lib/lastfm-signal/identityQualityGate';

function lastfmHistory(days = 10): string {
  const headers = [
    'snapshotDate', 'artist', 'query', 'lastfmName',
    'listeners', 'playcount', 'collectedAt', 'status',
  ];
  const rows: string[] = [headers.join(',')];
  for (let day = 1; day <= days; day += 1) {
    const date = `2026-08-${String(day).padStart(2, '0')}`;
    LASTFM_CANONICAL_IDENTITIES.forEach((identity, index) => {
      const rate = 2 ** index;
      rows.push([
        date,
        identity.artistLabel,
        identity.expectedQuery,
        identity.acceptedLastfmNames[0],
        100_000 + rate * day,
        1_000_000 + rate * 10 * day,
        `${date}T10:00:00+09:00`,
        'ok',
      ].join(','));
    });
  }
  return rows.join('\n') + '\n';
}

function frozenPoint(input: Readonly<{
  throughSlotStart: string;
  activityRate: number;
  score: number;
}>): NaverNewsIssuePointFrozenMethodologyResult {
  return {
    contractVersion: NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
    methodologyVersion: NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    variableId: 'newsIssuePoint',
    canonicalArtistId: 'iu',
    protocolStart: '2026-08-01T00:00:00.000Z',
    throughSlotStart: input.throughSlotStart,
    selectedWindowSlotCount: 8,
    rollingWindowSemantics: 'overlapping',
    baselineScope: 'same_artist_same_official_shadow_epoch',
    baselineReadiness: {
      cycleSlotCount: 24,
      utcHourCoverageCount: 24,
      completeCycleCount: 2,
      sameUtcHourReplicationFloor: 2,
      sameUtcHourReplicationCeiling: 2,
      status: 'replicated_cycle_history',
    },
    normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
    status: 'available',
    reason: 'frozen_methodology_value_available',
    score: input.score,
    currentActivityRate: input.activityRate,
    priorDefinedWindowCount: 48,
    priorLessThanLatestCount: 24,
    priorEqualToLatestCount: 0,
    priorGreaterThanLatestCount: 24,
    currentWindow: null,
    eligiblePriorWindows: [],
    excludedWindows: [],
    evidenceTrace: { windows: [], storedEvidenceJobIds: [] },
  } as unknown as NaverNewsIssuePointFrozenMethodologyResult;
}

function naverComponent() {
  return deriveFandexNaverMediaAttentionMomentumResearch([
    frozenPoint({
      throughSlotStart: '2026-08-08T17:00:00.000Z',
      activityRate: 0.01,
      score: 10,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-09T01:00:00.000Z',
      activityRate: 0.02,
      score: 20,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-09T09:00:00.000Z',
      activityRate: 0.03,
      score: 30,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-09T17:00:00.000Z',
      activityRate: 0.04,
      score: 40,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-10T01:00:00.000Z',
      activityRate: 0.05,
      score: 50,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-10T09:00:00.000Z',
      activityRate: 0.08,
      score: 80,
    }),
  ]);
}

test('v141 defines common-cutoff alignment and within-family historical normalization only', () => {
  assert.equal(
    FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR.temporalAlignment,
    'latest-common-component-end-cutoff-without-lookahead',
  );
  assert.equal(
    FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR.normalization,
    'same-artist-same-family-historical-strict-exceedance-share',
  );
  assert.equal(
    FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR.crossFamilyNormalizedAveragingAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR.compositeScoreProduced,
    false,
  );
});

test('v141 blocks same-day future NAVER evidence by using latest common component cutoff', () => {
  const result = evaluateFandexMomentumTemporalNormalizationResearch({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: lastfmHistory(),
    naverComponent: naverComponent(),
  });

  assert.equal(result.contractVersion, FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION);
  assert.equal(result.state, 'aligned-normalized-research');
  assert.equal(result.alignmentCutoffAt, '2026-08-10T01:00:00.000Z');

  const lastfm = result.components.find((component) => component.family === 'audience-consumption');
  const naver = result.components.find((component) => component.family === 'media-attention');
  assert.equal(lastfm?.selectedKey, '2026-08-10');
  assert.equal(naver?.selectedKey, '2026-08-10T01:00:00.000Z');
  assert.notEqual(naver?.selectedKey, '2026-08-10T09:00:00.000Z');
  assert.equal(result.futureEvidenceUsed, false);
});

test('v141 normalizes each family against its own prior defined history', () => {
  const result = evaluateFandexMomentumTemporalNormalizationResearch({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: lastfmHistory(),
    naverComponent: naverComponent(),
  });

  const lastfm = result.components.find((component) => component.family === 'audience-consumption');
  const naver = result.components.find((component) => component.family === 'media-attention');

  assert.ok((lastfm?.priorDefinedCount ?? 0) > 0);
  assert.notEqual(lastfm?.historicalStrictExceedanceShare, null);

  assert.equal(naver?.nativeValue, 0.05);
  assert.equal(naver?.priorDefinedCount, 4);
  assert.equal(naver?.priorLessThanCurrentCount, 4);
  assert.equal(naver?.priorEqualToCurrentCount, 0);
  assert.equal(naver?.historicalStrictExceedanceShare, 100);
});

test('v141 preserves native direction and persistence instead of folding them into normalization', () => {
  const result = evaluateFandexMomentumTemporalNormalizationResearch({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: lastfmHistory(),
    naverComponent: naverComponent(),
  });
  const naver = result.components.find((component) => component.family === 'media-attention');

  assert.equal(naver?.direction, 'up');
  assert.equal(naver?.nativeDelta, 0.01);
  assert.equal(naver?.latestDirectionalRunTransitionCount, 4);
  assert.equal(naver?.latestDirectionalRunDurationHours, 32);
  assert.equal(naver?.historicalStrictExceedanceShare, 100);
});

test('v141 produces no weights, raw average, normalized average, or composite score', () => {
  const result = evaluateFandexMomentumTemporalNormalizationResearch({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: lastfmHistory(),
    naverComponent: naverComponent(),
  });

  assert.equal(result.crossFamilyRawAveragingApplied, false);
  assert.equal(result.crossFamilyNormalizedAveragingApplied, false);
  assert.equal(result.componentWeights, null);
  assert.equal(result.compositeScore, null);
  assert.equal(result.freezeStatus.temporalAlignmentPolicy, 'defined-research');
  assert.equal(result.freezeStatus.componentNormalization, 'defined-research');
  assert.equal(result.freezeStatus.componentWeighting, 'not-frozen');
  assert.equal(result.freezeStatus.compositeScoreFormula, 'not-frozen');
});

test('v141 keeps tie handling strict: ties stay in denominator but not numerator', () => {
  const component = deriveFandexNaverMediaAttentionMomentumResearch([
    frozenPoint({
      throughSlotStart: '2026-08-09T01:00:00.000Z',
      activityRate: 0.02,
      score: 20,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-09T09:00:00.000Z',
      activityRate: 0.05,
      score: 50,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-09T17:00:00.000Z',
      activityRate: 0.05,
      score: 50,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-10T01:00:00.000Z',
      activityRate: 0.05,
      score: 50,
    }),
    frozenPoint({
      throughSlotStart: '2026-08-10T09:00:00.000Z',
      activityRate: 0.09,
      score: 90,
    }),
  ]);

  const result = evaluateFandexMomentumTemporalNormalizationResearch({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: lastfmHistory(),
    naverComponent: component,
  });
  const naver = result.components.find((item) => item.family === 'media-attention');

  assert.equal(naver?.selectedKey, '2026-08-10T01:00:00.000Z');
  assert.equal(naver?.priorDefinedCount, 3);
  assert.equal(naver?.priorLessThanCurrentCount, 1);
  assert.equal(naver?.priorEqualToCurrentCount, 2);
  assert.equal(naver?.historicalStrictExceedanceShare, 100 / 3);
});

test('v141 rejects NAVER artist mismatch rather than cross-artist normalization', () => {
  const mismatched = Object.freeze({
    ...naverComponent(),
    canonicalArtistId: 'aespa',
  });

  const result = evaluateFandexMomentumTemporalNormalizationResearch({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: lastfmHistory(),
    naverComponent: mismatched,
  });

  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('naver-component-contract-or-artist-mismatch'));
  assert.equal(result.compositeScore, null);
});
