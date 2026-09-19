import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateNaverNewsMediaActivityMethodResearch,
  NAVER_NEWS_MEDIA_ACTIVITY_METHOD_RESEARCH_CONTRACT_VERSION,
  parseNaverNewsMediaActivityMethodResearchCommand,
  runNaverNewsMediaActivityMethodResearch,
  summarizeNaverNewsMediaActivityMethodResearch,
} from '../lib/server/ingestion/naverNewsMediaActivityMethodResearch';
import type { NaverNewsShadowFirstSeenSeriesResult } from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';

const protocolStart = '2026-09-15T16:00:00.000Z';
const throughSlotStart = '2026-09-15T20:00:00.000Z';

function createAvailableSeries(): NaverNewsShadowFirstSeenSeriesResult {
  const slots = [
    {
      slotStart: protocolStart,
      jobId: '1'.repeat(64),
      collectionCompleteness: 'truncated',
      observedObservationCount: 100,
      firstSeenObservationCount: null,
      firstSeenObservationIds: [],
      bootstrap: true,
    },
    {
      slotStart: '2026-09-15T17:00:00.000Z',
      jobId: '2'.repeat(64),
      collectionCompleteness: 'truncated',
      observedObservationCount: 100,
      firstSeenObservationCount: 0,
      firstSeenObservationIds: [],
      bootstrap: false,
    },
    {
      slotStart: '2026-09-15T18:00:00.000Z',
      jobId: '3'.repeat(64),
      collectionCompleteness: 'truncated',
      observedObservationCount: 100,
      firstSeenObservationCount: 5,
      firstSeenObservationIds: [],
      bootstrap: false,
    },
    {
      slotStart: '2026-09-15T19:00:00.000Z',
      jobId: '4'.repeat(64),
      collectionCompleteness: 'truncated',
      observedObservationCount: 100,
      firstSeenObservationCount: 10,
      firstSeenObservationIds: [],
      bootstrap: false,
    },
    {
      slotStart: throughSlotStart,
      jobId: '5'.repeat(64),
      collectionCompleteness: 'truncated',
      observedObservationCount: 100,
      firstSeenObservationCount: 0,
      firstSeenObservationIds: [],
      bootstrap: false,
    },
  ] as const;

  return {
    contractVersion: 'v1_naver_news_shadow_first_seen_series',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    protocolStart,
    throughSlotStart,
    expectedSlots: [],
    snapshots: [],
    status: 'available',
    reason: 'shadow_series_available',
    missingSlotStart: null,
    missingJobId: null,
    activity: {
      contractVersion: 'v1_naver_news_shadow_first_seen_activity',
      metricKey: 'naverNewsShadowFirstSeenActivity',
      lifecycle: 'shadow',
      directProductContributionEligible: false,
      canonicalArtistId: 'iu',
      protocolStart,
      protocol: {
        provider: 'NAVER',
        schedulerVersion: 'v125_naver_news_scheduler_v1',
        cadenceMinutes: 60,
        start: 1,
        display: 100,
        sort: 'date',
        completeCollectionRequired: false,
        observationSetCoverageRequired: 'proven',
      },
      status: 'available',
      reason: 'shadow_series_available',
      slots,
      unavailableAtSlotStart: null,
    },
  } as unknown as NaverNewsShadowFirstSeenSeriesResult;
}

test('command requires explicit artist, through slot, and unique positive window candidates', () => {
  assert.deepEqual(
    parseNaverNewsMediaActivityMethodResearchCommand([
      '--artist', 'iu',
      '--through-slot-start', throughSlotStart,
      '--window-slots', '1,2,4',
    ]),
    {
      canonicalArtistId: 'iu',
      throughSlotStart,
      candidateWindowSlotCounts: [1, 2, 4],
    },
  );

  const invalidArgs = [
    ['--artist', 'iu', '--through-slot-start', throughSlotStart],
    ['--artist', 'iu', '--through-slot-start', throughSlotStart, '--window-slots', '0'],
    ['--artist', 'iu', '--through-slot-start', throughSlotStart, '--window-slots', '2,2'],
    ['--artist', 'iu', '--through-slot-start', '2026-09-15T20:30:00.000Z', '--window-slots', '2'],
    ['--artist', 'unknown', '--through-slot-start', throughSlotStart, '--window-slots', '2'],
  ];

  for (const argv of invalidArgs) {
    assert.throws(
      () => parseNaverNewsMediaActivityMethodResearchCommand(argv),
      /naver_news_media_activity_method_research_argument_invalid/,
    );
  }
});

test('research evaluator excludes bootstrap and compares explicit rolling-window candidates without publishing a Product score', () => {
  const result = evaluateNaverNewsMediaActivityMethodResearch({
    series: createAvailableSeries(),
    candidateWindowSlotCounts: [1, 2, 5],
  });

  assert.equal(
    result.contractVersion,
    NAVER_NEWS_MEDIA_ACTIVITY_METHOD_RESEARCH_CONTRACT_VERSION,
  );
  assert.equal(result.lifecycle, 'research');
  assert.equal(result.directProductContributionEligible, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.sourceMetricKey, 'naverNewsShadowFirstSeenActivity');
  assert.equal(result.baselineScope, 'same_artist_same_official_shadow_epoch');
  assert.equal(result.bootstrapExcluded, true);
  assert.equal(result.missingOrGapAsZeroAllowed, false);
  assert.equal(result.status, 'available');
  assert.equal(result.analysisSlotCount, 4);

  const oneSlot = result.candidates[0];
  assert.equal(oneSlot.status, 'available');
  assert.equal(oneSlot.windowCount, 4);
  assert.equal(oneSlot.zeroActivityWindowCount, 2);
  assert.equal(oneSlot.zeroActivityWindowRate, 0.5);
  assert.equal(oneSlot.statistics.min, 0);
  assert.equal(oneSlot.statistics.max, 0.1);
  assert.equal(oneSlot.statistics.mean, 0.0375);
  assert.equal(oneSlot.statistics.median, 0.025);
  assert.equal(oneSlot.latestWindow?.observedActivityRate, 0);
  assert.deepEqual(oneSlot.latestVsPrior, {
    priorDefinedWindowCount: 3,
    priorLessThanLatestCount: 0,
    priorEqualToLatestCount: 1,
    priorGreaterThanLatestCount: 2,
  });

  const twoSlot = result.candidates[1];
  assert.equal(twoSlot.status, 'available');
  assert.deepEqual(
    twoSlot.windows.map((window) => window.observedActivityRate),
    [0.025, 0.075, 0.05],
  );
  assert.equal(twoSlot.statistics.mean, 0.05);
  assert.equal(twoSlot.statistics.median, 0.05);
  assert.deepEqual(twoSlot.latestVsPrior, {
    priorDefinedWindowCount: 2,
    priorLessThanLatestCount: 1,
    priorEqualToLatestCount: 0,
    priorGreaterThanLatestCount: 1,
  });

  const fiveSlot = result.candidates[2];
  assert.equal(fiveSlot.status, 'insufficient_history');
  assert.equal(fiveSlot.windowCount, 0);
  assert.equal(fiveSlot.zeroActivityWindowRate, null);
  assert.equal(fiveSlot.latestWindow, null);
});

test('zero observed denominator stays undefined rather than becoming zero activity', () => {
  const series = createAvailableSeries() as unknown as {
    activity: { slots: Array<Record<string, unknown>> };
  };
  series.activity.slots[1] = {
    ...series.activity.slots[1],
    observedObservationCount: 0,
    firstSeenObservationCount: 0,
  };

  const result = evaluateNaverNewsMediaActivityMethodResearch({
    series: series as unknown as NaverNewsShadowFirstSeenSeriesResult,
    candidateWindowSlotCounts: [1],
  });
  const candidate = result.candidates[0];

  assert.equal(candidate.windowCount, 4);
  assert.equal(candidate.definedActivityWindowCount, 3);
  assert.equal(candidate.undefinedActivityWindowCount, 1);
  assert.equal(candidate.zeroActivityWindowCount, 1);
  assert.equal(candidate.zeroActivityWindowRate, 0.333333333333);
  assert.equal(candidate.windows[0].observedActivityRate, null);
});

test('unavailable source series stays unavailable and is never converted to zero', () => {
  const source = createAvailableSeries();
  const unavailable = {
    ...source,
    status: 'unavailable',
    reason: 'expected_job_missing',
    activity: null,
    missingSlotStart: '2026-09-15T18:00:00.000Z',
    missingJobId: 'a'.repeat(64),
  } as unknown as NaverNewsShadowFirstSeenSeriesResult;

  const result = evaluateNaverNewsMediaActivityMethodResearch({
    series: unavailable,
    candidateWindowSlotCounts: [1, 2],
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'source_series_unavailable');
  assert.equal(result.analysisSlotCount, 0);
  assert.deepEqual(result.candidates, []);
});

test('bounded summary omits per-window history and observation/article payloads', () => {
  const evaluated = evaluateNaverNewsMediaActivityMethodResearch({
    series: createAvailableSeries(),
    candidateWindowSlotCounts: [1, 2],
  });
  const summary = summarizeNaverNewsMediaActivityMethodResearch(evaluated);
  const serialized = JSON.stringify(summary);

  assert.equal('windows' in summary.candidates[0], false);
  assert.doesNotMatch(serialized, /firstSeenObservationIds/);
  assert.doesNotMatch(serialized, /observations/);
  assert.doesNotMatch(serialized, /sourceUrl/);
  assert.doesNotMatch(serialized, /title/);
  assert.doesNotMatch(serialized, /raw_payload/i);
});

test('runner uses official-series dependency, hardened pool config, and closes the pool', async () => {
  let ended = false;
  let assembledInput: unknown = null;
  let observedPoolConfig: unknown = null;

  const result = await runNaverNewsMediaActivityMethodResearch(
    [
      '--artist', 'iu',
      '--through-slot-start', throughSlotStart,
      '--window-slots', '1,2',
    ],
    {
      FANDEX_RUNTIME_DATABASE_URL:
        'postgresql://fandex_runtime:secret@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
    },
    {
      poolFactory(config) {
        observedPoolConfig = config;
        return {
          async query() {
            throw new Error('query must be handled by injected repository');
          },
          async end() {
            ended = true;
          },
        } as never;
      },
      repositoryFactory() {
        return {
          async readJobEvidence() {
            return null;
          },
        };
      },
      async assembleOfficialSeries(input) {
        assembledInput = input;
        return createAvailableSeries();
      },
    },
  );

  assert.deepEqual(assembledInput, {
    canonicalArtistId: 'iu',
    throughSlotStart,
  });
  assert.deepEqual(observedPoolConfig, {
    connectionString:
      'postgresql://fandex_runtime:secret@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
    max: 1,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    ssl: { rejectUnauthorized: true },
  });
  assert.equal(ended, true);
  assert.equal(result.lifecycle, 'research');
  assert.equal(result.directProductContributionEligible, false);
  assert.equal(result.productScorePublished, false);
});

test('runner fails closed when runtime DB contract is absent', async () => {
  await assert.rejects(
    () => runNaverNewsMediaActivityMethodResearch(
      [
        '--artist', 'iu',
        '--through-slot-start', throughSlotStart,
        '--window-slots', '1',
      ],
      {},
    ),
    /naver_news_media_activity_method_research_failed/,
  );
});

test('research implementation has no collection, dispatch, fetch, Product pipeline, or write SQL path', async () => {
  const moduleSource = await readFile(
    new URL('../lib/server/ingestion/naverNewsMediaActivityMethodResearch.ts', import.meta.url),
    'utf8',
  );
  const cliSource = await readFile(
    new URL('../scripts/ingestion/research-naver-news-media-activity.mts', import.meta.url),
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
