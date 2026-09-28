import {
  MOMENTUM_PRODUCT_ACTIVATION_APPROVAL,
} from './momentumProductActivationApproval';
import {
  type MomentumProductActivationAuthorizationResult,
} from './momentumProductActivationAuthorization';
import {
  MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_VERSION,
  authorizeMomentumProductPublication,
  type MomentumProductPublicationApproval,
} from './momentumProductPublicationAuthorization';

export const MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_CANDIDATE_VERSION =
  'momentum-product-publication-approval-candidate-v1' as const;

type PendingPublicationApproval = Readonly<
  Omit<
    MomentumProductPublicationApproval,
    'publicationAuthorizationId' | 'authorizedAt'
  > & {
    publicationAuthorizationId: null;
    authorizedAt: null;
  }
>;

export type MomentumProductPublicationApprovalCandidate =
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_CANDIDATE_VERSION;
      status: 'ready-for-owner-attestation';
      approval: PendingPublicationApproval;
      authorizationWithoutApproval: ReturnType<
        typeof authorizeMomentumProductPublication
      >;
      productionBinding: Readonly<{
        authorizedMain:
          'a3d5db92206f027be6a015baddb0ac0ce2044348';
        deploymentId:
          'dpl_BX5qkSxZfAztKJpSn3e852i8A4U2';
        deploymentState: 'READY';
        deploymentTarget: 'production';
        deploymentCommitSha:
          'a3d5db92206f027be6a015baddb0ac0ce2044348';
      }>;
      activationAuthorized: true;
      productPublicationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      productMomentumScore: null;
      numericProductEligible: false;
      legacyGrowthMomentumPointReuseAllowed: false;
      previewFallbackAllowed: false;
      directProductionContributionEligible: false;
      requiredNextGate:
        'explicit-momentum-product-publication-authorization';
    }>
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_CANDIDATE_VERSION;
      status: 'blocked';
      reason: 'activation-authorization-not-ready';
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

export function createMomentumProductPublicationApprovalCandidate(
  activationAuthorization: MomentumProductActivationAuthorizationResult,
): MomentumProductPublicationApprovalCandidate {
  if (
    activationAuthorization.status !== 'authorized-for-publication-review'
    || activationAuthorization.activationAuthorized !== true
    || activationAuthorization.productPublicationAuthorized !== false
    || activationAuthorization.publicRouteActivated !== false
    || activationAuthorization.publication !== 'shadow'
    || activationAuthorization.productMomentumScore !== null
    || activationAuthorization.numericProductEligible !== false
    || activationAuthorization.legacyGrowthMomentumPointReuseAllowed !== false
    || activationAuthorization.previewFallbackAllowed !== false
    || activationAuthorization.directProductionContributionEligible !== false
    || activationAuthorization.requiredNextGate
      !== 'explicit-momentum-product-publication-authorization'
  ) {
    return Object.freeze({
      contractVersion:
        MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_CANDIDATE_VERSION,
      status: 'blocked' as const,
      reason: 'activation-authorization-not-ready' as const,
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

  const approval: PendingPublicationApproval = Object.freeze({
    contractVersion:
      MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_VERSION,
    action: 'authorize-momentum-product-publication' as const,
    authority: 'product-operations-owner' as const,
    publicationAuthorizationId: null,
    authorizedAt: null,
    target: MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.target,
    binding: Object.freeze({
      activationAuthorizationId:
        MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId,
      activationApprovalContractVersion:
        MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.contractVersion,
      activationAuthorizationContractVersion:
        activationAuthorization.contractVersion,
      productContractVersion:
        MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding.productContractVersion,
      claimScope:
        MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding.claimScope,
      activationAuthorizedMain:
        'a3d5db92206f027be6a015baddb0ac0ce2044348' as const,
      activationProductionDeploymentId:
        'dpl_BX5qkSxZfAztKJpSn3e852i8A4U2' as const,
      activationProductionCommitSha:
        'a3d5db92206f027be6a015baddb0ac0ce2044348' as const,
      currentEvaluationAttestationDigest:
        MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding
          .currentEvaluationAttestationDigest,
    }),
  });

  const authorizationWithoutApproval =
    authorizeMomentumProductPublication({
      activationAuthorization,
      approval: null,
    });

  if (
    authorizationWithoutApproval.status !== 'not-authorized'
    || authorizationWithoutApproval.reason
      !== 'publication-approval-absent'
    || authorizationWithoutApproval.activationAuthorized !== true
    || authorizationWithoutApproval.productPublicationAuthorized !== false
    || authorizationWithoutApproval.publicRouteActivated !== false
    || authorizationWithoutApproval.publication !== 'shadow'
  ) {
    throw new Error(
      'momentum_publication_approval_candidate_fail_closed_invalid',
    );
  }

  return Object.freeze({
    contractVersion:
      MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_CANDIDATE_VERSION,
    status: 'ready-for-owner-attestation' as const,
    approval,
    authorizationWithoutApproval,
    productionBinding: Object.freeze({
      authorizedMain:
        'a3d5db92206f027be6a015baddb0ac0ce2044348' as const,
      deploymentId:
        'dpl_BX5qkSxZfAztKJpSn3e852i8A4U2' as const,
      deploymentState: 'READY' as const,
      deploymentTarget: 'production' as const,
      deploymentCommitSha:
        'a3d5db92206f027be6a015baddb0ac0ce2044348' as const,
    }),
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
  });
}
