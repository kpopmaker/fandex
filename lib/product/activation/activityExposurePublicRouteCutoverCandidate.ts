import {
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL,
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE,
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
import type {
  ActivityExposureProductionReadiness,
} from './activityExposureProductionReadiness';

export const ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION =
  'activity-exposure-public-route-cutover-candidate-v1' as const;

type PendingCutoverApproval = Readonly<
  Omit<
    ActivityExposurePublicRouteCutoverApproval,
    'cutoverAuthorizationId' | 'authorizedAt'
  > & {
    cutoverAuthorizationId: null;
    authorizedAt: null;
  }
>;

export function createActivityExposurePublicRouteCutoverCandidate(
  readiness: ActivityExposureProductionReadiness,
) {
  const activationAuthorization =
    authorizeActivityExposureProductionActivation({
      readiness,
      approval: ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL,
    });

  if (activationAuthorization.status !== 'authorized-for-cutover') {
    return Object.freeze({
      contractVersion:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
      status: 'blocked' as const,
      reason: 'activation-authorization-not-ready' as const,
      activationAuthorized: false as const,
      cutoverAuthorized: false as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      directProductionContributionEligible: false as const,
    });
  }

  const pendingApproval: PendingCutoverApproval = Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-public-route-cutover' as const,
    authority: 'product-operations-owner' as const,
    cutoverAuthorizationId: null,
    authorizedAt: null,
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
  });

  const authorizationWithoutApproval =
    authorizeActivityExposurePublicRouteCutover({
      activationAuthorization,
      approval: null,
    });

  if (
    authorizationWithoutApproval.status !== 'not-authorized'
    || authorizationWithoutApproval.reason !== 'cutover-approval-absent'
    || authorizationWithoutApproval.activationAuthorized !== true
    || authorizationWithoutApproval.cutoverAuthorized !== false
    || authorizationWithoutApproval.publicRouteActivated !== false
    || authorizationWithoutApproval.publication !== 'shadow'
  ) {
    throw new Error(
      'activity_exposure_cutover_candidate_fail_closed_invalid',
    );
  }

  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
    status: 'ready-for-owner-attestation' as const,
    authoritativeMainWithActivationAuthorization:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE.authorizedMain,
    activationAuthorizationEvidenceCommentId:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE
        .authorizationEvidenceCommentId,
    activationAuthorizationId:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL
        .activationAuthorizationId,
    pendingApproval,
    authorizationWithoutApproval,
    decision: Object.freeze({
      activationAuthorized: true as const,
      cutoverAuthorized: false as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      directProductionContributionEligible: false as const,
      lifecycleState: 'shadow' as const,
      requiredNextGate: 'explicit-public-route-cutover' as const,
    }),
  });
}
