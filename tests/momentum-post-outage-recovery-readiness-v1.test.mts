import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateFandexMomentumPostOutageRecoveryReadiness,
} from '../lib/intelligence/fandexMomentumPostOutageRecoveryReadiness';
import type {
  NaverNewsShadowFirstSeenSeriesResult,
} from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import type {
  NaverNewsIssuePointFrozenMethodologyResult,
} from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';

function series(overrides: Partial<NaverNewsShadowFirstSeenSeriesResult> = {}) {
  return {
    contractVersion: 'v1_naver_news_shadow_first_seen_series',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    protocolStart: '2026-09-15T16:00:00.000Z',
    throughSlotStart: '2026-10-01T02:00:00.000Z',
    expectedSlots: [],
    snapshots: [],
    status: 'unavailable',
    reason: 'expected_job_missing',
    missingSlotStart: '2026-09-27T13:00:00.000Z',
    missingJobId: 'a'.repeat(64),
    activity: null,
    ...overrides,
  } as NaverNewsShadowFirstSeenSeriesResult;
}

function availableIssuePoint(
  throughSlotStart = '2026-10-01T02:00:00.000Z',
) {
  return {
    status: 'available',
    reason: 'frozen_methodology_value_available',
    throughSlotStart,
  } as NaverNewsIssuePointFrozenMethodologyResult;
}

test('fails closed on the real post-outage official epoch gap', () => {
  const value = evaluateFandexMomentumPostOutageRecoveryReadiness({
    canonicalArtistId: 'iu',
    lastfmComponentEndAt: '2026-10-01T02:30:00.000Z',
    naverSeries: series(),
  });

  assert.equal(value.state, 'official-epoch-gap-blocked');
  assert.equal(value.missingSlotStart, '2026-09-27T13:00:00.000Z');
  assert.deepEqual(value.blockers, [
    'official-epoch-continuity-gap',
    'backfill-not-authorized',
    'current-frozen-methodology-requires-official-epoch',
  ]);
  assert.equal(value.safety.databaseWrites, 0);
  assert.equal(value.safety.historyWritePerformed, false);
});

test('forbids NAVER evidence after the Last.fm component end', () => {
  const inputSeries = series({
    status: 'available',
    reason: 'activity_available',
    missingSlotStart: null,
    missingJobId: null,
    throughSlotStart: '2026-10-01T03:00:00.000Z',
  } as Partial<NaverNewsShadowFirstSeenSeriesResult>);

  const value = evaluateFandexMomentumPostOutageRecoveryReadiness({
    canonicalArtistId: 'iu',
    lastfmComponentEndAt: '2026-10-01T02:30:00.000Z',
    naverSeries: inputSeries,
  }, {
    evaluateIssuePoint: () => availableIssuePoint(
      '2026-10-01T03:00:00.000Z',
    ),
  });

  assert.equal(value.state, 'lookahead-blocked');
  assert.deepEqual(value.blockers, ['future-naver-evidence-forbidden']);
});

test('uses the frozen eight-hour native cadence for freshness', () => {
  const inputSeries = series({
    status: 'available',
    reason: 'activity_available',
    missingSlotStart: null,
    missingJobId: null,
    throughSlotStart: '2026-10-01T00:00:00.000Z',
  } as Partial<NaverNewsShadowFirstSeenSeriesResult>);

  const value = evaluateFandexMomentumPostOutageRecoveryReadiness({
    canonicalArtistId: 'iu',
    lastfmComponentEndAt: '2026-10-01T09:00:00.000Z',
    naverSeries: inputSeries,
  }, {
    evaluateIssuePoint: () => availableIssuePoint(
      '2026-10-01T00:00:00.000Z',
    ),
  });

  assert.equal(value.state, 'temporal-alignment-not-ready');
  assert.equal(value.naverNativeCadenceHours, 8);
  assert.equal(value.naverFreshnessLagHours, 9);
});

test('becomes ready only with available, non-lookahead, cadence-fresh evidence', () => {
  const inputSeries = series({
    status: 'available',
    reason: 'activity_available',
    missingSlotStart: null,
    missingJobId: null,
    throughSlotStart: '2026-10-01T02:00:00.000Z',
  } as Partial<NaverNewsShadowFirstSeenSeriesResult>);

  const value = evaluateFandexMomentumPostOutageRecoveryReadiness({
    canonicalArtistId: 'iu',
    lastfmComponentEndAt: '2026-10-01T02:30:00.000Z',
    naverSeries: inputSeries,
  }, {
    evaluateIssuePoint: () => availableIssuePoint(),
  });

  assert.equal(value.state, 'ready-for-v140-replay');
  assert.equal(value.naverFreshnessLagHours, 0.5);
  assert.deepEqual(value.blockers, []);
});
