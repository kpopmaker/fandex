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
  BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION,
  type BrandFitProductionReadiness,
} from './brandFitProductionReadiness';

export const BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION =
  'brand-fit-production-activation-authorization-v1' as const;

export const BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION =
  'brand-fit-production-activation-approval-v1' as const;

export type BrandFitProductionActivationApproval = Readonly<{
  contractVersion:
    typeof BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION;
  action: 'authorize-production-lifecycle-cutover';
  authority: 'product-operations-owner';
  activationAuthorizationId: string;
  authorizedAt: string;
  target: Readonly<{
    artistId: 'iu';
    variableId: 'brandFitPoint';
    constructId: typeof BRAND_FIT_POINT_CONSTRUCT.constructId;
  }>;
  binding: Readonly<{
    readinessContractVersion:
      typeof BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION;
    productAdapterVersion:
      typeof BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION;
    evidenceContractVersion: typeof BRAND_FIT_POINT_CONTRACT_VERSION;
    riskQualityMetadataContractVersion:
      typeof BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION;
    runtimeVerificationContractVersion:
      typeof BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION;
    verifiedRuntimeCommitSha: string;
    runtimeServiceId: string;
    sourceLifecycle: 'research';
    targetLifecycle: 'production';
    claimScope:
      'verified-commercial-partnership-event-only-no-numeric-score';
    restrictedRightsPublicationAllowed: false;
  }>;
}>;

export type BrandFitProductionActivationAuthorizationResult =
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'authorized-for-lifecycle-cutover';
      activationAuthorized: true;
      lifecycleState: 'research';
      targetLifecycleState: 'production';
      publicationAuthorized: false;
      publicRouteCutoverAuthorized: false;
      directProductionContributionEligible: false;
      riskConsumptionAuthorized: false;
      numericEligible: false;
      requiredNextGate: 'explicit-production-lifecycle-cutover';
      approval: BrandFitProductionActivationApproval;
    }>
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'not-authorized';
      activationAuthorized: false;
      lifecycleState: 'research';
      publicationAuthorized: false;
      publicRouteCutoverAuthorized: false;
      directProductionContributionEligible: false;
      riskConsumptionAuthorized: false;
      numericEligible: false;
      reason:
        | 'activation-readiness-not-ready'
        | 'activation-approval-absent';
    }>
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'data-issue';
      activationAuthorized: false;
      lifecycleState: 'blocked';
      publicationAuthorized: false;
      publicRouteCutoverAuthorized: false;
      directProductionContributionEligible: false;
      riskConsumptionAuthorized: false;
      numericEligible: false;
      reason:
        | 'activation-approval-contract-invalid'
        | 'activation-approval-binding-mismatch';
    }>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    && new Date(parsed).toISOString() === value;
}

function notAuthorized(
  reason:
    | 'activation-readiness-not-ready'
    | 'activation-approval-absent',
): BrandFitProductionActivationAuthorizationResult {
  return Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'not-authorized' as const,
    activationAuthorized: false as const,
    lifecycleState: 'research' as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    directProductionContributionEligible: false as const,
    riskConsumptionAuthorized: false as const,
    numericEligible: false as const,
    reason,
  });
}

function dataIssue(
  reason:
    | 'activation-approval-contract-invalid'
    | 'activation-approval-binding-mismatch',
): BrandFitProductionActivationAuthorizationResult {
  return Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'data-issue' as const,
    activationAuthorized: false as const,
    lifecycleState: 'blocked' as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    directProductionContributionEligible: false as const,
    riskConsumptionAuthorized: false as const,
    numericEligible: false as const,
    reason,
  });
}

function approvalContractValid(
  approval: BrandFitProductionActivationApproval,
): boolean {
  return (
    approval.contractVersion
      === BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION
    && approval.action === 'authorize-production-lifecycle-cutover'
    && approval.authority === 'product-operations-owner'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.activationAuthorizationId,
    )
    && exactIso(approval.authorizedAt)
    && approval.target.artistId === 'iu'
    && approval.target.variableId === 'brandFitPoint'
    && approval.target.constructId
      === BRAND_FIT_POINT_CONSTRUCT.constructId
    && approval.binding.readinessContractVersion
      === BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION
    && approval.binding.productAdapterVersion
      === BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION
    && approval.binding.evidenceContractVersion
      === BRAND_FIT_POINT_CONTRACT_VERSION
    && approval.binding.riskQualityMetadataContractVersion
      === BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION
    && approval.binding.runtimeVerificationContractVersion
      === BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION
    && approval.binding.verifiedRuntimeCommitSha
      === BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION
        .verifiedRuntimeCommitSha
    && approval.binding.runtimeServiceId
      === BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION.serviceId
    && approval.binding.sourceLifecycle === 'research'
    && approval.binding.targetLifecycle === 'production'
    && approval.binding.claimScope
      === 'verified-commercial-partnership-event-only-no-numeric-score'
    && approval.binding.restrictedRightsPublicationAllowed === false
  );
}

function approvalMatches(
  readiness: BrandFitProductionReadiness,
  approval: BrandFitProductionActivationApproval,
): boolean {
  return (
    readiness.status === 'ready-for-activation-authorization'
    && readiness.contractVersion
      === approval.binding.readinessContractVersion
    && readiness.target.artistId === approval.target.artistId
    && readiness.target.variableId === approval.target.variableId
    && readiness.target.constructId === approval.target.constructId
    && readiness.activationAuthorized === false
    && readiness.publicationAuthorized === false
    && readiness.publicRouteCutoverAuthorized === false
    && readiness.riskConsumptionAuthorized === false
    && readiness.numericEligible === false
    && Object.values(readiness.checks).every(Boolean)
  );
}

export function authorizeBrandFitProductionActivation(
  input: Readonly<{
    readiness: BrandFitProductionReadiness;
    approval: BrandFitProductionActivationApproval | null;
  }>,
): BrandFitProductionActivationAuthorizationResult {
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
      BRAND_FIT_PRODUCTION_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'authorized-for-lifecycle-cutover' as const,
    activationAuthorized: true as const,
    lifecycleState: 'research' as const,
    targetLifecycleState: 'production' as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    directProductionContributionEligible: false as const,
    riskConsumptionAuthorized: false as const,
    numericEligible: false as const,
    requiredNextGate: 'explicit-production-lifecycle-cutover' as const,
    approval: input.approval,
  });
}
