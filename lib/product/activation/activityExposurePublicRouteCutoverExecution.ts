import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL,
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE,
} from './activityExposurePublicRouteCutoverApproval';

export const ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION_CONTRACT_VERSION =
  'activity-exposure-public-route-cutover-execution-v1' as const;

export const ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION =
  Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION_CONTRACT_VERSION,
    action: 'execute-public-route-cutover' as const,
    authority: 'product-operations-owner' as const,
    cutoverExecutionAuthorizationId:
      'ops-cutover-execution-activity-exposure-20260926t033503z-v1',
    authorizedAt: '2026-09-26T03:35:03.000Z',
    authorizationEvidenceCommentId: 5842819597 as const,
    authorizedMain:
      'defc8f3a61328a80192b5380ad95ab7fc7d8be5b' as const,
    target: ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.target,
    binding: Object.freeze({
      cutoverAuthorizationId:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .cutoverAuthorizationId,
      cutoverApprovalContractVersion:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.contractVersion,
      activationAuthorizationId:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.activationAuthorizationId,
      productContractVersion:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.productContractVersion,
      claimScope:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .binding.claimScope,
    }),
    decision: Object.freeze({
      activationAuthorized: true as const,
      cutoverAuthorized: true as const,
      publicRouteActivated: true as const,
      publication: 'production' as const,
      directProductionContributionEligible: true as const,
      lifecycleState: 'production' as const,
    }),
  });

if (
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.activationAuthorized !== true
  || ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.cutoverAuthorized !== true
  || ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.publicRouteActivated !== false
  || ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.publication !== 'shadow'
  || ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.directProductionContributionEligible !== false
  || ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
    .decision.requiredNextGate
      !== 'explicit-public-route-cutover-execution'
  || ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION
    .binding.cutoverAuthorizationId
      !== ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
        .cutoverAuthorizationId
  || ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION
    .binding.activationAuthorizationId
      !== ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
        .activationAuthorizationId
) {
  throw new Error(
    'activity_exposure_public_route_execution_binding_invalid',
  );
}
