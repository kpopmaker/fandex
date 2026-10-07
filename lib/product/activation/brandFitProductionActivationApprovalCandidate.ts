import {
  BRAND_FIT_POINT_CONTRACT_VERSION,
  BRAND_FIT_POINT_CONSTRUCT,
} from '../../intelligence/brandFitPointConstruct';
import {
  BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../adapters/brandFitPointFandexVariableProduct';
import {
  BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
} from '../adapters/brandFitPointRiskQualityMetadata';
import {
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION,
} from './brandFitProductionRuntimeVerification';
import {
  BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
  authorizeBrandFitProductionActivation,
  type BrandFitProductionActivationApproval,
} from './brandFitProductionActivationAuthorization';
import {
  BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION,
  type BrandFitProductionReadiness,
} from './brandFitProductionReadiness';

export const BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION =
  'brand-fit-production-activation-approval-candidate-v1' as const;

type PendingBrandFitProductionActivationApproval = Readonly<
  Omit<
    BrandFitProductionActivationApproval,
    'activationAuthorizationId' | 'authorizedAt'
  > & {
    activationAuthorizationId: null;
    authorizedAt: null;
  }
>;

export type BrandFitProductionActivationApprovalCandidateResult =
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      status: 'ready-for-owner-attestation';
      approval: PendingBrandFitProductionActivationApproval;
      authorizationWithoutApproval: ReturnType<
        typeof authorizeBrandFitProductionActivation
      >;
      activationAuthorized: false;
      lifecycleState: 'research';
      targetLifecycleState: 'production';
      publicationAuthorized: false;
      publicRouteCutoverAuthorized: false;
      directProductionContributionEligible: false;
      riskConsumptionAuthorized: false;
      numericEligible: false;
      renderRedeployRequiredAfterActivationMerge: true;
      requiredNextGate:
        'explicit-production-activation-authorization';
    }>
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      status: 'blocked';
      reason: 'activation-readiness-not-ready';
      activationAuthorized: false;
      lifecycleState: 'research';
      publicationAuthorized: false;
      publicRouteCutoverAuthorized: false;
      directProductionContributionEligible: false;
      riskConsumptionAuthorized: false;
      numericEligible: false;
    }>;

export function createBrandFitProductionActivationApprovalCandidate(
  readiness: BrandFitProductionReadiness,
): BrandFitProductionActivationApprovalCandidateResult {
  if (
    readiness.status !== 'ready-for-activation-authorization'
    || readiness.contractVersion
      !== BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION
    || readiness.target.artistId !== 'iu'
    || readiness.target.variableId !== 'brandFitPoint'
    || readiness.target.constructId
      !== BRAND_FIT_POINT_CONSTRUCT.constructId
    || readiness.activationAuthorized !== false
    || readiness.publicationAuthorized !== false
    || readiness.publicRouteCutoverAuthorized !== false
    || readiness.riskConsumptionAuthorized !== false
    || readiness.numericEligible !== false
    || !Object.values(readiness.checks).every(Boolean)
  ) {
    return Object.freeze({
      contractVersion:
        BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
      status: 'blocked' as const,
      reason: 'activation-readiness-not-ready' as const,
      activationAuthorized: false as const,
      lifecycleState: 'research' as const,
      publicationAuthorized: false as const,
      publicRouteCutoverAuthorized: false as const,
      directProductionContributionEligible: false as const,
      riskConsumptionAuthorized: false as const,
      numericEligible: false as const,
    });
  }

  const approval: PendingBrandFitProductionActivationApproval =
    Object.freeze({
      contractVersion:
        BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
      action: 'authorize-production-lifecycle-cutover' as const,
      authority: 'product-operations-owner' as const,
      activationAuthorizationId: null,
      authorizedAt: null,
      target: Object.freeze({
        artistId: 'iu' as const,
        variableId: 'brandFitPoint' as const,
        constructId: BRAND_FIT_POINT_CONSTRUCT.constructId,
      }),
      binding: Object.freeze({
        readinessContractVersion:
          BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION,
        productAdapterVersion:
          BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
        evidenceContractVersion:
          BRAND_FIT_POINT_CONTRACT_VERSION,
        riskQualityMetadataContractVersion:
          BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
        runtimeVerificationContractVersion:
          BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION,
        verifiedRuntimeCommitSha:
          BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION
            .verifiedRuntimeCommitSha,
        runtimeServiceId:
          BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION.serviceId,
        sourceLifecycle: 'research' as const,
        targetLifecycle: 'production' as const,
        claimScope:
          'verified-commercial-partnership-event-only-no-numeric-score' as const,
        restrictedRightsPublicationAllowed: false as const,
      }),
    });

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
    || authorizationWithoutApproval.riskConsumptionAuthorized !== false
    || authorizationWithoutApproval.numericEligible !== false
  ) {
    throw new Error(
      'brand_fit_activation_candidate_fail_closed_invalid',
    );
  }

  return Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
    status: 'ready-for-owner-attestation' as const,
    approval,
    authorizationWithoutApproval,
    activationAuthorized: false as const,
    lifecycleState: 'research' as const,
    targetLifecycleState: 'production' as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    directProductionContributionEligible: false as const,
    riskConsumptionAuthorized: false as const,
    numericEligible: false as const,
    renderRedeployRequiredAfterActivationMerge: true as const,
    requiredNextGate:
      'explicit-production-activation-authorization' as const,
  });
}
