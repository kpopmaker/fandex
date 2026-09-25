import type {
  ActivityExposureProductionReadiness,
} from './activityExposureProductionReadiness';

export const ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION =
  'activity-exposure-production-activation-authorization-v1' as const;

export const ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION =
  'activity-exposure-production-activation-approval-v1' as const;

export type ActivityExposureProductionActivationApproval = Readonly<{
  contractVersion:
    typeof ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION;
  action: 'authorize-production-activation';
  authority: 'product-operations-owner';
  activationAuthorizationId: string;
  authorizedAt: string;
  target: Readonly<{
    artistId: 'iu';
    legacyVariableId: 'comebackActivityPoint';
    constructId: 'activityExposure';
  }>;
  binding: Readonly<{
    readinessContractVersion:
      'activity-exposure-production-readiness-v1';
    productContractVersion:
      'product-activity-exposure-v1';
    persistenceContractVersion:
      'activity-exposure-event-v1';
    requiredProviders: readonly ['musicbrainz', 'youtube'];
    sourcePublication: 'shadow';
    claimScope: 'event-stream-only-no-numeric-score';
  }>;
}>;

export type ActivityExposureProductionActivationAuthorizationResult =
  | Readonly<{
      contractVersion:
        typeof ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'authorized-for-cutover';
      activationAuthorized: true;
      publicRouteActivated: false;
      publication: 'shadow';
      directProductionContributionEligible: false;
      lifecycleState: 'shadow';
      requiredNextGate: 'explicit-public-route-cutover';
      approval: ActivityExposureProductionActivationApproval;
    }>
  | Readonly<{
      contractVersion:
        typeof ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'not-authorized';
      activationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      directProductionContributionEligible: false;
      lifecycleState: 'shadow';
      reason:
        | 'activation-readiness-not-ready'
        | 'activation-approval-absent';
    }>
  | Readonly<{
      contractVersion:
        typeof ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'data-issue';
      activationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      directProductionContributionEligible: false;
      lifecycleState: 'blocked';
      reason:
        | 'activation-approval-contract-invalid'
        | 'activation-approval-binding-mismatch';
    }>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function notAuthorized(
  reason:
    | 'activation-readiness-not-ready'
    | 'activation-approval-absent',
): ActivityExposureProductionActivationAuthorizationResult {
  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'not-authorized' as const,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    directProductionContributionEligible: false as const,
    lifecycleState: 'shadow' as const,
    reason,
  });
}

function dataIssue(
  reason:
    | 'activation-approval-contract-invalid'
    | 'activation-approval-binding-mismatch',
): ActivityExposureProductionActivationAuthorizationResult {
  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'data-issue' as const,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    directProductionContributionEligible: false as const,
    lifecycleState: 'blocked' as const,
    reason,
  });
}

function approvalContractValid(
  approval: ActivityExposureProductionActivationApproval,
): boolean {
  return (
    approval.contractVersion
      === ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION
    && approval.action === 'authorize-production-activation'
    && approval.authority === 'product-operations-owner'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.activationAuthorizationId,
    )
    && exactIso(approval.authorizedAt)
    && approval.target.artistId === 'iu'
    && approval.target.legacyVariableId === 'comebackActivityPoint'
    && approval.target.constructId === 'activityExposure'
    && approval.binding.readinessContractVersion
      === 'activity-exposure-production-readiness-v1'
    && approval.binding.productContractVersion
      === 'product-activity-exposure-v1'
    && approval.binding.persistenceContractVersion
      === 'activity-exposure-event-v1'
    && approval.binding.requiredProviders.length === 2
    && approval.binding.requiredProviders[0] === 'musicbrainz'
    && approval.binding.requiredProviders[1] === 'youtube'
    && approval.binding.sourcePublication === 'shadow'
    && approval.binding.claimScope
      === 'event-stream-only-no-numeric-score'
  );
}

function approvalMatches(
  readiness: ActivityExposureProductionReadiness,
  approval: ActivityExposureProductionActivationApproval,
): boolean {
  return (
    readiness.status === 'ready-for-activation-authorization'
    && readiness.target.artistId === approval.target.artistId
    && readiness.target.legacyVariableId
      === approval.target.legacyVariableId
    && readiness.target.constructId === approval.target.constructId
    && readiness.contractVersion
      === approval.binding.readinessContractVersion
    && readiness.checks['observed-data-origin'] === true
    && readiness.checks['shadow-publication'] === true
    && readiness.checks['standard-presentation'] === true
    && readiness.checks['provider-coverage'] === true
    && readiness.checks['provider-availability'] === true
    && readiness.checks['stored-evidence-trace'] === true
    && readiness.checks['non-numeric-contract'] === true
  );
}

export function authorizeActivityExposureProductionActivation(
  input: Readonly<{
    readiness: ActivityExposureProductionReadiness;
    approval: ActivityExposureProductionActivationApproval | null;
  }>,
): ActivityExposureProductionActivationAuthorizationResult {
  if (input.readiness.status !== 'ready-for-activation-authorization') {
    return notAuthorized('activation-readiness-not-ready');
  }

  if (input.approval === null) {
    return notAuthorized('activation-approval-absent');
  }

  if (!approvalContractValid(input.approval)) {
    return dataIssue('activation-approval-contract-invalid');
  }

  if (!approvalMatches(input.readiness, input.approval)) {
    return dataIssue('activation-approval-binding-mismatch');
  }

  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'authorized-for-cutover' as const,
    activationAuthorized: true as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    directProductionContributionEligible: false as const,
    lifecycleState: 'shadow' as const,
    requiredNextGate: 'explicit-public-route-cutover' as const,
    approval: input.approval,
  });
}
