import type {
  FandexDataLifecycleState,
  FandexDataMaterialClass,
} from './productionState';
import {
  isRiskAdjustmentUpstreamInput,
  type RiskAdjustmentAvailabilityState,
  type RiskAdjustmentConflictState,
  type RiskAdjustmentCoverageState,
  type RiskAdjustmentFreshnessState,
  type RiskAdjustmentHistoryState,
  type RiskAdjustmentIdentityState,
  type RiskAdjustmentRevisionState,
  type RiskAdjustmentUpstreamInput,
  type RiskAdjustmentUpstreamVariableId,
  type RiskAdjustmentVolatilityState,
} from './riskAdjustmentPointConstruct';
import type { FandexConfidenceState } from './confidence';
import {
  evaluateRiskAdjustmentUpstreamQualityEnvelope,
  RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION,
  type RiskAdjustmentQualityDimensionSemantic,
  type RiskAdjustmentUpstreamQualityEnvelope,
  type RiskAdjustmentUpstreamQualityEnvelopeAssessment,
} from './riskAdjustmentUpstreamQualityEnvelope';
import type {
  RiskAdjustmentOptionalQualityDimension,
  RiskAdjustmentRequiredQualityDimension,
} from './riskAdjustmentUpstreamMetadataRequirements';

export const RISK_ADJUSTMENT_PRODUCER_METADATA_ADAPTER_VERSION =
  'risk-adjustment-producer-metadata-adapter-v1' as const;

export const RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS = Object.freeze({
  newsIssuePoint: 'news-issue-point-risk-quality-metadata-v1',
  comebackActivityPoint: 'activity-exposure-risk-quality-metadata-v1',
  musicAlbumPoint: 'music-album-point-risk-quality-metadata-v1',
} as const);

export type RiskAdjustmentKnownProducerVariableId =
  keyof typeof RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS;

export type RiskAdjustmentProducerQualityMetadata = Readonly<{
  contractVersion: string;
  variableId: RiskAdjustmentUpstreamVariableId;
  lifecycleState: FandexDataLifecycleState;
  materialClass: FandexDataMaterialClass;
  confidenceState: FandexConfidenceState;
  availabilityState: RiskAdjustmentAvailabilityState;
  identityState: RiskAdjustmentIdentityState;
  coverageState: RiskAdjustmentCoverageState;
  freshnessState: RiskAdjustmentFreshnessState;
  conflictState: RiskAdjustmentConflictState;
  revisionState: RiskAdjustmentRevisionState;
  historyState: RiskAdjustmentHistoryState;
  volatilityState?: RiskAdjustmentVolatilityState;
  evidenceRefs: readonly string[];
  requiredDimensionSemantics: Readonly<
    Partial<Record<
      RiskAdjustmentRequiredQualityDimension,
      RiskAdjustmentQualityDimensionSemantic
    >>
  >;
  optionalDimensionSemantics?: Readonly<
    Partial<Record<
      RiskAdjustmentOptionalQualityDimension,
      RiskAdjustmentQualityDimensionSemantic
    >>
  >;
}>;

export type RiskAdjustmentProducerMetadataAdaptation =
  | Readonly<{
      status: 'ok';
      adapterVersion:
        typeof RISK_ADJUSTMENT_PRODUCER_METADATA_ADAPTER_VERSION;
      envelope: RiskAdjustmentUpstreamQualityEnvelope;
      assessment: Exclude<
        RiskAdjustmentUpstreamQualityEnvelopeAssessment,
        { status: 'invalid' }
      >;
    }>
  | Readonly<{
      status: 'blocked';
      adapterVersion:
        typeof RISK_ADJUSTMENT_PRODUCER_METADATA_ADAPTER_VERSION;
      reason:
        | 'producer-metadata-shape-invalid'
        | 'producer-contract-not-recognized'
        | 'producer-contract-version-mismatch'
        | 'producer-envelope-invalid';
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value);
}

function knownProducerContract(
  variableId: RiskAdjustmentUpstreamVariableId,
): string | null {
  if (variableId === 'newsIssuePoint') {
    return RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS.newsIssuePoint;
  }
  if (variableId === 'comebackActivityPoint') {
    return RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS.comebackActivityPoint;
  }
  if (variableId === 'musicAlbumPoint') {
    return RISK_ADJUSTMENT_KNOWN_PRODUCER_CONTRACTS.musicAlbumPoint;
  }
  return null;
}

function blocked(
  reason: Extract<
    RiskAdjustmentProducerMetadataAdaptation,
    { status: 'blocked' }
  >['reason'],
): RiskAdjustmentProducerMetadataAdaptation {
  return Object.freeze({
    status: 'blocked' as const,
    adapterVersion: RISK_ADJUSTMENT_PRODUCER_METADATA_ADAPTER_VERSION,
    reason,
  });
}

export function adaptRiskAdjustmentProducerQualityMetadata(
  value: unknown,
): RiskAdjustmentProducerMetadataAdaptation {
  if (!isRecord(value)) {
    return blocked('producer-metadata-shape-invalid');
  }

  if (
    typeof value.contractVersion !== 'string'
    || typeof value.variableId !== 'string'
    || typeof value.lifecycleState !== 'string'
    || typeof value.materialClass !== 'string'
    || typeof value.confidenceState !== 'string'
    || typeof value.availabilityState !== 'string'
    || typeof value.identityState !== 'string'
    || typeof value.coverageState !== 'string'
    || typeof value.freshnessState !== 'string'
    || typeof value.conflictState !== 'string'
    || typeof value.revisionState !== 'string'
    || typeof value.historyState !== 'string'
    || !Array.isArray(value.evidenceRefs)
    || !isRecord(value.requiredDimensionSemantics)
    || (
      value.optionalDimensionSemantics !== undefined
      && !isRecord(value.optionalDimensionSemantics)
    )
  ) {
    return blocked('producer-metadata-shape-invalid');
  }

  const variableId =
    value.variableId as RiskAdjustmentUpstreamVariableId;
  const expectedContract = knownProducerContract(variableId);
  if (expectedContract === null) {
    return blocked('producer-contract-not-recognized');
  }
  if (value.contractVersion !== expectedContract) {
    return blocked('producer-contract-version-mismatch');
  }

  const input: RiskAdjustmentUpstreamInput = {
    variableId,
    lifecycleState:
      value.lifecycleState as FandexDataLifecycleState,
    materialClass:
      value.materialClass as FandexDataMaterialClass,
    confidenceState:
      value.confidenceState as FandexConfidenceState,
    availabilityState:
      value.availabilityState as RiskAdjustmentAvailabilityState,
    identityState:
      value.identityState as RiskAdjustmentIdentityState,
    coverageState:
      value.coverageState as RiskAdjustmentCoverageState,
    freshnessState:
      value.freshnessState as RiskAdjustmentFreshnessState,
    conflictState:
      value.conflictState as RiskAdjustmentConflictState,
    revisionState:
      value.revisionState as RiskAdjustmentRevisionState,
    volatilityState:
      (value.volatilityState ?? 'unknown') as RiskAdjustmentVolatilityState,
    historyState:
      value.historyState as RiskAdjustmentHistoryState,
    evidenceRefs: value.evidenceRefs as readonly string[],
  };

  if (!isRiskAdjustmentUpstreamInput(input)) {
    return blocked('producer-metadata-shape-invalid');
  }

  const envelope: RiskAdjustmentUpstreamQualityEnvelope = Object.freeze({
    contractVersion:
      RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION,
    producerContractVersion: value.contractVersion,
    variableId,
    lifecycleState: input.lifecycleState,
    materialClass: input.materialClass,
    input: Object.freeze(input),
    requiredDimensionSemantics:
      value.requiredDimensionSemantics as Readonly<
        Partial<Record<
          RiskAdjustmentRequiredQualityDimension,
          RiskAdjustmentQualityDimensionSemantic
        >>
      >,
    optionalDimensionSemantics:
      (value.optionalDimensionSemantics ?? {}) as Readonly<
        Partial<Record<
          RiskAdjustmentOptionalQualityDimension,
          RiskAdjustmentQualityDimensionSemantic
        >>
      >,
  });

  const assessment =
    evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope);
  if (assessment.status === 'invalid') {
    return blocked('producer-envelope-invalid');
  }

  return Object.freeze({
    status: 'ok' as const,
    adapterVersion:
      RISK_ADJUSTMENT_PRODUCER_METADATA_ADAPTER_VERSION,
    envelope,
    assessment,
  });
}
