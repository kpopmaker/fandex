import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  authorizeNewsIssuePointPublicRouteCutover,
  type NewsIssuePointPublicRouteCutoverApproval,
} from './newsIssuePointPublicRouteCutoverAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
} from './newsIssuePointRealProductActivationApproval';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
} from './newsIssuePointRealProductActivationAuthorization';

export const NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE_CONTRACT_VERSION =
  'v1_news_issue_point_public_route_cutover_approval_evidence' as const;

export const NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-public-route-cutover' as const,
    authority: 'product-operations-owner' as const,
    cutoverAuthorizationId:
      'ops-cutover-newsissuepoint-20260923t014819z-v1',
    authorizedAt: '2026-09-23T01:48:19.000Z',
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    binding: Object.freeze({
      activationAuthorizationId:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
          .activationAuthorizationId,
      activationApprovalContractVersion:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.contractVersion,
      activationAuthorizationContractVersion:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
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
  }) satisfies NewsIssuePointPublicRouteCutoverApproval;

const activationAuthorization = Object.freeze({
  contractVersion:
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
  status: 'authorized-for-cutover' as const,
  activationAuthorized: true as const,
  publicRouteActivated: false as const,
  productScorePublished: false as const,
  directProductionContributionEligible: false as const,
  strictPublicationIntervalClaimAllowed: false as const,
  lifecycleState: 'shadow' as const,
  requiredNextGate: 'explicit-public-route-cutover' as const,
  approval: NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
});

export const NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION =
  authorizeNewsIssuePointPublicRouteCutover({
    activationAuthorization,
    approval: NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL,
  });

export const NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE_CONTRACT_VERSION,
    approvedAt: '2026-09-23T01:48:19.000Z',
    authority: 'product-operations-owner' as const,
    cutoverCandidateContractVersion:
      'v2_news_issue_point_real_product_public_route_cutover_candidate' as const,
    authorizationEvidenceCommentId: 5787550830 as const,
    authorizedMain:
      'f1c32a298fb7d7155f1cb8358a7afdb22db8c7e0' as const,
    cutoverAuthorizationId:
      NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL.cutoverAuthorizationId,
    activationAuthorizationId:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
        .activationAuthorizationId,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    decision: Object.freeze({
      activationAuthorized: true as const,
      cutoverAuthorized: true as const,
      publicRouteActivated: false as const,
      productScorePublished: false as const,
      directProductionContributionEligible: false as const,
      strictPublicationIntervalClaimAllowed: false as const,
      lifecycleState: 'shadow' as const,
      requiredNextGate:
        'explicit-public-route-cutover-execution' as const,
    }),
  });
