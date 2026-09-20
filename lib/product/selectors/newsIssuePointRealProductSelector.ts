import type { ProductVariableReadModelResult } from '../contracts/productVariable';
import type {
  NaverNewsIssuePointProductCandidate,
  NaverNewsIssuePointProductCandidateResult,
} from '../adapters/naverNewsIssuePointProductCandidateAdapter';

export const NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION =
  'v1_news_issue_point_real_selector' as const;

export type NewsIssuePointRealSelectorInput = Readonly<{
  artistId: string;
  variableId: string;
  legacyResult: ProductVariableReadModelResult;
  realCandidateResult: NaverNewsIssuePointProductCandidateResult;
}>;

export type NewsIssuePointRealSelectorDataIssue =
  | 'real-candidate-data-issue'
  | 'real-candidate-scope-mismatch'
  | 'real-candidate-policy-mismatch'
  | 'real-candidate-fact-invalid';

export type NewsIssuePointRealSelectorResult =
  | Readonly<{
      contractVersion: typeof NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION;
      selection: 'legacy-preview';
      targetScope: false;
      legacyResult: ProductVariableReadModelResult;
    }>
  | Readonly<{
      contractVersion: typeof NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION;
      selection: 'real-shadow-candidate';
      targetScope: true;
      publishable: false;
      candidate: NaverNewsIssuePointProductCandidate;
    }>
  | Readonly<{
      contractVersion: typeof NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION;
      selection: 'real-unavailable';
      targetScope: true;
      publishable: false;
      candidate: NaverNewsIssuePointProductCandidate;
    }>
  | Readonly<{
      contractVersion: typeof NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION;
      selection: 'data-issue';
      targetScope: true;
      publishable: false;
      reason: NewsIssuePointRealSelectorDataIssue;
    }>;

export function isNewsIssuePointRealProductTargetScope(
  artistId: string,
  variableId: string,
): boolean {
  return artistId.trim() === 'iu' && variableId.trim() === 'newsIssuePoint';
}

function policyMatches(candidate: NaverNewsIssuePointProductCandidate): boolean {
  return (
    candidate.dataOrigin === 'observed'
    && candidate.publication === 'shadow'
    && candidate.presentation === 'standard'
    && candidate.sourceMetadata.baselineReadinessStatus === 'replicated_cycle_history'
    && candidate.productPolicy.directProductContributionEligible === false
    && candidate.productPolicy.productScorePublished === false
    && candidate.productPolicy.realVariablePromotionEligible === false
  );
}

export function selectNewsIssuePointRealProductSource(
  input: NewsIssuePointRealSelectorInput,
): NewsIssuePointRealSelectorResult {
  const artistId = input.artistId.trim();
  const variableId = input.variableId.trim();

  if (!isNewsIssuePointRealProductTargetScope(artistId, variableId)) {
    return Object.freeze({
      contractVersion: NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION,
      selection: 'legacy-preview' as const,
      targetScope: false as const,
      legacyResult: input.legacyResult,
    });
  }

  if (input.realCandidateResult.status === 'data-issue') {
    return Object.freeze({
      contractVersion: NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION,
      selection: 'data-issue' as const,
      targetScope: true as const,
      publishable: false as const,
      reason: 'real-candidate-data-issue' as const,
    });
  }

  const candidate = input.realCandidateResult.candidate;

  if (
    candidate.canonicalArtistId !== 'iu'
    || candidate.variableId !== 'newsIssuePoint'
  ) {
    return Object.freeze({
      contractVersion: NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION,
      selection: 'data-issue' as const,
      targetScope: true as const,
      publishable: false as const,
      reason: 'real-candidate-scope-mismatch' as const,
    });
  }

  if (!policyMatches(candidate)) {
    return Object.freeze({
      contractVersion: NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION,
      selection: 'data-issue' as const,
      targetScope: true as const,
      publishable: false as const,
      reason: 'real-candidate-policy-mismatch' as const,
    });
  }

  if (candidate.fact.availability === 'available') {
    if (
      !Number.isFinite(candidate.fact.value)
      || candidate.fact.value < 0
      || candidate.fact.value > 100
    ) {
      return Object.freeze({
        contractVersion: NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION,
        selection: 'data-issue' as const,
        targetScope: true as const,
        publishable: false as const,
        reason: 'real-candidate-fact-invalid' as const,
      });
    }

    return Object.freeze({
      contractVersion: NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION,
      selection: 'real-shadow-candidate' as const,
      targetScope: true as const,
      publishable: false as const,
      candidate,
    });
  }

  if (
    candidate.fact.availability === 'unavailable'
    && candidate.fact.value === null
  ) {
    return Object.freeze({
      contractVersion: NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION,
      selection: 'real-unavailable' as const,
      targetScope: true as const,
      publishable: false as const,
      candidate,
    });
  }

  return Object.freeze({
    contractVersion: NEWS_ISSUE_POINT_REAL_SELECTOR_CONTRACT_VERSION,
    selection: 'data-issue' as const,
    targetScope: true as const,
    publishable: false as const,
    reason: 'real-candidate-fact-invalid' as const,
  });
}
