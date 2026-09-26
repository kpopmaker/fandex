import {
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL,
} from './activityExposureProductionActivationApproval';
import {
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
  authorizeActivityExposureProductionActivation,
} from './activityExposureProductionActivationAuthorization';
import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  authorizeActivityExposurePublicRouteCutover,
  type ActivityExposurePublicRouteCutoverApproval,
} from './activityExposurePublicRouteCutoverAuthorization';
import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
} from './activityExposurePublicRouteCutoverCandidate';
import type {
  ActivityExposureProductionReadiness,
} from './activityExposureProductionReadiness';

export const ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE_CONTRACT_VERSION =
  'activity-exposure-public-route-cutover-approval-evidence-v1' as const;

export const ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL =
  Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-public-route-cutover' as const,
    authority: 'product-operations-owner' as const,
    cutoverAuthorizationId:
      'ops-cutover-activity-exposure-20260926t025517z-v1',
    authorizedAt: '2026-09-26T02:55:17.000Z',
    target: ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL.target,
    binding: Object.freeze({
      activationAuthorizationId:
        ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL
          .activationAuthorizationId,
      activationApprovalContractVersion:
        ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL.contractVersion,
      activationAuthorizationContractVersion:
        ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
      productContractVersion:
        ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL
          .binding.productContractVersion,
      claimScope:
        ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL
          .binding.claimScope,
    }),
  }) satisfies ActivityExposurePublicRouteCutoverApproval;

export const ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE =
  Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE_CONTRACT_VERSION,
    approvedAt: '2026-09-26T02:55:17.000Z',
    authority: 'product-operations-owner' as const,
    authorizationEvidenceCommentId: 5842556962 as const,
    authorizedMain:
      'fe1557b9f3801b5505359b9d433935e364f82a29' as const,
    candidateContractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
    cutoverAuthorizationId:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.cutoverAuthorizationId,
    activationAuthorizationId:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL
        .binding.activationAuthorizationId,
    target: ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.target,
    decision: Object.freeze({
      activationAuthorized: true as const,
      cutoverAuthorized: true as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      directProductionContributionEligible: false as const,
      lifecycleState: 'shadow' as const,
      requiredNextGate:
        'explicit-public-route-cutover-execution' as const,
    }),
  });

export function authorizeActivityExposurePublicRouteCutoverWithApproval(
  readiness: ActivityExposureProductionReadiness,
) {
  const activationAuthorization =
    authorizeActivityExposureProductionActivation({
      readiness,
      approval: ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL,
    });

  const cutoverAuthorization =
    authorizeActivityExposurePublicRouteCutover({
      activationAuthorization,
      approval: ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL,
    });

  if (cutoverAuthorization.status !== 'authorized-for-route-cutover') {
    throw new Error(
      'activity_exposure_public_route_cutover_approval_invalid',
    );
  }

  return cutoverAuthorization;
}
