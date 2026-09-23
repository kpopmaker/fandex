import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL,
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE,
} from './newsIssuePointPublicRouteCutoverApproval';

export const NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION_CONTRACT_VERSION =
  'v1_news_issue_point_public_route_cutover_execution' as const;

export const NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION_CONTRACT_VERSION,
    action: 'execute-public-route-cutover' as const,
    authority: 'product-operations-owner' as const,
    cutoverExecutionAuthorizationId:
      'ops-cutover-execution-newsissuepoint-20260923t095908z-v1',
    authorizedAt: '2026-09-23T09:59:08.000Z',
    authorizationEvidenceCommentId: 5792785034 as const,
    authorizedMain:
      '930f5d692129e75f79ca3d74e99f6751cc12bb46' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    binding: Object.freeze({
      cutoverAuthorizationId:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .cutoverAuthorizationId,
      cutoverApprovalContractVersion:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL.contractVersion,
      activationAuthorizationId:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.activationAuthorizationId,
      methodologyVersion:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.methodologyVersion,
      protocolStart:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.protocolStart,
      selectedWindowSlotCount:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.selectedWindowSlotCount,
      normalizationType:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.normalizationType,
      claimScope:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.claimScope,
    }),
    decision: Object.freeze({
      activationAuthorized: true as const,
      cutoverAuthorized: true as const,
      publicRouteActivated: true as const,
      productScorePublished: true as const,
      directProductionContributionEligible: true as const,
      strictPublicationIntervalClaimAllowed: false as const,
      lifecycleState: 'production' as const,
    }),
  });

if (
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.cutoverAuthorized !== true
  || NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.publicRouteActivated !== false
  || NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.productScorePublished !== false
  || NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.directProductionContributionEligible !== false
  || NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.strictPublicationIntervalClaimAllowed !== false
  || NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.requiredNextGate
      !== 'explicit-public-route-cutover-execution'
  || NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
    .binding.cutoverAuthorizationId
      !== NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
        .cutoverAuthorizationId
) {
  throw new Error('news_issue_point_public_route_execution_binding_invalid');
}
