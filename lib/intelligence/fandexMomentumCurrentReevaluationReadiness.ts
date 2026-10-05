import type {
  FandexMomentumRecoveryContinuityGateResult,
} from './fandexMomentumRecoveryContinuityGate';
import {
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
} from './fandexMomentumRecoveryContinuityGate';
import type {
  NaverNewsShadowFirstSeenSeriesResult,
} from '../server/ingestion/naverNewsShadowFirstSeenSeries';

export const FANDEX_MOMENTUM_CURRENT_REEVALUATION_READINESS_VERSION =
  'momentum-current-reevaluation-readiness-v1' as const;

export type FandexMomentumCurrentLastfmStatus = Readonly<{
  version: 'lastfm_cloud_history_v1';
  createdAt: string;
  snapshotDate: string;
  snapshotAppended: boolean;
  historyRowCount: number;
  snapshotDateCount: number;
  deltaReadyCount: number;
  needsReviewCount: number;
  scorePreviewCount: number;
  scoreUsage: 'preview_only_not_master_score';
  masterModified: boolean;
  websiteModified: boolean;
}>;

export type FandexMomentumCurrentReevaluationReadinessResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_CURRENT_REEVALUATION_READINESS_VERSION;
  state:
    | 'waiting-for-naver-continuity'
    | 'ready-for-current-categorical-reevaluation'
    | 'blocked';
  reason:
    | 'recovery-continuity-not-qualified'
    | 'qualified-blob-series-reproduction-complete'
    | 'qualified-blob-series-reproduction-incomplete'
    | 'lastfm-current-history-invalid';
  candidateProtocolStart: string | null;
  throughSlotStart: string | null;
  continuity: Readonly<{
    state: FandexMomentumRecoveryContinuityGateResult['state'];
    contiguousSuccessfulSlotCount: number;
    requiredAnalysisSlotCount: number;
    requiredSeriesSlotCount: number;
  }>;
  naver: Readonly<{
    evidenceSource: 'immutable-blob-official-scheduler-manifest';
    seriesReproduced: boolean;
    seriesStatus: NaverNewsShadowFirstSeenSeriesResult['status'] | null;
    expectedSlotCount: number;
    reproducedSnapshotCount: number;
    currentStoredEvidenceReproducedForReadiness: boolean;
  }>;
  lastfm: Readonly<{
    snapshotDate: string | null;
    historyRowCount: number;
    snapshotDateCount: number;
    deltaReadyCount: number;
    needsReviewCount: number;
    scoreUsage: string | null;
    currentHistoryValid: boolean;
  }>;
  nextAction:
    | 'continue-continuity-building'
    | 'run-frozen-current-categorical-reevaluation'
    | 'repair-source-readiness';
  safety: Readonly<{
    databaseReads: 0;
    databaseWrites: 0;
    blobWrites: 0;
    historyWrites: 0;
    productMetricReads: 0;
    productMetricWrites: 0;
    registryMutations: 0;
    productionActivations: 0;
    productPublications: 0;
  }>;
}>;

const SAFETY = Object.freeze({
  databaseReads: 0 as const,
  databaseWrites: 0 as const,
  blobWrites: 0 as const,
  historyWrites: 0 as const,
  productMetricReads: 0 as const,
  productMetricWrites: 0 as const,
  registryMutations: 0 as const,
  productionActivations: 0 as const,
  productPublications: 0 as const,
});

function validLastfmStatus(
  value: FandexMomentumCurrentLastfmStatus | null,
): value is FandexMomentumCurrentLastfmStatus {
  if (value === null) return false;
  return (
    value.version === 'lastfm_cloud_history_v1'
    && Number.isFinite(Date.parse(value.createdAt))
    && /^\d{4}-\d{2}-\d{2}$/.test(value.snapshotDate)
    && value.snapshotAppended === true
    && Number.isSafeInteger(value.historyRowCount)
    && value.historyRowCount > 0
    && Number.isSafeInteger(value.snapshotDateCount)
    && value.snapshotDateCount > 0
    && Number.isSafeInteger(value.deltaReadyCount)
    && value.deltaReadyCount >= 10
    && value.needsReviewCount === 0
    && Number.isSafeInteger(value.scorePreviewCount)
    && value.scorePreviewCount >= 0
    && value.scoreUsage === 'preview_only_not_master_score'
    && value.masterModified === false
    && value.websiteModified === false
  );
}

export function evaluateFandexMomentumCurrentReevaluationReadiness(
  input: Readonly<{
    continuity: FandexMomentumRecoveryContinuityGateResult;
    naverSeries: NaverNewsShadowFirstSeenSeriesResult | null;
    lastfmStatus: FandexMomentumCurrentLastfmStatus | null;
  }>,
): FandexMomentumCurrentReevaluationReadinessResult {
  const continuity = input.continuity;
  const lastfmValid = validLastfmStatus(input.lastfmStatus);
  const lastfm = Object.freeze({
    snapshotDate: input.lastfmStatus?.snapshotDate ?? null,
    historyRowCount: input.lastfmStatus?.historyRowCount ?? 0,
    snapshotDateCount: input.lastfmStatus?.snapshotDateCount ?? 0,
    deltaReadyCount: input.lastfmStatus?.deltaReadyCount ?? 0,
    needsReviewCount: input.lastfmStatus?.needsReviewCount ?? 0,
    scoreUsage: input.lastfmStatus?.scoreUsage ?? null,
    currentHistoryValid: lastfmValid,
  });

  const continuitySummary = Object.freeze({
    state: continuity.state,
    contiguousSuccessfulSlotCount: continuity.contiguousSuccessfulSlotCount,
    requiredAnalysisSlotCount: continuity.requiredAnalysisSlotCount,
    requiredSeriesSlotCount: continuity.requiredSeriesSlotCount,
  });

  if (
    continuity.requiredAnalysisSlotCount
      !== FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT
    || continuity.requiredSeriesSlotCount
      !== FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT
  ) {
    return Object.freeze({
      contractVersion:
        FANDEX_MOMENTUM_CURRENT_REEVALUATION_READINESS_VERSION,
      state: 'blocked' as const,
      reason: 'qualified-blob-series-reproduction-incomplete' as const,
      candidateProtocolStart: continuity.candidateProtocolStart,
      throughSlotStart: continuity.latestSuccessfulSlotStart,
      continuity: continuitySummary,
      naver: Object.freeze({
        evidenceSource:
          'immutable-blob-official-scheduler-manifest' as const,
        seriesReproduced: false,
        seriesStatus: null,
        expectedSlotCount: 0,
        reproducedSnapshotCount: 0,
        currentStoredEvidenceReproducedForReadiness: false,
      }),
      lastfm,
      nextAction: 'repair-source-readiness' as const,
      safety: SAFETY,
    });
  }

  if (continuity.state !== 'continuity-qualified-candidate') {
    return Object.freeze({
      contractVersion:
        FANDEX_MOMENTUM_CURRENT_REEVALUATION_READINESS_VERSION,
      state: 'waiting-for-naver-continuity' as const,
      reason: 'recovery-continuity-not-qualified' as const,
      candidateProtocolStart: continuity.candidateProtocolStart,
      throughSlotStart: continuity.latestSuccessfulSlotStart,
      continuity: continuitySummary,
      naver: Object.freeze({
        evidenceSource:
          'immutable-blob-official-scheduler-manifest' as const,
        seriesReproduced: false,
        seriesStatus: null,
        expectedSlotCount: 0,
        reproducedSnapshotCount: 0,
        currentStoredEvidenceReproducedForReadiness: false,
      }),
      lastfm,
      nextAction: 'continue-continuity-building' as const,
      safety: SAFETY,
    });
  }

  if (!lastfmValid) {
    return Object.freeze({
      contractVersion:
        FANDEX_MOMENTUM_CURRENT_REEVALUATION_READINESS_VERSION,
      state: 'blocked' as const,
      reason: 'lastfm-current-history-invalid' as const,
      candidateProtocolStart: continuity.candidateProtocolStart,
      throughSlotStart: continuity.latestSuccessfulSlotStart,
      continuity: continuitySummary,
      naver: Object.freeze({
        evidenceSource:
          'immutable-blob-official-scheduler-manifest' as const,
        seriesReproduced: input.naverSeries !== null,
        seriesStatus: input.naverSeries?.status ?? null,
        expectedSlotCount: input.naverSeries?.expectedSlots.length ?? 0,
        reproducedSnapshotCount: input.naverSeries?.snapshots.length ?? 0,
        currentStoredEvidenceReproducedForReadiness: false,
      }),
      lastfm,
      nextAction: 'repair-source-readiness' as const,
      safety: SAFETY,
    });
  }

  const series = input.naverSeries;
  const expectedSlotCount = series?.expectedSlots.length ?? 0;
  const reproducedSnapshotCount = series?.snapshots.length ?? 0;
  const seriesComplete =
    series !== null
    && series.status === 'available'
    && series.protocolStart === continuity.candidateProtocolStart
    && series.throughSlotStart === continuity.latestSuccessfulSlotStart
    && expectedSlotCount === continuity.contiguousSuccessfulSlotCount
    && expectedSlotCount >= continuity.requiredSeriesSlotCount
    && reproducedSnapshotCount === expectedSlotCount;

  if (!seriesComplete) {
    return Object.freeze({
      contractVersion:
        FANDEX_MOMENTUM_CURRENT_REEVALUATION_READINESS_VERSION,
      state: 'blocked' as const,
      reason: 'qualified-blob-series-reproduction-incomplete' as const,
      candidateProtocolStart: continuity.candidateProtocolStart,
      throughSlotStart: continuity.latestSuccessfulSlotStart,
      continuity: continuitySummary,
      naver: Object.freeze({
        evidenceSource:
          'immutable-blob-official-scheduler-manifest' as const,
        seriesReproduced: series !== null,
        seriesStatus: series?.status ?? null,
        expectedSlotCount,
        reproducedSnapshotCount,
        currentStoredEvidenceReproducedForReadiness: false,
      }),
      lastfm,
      nextAction: 'repair-source-readiness' as const,
      safety: SAFETY,
    });
  }

  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CURRENT_REEVALUATION_READINESS_VERSION,
    state: 'ready-for-current-categorical-reevaluation' as const,
    reason: 'qualified-blob-series-reproduction-complete' as const,
    candidateProtocolStart: continuity.candidateProtocolStart,
    throughSlotStart: continuity.latestSuccessfulSlotStart,
    continuity: continuitySummary,
    naver: Object.freeze({
      evidenceSource: 'immutable-blob-official-scheduler-manifest' as const,
      seriesReproduced: true,
      seriesStatus: series.status,
      expectedSlotCount,
      reproducedSnapshotCount,
      currentStoredEvidenceReproducedForReadiness: true,
    }),
    lastfm,
    nextAction: 'run-frozen-current-categorical-reevaluation' as const,
    safety: SAFETY,
  });
}
