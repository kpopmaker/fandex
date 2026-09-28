import {
  MOMENTUM_PRODUCT_ACTIVATION_APPROVAL,
} from './momentumProductActivationApproval';
import {
  MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION,
  type MomentumProductActivationAuthorizationResult,
} from './momentumProductActivationAuthorization';

export const MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION =
  'momentum-product-publication-authorization-v1' as const;

export const MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_VERSION =
  'momentum-product-publication-approval-v1' as const;

export type MomentumProductPublicationApproval = Readonly<{
  contractVersion: typeof MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_VERSION;
  action: 'authorize-momentum-product-publication';
  authority: 'product-operations-owner';
  publicationAuthorizationId: string;
  authorizedAt: string;
  target: Readonly<{
    artistId: 'iu';
    legacyVariableId: 'growthMomentumPoint';
    constructId: 'momentumEvidenceConsensus';
  }>;
  binding: Readonly<{
    activationAuthorizationId: string;
    activationApprovalContractVersion:
      'momentum-product-activation-approval-v1';
    activationAuthorizationContractVersion:
      typeof MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION;
    productContractVersion:
      'product-momentum-evidence-consensus-v1';
    claimScope:
      'structured-categorical-evidence-only-no-numeric-score';
    activationAuthorizedMain:
      'a3d5db92206f027be6a015baddb0ac0ce2044348';
    activationProductionDeploymentId:
      'dpl_BX5qkSxZfAztKJpSn3e852i8A4U2';
    activationProductionCommitSha:
      'a3d5db92206f027be6a015baddb0ac0ce2044348';
    currentEvaluationAttestationDigest: string;
  }>;
}>;

export type MomentumProductPublicationAuthorizationResult =
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION;
      status: 'authorized-for-public-route-review';
      activationAuthorized: true;
      productPublicationAuthorized: true;
      publicRouteActivated: false;
      publication: 'shadow';
      productMomentumScore: null;
      numericProductEligible: false;
      legacyGrowthMomentumPointReuseAllowed: false;
      previewFallbackAllowed: false;
      directProductionContributionEligible: false;
      requiredNextGate: 'explicit-momentum-public-route-cutover';
      approval: MomentumProductPublicationApproval;
    }>
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION;
      status: 'not-authorized';
      reason:
        | 'activation-authorization-not-ready'
        | 'publication-approval-absent';
      activationAuthorized: boolean;
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
        typeof MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION;
      status: 'data-issue';
      reason:
        | 'publication-approval-contract-invalid'
        | 'publication-approval-binding-mismatch';
      activationAuthorized: true;
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

function activationReady(
  value: MomentumProductActivationAuthorizationResult,
): value is Extract<
  MomentumProductActivationAuthorizationResult,
  { status: 'authorized-for-publication-review' }
> {
  return (
    value.status === 'authorized-for-publication-review'
    && value.activationAuthorized === true
    && value.productPublicationAuthorized === false
    && value.publicRouteActivated === false
    && value.publication === 'shadow'
    && value.productMomentumScore === null
    && value.numericProductEligible === false
    && value.legacyGrowthMomentumPointReuseAllowed === false
    && value.previewFallbackAllowed === false
    && value.directProductionContributionEligible === false
    && value.requiredNextGate
      === 'explicit-momentum-product-publication-authorization'
  );
}

function validApproval(
  approval: MomentumProductPublicationApproval,
): boolean {
  return (
    approval.contractVersion
      === MOMENTUM_PRODUCT_PUBLICATION_APPROVAL_VERSION
    && approval.action === 'authorize-momentum-product-publication'
    && approval.authority === 'product-operations-owner'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.publicationAuthorizationId,
    )
    && exactIso(approval.authorizedAt)
    && approval.target.artistId === 'iu'
    && approval.target.legacyVariableId === 'growthMomentumPoint'
    && approval.target.constructId === 'momentumEvidenceConsensus'
    && approval.binding.activationAuthorizationId
      === MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId
    && approval.binding.activationApprovalContractVersion
      === MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.contractVersion
    && approval.binding.activationAuthorizationContractVersion
      === MOMENTUM_PRODUCT_ACTIVATION_AUTHORIZATION_VERSION
    && approval.binding.productContractVersion
      === 'product-momentum-evidence-consensus-v1'
    && approval.binding.claimScope
      === 'structured-categorical-evidence-only-no-numeric-score'
    && approval.binding.activationAuthorizedMain
      === 'a3d5db92206f027be6a015baddb0ac0ce2044348'
    && approval.binding.activationProductionDeploymentId
      === 'dpl_BX5qkSxZfAztKJpSn3e852i8A4U2'
    && approval.binding.activationProductionCommitSha
      === 'a3d5db92206f027be6a015baddb0ac0ce2044348'
    && sha256(approval.binding.currentEvaluationAttestationDigest)
  );
}

export function authorizeMomentumProductPublication(
  input: Readonly<{
    activationAuthorization: MomentumProductActivationAuthorizationResult;
    approval: MomentumProductPublicationApproval | null;
  }>,
): MomentumProductPublicationAuthorizationResult {
  if (!activationReady(input.activationAuthorization)) {
    return Object.freeze({
      contractVersion:
        MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION,
      status: 'not-authorized' as const,
      reason: 'activation-authorization-not-ready' as const,
      activationAuthorized: false,
      productPublicationAuthorized: false,
      publicRouteActivated: false,
      publication: 'shadow' as const,
      productMomentumScore: null,
      numericProductEligible: false,
      legacyGrowthMomentumPointReuseAllowed: false,
      previewFallbackAllowed: false,
      directProductionContributionEligible: false,
    });
  }

  if (input.approval === null) {
    return Object.freeze({
      contractVersion:
        MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION,
      status: 'not-authorized' as const,
      reason: 'publication-approval-absent' as const,
      activationAuthorized: true,
      productPublicationAuthorized: false,
      publicRouteActivated: false,
      publication: 'shadow' as const,
      productMomentumScore: null,
      numericProductEligible: false,
      legacyGrowthMomentumPointReuseAllowed: false,
      previewFallbackAllowed: false,
      directProductionContributionEligible: false,
    });
  }

  if (!validApproval(input.approval)) {
    return Object.freeze({
      contractVersion:
        MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION,
      status: 'data-issue' as const,
      reason: 'publication-approval-contract-invalid' as const,
      activationAuthorized: true,
      productPublicationAuthorized: false,
      publicRouteActivated: false,
      publication: 'shadow' as const,
      productMomentumScore: null,
      numericProductEligible: false,
      legacyGrowthMomentumPointReuseAllowed: false,
      previewFallbackAllowed: false,
      directProductionContributionEligible: false,
    });
  }

  if (
    input.approval.binding.currentEvaluationAttestationDigest
      !== MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding
        .currentEvaluationAttestationDigest
  ) {
    return Object.freeze({
      contractVersion:
        MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION,
      status: 'data-issue' as const,
      reason: 'publication-approval-binding-mismatch' as const,
      activationAuthorized: true,
      productPublicationAuthorized: false,
      publicRouteActivated: false,
      publication: 'shadow' as const,
      productMomentumScore: null,
      numericProductEligible: false,
      legacyGrowthMomentumPointReuseAllowed: false,
      previewFallbackAllowed: false,
      directProductionContributionEligible: false,
    });
  }

  return Object.freeze({
    contractVersion:
      MOMENTUM_PRODUCT_PUBLICATION_AUTHORIZATION_VERSION,
    status: 'authorized-for-public-route-review' as const,
    activationAuthorized: true,
    productPublicationAuthorized: true,
    publicRouteActivated: false,
    publication: 'shadow' as const,
    productMomentumScore: null,
    numericProductEligible: false,
    legacyGrowthMomentumPointReuseAllowed: false,
    previewFallbackAllowed: false,
    directProductionContributionEligible: false,
    requiredNextGate:
      'explicit-momentum-public-route-cutover' as const,
    approval: input.approval,
  });
}
