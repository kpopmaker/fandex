import {
  FANDEX_CONFIDENCE_STATES,
  type FandexConfidenceState,
} from './confidence';
import {
  isFandexDataLifecycleState,
  isFandexDataMaterialClass,
  type FandexDataLifecycleState,
  type FandexDataMaterialClass,
} from './productionState';

export const RISK_ADJUSTMENT_POINT_CONTRACT_VERSION =
  'risk-adjustment-input-v1' as const;

export const RISK_ADJUSTMENT_POINT_CONSTRUCT = Object.freeze({
  variableId: 'riskAdjustmentPoint' as const,
  constructId: 'validated-product-data-uncertainty-state' as const,
  construct:
    'Categorical downstream assessment of validated Product data quality, coverage, conflict, revision stability, and volatility evidence',
  productForm: 'categorical-adjustment-state' as const,
  numericEligible: false as const,
});

export const RISK_ADJUSTMENT_UPSTREAM_CANDIDATES = Object.freeze([
  'newsIssuePoint',
  'comebackActivityPoint',
  'growthMomentumPoint',
  'musicAlbumPoint',
  'snsFandomPoint',
  'brandFitPoint',
] as const);
export type RiskAdjustmentUpstreamVariableId =
  typeof RISK_ADJUSTMENT_UPSTREAM_CANDIDATES[number];

export const RISK_ADJUSTMENT_AVAILABILITY_STATES = Object.freeze([
  'available',
  'available-nonzero',
  'true-zero',
  'source-missing',
  'provider-unavailable',
  'upstream-unavailable-ambiguous',
  'not-tracked',
  'not-ranked',
  'unsupported',
] as const);
export type RiskAdjustmentAvailabilityState =
  typeof RISK_ADJUSTMENT_AVAILABILITY_STATES[number];

export const RISK_ADJUSTMENT_IDENTITY_STATES = Object.freeze([
  'resolved',
  'unresolved',
  'conflict',
] as const);
export type RiskAdjustmentIdentityState =
  typeof RISK_ADJUSTMENT_IDENTITY_STATES[number];

export const RISK_ADJUSTMENT_COVERAGE_STATES = Object.freeze([
  'complete',
  'incomplete',
  'unknown',
] as const);
export type RiskAdjustmentCoverageState =
  typeof RISK_ADJUSTMENT_COVERAGE_STATES[number];

export const RISK_ADJUSTMENT_FRESHNESS_STATES = Object.freeze([
  'current',
  'stale',
  'unknown',
] as const);
export type RiskAdjustmentFreshnessState =
  typeof RISK_ADJUSTMENT_FRESHNESS_STATES[number];

export const RISK_ADJUSTMENT_CONFLICT_STATES = Object.freeze([
  'none',
  'detected',
  'unknown',
] as const);
export type RiskAdjustmentConflictState =
  typeof RISK_ADJUSTMENT_CONFLICT_STATES[number];

export const RISK_ADJUSTMENT_REVISION_STATES = Object.freeze([
  'stable',
  'revised-stable',
  'unstable',
  'unknown',
] as const);
export type RiskAdjustmentRevisionState =
  typeof RISK_ADJUSTMENT_REVISION_STATES[number];

export const RISK_ADJUSTMENT_VOLATILITY_STATES = Object.freeze([
  'ordinary',
  'unusual',
  'unknown',
] as const);
export type RiskAdjustmentVolatilityState =
  typeof RISK_ADJUSTMENT_VOLATILITY_STATES[number];

export const RISK_ADJUSTMENT_HISTORY_STATES = Object.freeze([
  'sufficient',
  'insufficient',
  'unknown',
] as const);
export type RiskAdjustmentHistoryState =
  typeof RISK_ADJUSTMENT_HISTORY_STATES[number];

export type RiskAdjustmentUpstreamInput = Readonly<{
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
  volatilityState: RiskAdjustmentVolatilityState;
  historyState: RiskAdjustmentHistoryState;
  evidenceRefs: readonly string[];
}>;

export function isRiskAdjustmentUpstreamInput(
  value: unknown,
): value is RiskAdjustmentUpstreamInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Partial<RiskAdjustmentUpstreamInput>;
  return (
    typeof row.variableId === 'string'
    && RISK_ADJUSTMENT_UPSTREAM_CANDIDATES.includes(
      row.variableId as RiskAdjustmentUpstreamVariableId,
    )
    && isFandexDataLifecycleState(row.lifecycleState)
    && isFandexDataMaterialClass(row.materialClass)
    && typeof row.confidenceState === 'string'
    && FANDEX_CONFIDENCE_STATES.includes(
      row.confidenceState as FandexConfidenceState,
    )
    && typeof row.availabilityState === 'string'
    && RISK_ADJUSTMENT_AVAILABILITY_STATES.includes(
      row.availabilityState as RiskAdjustmentAvailabilityState,
    )
    && typeof row.identityState === 'string'
    && RISK_ADJUSTMENT_IDENTITY_STATES.includes(
      row.identityState as RiskAdjustmentIdentityState,
    )
    && typeof row.coverageState === 'string'
    && RISK_ADJUSTMENT_COVERAGE_STATES.includes(
      row.coverageState as RiskAdjustmentCoverageState,
    )
    && typeof row.freshnessState === 'string'
    && RISK_ADJUSTMENT_FRESHNESS_STATES.includes(
      row.freshnessState as RiskAdjustmentFreshnessState,
    )
    && typeof row.conflictState === 'string'
    && RISK_ADJUSTMENT_CONFLICT_STATES.includes(
      row.conflictState as RiskAdjustmentConflictState,
    )
    && typeof row.revisionState === 'string'
    && RISK_ADJUSTMENT_REVISION_STATES.includes(
      row.revisionState as RiskAdjustmentRevisionState,
    )
    && typeof row.volatilityState === 'string'
    && RISK_ADJUSTMENT_VOLATILITY_STATES.includes(
      row.volatilityState as RiskAdjustmentVolatilityState,
    )
    && typeof row.historyState === 'string'
    && RISK_ADJUSTMENT_HISTORY_STATES.includes(
      row.historyState as RiskAdjustmentHistoryState,
    )
    && Array.isArray(row.evidenceRefs)
    && row.evidenceRefs.every(
      (ref) => typeof ref === 'string' && ref.trim().length > 0,
    )
  );
}

export type RiskAdjustmentQualityIssue =
  | 'source-missing'
  | 'provider-unavailable'
  | 'availability-unresolved'
  | 'unsupported-scope'
  | 'identity-unresolved'
  | 'identity-conflict'
  | 'incomplete-coverage'
  | 'coverage-unknown'
  | 'stale-evidence'
  | 'freshness-unknown'
  | 'data-conflict'
  | 'conflict-unknown'
  | 'revision-instability'
  | 'revision-state-unknown'
  | 'unusual-volatility'
  | 'volatility-unknown'
  | 'confidence-insufficient'
  | 'history-insufficient'
  | 'history-unknown';

export const RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES = Object.freeze([
  'availability-unresolved',
  'identity-unresolved',
  'identity-conflict',
  'coverage-unknown',
  'freshness-unknown',
  'conflict-unknown',
  'revision-state-unknown',
  'confidence-insufficient',
  'history-insufficient',
  'history-unknown',
] as const satisfies readonly RiskAdjustmentQualityIssue[]);

export type RiskAdjustmentDependencyBlocker =
  | 'upstream-not-production'
  | 'upstream-not-real';

export type RiskAdjustmentDependencyAssessment = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  status: 'usable' | 'blocked';
  blockers: readonly RiskAdjustmentDependencyBlocker[];
  qualityIssues: readonly RiskAdjustmentQualityIssue[];
  trueZeroObserved: boolean;
  evidenceRefs: readonly string[];
}>;

export type RiskAdjustmentAssessment = Readonly<{
  contractVersion: typeof RISK_ADJUSTMENT_POINT_CONTRACT_VERSION;
  variableId: 'riskAdjustmentPoint';
  constructId: typeof RISK_ADJUSTMENT_POINT_CONSTRUCT.constructId;
  status: 'insufficient_data' | 'dependency_blocked' | 'categorical_ready';
  dependencies: readonly RiskAdjustmentDependencyAssessment[];
  qualityIssues: readonly RiskAdjustmentQualityIssue[];
  blockedUpstreamVariables: readonly RiskAdjustmentUpstreamVariableId[];
  trueZeroVariables: readonly RiskAdjustmentUpstreamVariableId[];
  numericEligible: false;
  score: null;
  penalty: null;
  weight: null;
}>;

function orderedUnique<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

function validateEvidenceRefs(refs: readonly string[]): readonly string[] {
  if (refs.some((ref) => typeof ref !== 'string' || ref.trim() === '')) {
    throw new Error('risk_adjustment_evidence_ref_invalid');
  }
  return orderedUnique(refs.map((ref) => ref.trim()));
}

export function assessRiskAdjustmentDependency(
  input: RiskAdjustmentUpstreamInput,
): RiskAdjustmentDependencyAssessment {
  if (!isRiskAdjustmentUpstreamInput(input)) {
    throw new Error('risk_adjustment_upstream_input_invalid');
  }

  const blockers: RiskAdjustmentDependencyBlocker[] = [];
  if (input.lifecycleState !== 'production') {
    blockers.push('upstream-not-production');
  }
  if (input.materialClass !== 'real') {
    blockers.push('upstream-not-real');
  }

  const qualityIssues: RiskAdjustmentQualityIssue[] = [];
  if (input.availabilityState === 'source-missing') {
    qualityIssues.push('source-missing');
  }
  if (input.availabilityState === 'provider-unavailable') {
    qualityIssues.push('provider-unavailable');
  }
  if (input.availabilityState === 'upstream-unavailable-ambiguous') {
    qualityIssues.push('availability-unresolved');
  }
  if (input.availabilityState === 'unsupported') {
    qualityIssues.push('unsupported-scope');
  }
  if (input.identityState === 'unresolved') {
    qualityIssues.push('identity-unresolved');
  }
  if (input.identityState === 'conflict') {
    qualityIssues.push('identity-conflict');
  }
  if (input.coverageState === 'incomplete') {
    qualityIssues.push('incomplete-coverage');
  }
  if (input.coverageState === 'unknown') {
    qualityIssues.push('coverage-unknown');
  }
  if (input.freshnessState === 'stale') {
    qualityIssues.push('stale-evidence');
  }
  if (input.freshnessState === 'unknown') {
    qualityIssues.push('freshness-unknown');
  }
  if (input.conflictState === 'detected') {
    qualityIssues.push('data-conflict');
  }
  if (input.conflictState === 'unknown') {
    qualityIssues.push('conflict-unknown');
  }
  if (input.revisionState === 'unstable') {
    qualityIssues.push('revision-instability');
  }
  if (input.revisionState === 'unknown') {
    qualityIssues.push('revision-state-unknown');
  }
  if (input.volatilityState === 'unusual') {
    qualityIssues.push('unusual-volatility');
  }
  if (input.volatilityState === 'unknown') {
    qualityIssues.push('volatility-unknown');
  }
  if (input.confidenceState === 'insufficient') {
    qualityIssues.push('confidence-insufficient');
  }
  if (input.historyState === 'insufficient') {
    qualityIssues.push('history-insufficient');
  }
  if (input.historyState === 'unknown') {
    qualityIssues.push('history-unknown');
  }

  return Object.freeze({
    variableId: input.variableId,
    status: blockers.length === 0 ? 'usable' as const : 'blocked' as const,
    blockers: orderedUnique(blockers),
    qualityIssues: orderedUnique(qualityIssues),
    trueZeroObserved: input.availabilityState === 'true-zero',
    evidenceRefs: validateEvidenceRefs(input.evidenceRefs),
  });
}

export function deriveRiskAdjustmentAssessment(
  inputs: readonly RiskAdjustmentUpstreamInput[],
): RiskAdjustmentAssessment {
  if (
    new Set(inputs.map((input) => input.variableId)).size !== inputs.length
  ) {
    throw new Error('risk_adjustment_upstream_variable_duplicate');
  }

  const dependencies = Object.freeze(
    inputs
      .map(assessRiskAdjustmentDependency)
      .sort((left, right) => left.variableId.localeCompare(right.variableId)),
  );
  const blocked = dependencies.filter(
    (dependency) => dependency.status === 'blocked',
  );
  const qualityIssues = orderedUnique(
    dependencies.flatMap((dependency) => dependency.qualityIssues),
  );
  const hasUnresolvedRequiredQuality =
    RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES.some(
      (issue) => qualityIssues.includes(issue),
    );

  let status: RiskAdjustmentAssessment['status'];
  if (inputs.length === 0) {
    status = 'insufficient_data';
  } else if (blocked.length > 0) {
    status = 'dependency_blocked';
  } else if (hasUnresolvedRequiredQuality) {
    status = 'insufficient_data';
  } else {
    status = 'categorical_ready';
  }

  return Object.freeze({
    contractVersion: RISK_ADJUSTMENT_POINT_CONTRACT_VERSION,
    variableId: 'riskAdjustmentPoint',
    constructId: RISK_ADJUSTMENT_POINT_CONSTRUCT.constructId,
    status,
    dependencies,
    qualityIssues,
    blockedUpstreamVariables: orderedUnique(
      blocked.map((dependency) => dependency.variableId),
    ),
    trueZeroVariables: orderedUnique(
      dependencies
        .filter((dependency) => dependency.trueZeroObserved)
        .map((dependency) => dependency.variableId),
    ),
    numericEligible: false as const,
    score: null,
    penalty: null,
    weight: null,
  });
}
