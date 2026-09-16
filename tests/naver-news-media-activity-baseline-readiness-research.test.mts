import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateNaverNewsMediaActivityBaselineReadinessResearch,
  NAVER_NEWS_MEDIA_ACTIVITY_BASELINE_READINESS_RESEARCH_CONTRACT_VERSION,
  parseNaverNewsMediaActivityBaselineReadinessResearchCommand,
  runNaverNewsMediaActivityBaselineReadinessResearch,
} from '../lib/server/ingestion/naverNewsMediaActivityBaselineReadinessResearch';

const protocolStart = '2026-09-15T16:00:00.000Z';
const throughSlotStart = '2026-09-16T08:00:00.000Z';

function candidate(windowSlotCount: number, windowCount: number, zeroRate: number) {
  return {
    windowSlotCount,
    status: 'available' as const,
    rollingWindowSemantics: 'overlapping' as const,
    windowCount,
    definedActivityWindowCount: windowCount,
    undefinedActivityWindowCount: 0,
    zeroActivityWindowCount: Math.round(windowCount * zeroRate),
    zeroActivityWindowRate: zeroRate,
    statistics: {
      min: 0,
      max: 0.04,
      mean: 0.015,
      median: 0.0125,
      populationStdDev: 0.01,
      meanAbsoluteConsecutiveChange: 0.005,
    },
    latestWindow: null,
    latestVsPrior: null,
  };
}

function methodResearch(analysisSlotCount: number) {
  return {
    contractVersion: 'v1_naver_news_media_activity_method_research',
    researchKey: 'naverNewsMediaActivityMethodResearch',
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
    sourceMetricKey: 'naverNewsShadowFirstSeenActivity' as const,
    canonicalArtistId: 'iu',
    protocolStart,
    throughSlotStart,
    baselineScope: 'same_artist_same_official_shadow_epoch' as const,
    bootstrapExcluded: true as const,
    missingOrGapAsZeroAllowed: false as const,
    status: 'available' as const,
    reason: 'method_research_available' as const,
    analysisSlotCount,
    candidateWindowSlotCounts: [4, 8],
    candidates: [
      candidate(4, Math.max(0, analysisSlotCount - 3), 0.3),
      candidate(8, Math.max(0, analysisSlotCount - 7), 0),
    ],
  };
}

test('command requires explicit baseline candidates and preserves explicit method candidates', () => {
  assert.deepEqual(
    parseNaverNewsMediaActivityBaselineReadinessResearchCommand([
      '--artist', 'iu',
      '--through-slot-start', throughSlotStart,
      '--window-slots', '4,8',
      '--baseline-slots', '24,48,72,168',
    ]),
    {
      canonicalArtistId: 'iu',
      throughSlotStart,
      candidateWindowSlotCounts: [4, 8],
      candidateBaselineSlotCounts: [24, 48, 72, 168],
    },
  );

  const invalidArgs = [
    ['--artist', 'iu', '--through-slot-start', throughSlotStart, '--window-slots', '4,8'],
    ['--artist', 'iu', '--through-slot-start', throughSlotStart, '--window-slots', '4,8', '--baseline-slots', '0'],
    ['--artist', 'iu', '--through-slot-start', throughSlotStart, '--window-slots', '4,8', '--baseline-slots', '24,24'],
  ];
  for (const argv of invalidArgs) {
    assert.throws(
      () => parseNaverNewsMediaActivityBaselineReadinessResearchCommand(argv),
      /naver_news_media_activity_baseline_readiness_research_argument_invalid/,
    );
  }
});

test('16 analysis slots stay below a complete diurnal cycle and do not imply baseline sufficiency', () => {
  const result = evaluateNaverNewsMediaActivityBaselineReadinessResearch({
    methodResearch: methodResearch(16) as never,
    candidateBaselineSlotCounts: [24, 48, 168],
  });

  assert.equal(
    result.contractVersion,
    NAVER_NEWS_MEDIA_ACTIVITY_BASELINE_READINESS_RESEARCH_CONTRACT_VERSION,
  );
  assert.equal(result.lifecycle, 'research');
  assert.equal(result.directProductContributionEligible, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.productMethodologyFrozen, false);
  assert.equal(result.productionBaselineSufficiencyRuleStatus, 'not_frozen');
  assert.deepEqual(result.diurnalReadiness, {
    cycleSlotCount: 24,
    utcHourCoverageCount: 16,
    completeCycleCount: 0,
    sameUtcHourReplicationFloor: 0,
    sameUtcHourReplicationCeiling: 1,
    status: 'full_cycle_unavailable',
  });
  assert.deepEqual(
    result.windowReadiness.map((item) => ({
      windowSlotCount: item.windowSlotCount,
      rollingWindowCount: item.rollingWindowCount,
      nonOverlappingWindowCount: item.nonOverlappingWindowCount,
    })),
    [
      { windowSlotCount: 4, rollingWindowCount: 13, nonOverlappingWindowCount: 4 },
      { windowSlotCount: 8, rollingWindowCount: 9, nonOverlappingWindowCount: 2 },
    ],
  );
  assert.deepEqual(
    result.baselineCandidates.map((item) => ({
      baselineSlotCount: item.baselineSlotCount,
      status: item.status,
      fullBaselineBlockCount: item.fullBaselineBlockCount,
      productionSufficiencyImplied: item.productionSufficiencyImplied,
    })),
    [
      { baselineSlotCount: 24, status: 'insufficient_history', fullBaselineBlockCount: 0, productionSufficiencyImplied: false },
      { baselineSlotCount: 48, status: 'insufficient_history', fullBaselineBlockCount: 0, productionSufficiencyImplied: false },
      { baselineSlotCount: 168, status: 'insufficient_history', fullBaselineBlockCount: 0, productionSufficiencyImplied: false },
    ],
  );
});

test('24 slots mark one full cycle as available without declaring Product baseline sufficiency', () => {
  const result = evaluateNaverNewsMediaActivityBaselineReadinessResearch({
    methodResearch: methodResearch(24) as never,
    candidateBaselineSlotCounts: [24, 48],
  });

  assert.equal(result.diurnalReadiness.status, 'single_cycle_only');
  assert.equal(result.diurnalReadiness.completeCycleCount, 1);
  assert.equal(result.diurnalReadiness.sameUtcHourReplicationFloor, 1);
  assert.equal(result.diurnalReadiness.sameUtcHourReplicationCeiling, 1);
  assert.deepEqual(result.baselineCandidates, [
    {
      baselineSlotCount: 24,
      status: 'history_available',
      availableSlotCount: 24,
      fullBaselineBlockCount: 1,
      productionSufficiencyImplied: false,
    },
    {
      baselineSlotCount: 48,
      status: 'insufficient_history',
      availableSlotCount: 24,
      fullBaselineBlockCount: 0,
      productionSufficiencyImplied: false,
    },
  ]);
  assert.equal(result.productMethodologyFrozen, false);
  assert.equal(result.productionBaselineSufficiencyRuleStatus, 'not_frozen');
});

test('48 slots only establishes replicated cycle history; it still does not freeze Product methodology', () => {
  const result = evaluateNaverNewsMediaActivityBaselineReadinessResearch({
    methodResearch: methodResearch(48) as never,
    candidateBaselineSlotCounts: [24, 48, 168],
  });

  assert.deepEqual(result.diurnalReadiness, {
    cycleSlotCount: 24,
    utcHourCoverageCount: 24,
    completeCycleCount: 2,
    sameUtcHourReplicationFloor: 2,
    sameUtcHourReplicationCeiling: 2,
    status: 'replicated_cycle_history',
  });
  assert.equal(result.baselineCandidates[0].fullBaselineBlockCount, 2);
  assert.equal(result.baselineCandidates[1].fullBaselineBlockCount, 1);
  assert.equal(result.baselineCandidates[2].status, 'insufficient_history');
  assert.equal(result.baselineCandidates.every((item) => item.productionSufficiencyImplied === false), true);
  assert.equal(result.productMethodologyFrozen, false);
});

test('unavailable method research remains unavailable rather than becoming zero-history evidence', () => {
  const source = {
    ...methodResearch(0),
    status: 'unavailable' as const,
    reason: 'source_series_unavailable' as const,
    candidates: [],
  };
  const result = evaluateNaverNewsMediaActivityBaselineReadinessResearch({
    methodResearch: source as never,
    candidateBaselineSlotCounts: [24],
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'source_method_research_unavailable');
  assert.equal(result.analysisSlotCount, 0);
  assert.equal(result.diurnalReadiness.status, 'full_cycle_unavailable');
  assert.equal(result.baselineCandidates[0].status, 'insufficient_history');
});

test('runner delegates all DB reading to the existing read-only method research runner', async () => {
  let forwardedArgv: readonly string[] | null = null;
  let forwardedEnvironment: Readonly<Record<string, string | undefined>> | null = null;

  const result = await runNaverNewsMediaActivityBaselineReadinessResearch([
    '--artist', 'iu',
    '--through-slot-start', throughSlotStart,
    '--window-slots', '4,8',
    '--baseline-slots', '24,48',
  ], { FANDEX_RUNTIME_DATABASE_URL: 'redacted-runtime-url' }, {
    async methodResearchRunner(argv, environment) {
      forwardedArgv = argv;
      forwardedEnvironment = environment;
      return methodResearch(16) as never;
    },
  });

  assert.deepEqual(forwardedArgv, [
    '--artist', 'iu',
    '--through-slot-start', throughSlotStart,
    '--window-slots', '4,8',
  ]);
  assert.deepEqual(forwardedEnvironment, { FANDEX_RUNTIME_DATABASE_URL: 'redacted-runtime-url' });
  assert.equal(result.analysisSlotCount, 16);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.productMethodologyFrozen, false);
});

test('baseline readiness research adds no collector, fetch, Product pipeline, or SQL write path', async () => {
  const moduleSource = await readFile(
    new URL('../lib/server/ingestion/naverNewsMediaActivityBaselineReadinessResearch.ts', import.meta.url),
    'utf8',
  );
  const cliSource = await readFile(
    new URL('../scripts/ingestion/research-naver-news-media-activity-baseline-readiness.mts', import.meta.url),
    'utf8',
  );
  const combined = `${moduleSource}\n${cliSource}`;

  assert.doesNotMatch(combined, /naverNewsExternalCollector/);
  assert.doesNotMatch(combined, /naverNewsSchedulerDispatch/);
  assert.doesNotMatch(combined, /metricScoringPipeline/);
  assert.doesNotMatch(combined, /issueScoreEngine/);
  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
});
