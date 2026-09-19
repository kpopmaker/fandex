import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
  type NaverNewsIssuePointFrozenMethodologyResult,
} from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
} from '../lib/intelligence/naverNewsIssuePointConstruct';
import {
  FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR,
  FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION,
  deriveFandexNaverMediaAttentionMomentumResearch,
} from '../lib/intelligence/fandexNaverMediaAttentionMomentumResearch';

function point(input: Readonly<{
  throughSlotStart: string;
  activityRate?: number | null;
  score?: number | null;
  status?: 'available' | 'unavailable';
  artist?: string;
  protocolStart?: string;
  priorDefinedWindowCount?: number;
}>): NaverNewsIssuePointFrozenMethodologyResult {
  const status = input.status ?? 'available';
  return {
    contractVersion: NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
    methodologyVersion: NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    variableId: 'newsIssuePoint',
    canonicalArtistId: input.artist ?? 'iu',
    protocolStart: input.protocolStart ?? '2026-09-01T00:00:00.000Z',
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
    status,
    reason: status === 'available'
      ? 'frozen_methodology_value_available'
      : 'current_window_undefined',
    score: status === 'available' ? (input.score ?? 50) : null,
    currentActivityRate: status === 'available' ? (input.activityRate ?? 0.5) : null,
    priorDefinedWindowCount: input.priorDefinedWindowCount ?? 48,
    priorLessThanLatestCount: status === 'available' ? 24 : 0,
    priorEqualToLatestCount: 0,
    priorGreaterThanLatestCount: status === 'available' ? 24 : 0,
    currentWindow: null,
    eligiblePriorWindows: [],
    excludedWindows: [],
    evidenceTrace: {
      windows: [],
      storedEvidenceJobIds: [],
    },
  } as unknown as NaverNewsIssuePointFrozenMethodologyResult;
}

test('v140 is research-only and produces no component score', () => {
  assert.equal(
    FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR.persistenceSampling,
    'latest-anchored-non-overlapping-frozen-window-duration',
  );
  assert.equal(
    FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR.directionSource,
    'currentActivityRate',
  );
  assert.equal(
    FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR.normalizedNewsIssuePointScoreRole,
    'diagnostic-only',
  );
  assert.equal(FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR.componentScoreProduced, false);
  assert.equal(FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR.productionEligible, false);
});

test('v140 observes persistence only across latest-anchored non-overlapping 8h windows', () => {
  const result = deriveFandexNaverMediaAttentionMomentumResearch([
    point({ throughSlotStart: '2026-09-10T00:00:00.000Z', activityRate: 0.2, score: 30 }),
    point({ throughSlotStart: '2026-09-10T08:00:00.000Z', activityRate: 0.3, score: 40 }),
    point({ throughSlotStart: '2026-09-10T16:00:00.000Z', activityRate: 0.5, score: 60 }),
  ]);

  assert.equal(result.contractVersion, FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION);
  assert.equal(result.state, 'persistence-observed');
  assert.equal(result.nonOverlappingAnchorCount, 3);
  assert.equal(result.transitions.length, 2);
  assert.equal(result.latestDirection, 'up');
  assert.equal(result.latestDirectionalRunTransitionCount, 2);
  assert.equal(result.latestDirectionalRunDurationHours, 16);
  assert.equal(result.persistenceObserved, true);
  assert.equal(result.componentScore, null);
});

test('v140 ignores overlapping hourly windows for persistence and samples exact 8h anchors', () => {
  const points = Array.from({ length: 17 }, (_, hour) =>
    point({
      throughSlotStart: `2026-09-10T${String(hour).padStart(2, '0')}:00:00.000Z`,
      activityRate: 0.2 + hour * 0.01,
      score: 20 + hour,
    }),
  );

  const result = deriveFandexNaverMediaAttentionMomentumResearch(points);

  assert.deepEqual(
    result.anchors.map((anchor) => anchor.throughSlotStart),
    [
      '2026-09-10T00:00:00.000Z',
      '2026-09-10T08:00:00.000Z',
      '2026-09-10T16:00:00.000Z',
    ],
  );
  assert.equal(result.sourcePointCount, 17);
  assert.equal(result.nonOverlappingAnchorCount, 3);
  assert.equal(result.continuity.overlappingHourlyWindowsUsedForPersistence, false);
});

test('missing or unavailable exact 8h anchor breaks continuity instead of becoming zero or stable', () => {
  const result = deriveFandexNaverMediaAttentionMomentumResearch([
    point({ throughSlotStart: '2026-09-10T00:00:00.000Z', activityRate: 0.2 }),
    point({ throughSlotStart: '2026-09-10T08:00:00.000Z', status: 'unavailable' }),
    point({ throughSlotStart: '2026-09-10T16:00:00.000Z', activityRate: 0.5 }),
  ]);

  assert.equal(result.state, 'insufficient-non-overlapping-history');
  assert.equal(result.nonOverlappingAnchorCount, 1);
  assert.equal(result.transitions.length, 0);
  assert.equal(result.latestDirection, null);
  assert.ok(result.blockers.includes('insufficient-non-overlapping-history'));
});

test('normalized newsIssuePoint score delta is diagnostic and cannot override activity-rate direction', () => {
  const result = deriveFandexNaverMediaAttentionMomentumResearch([
    point({ throughSlotStart: '2026-09-10T00:00:00.000Z', activityRate: 0.2, score: 90 }),
    point({ throughSlotStart: '2026-09-10T08:00:00.000Z', activityRate: 0.4, score: 70 }),
  ]);

  assert.equal(result.state, 'direction-observed');
  assert.equal(result.latestDirection, 'up');
  assert.equal(result.latestActivityRateDelta, 0.2);
  assert.equal(result.latestNewsIssuePointScoreDeltaDiagnostic, -20);
});

test('flat latest activity-rate transition is represented explicitly, not as missing', () => {
  const result = deriveFandexNaverMediaAttentionMomentumResearch([
    point({ throughSlotStart: '2026-09-10T00:00:00.000Z', activityRate: 0.4, score: 40 }),
    point({ throughSlotStart: '2026-09-10T08:00:00.000Z', activityRate: 0.4, score: 60 }),
  ]);

  assert.equal(result.state, 'flat-observed');
  assert.equal(result.latestDirection, 'flat');
  assert.equal(result.latestActivityRateDelta, 0);
  assert.equal(result.persistenceObserved, false);
});

test('latest unavailable source blocks current component observation', () => {
  const result = deriveFandexNaverMediaAttentionMomentumResearch([
    point({ throughSlotStart: '2026-09-10T00:00:00.000Z', activityRate: 0.2 }),
    point({ throughSlotStart: '2026-09-10T08:00:00.000Z', status: 'unavailable' }),
  ]);

  assert.equal(result.state, 'latest-source-unavailable');
  assert.equal(result.nonOverlappingAnchorCount, 0);
  assert.ok(result.blockers.includes('latest-source-unavailable'));
});

test('cross-artist or cross-epoch inputs are rejected instead of combined', () => {
  assert.throws(
    () => deriveFandexNaverMediaAttentionMomentumResearch([
      point({ throughSlotStart: '2026-09-10T00:00:00.000Z', artist: 'iu' }),
      point({ throughSlotStart: '2026-09-10T08:00:00.000Z', artist: 'aespa' }),
    ]),
    /scope_invalid/,
  );

  assert.throws(
    () => deriveFandexNaverMediaAttentionMomentumResearch([
      point({
        throughSlotStart: '2026-09-10T00:00:00.000Z',
        protocolStart: '2026-09-01T00:00:00.000Z',
      }),
      point({
        throughSlotStart: '2026-09-10T08:00:00.000Z',
        protocolStart: '2026-09-02T00:00:00.000Z',
      }),
    ]),
    /scope_invalid/,
  );
});
