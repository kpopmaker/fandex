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
  BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
  authorizeBrandFitProductionActivation,
  type BrandFitProductionActivationApproval,
} from './brandFitProductionActivationAuthorization';
import {
  BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION,
  type BrandFitProductionReadiness,
} from './brandFitProductionReadiness';
import {
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION,
} from './brandFitProductionRuntimeVerification';

export const BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE_VERSION =
  'brand-fit-production-activation-approval-evidence-v1' as const;

export const BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL =
  Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-production-lifecycle-cutover' as const,
    authority: 'product-operations-owner' as const,
    activationAuthorizationId:
      'ops-activation-brand-fit-20261007t014520z-v1',
    authorizedAt: '2026-10-07T01:45:20.000Z',
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
        BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION.verifiedRuntimeCommitSha,
      runtimeServiceId:
        BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION.serviceId,
      sourceLifecycle: 'research' as const,
      targetLifecycle: 'production' as const,
      claimScope:
        'verified-commercial-partnership-event-only-no-numeric-score' as const,
      restrictedRightsPublicationAllowed: false as const,
    }),
  }) satisfies BrandFitProductionActivationApproval;

export const BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE =
  Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE_VERSION,
    approvedAt:
      BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.authorizedAt,
    authority: 'product-operations-owner' as const,
    authorizationEvidenceCommentId: 6029102277 as const,
    authorizationEvidenceCommentUrl:
      'https://github.com/kpopmaker/fandex/issues/413#issuecomment-6029102277' as const,
    authorizedMain:
      'e8a2fb2969a09dde4b9a149e759f9b9e31e600bd' as const,
    activationAuthorizationId:
      BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.activationAuthorizationId,
    target: BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.target,
    binding: BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.binding,
    decision: Object.freeze({
      activationAuthorized: true as const,
      lifecycleState: 'research' as const,
      targetLifecycleState: 'production' as const,
      lifecycleCutoverExecuted: false as const,
      renderRedeployExecuted: false as const,
      publicationAuthorized: false as const,
      publicRouteCutoverAuthorized: false as const,
      directProductionContributionEligible: false as const,
      riskInventoryUpdated: false as const,
      riskConsumptionAuthorized: false as const,
      numericEligible: false as const,
      requiredNextGate:
        'explicit-production-lifecycle-cutover' as const,
    }),
  });

export function authorizeBrandFitProductionActivationWithApproval(
  readiness: BrandFitProductionReadiness,
) {
  return authorizeBrandFitProductionActivation({
    readiness,
    approval: BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL,
  });
}
