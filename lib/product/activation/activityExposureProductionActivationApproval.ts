import {
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
  authorizeActivityExposureProductionActivation,
  type ActivityExposureProductionActivationApproval,
} from './activityExposureProductionActivationAuthorization';
import {
  ACTIVITY_EXPOSURE_PRODUCTION_READINESS_CONTRACT_VERSION,
  type ActivityExposureProductionReadiness,
} from './activityExposureProductionReadiness';

export const ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE_CONTRACT_VERSION =
  'activity-exposure-production-activation-approval-evidence-v1' as const;

export const ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL =
  Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-production-activation' as const,
    authority: 'product-operations-owner' as const,
    activationAuthorizationId:
      'ops-activation-activity-exposure-20260926t010041z-v1',
    authorizedAt: '2026-09-26T01:00:41.000Z',
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'comebackActivityPoint' as const,
      constructId: 'activityExposure' as const,
    }),
    binding: Object.freeze({
      readinessContractVersion:
        ACTIVITY_EXPOSURE_PRODUCTION_READINESS_CONTRACT_VERSION,
      productContractVersion:
        'product-activity-exposure-v1' as const,
      persistenceContractVersion:
        'activity-exposure-event-v1' as const,
      requiredProviders:
        Object.freeze(['musicbrainz', 'youtube'] as const),
      sourcePublication: 'shadow' as const,
      claimScope: 'event-stream-only-no-numeric-score' as const,
    }),
  }) satisfies ActivityExposureProductionActivationApproval;

export const ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE =
  Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE_CONTRACT_VERSION,
    approvedAt: '2026-09-26T01:00:41.000Z',
    authority: 'product-operations-owner' as const,
    approvalCandidateContractVersion:
      'activity-exposure-production-activation-approval-candidate-v1' as const,
    authorizationEvidenceCommentId: 5841756452 as const,
    authorizedMain:
      '2696208d01e64d207d40817bb6068969820a83f2' as const,
    activationAuthorizationId:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL
        .activationAuthorizationId,
    target: ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL.target,
    binding: ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL.binding,
    decision: Object.freeze({
      activationAuthorized: true as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      directProductionContributionEligible: false as const,
      lifecycleState: 'shadow' as const,
      requiredNextGate: 'explicit-public-route-cutover' as const,
    }),
  });

export function authorizeActivityExposureProductionActivationWithApproval(
  readiness: ActivityExposureProductionReadiness,
) {
  return authorizeActivityExposureProductionActivation({
    readiness,
    approval: ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL,
  });
}
