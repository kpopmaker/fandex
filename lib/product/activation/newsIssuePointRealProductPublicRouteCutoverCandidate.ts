import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE,
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE_CONTRACT_VERSION,
} from './newsIssuePointRealProductActivationApproval';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION =
  'v1_news_issue_point_real_product_public_route_cutover_candidate' as const;

export const NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_ACTION =
  'authorize-public-route-cutover' as const;

export const NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
    action: NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_ACTION,
    authority: 'product-operations-owner' as const,
    status: 'ready-for-owner-attestation' as const,
    cutoverAuthorizationId: null,
    authorizedAt: null,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    binding: Object.freeze({
      authoritativeMainWithActivationApproval:
        '91d310a25bc43ff32de741012f6649c95b827e88' as const,
      activationApprovalContractVersion:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.contractVersion,
      activationApprovalEvidenceContractVersion:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE_CONTRACT_VERSION,
      activationAuthorizationId:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId,
      activationAuthorizedAt:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.authorizedAt,
      activationAuthorizationEvidenceCommentId:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
          .authorizationEvidenceCommentId,
      promotionAuthorizationId:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
          .binding.promotionAuthorizationId,
      methodologyVersion:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
          .binding.methodologyVersion,
      protocolStart:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
          .binding.protocolStart,
      selectedWindowSlotCount:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
          .binding.selectedWindowSlotCount,
      normalizationType:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
          .binding.normalizationType,
      claimScope:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
          .binding.claimScope,
    }),
    decision: Object.freeze({
      activationAuthorized: true as const,
      cutoverAuthorized: false as const,
      publicRouteActivated: false as const,
      productScorePublished: false as const,
      directProductionContributionEligible: false as const,
      strictPublicationIntervalClaimAllowed: false as const,
      lifecycleState: 'shadow' as const,
      requiredNextGate: 'explicit-public-route-cutover' as const,
    }),
  });
