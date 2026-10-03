import type {
  RiskAdjustmentAvailabilityState,
  RiskAdjustmentConflictState,
  RiskAdjustmentCoverageState,
  RiskAdjustmentFreshnessState,
  RiskAdjustmentHistoryState,
  RiskAdjustmentIdentityState,
  RiskAdjustmentRevisionState,
  RiskAdjustmentUpstreamInput,
} from './riskAdjustmentPointConstruct';
import type { FandexConfidenceState } from './confidence';
import type {
  RiskAdjustmentRequiredQualityDimension,
} from './riskAdjustmentUpstreamMetadataRequirements';

export const RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_ACCEPTANCE_VERSION =
  'risk-adjustment-quality-sufficiency-acceptance-v1' as const;

export const RISK_ADJUSTMENT_RESOLVED_REQUIRED_QUALITY_STATES =
  Object.freeze({
    availability: Object.freeze([
      'available',
      'available-nonzero',
      'true-zero',
      'source-missing',
      'provider-unavailable',
      'not-tracked',
      'not-ranked',
      'unsupported',
    ] as const satisfies readonly RiskAdjustmentAvailabilityState[]),
    identity: Object.freeze([
      'resolved',
    ] as const satisfies readonly RiskAdjustmentIdentityState[]),
    confidence: Object.freeze([
      'high',
      'moderate',
      'low',
    ] as const satisfies readonly FandexConfidenceState[]),
    coverage: Object.freeze([
      'complete',
      'incomplete',
    ] as const satisfies readonly RiskAdjustmentCoverageState[]),
    freshness: Object.freeze([
      'current',
      'stale',
    ] as const satisfies readonly RiskAdjustmentFreshnessState[]),
    conflict: Object.freeze([
      'none',
      'detected',
    ] as const satisfies readonly RiskAdjustmentConflictState[]),
    revision: Object.freeze([
      'stable',
      'revised-stable',
      'unstable',
    ] as const satisfies readonly RiskAdjustmentRevisionState[]),
    history: Object.freeze([
      'sufficient',
    ] as const satisfies readonly RiskAdjustmentHistoryState[]),
  });

export type RiskAdjustmentRequiredQualityResolution = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_ACCEPTANCE_VERSION;
  dimension: RiskAdjustmentRequiredQualityDimension;
  stateValue: string;
  resolved: boolean;
}>;

function stateForDimension(
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

export function isRiskAdjustmentRequiredQualityResolved(
  dimension: RiskAdjustmentRequiredQualityDimension,
  stateValue: string,
): boolean {
  return (
    RISK_ADJUSTMENT_RESOLVED_REQUIRED_QUALITY_STATES[
      dimension
    ] as readonly string[]
  ).includes(stateValue);
}

export function evaluateRiskAdjustmentRequiredQualityResolution(
  input: RiskAdjustmentUpstreamInput,
): readonly RiskAdjustmentRequiredQualityResolution[] {
  const dimensions = Object.keys(
    RISK_ADJUSTMENT_RESOLVED_REQUIRED_QUALITY_STATES,
  ) as RiskAdjustmentRequiredQualityDimension[];

  return Object.freeze(
    dimensions
      .map((dimension) => {
        const stateValue = stateForDimension(input, dimension);
        return Object.freeze({
          contractVersion:
            RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_ACCEPTANCE_VERSION,
          dimension,
          stateValue,
          resolved: isRiskAdjustmentRequiredQualityResolved(
            dimension,
            stateValue,
          ),
        });
      })
      .sort((left, right) =>
        left.dimension.localeCompare(right.dimension)
      ),
  );
}
