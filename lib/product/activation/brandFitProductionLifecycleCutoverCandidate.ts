import {
  BRAND_FIT_POINT_CONSTRUCT,
} from '../../intelligence/brandFitPointConstruct';
import {
  adaptRiskAdjustmentProducerQualityMetadata,
} from '../../intelligence/riskAdjustmentProducerMetadataAdapter';
import {
  BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../adapters/brandFitPointFandexVariableProduct';
import {
  buildBrandFitPointRiskQualityMetadata,
} from '../adapters/brandFitPointRiskQualityMetadata';
import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import type {
  BrandFitProductionActivationAuthorizationResult,
} from './brandFitProductionActivationAuthorization';

export const BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_CANDIDATE_VERSION =
  'brand-fit-production-lifecycle-cutover-candidate-v1' as const;

export type BrandFitProductionLifecycleCutoverCandidate =
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_CANDIDATE_VERSION;
      status: 'ready-for-explicit-lifecycle-cutover-execution';
      sourceRecord: FandexVariableProductRecord;
      candidateRecord: FandexVariableProductRecord;
      authorization: Extract<
        BrandFitProductionActivationAuthorizationResult,
        { status: 'authorized-for-lifecycle-cutover' }
      >;
      checks: Readonly<{
        'activation-authorization-current': true;
        'source-record-research-real': true;
        'categorical-event-preserved': true;
        'restricted-rights-publication-locked': true;
        'numeric-boundary-preserved': true;
        'candidate-production-record-valid': true;
        'risk-generic-handoff-shape-valid': true;
        'risk-inventory-mutation-not-performed': true;
      }>;
      executionBoundary: Readonly<{
        lifecycleCutoverExecuted: false;
        renderRedeployExecuted: false;
        publicationAuthorized: false;
        publicRouteCutoverAuthorized: false;
        riskInventoryUpdated: false;
        riskConsumptionAuthorized: false;
      }>;
      requiredNextGate:
        'explicit-brand-fit-production-lifecycle-cutover-execution';
    }>
  | Readonly<{
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_CANDIDATE_VERSION;
      status: 'blocked';
      reason:
        | 'activation-authorization-not-granted'
        | 'source-record-invalid'
        | 'source-record-numeric-boundary-violated'
        | 'candidate-record-invalid'
        | 'risk-handoff-shape-invalid';
      executionBoundary: Readonly<{
        lifecycleCutoverExecuted: false;
        renderRedeployExecuted: false;
        publicationAuthorized: false;
        publicRouteCutoverAuthorized: false;
        riskInventoryUpdated: false;
        riskConsumptionAuthorized: false;
      }>;
    }>;

function boundary() {
  return Object.freeze({
    lifecycleCutoverExecuted: false as const,
    renderRedeployExecuted: false as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    riskInventoryUpdated: false as const,
    riskConsumptionAuthorized: false as const,
  });
}

function blocked(
  reason: Extract<
    BrandFitProductionLifecycleCutoverCandidate,
    { status: 'blocked' }
  >['reason'],
): BrandFitProductionLifecycleCutoverCandidate {
  return Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_CANDIDATE_VERSION,
    status: 'blocked' as const,
    reason,
    executionBoundary: boundary(),
  });
}

function sourceRecordValid(
  record: FandexVariableProductRecord,
): boolean {
  return (
    record.variableId === 'brandFitPoint'
    && record.canonicalArtistId === 'iu'
    && record.lifecycleState === 'research'
    && record.materialClass === 'real'
    && record.readinessState === 'research-only'
    && record.availability === 'available'
    && record.valueRepresentation.kind === 'event'
    && record.valueRepresentation.state
      === BRAND_FIT_POINT_CONSTRUCT.constructId
    && record.productVersion
      === BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION
    && record.evidenceRefs.includes(
      'brand-fit-limitation:rights-restricted',
    )
  );
}

function candidateRecordFrom(
  source: FandexVariableProductRecord,
  activationAuthorizationId: string,
): FandexVariableProductRecord {
  return createFandexVariableProductRecord({
    variableId: source.variableId,
    canonicalArtistId: source.canonicalArtistId,
    lifecycleState: 'production',
    materialClass: source.materialClass,
    readinessState: 'production',
    availability: source.availability,
    valueRepresentation: source.valueRepresentation,
    asOf: source.asOf,
    observationTime: source.observationTime,
    collectionTime: source.collectionTime,
    confidence: source.confidence,
    coverage: source.coverage,
    freshness: source.freshness,
    missingReason: source.missingReason,
    unsupportedReason: source.unsupportedReason,
    blockerReason: source.blockerReason,
    evidenceRefs: [
      ...source.evidenceRefs,
      `brand-fit-activation-authorization:${activationAuthorizationId}`,
      'brand-fit-lifecycle-cutover-candidate:production',
      'brand-fit-publication-authorized:false',
      'brand-fit-public-route-cutover-authorized:false',
      'brand-fit-risk-inventory-updated:false',
      'brand-fit-risk-consumption-authorized:false',
      'brand-fit-render-revalidation-required:true',
    ],
    methodologyVersion: source.methodologyVersion,
    sourceVersion: source.sourceVersion,
    productVersion: source.productVersion,
  });
}

export function createBrandFitProductionLifecycleCutoverCandidate(
  input: Readonly<{
    sourceRecord: FandexVariableProductRecord;
    authorization: BrandFitProductionActivationAuthorizationResult;
  }>,
): BrandFitProductionLifecycleCutoverCandidate {
  const { sourceRecord, authorization } = input;

  if (
    authorization.status !== 'authorized-for-lifecycle-cutover'
    || authorization.activationAuthorized !== true
    || authorization.lifecycleState !== 'research'
    || authorization.targetLifecycleState !== 'production'
    || authorization.publicationAuthorized !== false
    || authorization.publicRouteCutoverAuthorized !== false
    || authorization.directProductionContributionEligible !== false
    || authorization.riskConsumptionAuthorized !== false
    || authorization.numericEligible !== false
    || authorization.requiredNextGate
      !== 'explicit-production-lifecycle-cutover'
  ) {
    return blocked('activation-authorization-not-granted');
  }

  if (!sourceRecordValid(sourceRecord)) {
    return blocked('source-record-invalid');
  }

  if (sourceRecord.valueRepresentation.kind === 'numeric') {
    return blocked('source-record-numeric-boundary-violated');
  }

  let candidateRecord: FandexVariableProductRecord;
  try {
    candidateRecord = candidateRecordFrom(
      sourceRecord,
      authorization.approval.activationAuthorizationId,
    );
  } catch {
    return blocked('candidate-record-invalid');
  }

  if (
    candidateRecord.lifecycleState !== 'production'
    || candidateRecord.materialClass !== 'real'
    || candidateRecord.readinessState !== 'production'
    || candidateRecord.availability !== 'available'
    || candidateRecord.valueRepresentation.kind !== 'event'
    || candidateRecord.valueRepresentation.state
      !== BRAND_FIT_POINT_CONSTRUCT.constructId
    || candidateRecord.evidenceRefs.includes(
      'brand-fit-publication-authorized:true',
    )
    || candidateRecord.evidenceRefs.includes(
      'brand-fit-risk-consumption-authorized:true',
    )
  ) {
    return blocked('candidate-record-invalid');
  }

  const riskMetadata = buildBrandFitPointRiskQualityMetadata({
    canonicalArtistId: 'iu',
    record: candidateRecord,
  });
  if (riskMetadata.status !== 'ok') {
    return blocked('risk-handoff-shape-invalid');
  }

  const riskAssessment = adaptRiskAdjustmentProducerQualityMetadata(
    riskMetadata.metadata,
  );
  if (
    riskAssessment.status !== 'ok'
    || riskAssessment.envelope.lifecycleState !== 'production'
    || riskAssessment.envelope.materialClass !== 'real'
    || riskAssessment.assessment.status !== 'accepted'
    || riskAssessment.assessment.handoff.acceptedForRiskConsumption !== true
  ) {
    return blocked('risk-handoff-shape-invalid');
  }

  return Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_CANDIDATE_VERSION,
    status: 'ready-for-explicit-lifecycle-cutover-execution' as const,
    sourceRecord,
    candidateRecord,
    authorization,
    checks: Object.freeze({
      'activation-authorization-current': true as const,
      'source-record-research-real': true as const,
      'categorical-event-preserved': true as const,
      'restricted-rights-publication-locked': true as const,
      'numeric-boundary-preserved': true as const,
      'candidate-production-record-valid': true as const,
      'risk-generic-handoff-shape-valid': true as const,
      'risk-inventory-mutation-not-performed': true as const,
    }),
    executionBoundary: boundary(),
    requiredNextGate:
      'explicit-brand-fit-production-lifecycle-cutover-execution' as const,
  });
}
