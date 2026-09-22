import type {
  NewsIssuePointRealProductActivationApproval,
} from './newsIssuePointRealProductActivationAuthorization';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE_CONTRACT_VERSION =
  'v1_news_issue_point_real_product_activation_approval_evidence' as const;

export const NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL =
  Object.freeze({
    contractVersion:
      'v1_news_issue_point_real_product_activation_approval' as const,
    action: 'authorize-production-activation' as const,
    authority: 'product-operations-owner' as const,
    activationAuthorizationId:
      'ops-activation-newsissuepoint-20260922t081619z-v1',
    authorizedAt: '2026-09-22T08:16:19.000Z',
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    binding: Object.freeze({
      promotionAuthorizationId:
        'ops-approval-newsissuepoint-20260921t001840z-v1',
      promotionApprovalContractVersion:
        'v1_news_issue_point_real_promotion_approval' as const,
      activationGateContractVersion:
        'v1_news_issue_point_real_product_activation_gate' as const,
      methodologyVersion:
        'v1_naver_news_issue_point_real_methodology' as const,
      protocolStart: '2026-09-15T16:00:00.000Z',
      selectedWindowSlotCount: 8 as const,
      normalizationType:
        'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      claimScope:
        'protocol-conditioned-first-seen-only' as const,
    }),
  }) satisfies NewsIssuePointRealProductActivationApproval;

export const NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE_CONTRACT_VERSION,
    approvedAt: '2026-09-22T08:16:19.000Z',
    authority: 'product-operations-owner' as const,
    approvalCandidateContractVersion:
      'v2_news_issue_point_real_product_activation_approval_candidate' as const,
    activationAuthorizationId:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId,
    promotionAuthorizationId:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
        .binding.promotionAuthorizationId,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    decision: Object.freeze({
      activationAuthorized: true as const,
      publicRouteActivated: false as const,
      productScorePublished: false as const,
      directProductionContributionEligible: false as const,
      strictPublicationIntervalClaimAllowed: false as const,
      lifecycleState: 'shadow' as const,
      requiredNextGate: 'explicit-public-route-cutover' as const,
    }),
  });
