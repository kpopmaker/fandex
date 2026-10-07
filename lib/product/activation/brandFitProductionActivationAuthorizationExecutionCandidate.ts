import {
  authorizeBrandFitProductionActivation,
} from './brandFitProductionActivationAuthorization';
import {
  createBrandFitProductionActivationApprovalCandidate,
  type BrandFitProductionActivationApprovalCandidateResult,
} from './brandFitProductionActivationApprovalCandidate';
import {
  BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION,
  type BrandFitProductionReadiness,
} from './brandFitProductionReadiness';

export const BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION =
  'brand-fit-production-activation-authorization-execution-candidate-v1' as const;

type ReadyApprovalCandidate = Extract<
  BrandFitProductionActivationApprovalCandidateResult,
  { status: 'ready-for-owner-attestation' }
>;

export type BrandFitProductionActivationAuthorizationExecutionCandidate =
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION;
      status: 'ready-for-explicit-authorization';
      checks: Readonly<{
        'activation-readiness-current': true;
        'owner-attestation-candidate-current': true;
        'approval-fields-unmaterialized': true;
        'authorization-fails-closed-without-approval': true;
        'restricted-rights-publication-remains-locked': true;
        'risk-consumption-remains-locked': true;
      }>;
      approvalInputTemplate: ReadyApprovalCandidate['approval'];
      authorizationWithoutApproval: ReturnType<
        typeof authorizeBrandFitProductionActivation
      >;
      executionBoundary: Readonly<{
        ownerApprovalRecorded: false;
        approvalMaterialized: false;
        authorizationExecuted: false;
        lifecycleCutoverExecuted: false;
        renderRedeployExecuted: false;
      }>;
      activationAuthorized: false;
      lifecycleState: 'research';
      targetLifecycleState: 'production';
      publicationAuthorized: false;
      publicRouteCutoverAuthorized: false;
      directProductionContributionEligible: false;
      riskConsumptionAuthorized: false;
      numericEligible: false;
      requiredNextGate:
        'explicit-brand-fit-production-activation-authorization';
    }>
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION;
      status: 'blocked';
      reason:
        | 'activation-readiness-not-ready'
        | 'owner-attestation-candidate-not-ready'
        | 'approval-template-materialized'
        | 'approval-binding-mismatch'
        | 'authorization-not-fail-closed';
      executionBoundary: Readonly<{
        ownerApprovalRecorded: false;
        approvalMaterialized: false;
        authorizationExecuted: false;
        lifecycleCutoverExecuted: false;
        renderRedeployExecuted: false;
      }>;
      activationAuthorized: false;
      lifecycleState: 'research';
      publicationAuthorized: false;
      publicRouteCutoverAuthorized: false;
      directProductionContributionEligible: false;
      riskConsumptionAuthorized: false;
      numericEligible: false;
    }>;

function boundary() {
  return Object.freeze({
    ownerApprovalRecorded: false as const,
    approvalMaterialized: false as const,
    authorizationExecuted: false as const,
    lifecycleCutoverExecuted: false as const,
    renderRedeployExecuted: false as const,
  });
}

function blocked(
  reason: Extract<
    BrandFitProductionActivationAuthorizationExecutionCandidate,
    { status: 'blocked' }
  >['reason'],
): BrandFitProductionActivationAuthorizationExecutionCandidate {
  return Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION,
    status: 'blocked' as const,
    reason,
    executionBoundary: boundary(),
    activationAuthorized: false as const,
    lifecycleState: 'research' as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    directProductionContributionEligible: false as const,
    riskConsumptionAuthorized: false as const,
    numericEligible: false as const,
  });
}

function approvalBindingMatchesReadiness(
  readiness: BrandFitProductionReadiness,
  candidate: ReadyApprovalCandidate,
): boolean {
  const approval = candidate.approval;

  return (
    readiness.contractVersion
      === BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION
    && readiness.status === 'ready-for-activation-authorization'
    && Object.values(readiness.checks).every(Boolean)
    && readiness.target.artistId === approval.target.artistId
    && readiness.target.variableId === approval.target.variableId
    && readiness.target.constructId === approval.target.constructId
    && approval.binding.readinessContractVersion
      === readiness.contractVersion
    && approval.binding.sourceLifecycle === 'research'
    && approval.binding.targetLifecycle === 'production'
    && approval.binding.restrictedRightsPublicationAllowed === false
    && approval.binding.claimScope
      === 'verified-commercial-partnership-event-only-no-numeric-score'
    && readiness.activationAuthorized === false
    && readiness.publicationAuthorized === false
    && readiness.publicRouteCutoverAuthorized === false
    && readiness.riskConsumptionAuthorized === false
    && readiness.numericEligible === false
  );
}

export function createBrandFitProductionActivationAuthorizationExecutionCandidate(
  readiness: BrandFitProductionReadiness,
  approvalCandidate: BrandFitProductionActivationApprovalCandidateResult =
    createBrandFitProductionActivationApprovalCandidate(readiness),
): BrandFitProductionActivationAuthorizationExecutionCandidate {
  if (
    readiness.status !== 'ready-for-activation-authorization'
    || readiness.contractVersion
      !== BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION
    || !Object.values(readiness.checks).every(Boolean)
  ) {
    return blocked('activation-readiness-not-ready');
  }

  if (approvalCandidate.status !== 'ready-for-owner-attestation') {
    return blocked('owner-attestation-candidate-not-ready');
  }

  if (
    approvalCandidate.approval.activationAuthorizationId !== null
    || approvalCandidate.approval.authorizedAt !== null
  ) {
    return blocked('approval-template-materialized');
  }

  if (!approvalBindingMatchesReadiness(readiness, approvalCandidate)) {
    return blocked('approval-binding-mismatch');
  }

  const authorizationWithoutApproval =
    authorizeBrandFitProductionActivation({
      readiness,
      approval: null,
    });

  if (
    authorizationWithoutApproval.status !== 'not-authorized'
    || authorizationWithoutApproval.reason
      !== 'activation-approval-absent'
    || authorizationWithoutApproval.activationAuthorized !== false
    || authorizationWithoutApproval.lifecycleState !== 'research'
    || authorizationWithoutApproval.publicationAuthorized !== false
    || authorizationWithoutApproval.publicRouteCutoverAuthorized !== false
    || authorizationWithoutApproval.directProductionContributionEligible
      !== false
    || authorizationWithoutApproval.riskConsumptionAuthorized !== false
    || authorizationWithoutApproval.numericEligible !== false
  ) {
    return blocked('authorization-not-fail-closed');
  }

  return Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION,
    status: 'ready-for-explicit-authorization' as const,
    checks: Object.freeze({
      'activation-readiness-current': true as const,
      'owner-attestation-candidate-current': true as const,
      'approval-fields-unmaterialized': true as const,
      'authorization-fails-closed-without-approval': true as const,
      'restricted-rights-publication-remains-locked': true as const,
      'risk-consumption-remains-locked': true as const,
    }),
    approvalInputTemplate: approvalCandidate.approval,
    authorizationWithoutApproval,
    executionBoundary: boundary(),
    activationAuthorized: false as const,
    lifecycleState: 'research' as const,
    targetLifecycleState: 'production' as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    directProductionContributionEligible: false as const,
    riskConsumptionAuthorized: false as const,
    numericEligible: false as const,
    requiredNextGate:
      'explicit-brand-fit-production-activation-authorization' as const,
  });
}
