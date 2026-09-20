import type {
  NaverNewsIssuePointProductCandidate,
} from '../adapters/naverNewsIssuePointProductCandidateAdapter';
import type {
  NewsIssuePointRealSelectorResult,
} from '../selectors/newsIssuePointRealProductSelector';

export const NEWS_ISSUE_POINT_REAL_PROMOTION_GATE_CONTRACT_VERSION =
  'v1_news_issue_point_real_promotion_gate' as const;

export type NewsIssuePointRealPromotionBlockedReason =
  | 'target-scope-not-selected'
  | 'selector-data-issue'
  | 'real-value-unavailable'
  | 'candidate-contract-mismatch'
  | 'candidate-policy-mismatch'
  | 'candidate-evidence-mismatch';

export type NewsIssuePointRealPromotionEligibilityResult =
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PROMOTION_GATE_CONTRACT_VERSION;
      status: 'eligible';
      targetScope: true;
      promotionAuthorized: false;
      claimScope: 'protocol-conditioned-first-seen-only';
      strictPublicationIntervalClaimAllowed: false;
      candidate: NaverNewsIssuePointProductCandidate;
    }>
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PROMOTION_GATE_CONTRACT_VERSION;
      status: 'blocked';
      targetScope: boolean;
      promotionAuthorized: false;
      strictPublicationIntervalClaimAllowed: false;
      reason: NewsIssuePointRealPromotionBlockedReason;
    }>;

function blocked(
  reason: NewsIssuePointRealPromotionBlockedReason,
  targetScope: boolean,
): NewsIssuePointRealPromotionEligibilityResult {
  return Object.freeze({
    contractVersion: NEWS_ISSUE_POINT_REAL_PROMOTION_GATE_CONTRACT_VERSION,
    status: 'blocked' as const,
    targetScope,
    promotionAuthorized: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    reason,
  });
}

function exactCurrentWindowTrace(
  candidate: NaverNewsIssuePointProductCandidate,
): boolean {
  const currentWindow = candidate.evidenceTrace.currentWindow;
  if (
    currentWindow === null
    || currentWindow.canonicalArtistId !== candidate.canonicalArtistId
    || currentWindow.methodologyVersion !== candidate.sourceMetadata.methodologyVersion
    || currentWindow.protocolStart !== candidate.sourceMetadata.protocolStart
    || currentWindow.windowSlotCount !== 8
    || currentWindow.slotEvidence.length !== 8
    || currentWindow.activityRate === null
    || !Number.isFinite(currentWindow.activityRate)
  ) {
    return false;
  }

  if (
    candidate.observationTime.kind !== 'period'
    || candidate.observationTime.start !== currentWindow.startSlotStart
    || candidate.observationTime.end !== currentWindow.endSlotStart
    || candidate.sourceMetadata.throughSlotStart !== currentWindow.endSlotStart
  ) {
    return false;
  }

  const trace = candidate.evidenceTrace.storedEvidenceJobIds;
  if (trace.length === 0 || new Set(trace).size !== trace.length) {
    return false;
  }

  return currentWindow.slotEvidence.every(
    (slot) =>
      slot.bootstrap === false
      && slot.jobId.length > 0
      && trace.includes(slot.jobId),
  );
}

function candidateContractMatches(
  candidate: NaverNewsIssuePointProductCandidate,
): boolean {
  const metadata = candidate.sourceMetadata;
  const fact = candidate.fact;

  return (
    candidate.contractVersion === 'v1_naver_news_issue_point_product_candidate'
    && candidate.variableId === 'newsIssuePoint'
    && candidate.canonicalArtistId === 'iu'
    && candidate.dataOrigin === 'observed'
    && candidate.publication === 'shadow'
    && candidate.presentation === 'standard'
    && fact.availability === 'available'
    && Number.isFinite(fact.value)
    && fact.value >= 0
    && fact.value <= 100
    && metadata.sourceKind === 'naver-news-issue-point-frozen-methodology'
    && metadata.methodologyVersion === 'v1_naver_news_issue_point_real_methodology'
    && metadata.selectedWindowSlotCount === 8
    && metadata.normalizationType === 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
    && metadata.baselineReadinessStatus === 'replicated_cycle_history'
    && metadata.priorDefinedWindowCount > 0
    && metadata.priorLessThanLatestCount >= 0
    && metadata.priorEqualToLatestCount >= 0
    && metadata.priorGreaterThanLatestCount >= 0
    && metadata.priorLessThanLatestCount
      + metadata.priorEqualToLatestCount
      + metadata.priorGreaterThanLatestCount
      === metadata.priorDefinedWindowCount
  );
}

function candidatePolicyIsStillFailClosed(
  candidate: NaverNewsIssuePointProductCandidate,
): boolean {
  return (
    candidate.productPolicy.directProductContributionEligible === false
    && candidate.productPolicy.productScorePublished === false
    && candidate.productPolicy.realVariablePromotionEligible === false
  );
}

export function evaluateNewsIssuePointRealPromotionEligibility(
  selection: NewsIssuePointRealSelectorResult,
): NewsIssuePointRealPromotionEligibilityResult {
  if (selection.selection === 'legacy-preview') {
    return blocked('target-scope-not-selected', false);
  }

  if (selection.selection === 'data-issue') {
    return blocked('selector-data-issue', true);
  }

  if (selection.selection === 'real-unavailable') {
    return blocked('real-value-unavailable', true);
  }

  if (
    selection.targetScope !== true
    || selection.publishable !== false
    || !candidateContractMatches(selection.candidate)
  ) {
    return blocked('candidate-contract-mismatch', true);
  }

  if (!candidatePolicyIsStillFailClosed(selection.candidate)) {
    return blocked('candidate-policy-mismatch', true);
  }

  if (!exactCurrentWindowTrace(selection.candidate)) {
    return blocked('candidate-evidence-mismatch', true);
  }

  return Object.freeze({
    contractVersion: NEWS_ISSUE_POINT_REAL_PROMOTION_GATE_CONTRACT_VERSION,
    status: 'eligible' as const,
    targetScope: true as const,
    promotionAuthorized: false as const,
    claimScope: 'protocol-conditioned-first-seen-only' as const,
    strictPublicationIntervalClaimAllowed: false as const,
    candidate: selection.candidate,
  });
}
