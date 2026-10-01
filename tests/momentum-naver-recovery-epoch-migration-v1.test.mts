import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateNaverNewsIssuePointFrozenMethodology,
} from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  NAVER_NEWS_IU_GITHUB_RECOVERY_PROTOCOL_START,
  NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
} from '../lib/server/ingestion/naverNewsShadowEpoch';
import type {
  NaverNewsShadowFirstSeenSeriesResult,
} from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  NAVER_NEWS_SCHEDULER_VERSION,
} from '../lib/server/ingestion/naverNewsScheduler';

const HOUR_MS = 60 * 60 * 1_000;

function seriesFor(
  protocolStart: string,
): NaverNewsShadowFirstSeenSeriesResult {
  const at = (hour: number) =>
    new Date(Date.parse(protocolStart) + hour * HOUR_MS).toISOString();

  const bootstrap = Object.freeze({
    slotStart: at(0),
    jobId: 'migration-bootstrap-job',
    collectionCompleteness: 'truncated' as const,
    observedObservationCount: 100,
    firstSeenObservationCount: null,
    firstSeenObservationIds: Object.freeze([]),
    bootstrap: true,
  });
  const analysis = Array.from({ length: 48 }, (_, index) => {
    const count = index === 47 ? 4 : 0;
    return Object.freeze({
      slotStart: at(index + 1),
      jobId: `migration-job-${index + 1}`,
      collectionCompleteness: 'truncated' as const,
      observedObservationCount: 100,
      firstSeenObservationCount: count,
      firstSeenObservationIds: Object.freeze(
        Array.from({ length: count }, (__, itemIndex) =>
          `migration-first-seen-${index + 1}-${itemIndex}`),
      ),
      bootstrap: false,
    });
  });
  const slots = Object.freeze([bootstrap, ...analysis]);

  return {
    contractVersion: 'v1_naver_news_shadow_first_seen_series',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    protocolStart,
    throughSlotStart: at(48),
    expectedSlots: Object.freeze([]),
    snapshots: Object.freeze([]),
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
        provider: 'naver-news',
        schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
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
  } as NaverNewsShadowFirstSeenSeriesResult;
}

test('frozen methodology accepts a sufficiently populated recovery epoch', () => {
  const result = evaluateNaverNewsIssuePointFrozenMethodology(
    seriesFor(NAVER_NEWS_IU_GITHUB_RECOVERY_PROTOCOL_START),
  );

  assert.equal(result.status, 'available');
  assert.equal(
    result.protocolStart,
    NAVER_NEWS_IU_GITHUB_RECOVERY_PROTOCOL_START,
  );
  assert.equal(result.baselineReadiness.status, 'replicated_cycle_history');
  assert.equal(result.currentWindow?.observedObservationCount, 800);
  assert.equal(result.currentActivityRate, 0.005);
  assert.equal(result.score, 100);
});

test('historical epoch remains reconstructable after current epoch migration', () => {
  const result = evaluateNaverNewsIssuePointFrozenMethodology(
    seriesFor(NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START),
  );

  assert.equal(result.status, 'available');
  assert.equal(
    result.protocolStart,
    NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
  );
  assert.equal(result.baselineReadiness.status, 'replicated_cycle_history');
});

test('unknown epoch still fails closed', () => {
  const result = evaluateNaverNewsIssuePointFrozenMethodology(
    seriesFor('2026-09-30T23:00:00.000Z'),
  );

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'official_epoch_mismatch');
  assert.equal(result.score, null);
});
