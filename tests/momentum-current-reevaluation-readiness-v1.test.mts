import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumCurrentReevaluationReadiness,
  type FandexMomentumCurrentLastfmStatus,
} from '../lib/intelligence/fandexMomentumCurrentReevaluationReadiness';
import {
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
  type FandexMomentumRecoveryContinuityGateResult,
} from '../lib/intelligence/fandexMomentumRecoveryContinuityGate';
import type {
  NaverNewsShadowFirstSeenSeriesResult,
} from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';

const safety = Object.freeze({
  databaseMode: 'read-only' as const,
  databaseWrites: 0 as const,
  historyWrites: 0 as const,
  productMetricWrites: 0 as const,
  registryMutations: 0 as const,
  productionActivations: 0 as const,
});

function continuity(
  count: number,
  state:
    | 'continuity-building'
    | 'continuity-qualified-candidate' = 'continuity-building',
): FandexMomentumRecoveryContinuityGateResult {
  const protocolStart = '2026-10-03T01:00:00.000Z';
  const qualifiedThrough = new Date(
    Date.parse(protocolStart) + (count - 1) * 60 * 60 * 1000,
  ).toISOString();

  return Object.freeze({
    contractVersion: 'momentum-recovery-continuity-gate-v1',
    state,
    candidateProtocolStart: protocolStart,
    latestSuccessfulSlotStart:
      state === 'continuity-qualified-candidate'
        ? qualifiedThrough
        : '2026-10-03T03:00:00.000Z',
    contiguousSuccessfulSlotCount: count,
    requiredAnalysisSlotCount:
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
    requiredSeriesSlotCount:
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
    missingSlotsSynthesized: false,
    backfillAuthorized: false,
    activationAllowed: false,
    productionOperationsApprovalRequired: true,
    safety,
  });
}

const lastfmStatus: FandexMomentumCurrentLastfmStatus = Object.freeze({
  version: 'lastfm_cloud_history_v1',
  createdAt: '2026-10-03T11:36:05+09:00',
  snapshotDate: '2026-10-03',
  snapshotAppended: true,
  historyRowCount: 550,
  snapshotDateCount: 55,
  deltaReadyCount: 10,
  needsReviewCount: 0,
  scorePreviewCount: 10,
  scoreUsage: 'preview_only_not_master_score',
  masterModified: false,
  websiteModified: false,
});

function completeSeries(
  count = FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
): NaverNewsShadowFirstSeenSeriesResult {
  const expectedSlots = Array.from(
    { length: count },
    (_, index) => Object.freeze({
      slotStart: new Date(
        Date.parse('2026-10-03T01:00:00.000Z') + index * 60 * 60 * 1000,
      ).toISOString(),
      jobId: String(index).padStart(64, '0').slice(-64),
    }),
  );
  const snapshots = expectedSlots.map((slot) => Object.freeze({
    canonicalArtistId: 'iu',
    jobId: slot.jobId,
    slotStart: slot.slotStart,
    request: {} as never,
    completeness: {} as never,
    observationSetCoverage: {} as never,
    observations: Object.freeze([]),
  }));

  return Object.freeze({
    contractVersion: 'v1_naver_news_shadow_first_seen_series',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    schedulerVersion: 'v125_naver_news_scheduler_v1',
    protocolStart: '2026-10-03T01:00:00.000Z',
    throughSlotStart: expectedSlots.at(-1)?.slotStart ?? '2026-10-03T01:00:00.000Z',
    expectedSlots: Object.freeze(expectedSlots),
    snapshots: Object.freeze(snapshots),
    status: 'available',
    reason: 'shadow_series_available',
    missingSlotStart: null,
    missingJobId: null,
    activity: {} as never,
  });
}

test('waits without inventing readiness before frozen 49-slot continuity', () => {
  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity: continuity(3),
    naverSeries: null,
    lastfmStatus,
  });

  assert.equal(result.state, 'waiting-for-naver-continuity');
  assert.equal(result.reason, 'recovery-continuity-not-qualified');
  assert.equal(result.continuity.contiguousSuccessfulSlotCount, 3);
  assert.equal(
    result.continuity.requiredSeriesSlotCount,
    FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
  );
  assert.equal(result.naver.currentStoredEvidenceReproducedForReadiness, false);
  assert.equal(result.nextAction, 'continue-continuity-building');
  assert.equal(result.safety.databaseWrites, 0);
  assert.equal(result.safety.productionActivations, 0);
});

test('qualifies only after exact Blob series reproduction and valid Last.fm history', () => {
  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity: continuity(
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
      'continuity-qualified-candidate',
    ),
    naverSeries: completeSeries(),
    lastfmStatus,
  });

  assert.equal(result.state, 'ready-for-current-categorical-reevaluation');
  assert.equal(result.reason, 'qualified-blob-series-reproduction-complete');
  assert.equal(result.naver.expectedSlotCount, 49);
  assert.equal(result.naver.reproducedSnapshotCount, 49);
  assert.equal(result.naver.currentStoredEvidenceReproducedForReadiness, true);
  assert.equal(result.lastfm.currentHistoryValid, true);
  assert.equal(result.nextAction, 'run-frozen-current-categorical-reevaluation');
  assert.equal(result.safety.blobWrites, 0);
  assert.equal(result.safety.databaseReads, 0);
});

test('accepts fully reproduced current Blob series beyond the minimum 49-slot qualification', () => {
  const currentCount = 59;
  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity: continuity(currentCount, 'continuity-qualified-candidate'),
    naverSeries: completeSeries(currentCount),
    lastfmStatus: Object.freeze({
      ...lastfmStatus,
      createdAt: '2026-10-05T11:40:44+09:00',
      snapshotDate: '2026-10-05',
      historyRowCount: 588,
      snapshotDateCount: 57,
      deltaReadyCount: 19,
      needsReviewCount: 0,
      scorePreviewCount: 19,
    }),
  });

  assert.equal(result.state, 'ready-for-current-categorical-reevaluation');
  assert.equal(result.reason, 'qualified-blob-series-reproduction-complete');
  assert.equal(result.naver.expectedSlotCount, 59);
  assert.equal(result.naver.reproducedSnapshotCount, 59);
  assert.equal(result.naver.currentStoredEvidenceReproducedForReadiness, true);
  assert.equal(result.lastfm.currentHistoryValid, true);
  assert.equal(result.lastfm.deltaReadyCount, 19);
});

test('accepts current Last.fm mixed source cohort when Product delta history is ready', () => {
  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity: continuity(
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
      'continuity-qualified-candidate',
    ),
    naverSeries: completeSeries(),
    lastfmStatus: Object.freeze({
      ...lastfmStatus,
      createdAt: '2026-10-04T12:07:16+09:00',
      snapshotDate: '2026-10-04',
      historyRowCount: 569,
      snapshotDateCount: 56,
      deltaReadyCount: 10,
      needsReviewCount: 0,
      scorePreviewCount: 0,
    }),
  });

  assert.equal(result.state, 'ready-for-current-categorical-reevaluation');
  assert.equal(result.lastfm.currentHistoryValid, true);
  assert.equal(result.lastfm.deltaReadyCount, 10);
  assert.equal(result.nextAction, 'run-frozen-current-categorical-reevaluation');
});

test('rejects Last.fm history when the frozen Product delta-ready floor is not met', () => {
  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity: continuity(
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
      'continuity-qualified-candidate',
    ),
    naverSeries: completeSeries(),
    lastfmStatus: Object.freeze({
      ...lastfmStatus,
      deltaReadyCount: 9,
      scorePreviewCount: 9,
    }),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.reason, 'lastfm-current-history-invalid');
});

test('rejects malformed Last.fm preview-count metadata without making preview output a readiness gate', () => {
  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity: continuity(
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
      'continuity-qualified-candidate',
    ),
    naverSeries: completeSeries(),
    lastfmStatus: Object.freeze({
      ...lastfmStatus,
      scorePreviewCount: -1,
    }),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.reason, 'lastfm-current-history-invalid');
});

test('fails closed when qualified continuity cannot reproduce the exact Blob series', () => {
  const series = completeSeries();
  const incomplete = {
    ...series,
    snapshots: series.snapshots.slice(0, -1),
  } as NaverNewsShadowFirstSeenSeriesResult;

  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity: continuity(
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
      'continuity-qualified-candidate',
    ),
    naverSeries: incomplete,
    lastfmStatus,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.reason, 'qualified-blob-series-reproduction-incomplete');
  assert.equal(result.naver.currentStoredEvidenceReproducedForReadiness, false);
  assert.equal(result.nextAction, 'repair-source-readiness');
});

test('fails closed on invalid current Last.fm history without adding an age threshold', () => {
  const result = evaluateFandexMomentumCurrentReevaluationReadiness({
    continuity: continuity(
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
      'continuity-qualified-candidate',
    ),
    naverSeries: completeSeries(),
    lastfmStatus: Object.freeze({
      ...lastfmStatus,
      needsReviewCount: 1,
    }),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.reason, 'lastfm-current-history-invalid');
  assert.equal(result.lastfm.currentHistoryValid, false);
  assert.equal(result.nextAction, 'repair-source-readiness');
});
