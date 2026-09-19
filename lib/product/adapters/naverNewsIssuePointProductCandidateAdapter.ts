import type {
  NaverNewsIssuePointFrozenMethodologyResult,
  NaverNewsIssuePointWindowEvidence,
} from '../../server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  makeAvailableProductNumericFact,
  makeUnavailableProductNumericFact,
  type ProductNumericFact,
} from '../contracts/productNumericFact';
import type {
  ProductDataOrigin,
  ProductPresentation,
  ProductPublication,
} from '../contracts/productState';
import type { ProductObservationTime } from '../contracts/productTime';

export const NAVER_NEWS_ISSUE_POINT_PRODUCT_CANDIDATE_CONTRACT_VERSION =
  'v1_naver_news_issue_point_product_candidate' as const;

const EXPECTED_FROZEN_METHODOLOGY_CONTRACT_VERSION =
  'v1_naver_news_issue_point_frozen_methodology' as const;
const EXPECTED_METHODOLOGY_VERSION =
  'v1_naver_news_issue_point_real_methodology' as const;
const EXPECTED_WINDOW_SLOT_COUNT = 8 as const;
const EXPECTED_BASELINE_SCOPE =
  'same_artist_same_official_shadow_epoch' as const;
const EXPECTED_NORMALIZATION_TYPE =
  'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const;

export type NaverNewsIssuePointProductCandidateSourceMetadata = Readonly<{
  sourceKind: 'naver-news-issue-point-frozen-methodology';
  methodologyVersion: string;
  protocolStart: string;
  throughSlotStart: string;
  selectedWindowSlotCount: 8;
  normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
  baselineReadinessStatus:
    NaverNewsIssuePointFrozenMethodologyResult['baselineReadiness']['status'];
  priorDefinedWindowCount: number;
  priorLessThanLatestCount: number;
  priorEqualToLatestCount: number;
  priorGreaterThanLatestCount: number;
}>;

export type NaverNewsIssuePointProductCandidate = Readonly<{
  contractVersion: typeof NAVER_NEWS_ISSUE_POINT_PRODUCT_CANDIDATE_CONTRACT_VERSION;
  variableId: 'newsIssuePoint';
  canonicalArtistId: string;
  fact: ProductNumericFact;
  dataOrigin: ProductDataOrigin;
  publication: ProductPublication;
  presentation: ProductPresentation;
  observationTime: ProductObservationTime;
  sourceMetadata: NaverNewsIssuePointProductCandidateSourceMetadata;
  evidenceTrace: Readonly<{
    currentWindow: NaverNewsIssuePointWindowEvidence | null;
    storedEvidenceJobIds: readonly string[];
  }>;
  productPolicy: Readonly<{
    directProductContributionEligible: false;
    productScorePublished: false;
    realVariablePromotionEligible: false;
  }>;
}>;

export type NaverNewsIssuePointProductCandidateIssue =
  | 'frozen-methodology-contract-mismatch'
  | 'invalid-available-result'
  | 'invalid-unavailable-result';

export type NaverNewsIssuePointProductCandidateResult =
  | Readonly<{
      status: 'ok';
      candidate: NaverNewsIssuePointProductCandidate;
    }>
  | Readonly<{
      status: 'data-issue';
      reason: NaverNewsIssuePointProductCandidateIssue;
    }>;

function issue(
  reason: NaverNewsIssuePointProductCandidateIssue,
): NaverNewsIssuePointProductCandidateResult {
  return Object.freeze({ status: 'data-issue' as const, reason });
}

function sourceMetadata(
  result: NaverNewsIssuePointFrozenMethodologyResult,
): NaverNewsIssuePointProductCandidateSourceMetadata {
  return Object.freeze({
    sourceKind: 'naver-news-issue-point-frozen-methodology' as const,
    methodologyVersion: result.methodologyVersion,
    protocolStart: result.protocolStart,
    throughSlotStart: result.throughSlotStart,
    selectedWindowSlotCount: result.selectedWindowSlotCount,
    normalizationType: result.normalizationType,
    baselineReadinessStatus: result.baselineReadiness.status,
    priorDefinedWindowCount: result.priorDefinedWindowCount,
    priorLessThanLatestCount: result.priorLessThanLatestCount,
    priorEqualToLatestCount: result.priorEqualToLatestCount,
    priorGreaterThanLatestCount: result.priorGreaterThanLatestCount,
  });
}

function candidate(
  result: NaverNewsIssuePointFrozenMethodologyResult,
  fact: ProductNumericFact,
  observationTime: ProductObservationTime,
): NaverNewsIssuePointProductCandidateResult {
  return Object.freeze({
    status: 'ok' as const,
    candidate: Object.freeze({
      contractVersion:
        NAVER_NEWS_ISSUE_POINT_PRODUCT_CANDIDATE_CONTRACT_VERSION,
      variableId: 'newsIssuePoint' as const,
      canonicalArtistId: result.canonicalArtistId,
      fact,
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
      observationTime,
      sourceMetadata: sourceMetadata(result),
      evidenceTrace: Object.freeze({
        currentWindow: result.currentWindow,
        storedEvidenceJobIds: Object.freeze([
          ...result.evidenceTrace.storedEvidenceJobIds,
        ]),
      }),
      productPolicy: Object.freeze({
        directProductContributionEligible: false as const,
        productScorePublished: false as const,
        realVariablePromotionEligible: false as const,
      }),
    }),
  });
}

function frozenContractMatches(
  result: NaverNewsIssuePointFrozenMethodologyResult,
): boolean {
  return (
    result.contractVersion === EXPECTED_FROZEN_METHODOLOGY_CONTRACT_VERSION
    && result.methodologyVersion === EXPECTED_METHODOLOGY_VERSION
    && result.lifecycle === 'research'
    && result.variableId === 'newsIssuePoint'
    && result.selectedWindowSlotCount === EXPECTED_WINDOW_SLOT_COUNT
    && result.rollingWindowSemantics === 'overlapping'
    && result.baselineScope === EXPECTED_BASELINE_SCOPE
    && result.normalizationType === EXPECTED_NORMALIZATION_TYPE
    && result.directProductContributionEligible === false
    && result.productScorePublished === false
  );
}

function roundedScore(lower: number, total: number): number {
  return Number((100 * lower / total).toFixed(12));
}

function sameWindowIdentity(
  left: NaverNewsIssuePointWindowEvidence,
  right: NaverNewsIssuePointWindowEvidence,
): boolean {
  return (
    left.methodologyVersion === right.methodologyVersion
    && left.canonicalArtistId === right.canonicalArtistId
    && left.protocolStart === right.protocolStart
    && left.windowSlotCount === right.windowSlotCount
    && left.startSlotStart === right.startSlotStart
    && left.endSlotStart === right.endSlotStart
    && left.firstSeenObservationCount === right.firstSeenObservationCount
    && left.observedObservationCount === right.observedObservationCount
    && left.activityRate === right.activityRate
  );
}

function eligibleWindowMatchesCurrentScope(
  window: NaverNewsIssuePointWindowEvidence,
  current: NaverNewsIssuePointWindowEvidence,
): boolean {
  return (
    window.methodologyVersion === EXPECTED_METHODOLOGY_VERSION
    && window.canonicalArtistId === current.canonicalArtistId
    && window.protocolStart === current.protocolStart
    && window.windowSlotCount === EXPECTED_WINDOW_SLOT_COUNT
    && window.endSlotStart < current.endSlotStart
    && window.activityRate !== null
    && Number.isFinite(window.activityRate)
    && window.slotEvidence.length === EXPECTED_WINDOW_SLOT_COUNT
    && window.slotEvidence.every(
      (slot) => slot.bootstrap === false && slot.jobId.length > 0,
    )
  );
}

function exactEvidenceTraceMatches(
  result: NaverNewsIssuePointFrozenMethodologyResult,
  current: NaverNewsIssuePointWindowEvidence,
): boolean {
  const windows = result.evidenceTrace.windows;
  if (
    windows.length === 0
    || !windows.some((window) => sameWindowIdentity(window, current))
  ) {
    return false;
  }

  for (const prior of result.eligiblePriorWindows) {
    if (!windows.some((window) => sameWindowIdentity(window, prior))) {
      return false;
    }
  }

  const derivedJobIds = [
    ...new Set(
      windows.flatMap((window) =>
        window.slotEvidence.map((slot) => slot.jobId),
      ),
    ),
  ];
  const storedJobIds = [...result.evidenceTrace.storedEvidenceJobIds];

  return (
    derivedJobIds.length > 0
    && derivedJobIds.length === storedJobIds.length
    && derivedJobIds.every((jobId, index) => jobId === storedJobIds[index])
  );
}

function availableResultIsConsistent(
  result: NaverNewsIssuePointFrozenMethodologyResult,
): boolean {
  if (result.status !== 'available') return false;

  const current = result.currentWindow;
  const score = result.score;
  const currentActivityRate = result.currentActivityRate;
  if (
    result.reason !== 'frozen_methodology_value_available'
    || current === null
    || result.baselineReadiness.status !== 'replicated_cycle_history'
    || typeof score !== 'number'
    || !Number.isFinite(score)
    || score < 0
    || score > 100
    || currentActivityRate === null
    || !Number.isFinite(currentActivityRate)
    || current.activityRate !== currentActivityRate
    || current.methodologyVersion !== EXPECTED_METHODOLOGY_VERSION
    || current.canonicalArtistId !== result.canonicalArtistId
    || current.protocolStart !== result.protocolStart
    || current.windowSlotCount !== EXPECTED_WINDOW_SLOT_COUNT
    || current.slotEvidence.length !== EXPECTED_WINDOW_SLOT_COUNT
    || current.slotEvidence.some(
      (slot) => slot.bootstrap || slot.jobId.length === 0,
    )
    || result.priorDefinedWindowCount <= 0
    || result.eligiblePriorWindows.length !== result.priorDefinedWindowCount
    || result.eligiblePriorWindows.some(
      (window) => !eligibleWindowMatchesCurrentScope(window, current),
    )
  ) {
    return false;
  }

  const lower = result.eligiblePriorWindows.filter(
    (window) => (window.activityRate as number) < currentActivityRate,
  ).length;
  const equal = result.eligiblePriorWindows.filter(
    (window) => window.activityRate === currentActivityRate,
  ).length;
  const greater = result.eligiblePriorWindows.length - lower - equal;

  if (
    lower !== result.priorLessThanLatestCount
    || equal !== result.priorEqualToLatestCount
    || greater !== result.priorGreaterThanLatestCount
    || lower + equal + greater !== result.priorDefinedWindowCount
    || score !== roundedScore(lower, result.priorDefinedWindowCount)
  ) {
    return false;
  }

  return exactEvidenceTraceMatches(result, current);
}

export function adaptNaverNewsIssuePointProductCandidate(
  result: NaverNewsIssuePointFrozenMethodologyResult,
): NaverNewsIssuePointProductCandidateResult {
  if (!frozenContractMatches(result)) {
    return issue('frozen-methodology-contract-mismatch');
  }

  if (result.status === 'unavailable') {
    if (
      result.score !== null
      || result.currentActivityRate !== null
        && !Number.isFinite(result.currentActivityRate)
    ) {
      return issue('invalid-unavailable-result');
    }

    return candidate(
      result,
      makeUnavailableProductNumericFact(),
      Object.freeze({ kind: 'unknown' as const }),
    );
  }

  if (!availableResultIsConsistent(result)) {
    return issue('invalid-available-result');
  }

  const currentWindow = result.currentWindow;
  if (currentWindow === null || result.score === null) {
    return issue('invalid-available-result');
  }

  return candidate(
    result,
    makeAvailableProductNumericFact(result.score),
    Object.freeze({
      kind: 'period' as const,
      start: currentWindow.startSlotStart,
      end: currentWindow.endSlotStart,
    }),
  );
}
