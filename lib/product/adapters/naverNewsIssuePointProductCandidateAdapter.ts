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
    result.variableId === 'newsIssuePoint'
    && result.selectedWindowSlotCount === 8
    && result.normalizationType === 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
    && result.directProductContributionEligible === false
    && result.productScorePublished === false
  );
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

  const currentWindow = result.currentWindow;
  const score = result.score;
  const invariantTotal =
    result.priorLessThanLatestCount
    + result.priorEqualToLatestCount
    + result.priorGreaterThanLatestCount;

  if (
    currentWindow === null
    || result.baselineReadiness.status !== 'replicated_cycle_history'
    || typeof score !== 'number'
    || !Number.isFinite(score)
    || score < 0
    || score > 100
    || result.currentActivityRate === null
    || !Number.isFinite(result.currentActivityRate)
    || result.priorDefinedWindowCount <= 0
    || invariantTotal !== result.priorDefinedWindowCount
    || result.eligiblePriorWindows.length !== result.priorDefinedWindowCount
    || result.evidenceTrace.storedEvidenceJobIds.length === 0
  ) {
    return issue('invalid-available-result');
  }

  return candidate(
    result,
    makeAvailableProductNumericFact(score),
    Object.freeze({
      kind: 'period' as const,
      start: currentWindow.startSlotStart,
      end: currentWindow.endSlotStart,
    }),
  );
}
