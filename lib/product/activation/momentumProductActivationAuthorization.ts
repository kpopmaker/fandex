import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
} from '../contracts/productMomentumEvidenceConsensus';
import {
  MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION,
  type MomentumProductActivationReadiness,
} from './momentumProductActivationReadiness';
import {
  MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION,
} from '../readiness/momentumPublicRouteDesignCandidate';

export const MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION =
  'momentum-product-activation-authorization-v1' as const;

export const MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_VERSION =
  'momentum-product-activation-approval-v1' as const;

export type MomentumProductActivationApproval = Readonly<{
  contractVersion: typeof MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_VERSION;
  action: 'authorize-momentum-product-activation';
  authority: 'product-operations-owner';
  activationAuthorizationId: string;
  authorizedAt: string;
  target: Readonly<{
    artistId: 'iu';
    legacyVariableId: 'growthMomentumPoint';
    constructId:
      typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID;
  }>;
  binding: Readonly<{
    readinessContractVersion:
      typeof MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION;
    routeDesignContractVersion:
      typeof MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION;
    productContractVersion:
      typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION;
    sourcePublication: 'shadow';
    claimScope:
      'structured-categorical-evidence-only-no-numeric-score';
    carrierRecordId: string;
    alignmentCutoffAt: string;
    directionalConsensus: string;
    persistenceConsensus: string;
    currentNoOpEvaluationAttested: true;
    evaluatedAlignmentCutoffAt: string;
    currentEvaluationAttestationPath:
      | 'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json'
      | null;
    currentEvaluationAttestationWorkflow?: Readonly<{
      kind: 'github-actions-read-only-current-evaluation';
      workflowRunId: number;
      workflowJobId: number;
      workflowHeadSha: string;
    }>;
    currentEvaluationAttestationDigest: string;
  }>;
}>;

export type MomentumProductActivationAuthorizationResult =
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION;
      status: 'authorized-for-publication-review';
      activationAuthorized: true;
      productPublicationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      productMomentumScore: null;
      numericProductEligible: false;
      legacyGrowthMomentumPointReuseAllowed: false;
      previewFallbackAllowed: false;
      directProductionContributionEligible: false;
      requiredNextGate: 'explicit-momentum-product-publication-authorization';
      approval: MomentumProductActivationApproval;
    }>
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION;
      status: 'not-authorized';
      reason:
        | 'activation-readiness-not-eligible'
        | 'activation-approval-absent';
      activationAuthorized: false;
      productPublicationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      productMomentumScore: null;
      numericProductEligible: false;
      legacyGrowthMomentumPointReuseAllowed: false;
      previewFallbackAllowed: false;
      directProductionContributionEligible: false;
    }>
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION;
      status: 'data-issue';
      reason:
        | 'activation-approval-contract-invalid'
        | 'activation-approval-binding-mismatch';
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

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function sha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function validPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function workflowAttestationValid(
  value: MomentumProductActivationApproval['binding']['currentEvaluationAttestationWorkflow'],
): boolean {
  return value !== undefined
    && value.kind === 'github-actions-read-only-current-evaluation'
    && validPositiveInteger(value.workflowRunId)
    && validPositiveInteger(value.workflowJobId)
    && /^[0-9a-f]{40}$/.test(value.workflowHeadSha);
}

function attestationBindingValid(
  binding: MomentumProductActivationApproval['binding'],
): boolean {
  const persisted =
    binding.currentEvaluationAttestationPath
      === 'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json'
    && binding.currentEvaluationAttestationWorkflow === undefined;
  const workflow =
    binding.currentEvaluationAttestationPath === null
    && workflowAttestationValid(
      binding.currentEvaluationAttestationWorkflow,
    );

  return persisted || workflow;
}

function workflowAttestationMatches(
  readiness: MomentumProductActivationReadiness,
  approval: MomentumProductActivationApproval,
): boolean {
  const expected = readiness.freshnessAttestation.attestationWorkflow;
  const actual =
    approval.binding.currentEvaluationAttestationWorkflow;

  if (expected === undefined || actual === undefined) {
    return expected === actual;
  }

  return expected.kind === actual.kind
    && expected.workflowRunId === actual.workflowRunId
    && expected.workflowJobId === actual.workflowJobId
    && expected.workflowHeadSha === actual.workflowHeadSha;
}

function notAuthorized(
  reason: Extract<
    MomentumProductActivationAuthorizationResult,
    { status: 'not-authorized' }
  >['reason'],
): MomentumProductActivationAuthorizationResult {
  return Object.freeze({
    contractVersion: MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION,
    status: 'not-authorized' as const,
    reason,
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

function dataIssue(
  reason: Extract<
    MomentumProductActivationAuthorizationResult,
    { status: 'data-issue' }
  >['reason'],
): MomentumProductActivationAuthorizationResult {
  return Object.freeze({
    contractVersion: MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION,
    status: 'data-issue' as const,
    reason,
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

function approvalContractValid(
  approval: MomentumProductActivationApproval,
): boolean {
  return (
    approval.contractVersion === MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_VERSION
    && approval.action === 'authorize-momentum-product-activation'
    && approval.authority === 'product-operations-owner'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.activationAuthorizationId,
    )
    && exactIso(approval.authorizedAt)
    && approval.target.artistId === 'iu'
    && approval.target.legacyVariableId === 'growthMomentumPoint'
    && approval.target.constructId
      === PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID
    && approval.binding.readinessContractVersion
      === MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION
    && approval.binding.routeDesignContractVersion
      === MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION
    && approval.binding.productContractVersion
      === PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION
    && approval.binding.sourcePublication === 'shadow'
    && approval.binding.claimScope
      === 'structured-categorical-evidence-only-no-numeric-score'
    && sha256(approval.binding.carrierRecordId)
    && exactIso(approval.binding.alignmentCutoffAt)
    && approval.binding.directionalConsensus.trim().length > 0
    && approval.binding.persistenceConsensus.trim().length > 0
    && approval.binding.currentNoOpEvaluationAttested === true
    && exactIso(approval.binding.evaluatedAlignmentCutoffAt)
    && attestationBindingValid(approval.binding)
    && sha256(approval.binding.currentEvaluationAttestationDigest)
  );
}

function approvalMatches(
  readiness: MomentumProductActivationReadiness,
  approval: MomentumProductActivationApproval,
): boolean {
  return (
    readiness.status === 'eligible-for-activation-review'
    && readiness.contractVersion === approval.binding.readinessContractVersion
    && readiness.target.artistId === approval.target.artistId
    && readiness.target.legacyVariableId
      === approval.target.legacyVariableId
    && readiness.target.constructId === approval.target.constructId
    && readiness.currentCarrierRecordId !== null
    && readiness.currentCarrierRecordId
      === approval.binding.carrierRecordId
    && readiness.alignmentCutoffAt !== null
    && readiness.alignmentCutoffAt
      === approval.binding.alignmentCutoffAt
    && readiness.directionalConsensus !== null
    && readiness.directionalConsensus
      === approval.binding.directionalConsensus
    && readiness.persistenceConsensus !== null
    && readiness.persistenceConsensus
      === approval.binding.persistenceConsensus
    && readiness.freshnessAttestation.currentNoOpEvaluationAttested === true
    && approval.binding.currentNoOpEvaluationAttested === true
    && readiness.freshnessAttestation.evaluatedAlignmentCutoffAt !== null
    && readiness.freshnessAttestation.evaluatedAlignmentCutoffAt
      === approval.binding.evaluatedAlignmentCutoffAt
    && readiness.freshnessAttestation.attestationPath
      === approval.binding.currentEvaluationAttestationPath
    && workflowAttestationMatches(readiness, approval)
    && readiness.freshnessAttestation.attestationDigest !== null
    && readiness.freshnessAttestation.attestationDigest
      === approval.binding.currentEvaluationAttestationDigest
    && readiness.freshnessAttestation.directionalConsensus
      === readiness.directionalConsensus
    && readiness.freshnessAttestation.persistenceConsensus
      === readiness.persistenceConsensus
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

export function authorizeMomentumProductActivation(
  input: Readonly<{
    readiness: MomentumProductActivationReadiness;
    approval: MomentumProductActivationApproval | null;
  }>,
): MomentumProductActivationAuthorizationResult {
  if (input.readiness.status !== 'eligible-for-activation-review') {
    return notAuthorized('activation-readiness-not-eligible');
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
    contractVersion: MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION,
    status: 'authorized-for-publication-review' as const,
    activationAuthorized: true as const,
    productPublicationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    productMomentumScore: null,
    numericProductEligible: false as const,
    legacyGrowthMomentumPointReuseAllowed: false as const,
    previewFallbackAllowed: false as const,
    directProductionContributionEligible: false as const,
    requiredNextGate:
      'explicit-momentum-product-publication-authorization' as const,
    approval: input.approval,
  });
}
