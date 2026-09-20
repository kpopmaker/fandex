import type {
  NewsIssuePointRealPromotionEligibilityResult,
} from './newsIssuePointRealProductPromotionGate';

export const NEWS_ISSUE_POINT_REAL_PROMOTION_APPROVAL_CANDIDATE_CONTRACT_VERSION =
  'v1_news_issue_point_real_promotion_approval_candidate' as const;

export type NewsIssuePointRealPromotionApprovalCandidateResult =
  | Readonly<{
      status: 'ready-for-owner-attestation';
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PROMOTION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      target: Readonly<{
        artistId: 'iu';
        variableId: 'newsIssuePoint';
      }>;
      authorityRequired: 'product-operations-owner';
      action: 'authorize-real-variable-promotion';
      authorizationId: null;
      authorizedAt: null;
      binding: Readonly<{
        candidateContractVersion:
          'v1_naver_news_issue_point_product_candidate';
        methodologyVersion:
          'v1_naver_news_issue_point_real_methodology';
        protocolStart: string;
        selectedWindowSlotCount: 8;
        normalizationType:
          'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
        claimScope:
          'protocol-conditioned-first-seen-only';
      }>;
      promotionAuthorized: false;
      publicRouteActivated: false;
      strictPublicationIntervalClaimAllowed: false;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PROMOTION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      reason: 'promotion-eligibility-not-met';
      promotionAuthorized: false;
      publicRouteActivated: false;
      strictPublicationIntervalClaimAllowed: false;
    }>;

function blocked(): NewsIssuePointRealPromotionApprovalCandidateResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PROMOTION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
    reason: 'promotion-eligibility-not-met' as const,
    promotionAuthorized: false as const,
    publicRouteActivated: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
  });
}

export function createNewsIssuePointRealPromotionApprovalCandidate(
  eligibility: NewsIssuePointRealPromotionEligibilityResult,
): NewsIssuePointRealPromotionApprovalCandidateResult {
  if (eligibility.status !== 'eligible') {
    return blocked();
  }

  const candidate = eligibility.candidate;
  const metadata = candidate.sourceMetadata;

  if (
    candidate.contractVersion
      !== 'v1_naver_news_issue_point_product_candidate'
    || metadata.methodologyVersion
      !== 'v1_naver_news_issue_point_real_methodology'
    || metadata.selectedWindowSlotCount !== 8
    || metadata.normalizationType
      !== 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
    || eligibility.claimScope
      !== 'protocol-conditioned-first-seen-only'
    || eligibility.strictPublicationIntervalClaimAllowed !== false
  ) {
    return blocked();
  }

  return Object.freeze({
    status: 'ready-for-owner-attestation' as const,
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PROMOTION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    authorityRequired: 'product-operations-owner' as const,
    action: 'authorize-real-variable-promotion' as const,
    authorizationId: null,
    authorizedAt: null,
    binding: Object.freeze({
      candidateContractVersion:
        'v1_naver_news_issue_point_product_candidate' as const,
      methodologyVersion:
        'v1_naver_news_issue_point_real_methodology' as const,
      protocolStart: metadata.protocolStart,
      selectedWindowSlotCount: 8 as const,
      normalizationType:
        'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      claimScope:
        'protocol-conditioned-first-seen-only' as const,
    }),
    promotionAuthorized: false as const,
    publicRouteActivated: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
  });
}
