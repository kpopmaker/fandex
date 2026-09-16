import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

import {
  evaluateNaverNewsMediaActivityMethodResearch,
  parseNaverNewsMediaActivityMethodResearchCommand,
  runNaverNewsMediaActivityMethodResearch,
  summarizeNaverNewsMediaActivityMethodResearch,
} from '../lib/server/ingestion/naverNewsMediaActivityMethodResearch';
import type { NaverNewsShadowFirstSeenSeriesResult } from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';

function createAvailableSeries(): NaverNewsShadowFirstSeenSeriesResult {
  const baseSlots = [
    ['2026-09-15T16:00:00.000Z', 100, null, true],
    ['2026-09-15T17:00:00.000Z', 100, 0, false],
    ['2026-09-15T18:00:00.000Z', 100, 10, false],
    ['2026-09-15T19:00:00.000Z', 100, 20, false],
    ['2026-09-15T20:00:00.000Z', 100, 10, false],
  ] as const;

  const slots = baseSlots.map(([slotStart, observedObservationCount, firstSeenObservationCount, bootstrap], index) => ({
    slotStart,
    jobId: `${index + 1}`.repeat(64).slice(0, 64),
    collectionCompleteness: 'truncated' as const,
    observedObservationCount,
    firstSeenObservationCount,
    firstSeenObservationIds: [] as string[],
    bootstrap,
  }));

  return {
    contractVersion: 'v1_naver_news_shadow_first_seen_series',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    protocolStart: '2026-09-15T16:00:00.000Z',
    throughSlotStart: '2026-09-15T20:00:00.000Z',
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
      protocolStart: '2026-09-15T16:00:00.000Z',
      protocol: {
        provider: 'naver-news',
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
  };
}

test('command requires explicit artist, through slot, and unique positive window candidates', () => {
  const command = parseNaverNewsMediaActivityMethodResearchCommand([
    '--artist',
    'iu',
    '--through-slot-start',
    '2026-09-16T02:00:00.000Z',
    '--window-slots',
    '1,3,6',
  ]);

  assert.deepEqual(command, {
    canonicalArtistId: 'iu',
    throughSlotStart: '2026-09-16T02:00:00.000Z',
    candidateWindowSlotCounts: [1, 3, 6],
  });
  assert.throws(() => parseNaverNewsMediaActivityMethodResearchCommand([
    '--artist', 'iu', '--through-slot-start', '2026-09-16T02:00:00.000Z',
  ]), /naver_news_media_activity_method_research_argument_invalid/);
  assert.throws(() => parseNaverNewsMediaActivityMethodResearchCommand([
    '--artist', 'iu', '--through-slot-start', '2026-09-16T02:00:00.000Z', '--window-slots', '3,3',
  ]), /naver_news_media_activity_method_research_argument_invalid/);
  assert.throws(() => parseNaverNewsMediaActivityMethodResearchCommand([
    '--artist', 'iu', '--through-slot-start', '2026-09-16T02:00:00.000Z', '--window-slots', '0',
  ]), /naver_news_media_activity_method_research_argument_invalid/);
});

test('research evaluator excludes bootstrap and compares explicit rolling-window candidates without publishing a Product score', () => {
  const result = evaluateNaverNewsMediaActivityMethodResearch({
    series: createAvailableSeries(),
    candidateWindowSlotCounts: [1, 2, 5],
  });

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
  assert.equal(oneSlot.windowSlotCount, 1);
  assert.equal(oneSlot.status, 'available');
  assert.equal(oneSlot.windowCount, 4);
  assert.equal(oneSlot.definedActivityWindowCount, 4);
  assert.equal(oneSlot.zeroActivityWindowCount, 1);
  assert.equal(oneSlot.zeroActivityWindowRate, 0.25);
  assert.equal(oneSlot.latestWindow?.observedActivityRate, 0.1);
  assert.deepEqual(oneSlot.latestVsPrior, {
    priorDefinedWindowCount: 3,
    priorLessThanLatestCount: 1,
    priorEqualToLatestCount: 0,
    priorGreaterThanLatestCount: 2,
  });

  const twoSlot = result.candidates[1];
  assert.equal(twoSlot.windowCount, 3);
  assert.equal(twoSlot.zeroActivityWindowCount, 0);
  assert.equal(twoSlot.statistics.mean, 0.1);
  assert.equal(twoSlot.statistics.median, 0.1);
  assert.equal(twoSlot.latestWindow?.firstSeenObservationCount, 30);
  assert.equal(twoSlot.latestWindow?.observedObservationCount, 200);
  assert.equal(twoSlot.latestWindow?.observedActivityRate, 0.15);
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
  } as NaverNewsShadowFirstSeenSeriesResult;

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
  const research = evaluateNaverNewsMediaActivityMethodResearch({
    series: createAvailableSeries(),
    candidateWindowSlotCounts: [1, 2],
  });
  const summary = summarizeNaverNewsMediaActivityMethodResearch(research);
  const serialized = JSON.stringify(summary);

  assert.equal(summary.lifecycle, 'research');
  assert.equal(summary.directProductContributionEligible, false);
  assert.equal(summary.productScorePublished, false);
  assert.equal(serialized.includes('windows'), false);
  assert.equal(serialized.includes('firstSeenObservationIds'), false);
  assert.equal(serialized.includes('title'), false);
  assert.equal(serialized.includes('summary'), false);
  assert.equal(serialized.includes('raw_payload'), false);
  assert.equal(serialized.includes('normalized_payload'), false);
});

test('runner uses official-series dependency, hardened pool config, and closes the pool', async () => {
  let poolEnded = false;
  let assembleInput: unknown = null;
  let capturedPoolConfig: unknown = null;
  const result = await runNaverNewsMediaActivityMethodResearch([
    '--artist', 'iu',
    '--through-slot-start', '2026-09-16T02:00:00.000Z',
    '--window-slots', '1,2',
  ], {
    FANDEX_RUNTIME_DATABASE_URL: 'postgresql://fandex_runtime:secret@ep-test-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  }, {
    poolFactory(config) {
      capturedPoolConfig = config;
      return {
        async connect() {
          throw new Error('repository is injected');
        },
        async end() {
          poolEnded = true;
        },
      };
    },
    repositoryFactory() {
      return {
        async readJobEvidence() {
          return null;
        },
      };
    },
    async assembleOfficialSeries(input) {
      assembleInput = input;
      return createAvailableSeries();
    },
  });

  assert.deepEqual(assembleInput, {
    canonicalArtistId: 'iu',
    throughSlotStart: '2026-09-16T02:00:00.000Z',
  });
  assert.deepEqual(capturedPoolConfig, {
    connectionString: 'postgresql://fandex_runtime:secret@ep-test-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
    max: 1,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    ssl: { rejectUnauthorized: true },
  });
  assert.equal(poolEnded, true);
  assert.equal(result.status, 'available');
  assert.equal(result.productScorePublished, false);
});

test('runner fails closed when runtime DB contract is absent', async () => {
  await assert.rejects(
    () => runNaverNewsMediaActivityMethodResearch([
      '--artist', 'iu',
      '--through-slot-start', '2026-09-16T02:00:00.000Z',
      '--window-slots', '1',
    ], {}),
    /naver_news_media_activity_method_research_failed/,
  );
});

test('research implementation has no collection, dispatch, fetch, Product pipeline, or write SQL path', () => {
  const source = fs.readFileSync(
    new URL('../lib/server/ingestion/naverNewsMediaActivityMethodResearch.ts', import.meta.url),
    'utf8',
  );
  const script = fs.readFileSync(
    new URL('../scripts/ingestion/research-naver-news-media-activity.mts', import.meta.url),
    'utf8',
  );
  const combined = `${source}\n${script}`;

  for (const forbidden of [
    'naverNewsExternalCollector',
    'dispatchNaverNews',
    'fetch(',
    'INSERT ',
    'UPDATE ',
    'DELETE ',
    'CREATE ',
    'ALTER ',
    'DROP ',
    'TRUNCATE ',
    'metricScoringPipeline',
    'newsIssuePoint',
  ]) {
    assert.equal(combined.includes(forbidden), false, `forbidden research path token: ${forbidden}`);
  }
});
