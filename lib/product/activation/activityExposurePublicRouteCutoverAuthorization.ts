import type {
  ActivityExposureProductionActivationAuthorizationResult,
} from './activityExposureProductionActivationAuthorization';

export const ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION =
  'activity-exposure-public-route-cutover-authorization-v1' as const;

export const ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION =
  'activity-exposure-public-route-cutover-approval-v1' as const;

export type ActivityExposurePublicRouteCutoverApproval = Readonly<{
  contractVersion:
    typeof ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION;
  action: 'authorize-public-route-cutover';
  authority: 'product-operations-owner';
  cutoverAuthorizationId: string;
  authorizedAt: string;
  target: Readonly<{
    artistId: 'iu';
    legacyVariableId: 'comebackActivityPoint';
    constructId: 'activityExposure';
  }>;
  binding: Readonly<{
    activationAuthorizationId: string;
    activationApprovalContractVersion:
      'activity-exposure-production-activation-approval-v1';
    activationAuthorizationContractVersion:
      'activity-exposure-production-activation-authorization-v1';
    productContractVersion: 'product-activity-exposure-v1';
    claimScope: 'event-stream-only-no-numeric-score';
  }>;
}>;

export type ActivityExposurePublicRouteCutoverAuthorizationResult =
  | Readonly<{
      contractVersion:
        typeof ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION;
      status: 'authorized-for-route-cutover';
      activationAuthorized: true;
      cutoverAuthorized: true;
      publicRouteActivated: false;
      publication: 'shadow';
      directProductionContributionEligible: false;
      requiredNextGate: 'explicit-public-route-cutover-execution';
      approval: ActivityExposurePublicRouteCutoverApproval;
    }>
  | Readonly<{
      contractVersion:
        typeof ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION;
      status: 'not-authorized';
      activationAuthorized: boolean;
      cutoverAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      directProductionContributionEligible: false;
      reason:
        | 'activation-authorization-not-ready'
        | 'cutover-approval-absent';
    }>
  | Readonly<{
      contractVersion:
        typeof ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION;
      status: 'data-issue';
      activationAuthorized: false;
      cutoverAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      directProductionContributionEligible: false;
      reason:
        | 'cutover-approval-contract-invalid'
        | 'cutover-approval-binding-mismatch';
    }>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function notAuthorized(
  activationAuthorized: boolean,
  reason:
    | 'activation-authorization-not-ready'
    | 'cutover-approval-absent',
): ActivityExposurePublicRouteCutoverAuthorizationResult {
  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
    status: 'not-authorized' as const,
    activationAuthorized,
    cutoverAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    directProductionContributionEligible: false as const,
    reason,
  });
}

function approvalValid(
  approval: ActivityExposurePublicRouteCutoverApproval,
): boolean {
  return (
    approval.contractVersion
      === ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION
    && approval.action === 'authorize-public-route-cutover'
    && approval.authority === 'product-operations-owner'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.cutoverAuthorizationId,
    )
    && exactIso(approval.authorizedAt)
    && approval.target.artistId === 'iu'
    && approval.target.legacyVariableId === 'comebackActivityPoint'
    && approval.target.constructId === 'activityExposure'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.binding.activationAuthorizationId,
    )
    && approval.binding.activationApprovalContractVersion
      === 'activity-exposure-production-activation-approval-v1'
    && approval.binding.activationAuthorizationContractVersion
      === 'activity-exposure-production-activation-authorization-v1'
    && approval.binding.productContractVersion
      === 'product-activity-exposure-v1'
    && approval.binding.claimScope
      === 'event-stream-only-no-numeric-score'
  );
}

export function authorizeActivityExposurePublicRouteCutover(
  input: Readonly<{
    activationAuthorization:
      ActivityExposureProductionActivationAuthorizationResult;
    approval: ActivityExposurePublicRouteCutoverApproval | null;
  }>,
): ActivityExposurePublicRouteCutoverAuthorizationResult {
  if (input.activationAuthorization.status !== 'authorized-for-cutover') {
    return notAuthorized(false, 'activation-authorization-not-ready');
  }

  if (input.approval === null) {
    return notAuthorized(true, 'cutover-approval-absent');
  }

  if (!approvalValid(input.approval)) {
    return Object.freeze({
      contractVersion:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
      status: 'data-issue' as const,
      activationAuthorized: false as const,
      cutoverAuthorized: false as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      directProductionContributionEligible: false as const,
      reason: 'cutover-approval-contract-invalid' as const,
    });
  }

  const activationApproval = input.activationAuthorization.approval;
  if (
    input.activationAuthorization.activationAuthorized !== true
    || input.activationAuthorization.publicRouteActivated !== false
    || input.activationAuthorization.publication !== 'shadow'
    || input.activationAuthorization.requiredNextGate
      !== 'explicit-public-route-cutover'
    || input.approval.target.artistId
      !== activationApproval.target.artistId
    || input.approval.target.legacyVariableId
      !== activationApproval.target.legacyVariableId
    || input.approval.target.constructId
      !== activationApproval.target.constructId
    || input.approval.binding.activationAuthorizationId
      !== activationApproval.activationAuthorizationId
    || input.approval.binding.activationApprovalContractVersion
      !== activationApproval.contractVersion
    || input.approval.binding.activationAuthorizationContractVersion
      !== input.activationAuthorization.contractVersion
    || input.approval.binding.productContractVersion
      !== activationApproval.binding.productContractVersion
    || input.approval.binding.claimScope
      !== activationApproval.binding.claimScope
    || Date.parse(input.approval.authorizedAt)
      < Date.parse(activationApproval.authorizedAt)
  ) {
    return Object.freeze({
      contractVersion:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
      status: 'data-issue' as const,
      activationAuthorized: false as const,
      cutoverAuthorized: false as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      directProductionContributionEligible: false as const,
      reason: 'cutover-approval-binding-mismatch' as const,
    });
  }

  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
    status: 'authorized-for-route-cutover' as const,
    activationAuthorized: true as const,
    cutoverAuthorized: true as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    directProductionContributionEligible: false as const,
    requiredNextGate:
      'explicit-public-route-cutover-execution' as const,
    approval: input.approval,
  });
}
