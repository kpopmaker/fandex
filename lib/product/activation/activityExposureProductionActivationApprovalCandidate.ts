import {
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
  authorizeActivityExposureProductionActivation,
  type ActivityExposureProductionActivationApproval,
} from './activityExposureProductionActivationAuthorization';
import type {
  ActivityExposureProductionReadiness,
} from './activityExposureProductionReadiness';

export const ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION =
  'activity-exposure-production-activation-approval-candidate-v1' as const;

type PendingActivityExposureActivationApproval = Readonly<
  Omit<
    ActivityExposureProductionActivationApproval,
    'activationAuthorizationId' | 'authorizedAt'
  > & {
    activationAuthorizationId: null;
    authorizedAt: null;
  }
>;

export type ActivityExposureProductionActivationApprovalCandidateResult =
  | Readonly<{
      contractVersion:
        typeof ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      status: 'ready-for-owner-attestation';
      approval: PendingActivityExposureActivationApproval;
      authorizationWithoutApproval: ReturnType<
        typeof authorizeActivityExposureProductionActivation
      >;
      activationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      directProductionContributionEligible: false;
      requiredNextGate: 'explicit-production-activation-authorization';
    }>
  | Readonly<{
      contractVersion:
        typeof ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      status: 'blocked';
      reason: 'activation-readiness-not-ready';
      activationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      directProductionContributionEligible: false;
    }>;

export function createActivityExposureProductionActivationApprovalCandidate(
  readiness: ActivityExposureProductionReadiness,
): ActivityExposureProductionActivationApprovalCandidateResult {
  if (
    readiness.status !== 'ready-for-activation-authorization'
    || readiness.contractVersion
      !== 'activity-exposure-production-readiness-v1'
    || readiness.target.artistId !== 'iu'
    || readiness.target.legacyVariableId !== 'comebackActivityPoint'
    || readiness.target.constructId !== 'activityExposure'
    || !Object.values(readiness.checks).every(Boolean)
  ) {
    return Object.freeze({
      contractVersion:
        ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
      status: 'blocked' as const,
      reason: 'activation-readiness-not-ready' as const,
      activationAuthorized: false as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      directProductionContributionEligible: false as const,
    });
  }

  const approval: PendingActivityExposureActivationApproval = Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-production-activation' as const,
    authority: 'product-operations-owner' as const,
    activationAuthorizationId: null,
    authorizedAt: null,
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'comebackActivityPoint' as const,
      constructId: 'activityExposure' as const,
    }),
    binding: Object.freeze({
      readinessContractVersion:
        'activity-exposure-production-readiness-v1' as const,
      productContractVersion:
        'product-activity-exposure-v1' as const,
      persistenceContractVersion:
        'activity-exposure-event-v1' as const,
      requiredProviders:
        Object.freeze(['musicbrainz', 'youtube'] as const),
      sourcePublication: 'shadow' as const,
      claimScope: 'event-stream-only-no-numeric-score' as const,
    }),
  });

  const authorizationWithoutApproval =
    authorizeActivityExposureProductionActivation({
      readiness,
      approval: null,
    });

  if (
    authorizationWithoutApproval.status !== 'not-authorized'
    || authorizationWithoutApproval.reason
      !== 'activation-approval-absent'
    || authorizationWithoutApproval.activationAuthorized !== false
    || authorizationWithoutApproval.publicRouteActivated !== false
    || authorizationWithoutApproval.publication !== 'shadow'
  ) {
    throw new Error(
      'activity_exposure_activation_candidate_fail_closed_invalid',
    );
  }

  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
    status: 'ready-for-owner-attestation' as const,
    approval,
    authorizationWithoutApproval,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    directProductionContributionEligible: false as const,
    requiredNextGate:
      'explicit-production-activation-authorization' as const,
  });
}
