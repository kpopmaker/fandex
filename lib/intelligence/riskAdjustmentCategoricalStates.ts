import type {
  RiskAdjustmentAssessment,
  RiskAdjustmentQualityIssue,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_CATEGORICAL_STATES_VERSION =
  'risk-adjustment-categorical-states-v1' as const;

export type RiskAdjustmentCategoricalState =
  | 'dependency-blocked'
  | 'insufficient-data'
  | 'source-missing'
  | 'provider-unavailable'
  | 'unsupported-scope'
  | 'identity-blocked'
  | 'coverage-limited'
  | 'source-stale'
  | 'conflicting-evidence'
  | 'revision-unstable'
  | 'volatility-observed'
  | 'no-adjustment-evidence';

const EXPLICIT_STATE_BY_QUALITY_ISSUE:
  Readonly<Partial<Record<
    RiskAdjustmentQualityIssue,
    RiskAdjustmentCategoricalState
  >>> = Object.freeze({
    'source-missing': 'source-missing',
    'provider-unavailable': 'provider-unavailable',
    'unsupported-scope': 'unsupported-scope',
    'identity-unresolved': 'identity-blocked',
    'identity-conflict': 'identity-blocked',
    'incomplete-coverage': 'coverage-limited',
    'stale-evidence': 'source-stale',
    'data-conflict': 'conflicting-evidence',
    'revision-instability': 'revision-unstable',
    'unusual-volatility': 'volatility-observed',
  });

function orderedUnique<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

export type RiskAdjustmentCategoricalStateAssessment = Readonly<{
  contractVersion: typeof RISK_ADJUSTMENT_CATEGORICAL_STATES_VERSION;
  states: readonly RiskAdjustmentCategoricalState[];
  numericEligible: false;
}>;

export function deriveRiskAdjustmentCategoricalStates(
  assessment: RiskAdjustmentAssessment,
): RiskAdjustmentCategoricalStateAssessment {
  const states: RiskAdjustmentCategoricalState[] = [];

  if (assessment.status === 'dependency_blocked') {
    states.push('dependency-blocked');
  }
  if (assessment.status === 'insufficient_data') {
    states.push('insufficient-data');
  }

  for (const issue of assessment.qualityIssues) {
    const state = EXPLICIT_STATE_BY_QUALITY_ISSUE[issue];
    if (state !== undefined) states.push(state);
  }

  if (
    assessment.status === 'categorical_ready'
    && states.length === 0
  ) {
    states.push('no-adjustment-evidence');
  }

  return Object.freeze({
    contractVersion: RISK_ADJUSTMENT_CATEGORICAL_STATES_VERSION,
    states: orderedUnique(states),
    numericEligible: false as const,
  });
}
