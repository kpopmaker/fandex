import type {
  FandexDataLifecycleState,
  FandexDataMaterialClass,
} from './productionState';
import {
  evaluateRiskAdjustmentUpstreamHandoff,
  type RiskAdjustmentUpstreamHandoffAssessment,
} from './riskAdjustmentUpstreamHandoff';
import {
  RISK_ADJUSTMENT_OPTIONAL_QUALITY_DIMENSIONS,
  RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS,
  type RiskAdjustmentOptionalQualityDimension,
  type RiskAdjustmentRequiredQualityDimension,
  type RiskAdjustmentUpstreamMetadataCapability,
} from './riskAdjustmentUpstreamMetadataRequirements';
import type {
  RiskAdjustmentUpstreamInput,
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION =
  'risk-adjustment-upstream-quality-envelope-v1' as const;

export type RiskAdjustmentQualityDimensionSemantic = Readonly<{
  semanticId: string;
  semanticVersion: string;
  stateValue: string;
  evidenceRefs: readonly string[];
}>;

export type RiskAdjustmentUpstreamQualityEnvelope = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION;
  producerContractVersion: string;
  variableId: RiskAdjustmentUpstreamVariableId;
  lifecycleState: FandexDataLifecycleState;
  materialClass: FandexDataMaterialClass;
  input: RiskAdjustmentUpstreamInput;
  requiredDimensionSemantics: Readonly<
    Partial<Record<
      RiskAdjustmentRequiredQualityDimension,
      RiskAdjustmentQualityDimensionSemantic
    >>
  >;
  optionalDimensionSemantics: Readonly<
    Partial<Record<
      RiskAdjustmentOptionalQualityDimension,
      RiskAdjustmentQualityDimensionSemantic
    >>
  >;
}>;

export type RiskAdjustmentUpstreamQualityEnvelopeAssessment =
  | Readonly<{
      status: 'accepted';
      contractVersion:
        typeof RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION;
      handoff: RiskAdjustmentUpstreamHandoffAssessment;
      input: RiskAdjustmentUpstreamInput;
    }>
  | Readonly<{
      status: 'required-metadata-blocked';
      contractVersion:
        typeof RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION;
      handoff: RiskAdjustmentUpstreamHandoffAssessment;
      input: RiskAdjustmentUpstreamInput;
    }>
  | Readonly<{
      status: 'not-production-eligible';
      contractVersion:
        typeof RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION;
      handoff: RiskAdjustmentUpstreamHandoffAssessment;
      input: RiskAdjustmentUpstreamInput;
    }>
  | Readonly<{
      status: 'invalid';
      contractVersion:
        typeof RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION;
      reason:
        | 'contract-version-mismatch'
        | 'producer-contract-version-invalid'
        | 'variable-id-mismatch'
        | 'lifecycle-mismatch'
        | 'material-class-mismatch'
        | 'dimension-semantic-invalid'
        | 'dimension-state-mismatch';
    }>;

function invalid(
  reason: Extract<
    RiskAdjustmentUpstreamQualityEnvelopeAssessment,
    { status: 'invalid' }
  >['reason'],
): RiskAdjustmentUpstreamQualityEnvelopeAssessment {
  return Object.freeze({
    status: 'invalid' as const,
    contractVersion: RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION,
    reason,
  });
}

function validSemantic(
  value: RiskAdjustmentQualityDimensionSemantic | undefined,
): boolean {
  return (
    value !== undefined
    && value.semanticId.trim().length > 0
    && value.semanticVersion.trim().length > 0
    && value.stateValue.trim().length > 0
    && value.evidenceRefs.length > 0
    && value.evidenceRefs.every(
      (ref) => typeof ref === 'string' && ref.trim().length > 0,
    )
  );
}

function requiredDimensionStateValue(
  input: RiskAdjustmentUpstreamInput,
  dimension: RiskAdjustmentRequiredQualityDimension,
): string {
  if (dimension === 'availability') return input.availabilityState;
  if (dimension === 'identity') return input.identityState;
  if (dimension === 'confidence') return input.confidenceState;
  if (dimension === 'coverage') return input.coverageState;
  if (dimension === 'freshness') return input.freshnessState;
  if (dimension === 'conflict') return input.conflictState;
  if (dimension === 'revision') return input.revisionState;
  return input.historyState;
}

function optionalDimensionStateValue(
  input: RiskAdjustmentUpstreamInput,
  dimension: RiskAdjustmentOptionalQualityDimension,
): string {
  if (dimension === 'volatility') return input.volatilityState;
  const exhaustive: never = dimension;
  return exhaustive;
}

export function evaluateRiskAdjustmentUpstreamQualityEnvelope(
  envelope: RiskAdjustmentUpstreamQualityEnvelope,
): RiskAdjustmentUpstreamQualityEnvelopeAssessment {
  if (
    envelope.contractVersion
    !== RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION
  ) {
    return invalid('contract-version-mismatch');
  }

  if (envelope.producerContractVersion.trim().length === 0) {
    return invalid('producer-contract-version-invalid');
  }

  if (envelope.input.variableId !== envelope.variableId) {
    return invalid('variable-id-mismatch');
  }
  if (envelope.input.lifecycleState !== envelope.lifecycleState) {
    return invalid('lifecycle-mismatch');
  }
  if (envelope.input.materialClass !== envelope.materialClass) {
    return invalid('material-class-mismatch');
  }

  for (const semantic of [
    ...Object.values(envelope.requiredDimensionSemantics),
    ...Object.values(envelope.optionalDimensionSemantics),
  ]) {
    if (semantic !== undefined && !validSemantic(semantic)) {
      return invalid('dimension-semantic-invalid');
    }
  }

  for (const dimension of RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS) {
    const semantic = envelope.requiredDimensionSemantics[dimension];
    if (
      semantic !== undefined
      && semantic.stateValue
        !== requiredDimensionStateValue(envelope.input, dimension)
    ) {
      return invalid('dimension-state-mismatch');
    }
  }

  for (const dimension of RISK_ADJUSTMENT_OPTIONAL_QUALITY_DIMENSIONS) {
    const semantic = envelope.optionalDimensionSemantics[dimension];
    if (
      semantic !== undefined
      && semantic.stateValue
        !== optionalDimensionStateValue(envelope.input, dimension)
    ) {
      return invalid('dimension-state-mismatch');
    }
  }

  const qualityDimensions: Partial<Record<
    RiskAdjustmentRequiredQualityDimension | RiskAdjustmentOptionalQualityDimension,
    'explicit' | 'unknown' | 'absent'
  >> = {};

  for (const dimension of RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS) {
    qualityDimensions[dimension] = validSemantic(
      envelope.requiredDimensionSemantics[dimension],
    )
      ? 'explicit'
      : 'absent';
  }

  for (const dimension of RISK_ADJUSTMENT_OPTIONAL_QUALITY_DIMENSIONS) {
    qualityDimensions[dimension] = validSemantic(
      envelope.optionalDimensionSemantics[dimension],
    )
      ? 'explicit'
      : 'absent';
  }

  const handoff = evaluateRiskAdjustmentUpstreamHandoff({
    lifecycleState: envelope.lifecycleState,
    materialClass: envelope.materialClass,
    capability: {
      variableId: envelope.variableId,
      lifecycleExposed: true,
      materialClassExposed: true,
      qualityDimensions,
    },
  });

  const status = handoff.status === 'accepted'
    ? 'accepted' as const
    : handoff.status === 'not-production-eligible'
      ? 'not-production-eligible' as const
      : 'required-metadata-blocked' as const;

  return Object.freeze({
    status,
    contractVersion: RISK_ADJUSTMENT_UPSTREAM_QUALITY_ENVELOPE_VERSION,
    handoff,
    input: envelope.input,
  });
}
