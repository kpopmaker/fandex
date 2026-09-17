import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
} from '../lib/intelligence/naverNewsIssuePointConstruct';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
  evaluateNaverNewsIssuePointHistoricalComparison,
  reconstructNaverNewsIssuePointFromEvidenceTrace,
  type NaverNewsIssuePointWindowEvidence,
} from '../lib/server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
} from '../lib/server/ingestion/naverNewsShadowEpoch';
import type {
  NaverNewsShadowFirstSeenSeriesResult,
} from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';

const HOUR_MS = 60 * 60 * 1_000;
const epoch = NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START;

function isoAt(hour: number): string {
  return new Date(Date.parse(epoch) + hour * HOUR_MS).toISOString();
}

function round(value: number, digits = 12): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function makeWindow(input: Readonly<{
  startHour: number;
  firstSeenTotal: number;
  observedPerSlot?: number;
  canonicalArtistId?: string;
  protocolStart?: string;
  methodologyVersion?: string;
  bootstrapAtIndex?: number | null;
}>): NaverNewsIssuePointWindowEvidence {
  const observedPerSlot = input.observedPerSlot ?? 100;
  const bootstrapAtIndex = input.bootstrapAtIndex ?? null;
  const slots = Array.from({ length: 8 }, (_, index) => {
    const firstSeen = index === 7 ? input.firstSeenTotal : 0;
    return Object.freeze({
      slotStart: isoAt(input.startHour + index),
      jobId: `fixture-job-${input.startHour + index}`,
      observedObservationCount: observedPerSlot,
      firstSeenObservationCount: firstSeen,
      firstSeenObservationIds: Object.freeze(
        Array.from({ length: firstSeen }, (__, itemIndex) =>
          `fixture-observation-${input.startHour + index}-${itemIndex}`),
      ),
      bootstrap: bootstrapAtIndex === index,
    });
  });
  const observed = observedPerSlot * 8;
  const rate = observed === 0 ? null : round(input.firstSeenTotal / observed);
  return Object.freeze({
    methodologyVersion:
      input.methodologyVersion ?? NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
    canonicalArtistId: input.canonicalArtistId ?? 'iu',
    protocolStart: input.protocolStart ?? epoch,
    windowSlotCount: 8,
    startSlotStart: slots[0].slotStart,
    endSlotStart: slots[7].slotStart,
    firstSeenObservationCount: input.firstSeenTotal,
    observedObservationCount: observed,
    activityRate: rate,
    slotEvidence: Object.freeze(slots),
  });
}

function compare(
  currentWindow: NaverNewsIssuePointWindowEvidence,
  historicalWindows: readonly NaverNewsIssuePointWindowEvidence[],
) {
  return evaluateNaverNewsIssuePointHistoricalComparison({
    baselineReadinessStatus: 'replicated_cycle_history',
    currentWindow,
    historicalWindows,
  });
}

test('Case A/B: strict-less share counts lower/equal/greater and excludes ties from numerator', () => {
  const current = makeWindow({ startHour: 30, firstSeenTotal: 4 });
  const lower = makeWindow({ startHour: 0, firstSeenTotal: 2 });
  const equal = makeWindow({ startHour: 8, firstSeenTotal: 4 });
  const greater = makeWindow({ startHour: 16, firstSeenTotal: 6 });

  const result = compare(current, [lower, equal, greater, current]);
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.priorDefinedWindowCount, 3);
  assert.equal(result.priorLessThanLatestCount, 1);
  assert.equal(result.priorEqualToLatestCount, 1);
  assert.equal(result.priorGreaterThanLatestCount, 1);
  assert.equal(result.score, round(100 / 3));
  assert.equal(
    result.excludedWindows.some((item) =>
      item.window.endSlotStart === current.endSlotStart
      && item.reason === 'not_prior_to_current'),
    true,
  );
});

test('Case C: a valid defined zero current window naturally produces score zero', () => {
  const current = makeWindow({ startHour: 30, firstSeenTotal: 0 });
  const equalZero = makeWindow({ startHour: 0, firstSeenTotal: 0 });
  const greater = makeWindow({ startHour: 8, firstSeenTotal: 1 });
  const result = compare(current, [equalZero, greater]);

  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.currentActivityRate, 0);
  assert.equal(result.priorDefinedWindowCount, 2);
  assert.equal(result.priorLessThanLatestCount, 0);
  assert.equal(result.score, 0);
});

test('Case D: when every eligible prior window is strictly lower the score is 100', () => {
  const current = makeWindow({ startHour: 30, firstSeenTotal: 8 });
  const result = compare(current, [
    makeWindow({ startHour: 0, firstSeenTotal: 1 }),
    makeWindow({ startHour: 8, firstSeenTotal: 2 }),
  ]);

  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.priorLessThanLatestCount, result.priorDefinedWindowCount);
  assert.equal(result.score, 100);
});

test('Case E: N=0 fails closed instead of emitting zero', () => {
  const current = makeWindow({ startHour: 30, firstSeenTotal: 4 });
  const result = compare(current, [current]);

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'prior_defined_window_count_zero');
  assert.equal(result.score, null);
});

test('undefined current activity fails closed instead of becoming zero', () => {
  const current = makeWindow({
    startHour: 30,
    firstSeenTotal: 0,
    observedPerSlot: 0,
  });
  const result = compare(current, [
    makeWindow({ startHour: 0, firstSeenTotal: 0 }),
  ]);

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'current_window_undefined');
  assert.equal(result.score, null);
});

test('baseline readiness below replicated_cycle_history fails closed', () => {
  const current = makeWindow({ startHour: 30, firstSeenTotal: 4 });
  const result = evaluateNaverNewsIssuePointHistoricalComparison({
    baselineReadinessStatus: 'single_cycle_only',
    currentWindow: current,
    historicalWindows: [makeWindow({ startHour: 0, firstSeenTotal: 1 })],
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'baseline_readiness_not_replicated');
  assert.equal(result.score, null);
});

test('Case G/H: cross-epoch and incompatible-methodology windows are excluded from N and L', () => {
  const current = makeWindow({ startHour: 30, firstSeenTotal: 4 });
  const valid = makeWindow({ startHour: 0, firstSeenTotal: 2 });
  const crossEpoch = makeWindow({
    startHour: 8,
    firstSeenTotal: 1,
    protocolStart: '2026-09-14T16:00:00.000Z',
  });
  const crossMethodology = makeWindow({
    startHour: 16,
    firstSeenTotal: 1,
    methodologyVersion: 'legacy_incompatible_methodology',
  });

  const result = compare(current, [valid, crossEpoch, crossMethodology]);
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.priorDefinedWindowCount, 1);
  assert.equal(result.priorLessThanLatestCount, 1);
  assert.equal(result.score, 100);
  assert.deepEqual(
    result.excludedWindows.map((item) => item.reason).sort(),
    ['cross_epoch', 'methodology_version_mismatch'],
  );
});

test('bootstrap-contaminated historical windows are excluded rather than treated as zero', () => {
  const current = makeWindow({ startHour: 30, firstSeenTotal: 4 });
  const contaminated = makeWindow({
    startHour: 0,
    firstSeenTotal: 0,
    bootstrapAtIndex: 0,
  });
  const valid = makeWindow({ startHour: 8, firstSeenTotal: 2 });

  const result = compare(current, [contaminated, valid]);
  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.priorDefinedWindowCount, 1);
  assert.equal(result.excludedWindows[0].reason, 'bootstrap_contamination');
});

function makeSeries(
  firstSeenCounts: readonly number[],
  overrides: Readonly<{
    status?: 'available' | 'unavailable';
    reason?: 'shadow_series_available' | 'protocol_slot_gap';
  }> = {},
): NaverNewsShadowFirstSeenSeriesResult {
  assert.equal(firstSeenCounts.length, 48);
  const bootstrap = Object.freeze({
    slotStart: isoAt(0),
    jobId: 'fixture-bootstrap-job',
    collectionCompleteness: 'truncated' as const,
    observedObservationCount: 100,
    firstSeenObservationCount: null,
    firstSeenObservationIds: Object.freeze([]),
    bootstrap: true,
  });
  const analysis = firstSeenCounts.map((count, index) => Object.freeze({
    slotStart: isoAt(index + 1),
    jobId: `fixture-stored-job-${index + 1}`,
    collectionCompleteness: 'truncated' as const,
    observedObservationCount: 100,
    firstSeenObservationCount: count,
    firstSeenObservationIds: Object.freeze(
      Array.from({ length: count }, (__, itemIndex) =>
        `fixture-first-seen-${index + 1}-${itemIndex}`),
    ),
    bootstrap: false,
  }));
  const slots = Object.freeze([bootstrap, ...analysis]);
  const status = overrides.status ?? 'available';
  const reason = overrides.reason ?? 'shadow_series_available';

  return {
    contractVersion: 'v1_naver_news_shadow_first_seen_series',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    protocolStart: epoch,
    throughSlotStart: isoAt(48),
    expectedSlots: Object.freeze([]),
    snapshots: Object.freeze([]),
    status,
    reason,
    missingSlotStart: null,
    missingJobId: null,
    activity: {
      contractVersion: 'v1_naver_news_shadow_first_seen_activity',
      metricKey: 'naverNewsShadowFirstSeenActivity',
      lifecycle: 'shadow',
      directProductContributionEligible: false,
      canonicalArtistId: 'iu',
      protocolStart: epoch,
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
      status,
      reason,
      slots,
      unavailableAtSlotStart: status === 'available' ? null : isoAt(24),
    },
  } as NaverNewsShadowFirstSeenSeriesResult;
}

test('actual evaluator uses rolling 8h sums and preserves job-level Stored Evidence trace', () => {
  const counts = Array<number>(48).fill(0);
  counts[47] = 4;
  const result = evaluateNaverNewsIssuePointFrozenMethodology(makeSeries(counts));

  assert.equal(result.status, 'available');
  assert.equal(result.selectedWindowSlotCount, 8);
  assert.equal(result.baselineReadiness.status, 'replicated_cycle_history');
  assert.equal(result.currentWindow?.firstSeenObservationCount, 4);
  assert.equal(result.currentWindow?.observedObservationCount, 800);
  assert.equal(result.currentActivityRate, 0.005);
  assert.equal(result.priorDefinedWindowCount, 40);
  assert.equal(result.priorLessThanLatestCount, 40);
  assert.equal(result.score, 100);
  assert.equal(result.currentWindow?.slotEvidence.length, 8);
  assert.equal(result.evidenceTrace.windows.length, 41);
  assert.equal(result.evidenceTrace.storedEvidenceJobIds.length, 48);
  assert.equal(
    result.evidenceTrace.storedEvidenceJobIds.includes('fixture-bootstrap-job'),
    false,
  );
});

test('Case F: source gap remains unavailable and is never converted to zero activity', () => {
  const counts = Array<number>(48).fill(0);
  const result = evaluateNaverNewsIssuePointFrozenMethodology(makeSeries(counts, {
    status: 'unavailable',
    reason: 'protocol_slot_gap',
  }));

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'source_series_unavailable');
  assert.equal(result.score, null);
});

test('official epoch mismatch fails closed before baseline comparison', () => {
  const counts = Array<number>(48).fill(0);
  const source = makeSeries(counts);
  const mismatch = {
    ...source,
    protocolStart: '2026-09-14T16:00:00.000Z',
    activity: source.activity
      ? { ...source.activity, protocolStart: '2026-09-14T16:00:00.000Z' }
      : null,
  } as NaverNewsShadowFirstSeenSeriesResult;

  const result = evaluateNaverNewsIssuePointFrozenMethodology(mismatch);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'official_epoch_mismatch');
  assert.equal(result.score, null);
});

test('Case I: historical revision recomputes affected comparisons without adding a new slot observation', () => {
  const beforeCounts = Array<number>(48).fill(0);
  beforeCounts[47] = 1;
  const afterCounts = [...beforeCounts];
  afterCounts[7] = 2;

  const beforeSeries = makeSeries(beforeCounts);
  const afterSeries = makeSeries(afterCounts);
  const before = evaluateNaverNewsIssuePointFrozenMethodology(beforeSeries);
  const after = evaluateNaverNewsIssuePointFrozenMethodology(afterSeries);

  assert.equal(before.status, 'available');
  assert.equal(after.status, 'available');
  assert.equal(before.evidenceTrace.storedEvidenceJobIds.length, 48);
  assert.deepEqual(
    before.evidenceTrace.storedEvidenceJobIds,
    after.evidenceTrace.storedEvidenceJobIds,
  );
  assert.equal(before.currentWindow?.endSlotStart, after.currentWindow?.endSlotStart);
  assert.equal(before.score, 100);
  assert.equal(after.score, 80);
  assert.equal(after.priorGreaterThanLatestCount, 8);
});

test('reverse trace reconstructs the same N, L, current window, and score', () => {
  const counts = Array<number>(48).fill(0);
  counts[10] = 1;
  counts[20] = 2;
  counts[47] = 3;
  const result = evaluateNaverNewsIssuePointFrozenMethodology(makeSeries(counts));
  const reconstructed = reconstructNaverNewsIssuePointFromEvidenceTrace(result);

  assert.equal(result.status, 'available');
  assert.equal(reconstructed.status, 'available');
  if (result.status !== 'available' || reconstructed.status !== 'available') return;
  assert.equal(reconstructed.score, result.score);
  assert.equal(
    reconstructed.priorDefinedWindowCount,
    result.priorDefinedWindowCount,
  );
  assert.equal(
    reconstructed.priorLessThanLatestCount,
    result.priorLessThanLatestCount,
  );
  assert.equal(
    reconstructed.currentWindow.endSlotStart,
    result.currentWindow?.endSlotStart,
  );
});

test('implementation is read-only and does not use prohibited normalization inputs or transforms', async () => {
  const source = await readFile(
    new URL('../lib/server/ingestion/naverNewsIssuePointFrozenMethodology.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /providerTotal/);
  assert.doesNotMatch(source, /stage.?1/i);
  assert.doesNotMatch(source, /min.?max/i);
  assert.doesNotMatch(source, /z.?score/i);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
});
