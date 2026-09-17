import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
  NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
} from '../../intelligence/naverNewsIssuePointConstruct';
import {
  evaluateNaverNewsMediaActivityDiurnalReadiness,
  type NaverNewsMediaActivityDiurnalReadiness,
} from './naverNewsMediaActivityBaselineReadinessResearch';
import {
  evaluateNaverNewsMediaActivityMethodResearch,
  type NaverNewsMediaActivityResearchWindow,
} from './naverNewsMediaActivityMethodResearch';
import { getOfficialNaverNewsShadowEpoch } from './naverNewsShadowEpoch';
import type { NaverNewsShadowFirstSeenSeriesResult } from './naverNewsShadowFirstSeenSeries';
import type { NaverNewsShadowFirstSeenActivitySlot } from './naverNewsShadowFirstSeenActivity';

export const NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION =
  'v1_naver_news_issue_point_frozen_methodology' as const;

export type NaverNewsIssuePointWindowSlotEvidence = Readonly<{
  slotStart: string;
  jobId: string;
  observedObservationCount: number;
  firstSeenObservationCount: number;
  firstSeenObservationIds: readonly string[];
  bootstrap: boolean;
}>;

export type NaverNewsIssuePointWindowEvidence = Readonly<{
  methodologyVersion: string;
  canonicalArtistId: string;
  protocolStart: string;
  windowSlotCount: number;
  startSlotStart: string;
  endSlotStart: string;
  firstSeenObservationCount: number;
  observedObservationCount: number;
  activityRate: number | null;
  slotEvidence: readonly NaverNewsIssuePointWindowSlotEvidence[];
}>;

export type NaverNewsIssuePointExcludedWindowReason =
  | 'artist_mismatch'
  | 'cross_epoch'
  | 'methodology_version_mismatch'
  | 'window_slot_count_mismatch'
  | 'not_prior_to_current'
  | 'bootstrap_contamination'
  | 'undefined_activity_rate';

export type NaverNewsIssuePointExcludedWindow = Readonly<{
  window: NaverNewsIssuePointWindowEvidence;
  reason: NaverNewsIssuePointExcludedWindowReason;
}>;

export type NaverNewsIssuePointHistoricalComparisonAvailable = Readonly<{
  status: 'available';
  reason: 'frozen_methodology_value_available';
  normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
  score: number;
  currentActivityRate: number;
  priorDefinedWindowCount: number;
  priorLessThanLatestCount: number;
  priorEqualToLatestCount: number;
  priorGreaterThanLatestCount: number;
  currentWindow: NaverNewsIssuePointWindowEvidence;
  eligiblePriorWindows: readonly NaverNewsIssuePointWindowEvidence[];
  excludedWindows: readonly NaverNewsIssuePointExcludedWindow[];
}>;

export type NaverNewsIssuePointHistoricalComparisonUnavailable = Readonly<{
  status: 'unavailable';
  reason:
    | 'baseline_readiness_not_replicated'
    | 'current_window_undefined'
    | 'prior_defined_window_count_zero';
  normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
  score: null;
  currentWindow: NaverNewsIssuePointWindowEvidence | null;
  eligiblePriorWindows: readonly NaverNewsIssuePointWindowEvidence[];
  excludedWindows: readonly NaverNewsIssuePointExcludedWindow[];
}>;

export type NaverNewsIssuePointHistoricalComparisonResult =
  | NaverNewsIssuePointHistoricalComparisonAvailable
  | NaverNewsIssuePointHistoricalComparisonUnavailable;

export type NaverNewsIssuePointFrozenMethodologyResult = Readonly<{
  contractVersion: typeof NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION;
  methodologyVersion: typeof NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  variableId: 'newsIssuePoint';
  canonicalArtistId: string;
  protocolStart: string;
  throughSlotStart: string;
  selectedWindowSlotCount: 8;
  rollingWindowSemantics: 'overlapping';
  baselineScope: 'same_artist_same_official_shadow_epoch';
  baselineReadiness: NaverNewsMediaActivityDiurnalReadiness;
  normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
  status: 'available' | 'unavailable';
  reason:
    | 'frozen_methodology_value_available'
    | 'source_series_unavailable'
    | 'official_epoch_mismatch'
    | 'baseline_readiness_not_replicated'
    | 'current_window_undefined'
    | 'prior_defined_window_count_zero';
  score: number | null;
  currentActivityRate: number | null;
  priorDefinedWindowCount: number;
  priorLessThanLatestCount: number;
  priorEqualToLatestCount: number;
  priorGreaterThanLatestCount: number;
  currentWindow: NaverNewsIssuePointWindowEvidence | null;
  eligiblePriorWindows: readonly NaverNewsIssuePointWindowEvidence[];
  excludedWindows: readonly NaverNewsIssuePointExcludedWindow[];
  evidenceTrace: Readonly<{
    windows: readonly NaverNewsIssuePointWindowEvidence[];
    storedEvidenceJobIds: readonly string[];
  }>;
}>;

const WINDOW_SLOT_COUNT = NAVER_NEWS_ISSUE_POINT_CONSTRUCT.selectedWindowSlotCount;
const HOUR_MS = 60 * 60 * 1_000;

function round(value: number, digits = 12): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function windowRate(firstSeen: number, observed: number): number | null {
  return observed === 0 ? null : round(firstSeen / observed);
}

function validateSlotEvidence(
  slot: NaverNewsIssuePointWindowSlotEvidence,
): void {
  if (
    typeof slot.slotStart !== 'string'
    || typeof slot.jobId !== 'string'
    || slot.jobId.length === 0
    || !Number.isSafeInteger(slot.observedObservationCount)
    || slot.observedObservationCount < 0
    || !Number.isSafeInteger(slot.firstSeenObservationCount)
    || slot.firstSeenObservationCount < 0
    || slot.firstSeenObservationCount > slot.observedObservationCount
    || slot.firstSeenObservationIds.length !== slot.firstSeenObservationCount
  ) {
    throw new Error('naver_news_issue_point_window_evidence_invalid');
  }
  const timestamp = Date.parse(slot.slotStart);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== slot.slotStart) {
    throw new Error('naver_news_issue_point_window_evidence_invalid');
  }
}

function validateWindowEvidence(
  window: NaverNewsIssuePointWindowEvidence,
): void {
  if (
    typeof window.canonicalArtistId !== 'string'
    || window.canonicalArtistId.length === 0
    || typeof window.protocolStart !== 'string'
    || typeof window.methodologyVersion !== 'string'
    || !Number.isSafeInteger(window.windowSlotCount)
    || window.windowSlotCount <= 0
    || window.slotEvidence.length !== window.windowSlotCount
  ) {
    throw new Error('naver_news_issue_point_window_evidence_invalid');
  }

  let firstSeen = 0;
  let observed = 0;
  for (let index = 0; index < window.slotEvidence.length; index += 1) {
    const slot = window.slotEvidence[index];
    validateSlotEvidence(slot);
    if (index > 0) {
      const previous = Date.parse(window.slotEvidence[index - 1].slotStart);
      const current = Date.parse(slot.slotStart);
      if (current - previous !== HOUR_MS) {
        throw new Error('naver_news_issue_point_window_evidence_invalid');
      }
    }
    firstSeen += slot.firstSeenObservationCount;
    observed += slot.observedObservationCount;
  }

  const expectedRate = windowRate(firstSeen, observed);
  if (
    window.startSlotStart !== window.slotEvidence[0].slotStart
    || window.endSlotStart !== window.slotEvidence[window.slotEvidence.length - 1].slotStart
    || window.firstSeenObservationCount !== firstSeen
    || window.observedObservationCount !== observed
    || window.activityRate !== expectedRate
  ) {
    throw new Error('naver_news_issue_point_window_evidence_invalid');
  }
}

function exclusionReason(
  window: NaverNewsIssuePointWindowEvidence,
  current: NaverNewsIssuePointWindowEvidence,
): NaverNewsIssuePointExcludedWindowReason | null {
  if (window.canonicalArtistId !== current.canonicalArtistId) return 'artist_mismatch';
  if (window.protocolStart !== current.protocolStart) return 'cross_epoch';
  if (window.methodologyVersion !== current.methodologyVersion) {
    return 'methodology_version_mismatch';
  }
  if (window.windowSlotCount !== WINDOW_SLOT_COUNT) return 'window_slot_count_mismatch';
  if (window.endSlotStart >= current.endSlotStart) return 'not_prior_to_current';
  if (window.slotEvidence.some((slot) => slot.bootstrap)) return 'bootstrap_contamination';
  if (window.activityRate === null) return 'undefined_activity_rate';
  return null;
}

export function evaluateNaverNewsIssuePointHistoricalComparison(input: Readonly<{
  baselineReadinessStatus: NaverNewsMediaActivityDiurnalReadiness['status'];
  currentWindow: NaverNewsIssuePointWindowEvidence | null;
  historicalWindows: readonly NaverNewsIssuePointWindowEvidence[];
}>): NaverNewsIssuePointHistoricalComparisonResult {
  const excluded: NaverNewsIssuePointExcludedWindow[] = [];
  const eligible: NaverNewsIssuePointWindowEvidence[] = [];

  if (input.currentWindow !== null) {
    validateWindowEvidence(input.currentWindow);
  }
  for (const window of input.historicalWindows) {
    validateWindowEvidence(window);
  }

  if (input.baselineReadinessStatus !== 'replicated_cycle_history') {
    return Object.freeze({
      status: 'unavailable' as const,
      reason: 'baseline_readiness_not_replicated' as const,
      normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      score: null,
      currentWindow: input.currentWindow,
      eligiblePriorWindows: Object.freeze([]),
      excludedWindows: Object.freeze([]),
    });
  }

  const current = input.currentWindow;
  if (current === null || current.activityRate === null) {
    return Object.freeze({
      status: 'unavailable' as const,
      reason: 'current_window_undefined' as const,
      normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      score: null,
      currentWindow: current,
      eligiblePriorWindows: Object.freeze([]),
      excludedWindows: Object.freeze([]),
    });
  }

  if (
    current.canonicalArtistId.length === 0
    || current.protocolStart.length === 0
    || current.methodologyVersion !== NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION
    || current.windowSlotCount !== WINDOW_SLOT_COUNT
    || current.slotEvidence.some((slot) => slot.bootstrap)
  ) {
    throw new Error('naver_news_issue_point_current_window_scope_invalid');
  }

  for (const window of input.historicalWindows) {
    const reason = exclusionReason(window, current);
    if (reason === null) {
      eligible.push(window);
    } else {
      excluded.push(Object.freeze({ window, reason }));
    }
  }

  if (eligible.length === 0) {
    return Object.freeze({
      status: 'unavailable' as const,
      reason: 'prior_defined_window_count_zero' as const,
      normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      score: null,
      currentWindow: current,
      eligiblePriorWindows: Object.freeze([]),
      excludedWindows: Object.freeze(excluded),
    });
  }

  const lower = eligible.filter((window) => (window.activityRate as number) < current.activityRate).length;
  const equal = eligible.filter((window) => window.activityRate === current.activityRate).length;
  const greater = eligible.length - lower - equal;

  return Object.freeze({
    status: 'available' as const,
    reason: 'frozen_methodology_value_available' as const,
    normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
    score: round(100 * lower / eligible.length),
    currentActivityRate: current.activityRate,
    priorDefinedWindowCount: eligible.length,
    priorLessThanLatestCount: lower,
    priorEqualToLatestCount: equal,
    priorGreaterThanLatestCount: greater,
    currentWindow: current,
    eligiblePriorWindows: Object.freeze(eligible),
    excludedWindows: Object.freeze(excluded),
  });
}

function slotEvidence(
  slot: NaverNewsShadowFirstSeenActivitySlot,
): NaverNewsIssuePointWindowSlotEvidence {
  const firstSeen = slot.firstSeenObservationCount;
  if (slot.bootstrap || firstSeen === null) {
    throw new Error('naver_news_issue_point_analysis_slot_invalid');
  }
  return Object.freeze({
    slotStart: slot.slotStart,
    jobId: slot.jobId,
    observedObservationCount: slot.observedObservationCount,
    firstSeenObservationCount: firstSeen,
    firstSeenObservationIds: Object.freeze([...slot.firstSeenObservationIds]),
    bootstrap: slot.bootstrap,
  });
}

function windowEvidence(
  researchWindow: NaverNewsMediaActivityResearchWindow,
  slots: readonly NaverNewsShadowFirstSeenActivitySlot[],
  canonicalArtistId: string,
  protocolStart: string,
): NaverNewsIssuePointWindowEvidence {
  const evidence = Object.freeze(slots.map(slotEvidence));
  const window = Object.freeze({
    methodologyVersion: NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
    canonicalArtistId,
    protocolStart,
    windowSlotCount: researchWindow.windowSlotCount,
    startSlotStart: researchWindow.startSlotStart,
    endSlotStart: researchWindow.endSlotStart,
    firstSeenObservationCount: researchWindow.firstSeenObservationCount,
    observedObservationCount: researchWindow.observedObservationCount,
    activityRate: researchWindow.observedActivityRate,
    slotEvidence: evidence,
  });
  validateWindowEvidence(window);
  return window;
}

function unavailableResult(
  series: NaverNewsShadowFirstSeenSeriesResult,
  baselineReadiness: NaverNewsMediaActivityDiurnalReadiness,
  reason: Exclude<NaverNewsIssuePointFrozenMethodologyResult['reason'], 'frozen_methodology_value_available'>,
  evidenceWindows: readonly NaverNewsIssuePointWindowEvidence[] = [],
  comparison?: NaverNewsIssuePointHistoricalComparisonUnavailable,
): NaverNewsIssuePointFrozenMethodologyResult {
  return Object.freeze({
    contractVersion: NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
    methodologyVersion: NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
    variableId: 'newsIssuePoint' as const,
    canonicalArtistId: series.canonicalArtistId,
    protocolStart: series.protocolStart,
    throughSlotStart: series.throughSlotStart,
    selectedWindowSlotCount: 8 as const,
    rollingWindowSemantics: 'overlapping' as const,
    baselineScope: 'same_artist_same_official_shadow_epoch' as const,
    baselineReadiness,
    normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
    status: 'unavailable' as const,
    reason,
    score: null,
    currentActivityRate: comparison?.currentWindow?.activityRate ?? null,
    priorDefinedWindowCount: comparison?.eligiblePriorWindows.length ?? 0,
    priorLessThanLatestCount: 0,
    priorEqualToLatestCount: 0,
    priorGreaterThanLatestCount: 0,
    currentWindow: comparison?.currentWindow ?? null,
    eligiblePriorWindows: comparison?.eligiblePriorWindows ?? Object.freeze([]),
    excludedWindows: comparison?.excludedWindows ?? Object.freeze([]),
    evidenceTrace: Object.freeze({
      windows: Object.freeze([...evidenceWindows]),
      storedEvidenceJobIds: Object.freeze(
        [...new Set(evidenceWindows.flatMap((window) => window.slotEvidence.map((slot) => slot.jobId)))],
      ),
    }),
  });
}

export function evaluateNaverNewsIssuePointFrozenMethodology(
  series: NaverNewsShadowFirstSeenSeriesResult,
): NaverNewsIssuePointFrozenMethodologyResult {
  const officialEpoch = getOfficialNaverNewsShadowEpoch(series.canonicalArtistId);
  const methodResearch = evaluateNaverNewsMediaActivityMethodResearch({
    series,
    candidateWindowSlotCounts: [WINDOW_SLOT_COUNT],
  });
  const baselineReadiness =
    evaluateNaverNewsMediaActivityDiurnalReadiness(methodResearch.analysisSlotCount);

  if (
    series.protocolStart !== officialEpoch.protocolStart
    || series.canonicalArtistId !== officialEpoch.canonicalArtistId
  ) {
    return unavailableResult(series, baselineReadiness, 'official_epoch_mismatch');
  }

  if (
    methodResearch.status !== 'available'
    || series.status !== 'available'
    || series.activity?.status !== 'available'
  ) {
    return unavailableResult(series, baselineReadiness, 'source_series_unavailable');
  }

  const candidate = methodResearch.candidates[0];
  if (!candidate || candidate.windowSlotCount !== WINDOW_SLOT_COUNT) {
    throw new Error('naver_news_issue_point_selected_window_missing');
  }

  const analysisSlots = series.activity.slots.slice(1);
  const windows = Object.freeze(candidate.windows.map((window, index) =>
    windowEvidence(
      window,
      analysisSlots.slice(index, index + WINDOW_SLOT_COUNT),
      series.canonicalArtistId,
      series.protocolStart,
    )));

  const currentWindow = windows.at(-1) ?? null;
  const comparison = evaluateNaverNewsIssuePointHistoricalComparison({
    baselineReadinessStatus: baselineReadiness.status,
    currentWindow,
    historicalWindows: windows,
  });

  if (comparison.status === 'unavailable') {
    return unavailableResult(
      series,
      baselineReadiness,
      comparison.reason,
      windows,
      comparison,
    );
  }

  return Object.freeze({
    contractVersion: NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
    methodologyVersion: NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
    variableId: 'newsIssuePoint' as const,
    canonicalArtistId: series.canonicalArtistId,
    protocolStart: series.protocolStart,
    throughSlotStart: series.throughSlotStart,
    selectedWindowSlotCount: 8 as const,
    rollingWindowSemantics: 'overlapping' as const,
    baselineScope: 'same_artist_same_official_shadow_epoch' as const,
    baselineReadiness,
    normalizationType: comparison.normalizationType,
    status: 'available' as const,
    reason: comparison.reason,
    score: comparison.score,
    currentActivityRate: comparison.currentActivityRate,
    priorDefinedWindowCount: comparison.priorDefinedWindowCount,
    priorLessThanLatestCount: comparison.priorLessThanLatestCount,
    priorEqualToLatestCount: comparison.priorEqualToLatestCount,
    priorGreaterThanLatestCount: comparison.priorGreaterThanLatestCount,
    currentWindow: comparison.currentWindow,
    eligiblePriorWindows: comparison.eligiblePriorWindows,
    excludedWindows: comparison.excludedWindows,
    evidenceTrace: Object.freeze({
      windows,
      storedEvidenceJobIds: Object.freeze(
        [...new Set(windows.flatMap((window) => window.slotEvidence.map((slot) => slot.jobId)))],
      ),
    }),
  });
}

export function reconstructNaverNewsIssuePointFromEvidenceTrace(
  result: NaverNewsIssuePointFrozenMethodologyResult,
): NaverNewsIssuePointHistoricalComparisonResult {
  return evaluateNaverNewsIssuePointHistoricalComparison({
    baselineReadinessStatus: result.baselineReadiness.status,
    currentWindow: result.currentWindow,
    historicalWindows: result.evidenceTrace.windows,
  });
}
