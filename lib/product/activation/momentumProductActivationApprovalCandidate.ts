import {
  MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_VERSION,
  authorizeMomentumProductActivation,
  type MomentumProductActivationApproval,
} from './momentumProductActivationAuthorization';
import {
  MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION,
  type MomentumProductActivationReadiness,
} from './momentumProductActivationReadiness';
import {
  MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION,
} from '../readiness/momentumPublicRouteDesignCandidate';
import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
} from '../contracts/productMomentumEvidenceConsensus';

export const MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_VERSION =
  'momentum-product-activation-approval-candidate-v1' as const;

type PendingMomentumProductActivationApproval = Readonly<
  Omit<
    MomentumProductActivationApproval,
    'activationAuthorizationId' | 'authorizedAt'
  > & {
    activationAuthorizationId: null;
    authorizedAt: null;
  }
>;

export type MomentumProductActivationApprovalCandidate =
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_VERSION;
      status: 'ready-for-owner-attestation';
      approval: PendingMomentumProductActivationApproval;
      authorizationWithoutApproval: ReturnType<
        typeof authorizeMomentumProductActivation
      >;
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
        typeof MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_VERSION;
      status: 'blocked';
      reason: 'activation-readiness-not-eligible';
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

function blocked(): MomentumProductActivationApprovalCandidate {
  return Object.freeze({
    contractVersion: MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_VERSION,
    status: 'blocked' as const,
    reason: 'activation-readiness-not-eligible' as const,
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

export function createMomentumProductActivationApprovalCandidate(
  readiness: MomentumProductActivationReadiness,
): MomentumProductActivationApprovalCandidate {
  const attestationWorkflow =
    readiness.freshnessAttestation.attestationWorkflow;
  const persistedAttestationBound =
    readiness.freshnessAttestation.attestationPath
      === 'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json'
    && attestationWorkflow === undefined;
  const workflowAttestationBound =
    readiness.freshnessAttestation.attestationPath === null
    && attestationWorkflow !== undefined
    && attestationWorkflow.kind
      === 'github-actions-read-only-current-evaluation'
    && Number.isSafeInteger(attestationWorkflow.workflowRunId)
    && attestationWorkflow.workflowRunId > 0
    && Number.isSafeInteger(attestationWorkflow.workflowJobId)
    && attestationWorkflow.workflowJobId > 0
    && /^[0-9a-f]{40}$/.test(attestationWorkflow.workflowHeadSha);

  if (
    readiness.status !== 'eligible-for-activation-review'
    || readiness.contractVersion
      !== MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION
    || readiness.target.artistId !== 'iu'
    || readiness.target.legacyVariableId !== 'growthMomentumPoint'
    || readiness.target.constructId !== 'momentumEvidenceConsensus'
    || readiness.currentCarrierRecordId === null
    || readiness.alignmentCutoffAt === null
    || readiness.directionalConsensus === null
    || readiness.persistenceConsensus === null
    || readiness.freshnessAttestation.currentNoOpEvaluationAttested !== true
    || readiness.freshnessAttestation.evaluatedAlignmentCutoffAt === null
    || (!persistedAttestationBound && !workflowAttestationBound)
    || readiness.freshnessAttestation.attestationDigest === null
    || readiness.freshnessAttestation.directionalConsensus
      !== readiness.directionalConsensus
    || readiness.freshnessAttestation.persistenceConsensus
      !== readiness.persistenceConsensus
    || readiness.productActivationAuthorized !== false
    || readiness.productPublicationAuthorized !== false
    || readiness.publicRouteActivated !== false
    || readiness.publication !== 'shadow'
    || readiness.productMomentumScore !== null
    || readiness.numericProductEligible !== false
    || readiness.legacyGrowthMomentumPointReuseAllowed !== false
    || readiness.previewFallbackAllowed !== false
    || readiness.directProductionContributionEligible !== false
    || readiness.requiredNextGate
      !== 'explicit-momentum-product-activation-authorization'
    || !Object.values(readiness.checks).every(Boolean)
  ) {
    return blocked();
  }

  const approval: PendingMomentumProductActivationApproval = Object.freeze({
    contractVersion: MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_VERSION,
    action: 'authorize-momentum-product-activation' as const,
    authority: 'product-operations-owner' as const,
    activationAuthorizationId: null,
    authorizedAt: null,
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'growthMomentumPoint' as const,
      constructId: 'momentumEvidenceConsensus' as const,
    }),
    binding: Object.freeze({
      readinessContractVersion:
        MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION,
      routeDesignContractVersion:
        MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION,
      productContractVersion:
        PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
      sourcePublication: 'shadow' as const,
      claimScope:
        'structured-categorical-evidence-only-no-numeric-score' as const,
      carrierRecordId: readiness.currentCarrierRecordId,
      alignmentCutoffAt: readiness.alignmentCutoffAt,
      directionalConsensus: readiness.directionalConsensus,
      persistenceConsensus: readiness.persistenceConsensus,
      currentNoOpEvaluationAttested: true as const,
      evaluatedAlignmentCutoffAt:
        readiness.freshnessAttestation.evaluatedAlignmentCutoffAt,
      currentEvaluationAttestationPath:
        readiness.freshnessAttestation.attestationPath,
      currentEvaluationAttestationWorkflow:
        readiness.freshnessAttestation.attestationWorkflow,
      currentEvaluationAttestationDigest:
        readiness.freshnessAttestation.attestationDigest,
    }),
  });

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
  ) {
    throw new Error(
      'momentum_activation_approval_candidate_fail_closed_invalid',
    );
  }

  return Object.freeze({
    contractVersion: MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_VERSION,
    status: 'ready-for-owner-attestation' as const,
    approval,
    authorizationWithoutApproval,
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
