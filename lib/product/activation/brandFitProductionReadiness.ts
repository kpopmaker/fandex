import {
  BRAND_FIT_POINT_CONSTRUCT,
  BRAND_FIT_POINT_CONTRACT_VERSION,
} from '../../intelligence/brandFitPointConstruct';
import {
  adaptRiskAdjustmentProducerQualityMetadata,
} from '../../intelligence/riskAdjustmentProducerMetadataAdapter';
import {
  BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../adapters/brandFitPointFandexVariableProduct';
import {
  BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  buildBrandFitPointRiskQualityMetadata,
} from '../adapters/brandFitPointRiskQualityMetadata';
import type {
  FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import {
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION,
  type BrandFitProductionRuntimeVerification,
} from './brandFitProductionRuntimeVerification';

export const BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION =
  'brand-fit-production-readiness-v1' as const;

export type BrandFitProductionReadinessCheck =
  | 'target-identity'
  | 'pre-activation-lifecycle'
  | 'real-material'
  | 'research-only-readiness'
  | 'categorical-event-available'
  | 'evidence-lineage'
  | 'restricted-rights-boundary'
  | 'risk-metadata-handoff'
  | 'durable-runtime-verification'
  | 'non-numeric-contract';

export type BrandFitProductionReadiness = Readonly<{
  contractVersion: typeof BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION;
  target: Readonly<{
    artistId: 'iu';
    variableId: 'brandFitPoint';
    constructId: typeof BRAND_FIT_POINT_CONSTRUCT.constructId;
  }>;
  status: 'ready-for-activation-authorization' | 'blocked';
  checks: Readonly<Record<BrandFitProductionReadinessCheck, boolean>>;
  blockers: readonly string[];
  activationAuthorized: false;
  publicationAuthorized: false;
  publicRouteCutoverAuthorized: false;
  riskConsumptionAuthorized: false;
  numericEligible: false;
  runtimeDeploymentState:
    'verified-prior-live-runtime-redeploy-required-after-activation-merge';
}>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

function runtimeVerificationMatches(
  value: BrandFitProductionRuntimeVerification,
): boolean {
  const expected = BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION;
  return (
    value.contractVersion
      === BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION
    && value.runtime === expected.runtime
    && value.serviceId === expected.serviceId
    && value.verifiedRuntimeCommitSha
      === expected.verifiedRuntimeCommitSha
    && value.productSurface === expected.productSurface
    && value.workflowRunId === expected.workflowRunId
    && value.workflowJobId === expected.workflowJobId
    && value.requiredMarkers.valueState
      === expected.requiredMarkers.valueState
    && value.requiredMarkers.lifecycleDisplay
      === expected.requiredMarkers.lifecycleDisplay
    && value.requiredMarkers.materialClass
      === expected.requiredMarkers.materialClass
    && value.blockerMarkersAbsent.length
      === expected.blockerMarkersAbsent.length
    && expected.blockerMarkersAbsent.every(
      (marker) => value.blockerMarkersAbsent.includes(marker),
    )
    && value.sideEffects.providerCalls === 0
    && value.sideEffects.blobWrites === 0
    && value.sideEffects.databaseWrites === 0
    && value.sideEffects.productActivations === 0
    && value.sideEffects.publications === 0
    && value.verified === true
  );
}

function riskHandoffReadyForOwnerBoundary(
  record: FandexVariableProductRecord,
): boolean {
  const producer = buildBrandFitPointRiskQualityMetadata({
    canonicalArtistId: 'iu',
    record,
  });
  if (
    producer.status !== 'ok'
    || producer.metadata.contractVersion
      !== BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION
  ) {
    return false;
  }

  const risk = adaptRiskAdjustmentProducerQualityMetadata(
    producer.metadata,
  );
  return (
    risk.status === 'ok'
    && risk.envelope.variableId === 'brandFitPoint'
    && risk.envelope.lifecycleState === 'research'
    && risk.envelope.materialClass === 'real'
    && risk.assessment.status === 'not-production-eligible'
    && risk.assessment.handoff.acceptedForRiskConsumption === false
    && risk.assessment.handoff.blockers.length === 1
    && risk.assessment.handoff.blockers[0] === 'upstream-not-production'
  );
}

export function evaluateBrandFitProductionReadiness(input: Readonly<{
  record: FandexVariableProductRecord;
  runtimeVerification: BrandFitProductionRuntimeVerification;
}>): BrandFitProductionReadiness {
  const { record, runtimeVerification } = input;

  const checks: Record<BrandFitProductionReadinessCheck, boolean> = {
    'target-identity':
      record.variableId === 'brandFitPoint'
      && record.canonicalArtistId === 'iu',
    'pre-activation-lifecycle':
      record.lifecycleState === 'research',
    'real-material':
      record.materialClass === 'real',
    'research-only-readiness':
      record.readinessState === 'research-only',
    'categorical-event-available':
      record.availability === 'available'
      && record.valueRepresentation.kind === 'event'
      && record.valueRepresentation.state
        === BRAND_FIT_POINT_CONSTRUCT.constructId,
    'evidence-lineage':
      record.methodologyVersion === BRAND_FIT_POINT_CONTRACT_VERSION
      && record.sourceVersion === BRAND_FIT_POINT_CONTRACT_VERSION
      && record.productVersion
        === BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION
      && record.evidenceRefs.some(
        (ref) => ref.startsWith('brand-fit-event:'),
      )
      && record.evidenceRefs.some(
        (ref) => ref.startsWith('brand-fit-revision:'),
      ),
    'restricted-rights-boundary':
      record.evidenceRefs.includes(
        'brand-fit-limitation:rights-restricted',
      ),
    'risk-metadata-handoff':
      riskHandoffReadyForOwnerBoundary(record),
    'durable-runtime-verification':
      runtimeVerificationMatches(runtimeVerification),
    'non-numeric-contract':
      record.valueRepresentation.kind !== 'numeric'
      && !record.evidenceRefs.some(
        (ref) => ref.startsWith('brand-fit-score:'),
      ),
  };

  const blockers = orderedUnique(
    Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => `readiness-check-failed:${check}`),
  );

  return Object.freeze({
    contractVersion: BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'brandFitPoint' as const,
      constructId: BRAND_FIT_POINT_CONSTRUCT.constructId,
    }),
    status:
      blockers.length === 0
        ? 'ready-for-activation-authorization' as const
        : 'blocked' as const,
    checks: Object.freeze(checks),
    blockers,
    activationAuthorized: false as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    riskConsumptionAuthorized: false as const,
    numericEligible: false as const,
    runtimeDeploymentState:
      'verified-prior-live-runtime-redeploy-required-after-activation-merge'
        as const,
  });
}
