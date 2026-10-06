import {
  authorizeMomentumProductActivation,
} from './momentumProductActivationAuthorization';
import {
  createMomentumProductActivationApprovalCandidate,
  type MomentumProductActivationApprovalCandidate,
} from './momentumProductActivationApprovalCandidate';
import {
  MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION,
  type MomentumProductActivationReadiness,
} from './momentumProductActivationReadiness';

export const MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION =
  'momentum-product-activation-authorization-execution-candidate-v1' as const;

type ReadyApprovalCandidate = Extract<
  MomentumProductActivationApprovalCandidate,
  { status: 'ready-for-owner-attestation' }
>;

export type MomentumProductActivationAuthorizationExecutionCandidate =
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION;
      status: 'ready-for-explicit-authorization';
      checks: Readonly<{
        'activation-readiness-current': true;
        'owner-attestation-candidate-current': true;
        'freshness-binding-current': true;
        'approval-fields-unmaterialized': true;
        'authorization-fails-closed-without-approval': true;
      }>;
      approvalInputTemplate: ReadyApprovalCandidate['approval'];
      authorizationWithoutApproval: ReturnType<
        typeof authorizeMomentumProductActivation
      >;
      executionBoundary: Readonly<{
        ownerApprovalRecorded: false;
        approvalMaterialized: false;
        authorizationExecuted: false;
      }>;
      activationAuthorized: false;
      productPublicationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      productMomentumScore: null;
      numericProductEligible: false;
      legacyGrowthMomentumPointReuseAllowed: false;
      previewFallbackAllowed: false;
      directProductionContributionEligible: false;
      requiredNextGate:
        'explicit-momentum-product-activation-authorization';
    }>
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION;
      status: 'blocked';
      reason:
        | 'activation-readiness-not-eligible'
        | 'owner-attestation-candidate-not-ready'
        | 'approval-binding-mismatch'
        | 'authorization-not-fail-closed';
      executionBoundary: Readonly<{
        ownerApprovalRecorded: false;
        approvalMaterialized: false;
        authorizationExecuted: false;
      }>;
      activationAuthorized: false;
      productPublicationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      productMomentumScore: null;
      numericProductEligible: false;
      legacyGrowthMomentumPointReuseAllowed: false;
      previewFallbackAllowed: false;
      directProductionContributionEligible: false;
    }>;

function boundary() {
  return Object.freeze({
    ownerApprovalRecorded: false as const,
    approvalMaterialized: false as const,
    authorizationExecuted: false as const,
  });
}

function blocked(
  reason: Extract<
    MomentumProductActivationAuthorizationExecutionCandidate,
    { status: 'blocked' }
  >['reason'],
): MomentumProductActivationAuthorizationExecutionCandidate {
  return Object.freeze({
    contractVersion:
      MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION,
    status: 'blocked' as const,
    reason,
    executionBoundary: boundary(),
    activationAuthorized: false as const,
    productPublicationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    productMomentumScore: null,
    numericProductEligible: false as const,
    legacyGrowthMomentumPointReuseAllowed: false as const,
    previewFallbackAllowed: false as const,
    directProductionContributionEligible: false as const,
  });
}

function approvalBindingMatchesReadiness(
  readiness: MomentumProductActivationReadiness,
  candidate: ReadyApprovalCandidate,
): boolean {
  const approval = candidate.approval;
  const expectedWorkflow =
    readiness.freshnessAttestation.attestationWorkflow;
  const actualWorkflow =
    approval.binding.currentEvaluationAttestationWorkflow;
  const workflowMatches =
    expectedWorkflow === undefined || actualWorkflow === undefined
      ? expectedWorkflow === actualWorkflow
      : expectedWorkflow.kind === actualWorkflow.kind
        && expectedWorkflow.workflowRunId === actualWorkflow.workflowRunId
        && expectedWorkflow.workflowJobId === actualWorkflow.workflowJobId
        && expectedWorkflow.workflowHeadSha === actualWorkflow.workflowHeadSha;

  return (
    readiness.contractVersion
      === MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION
    && readiness.status === 'eligible-for-activation-review'
    && approval.activationAuthorizationId === null
    && approval.authorizedAt === null
    && approval.target.artistId === readiness.target.artistId
    && approval.target.legacyVariableId
      === readiness.target.legacyVariableId
    && approval.target.constructId === readiness.target.constructId
    && readiness.currentCarrierRecordId !== null
    && approval.binding.carrierRecordId
      === readiness.currentCarrierRecordId
    && readiness.alignmentCutoffAt !== null
    && approval.binding.alignmentCutoffAt
      === readiness.alignmentCutoffAt
    && readiness.directionalConsensus !== null
    && approval.binding.directionalConsensus
      === readiness.directionalConsensus
    && readiness.persistenceConsensus !== null
    && approval.binding.persistenceConsensus
      === readiness.persistenceConsensus
    && readiness.freshnessAttestation.currentNoOpEvaluationAttested === true
    && approval.binding.currentNoOpEvaluationAttested === true
    && readiness.freshnessAttestation.evaluatedAlignmentCutoffAt !== null
    && approval.binding.evaluatedAlignmentCutoffAt
      === readiness.freshnessAttestation.evaluatedAlignmentCutoffAt
    && approval.binding.currentEvaluationAttestationPath
      === readiness.freshnessAttestation.attestationPath
    && workflowMatches
    && readiness.freshnessAttestation.attestationDigest !== null
    && approval.binding.currentEvaluationAttestationDigest
      === readiness.freshnessAttestation.attestationDigest
    && readiness.productActivationAuthorized === false
    && readiness.productPublicationAuthorized === false
    && readiness.publicRouteActivated === false
    && readiness.publication === 'shadow'
    && readiness.productMomentumScore === null
    && readiness.numericProductEligible === false
    && readiness.legacyGrowthMomentumPointReuseAllowed === false
    && readiness.previewFallbackAllowed === false
    && readiness.directProductionContributionEligible === false
    && readiness.requiredNextGate
      === 'explicit-momentum-product-activation-authorization'
    && Object.values(readiness.checks).every(Boolean)
  );
}

export function createMomentumProductActivationAuthorizationExecutionCandidate(
  readiness: MomentumProductActivationReadiness,
  approvalCandidate: MomentumProductActivationApprovalCandidate =
    createMomentumProductActivationApprovalCandidate(readiness),
): MomentumProductActivationAuthorizationExecutionCandidate {
  if (
    readiness.status !== 'eligible-for-activation-review'
    || readiness.contractVersion
      !== MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION
    || readiness.requiredNextGate
      !== 'explicit-momentum-product-activation-authorization'
    || !Object.values(readiness.checks).every(Boolean)
  ) {
    return blocked('activation-readiness-not-eligible');
  }

  if (approvalCandidate.status !== 'ready-for-owner-attestation') {
    return blocked('owner-attestation-candidate-not-ready');
  }

  if (!approvalBindingMatchesReadiness(readiness, approvalCandidate)) {
    return blocked('approval-binding-mismatch');
  }

  const authorizationWithoutApproval = authorizeMomentumProductActivation({
    readiness,
    approval: null,
  });

  if (
    authorizationWithoutApproval.status !== 'not-authorized'
    || authorizationWithoutApproval.reason !== 'activation-approval-absent'
    || authorizationWithoutApproval.activationAuthorized !== false
    || authorizationWithoutApproval.productPublicationAuthorized !== false
    || authorizationWithoutApproval.publicRouteActivated !== false
    || authorizationWithoutApproval.publication !== 'shadow'
    || authorizationWithoutApproval.productMomentumScore !== null
    || authorizationWithoutApproval.numericProductEligible !== false
    || authorizationWithoutApproval.legacyGrowthMomentumPointReuseAllowed
      !== false
    || authorizationWithoutApproval.previewFallbackAllowed !== false
    || authorizationWithoutApproval.directProductionContributionEligible
      !== false
  ) {
    return blocked('authorization-not-fail-closed');
  }

  return Object.freeze({
    contractVersion:
      MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_EXECUTION_CANDIDATE_VERSION,
    status: 'ready-for-explicit-authorization' as const,
    checks: Object.freeze({
      'activation-readiness-current': true as const,
      'owner-attestation-candidate-current': true as const,
      'freshness-binding-current': true as const,
      'approval-fields-unmaterialized': true as const,
      'authorization-fails-closed-without-approval': true as const,
    }),
    approvalInputTemplate: approvalCandidate.approval,
    authorizationWithoutApproval,
    executionBoundary: boundary(),
    activationAuthorized: false as const,
    productPublicationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    productMomentumScore: null,
    numericProductEligible: false as const,
    legacyGrowthMomentumPointReuseAllowed: false as const,
    previewFallbackAllowed: false as const,
    directProductionContributionEligible: false as const,
    requiredNextGate:
      'explicit-momentum-product-activation-authorization' as const,
  });
}
