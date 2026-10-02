import {
  assessRiskAdjustmentDependency,
  deriveRiskAdjustmentAssessment,
  RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES,
  type RiskAdjustmentQualityIssue,
  type RiskAdjustmentUpstreamInput,
  type RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';
import {
  RISK_ADJUSTMENT_UPSTREAM_OWNER_SCOPE,
  type RiskAdjustmentUpstreamOwnerScope,
} from './riskAdjustmentUpstreamHandoff';
import type {
  RiskAdjustmentRequiredQualityDimension,
} from './riskAdjustmentUpstreamMetadataRequirements';

export const RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_WITNESS_VERSION =
  'risk-adjustment-quality-sufficiency-witness-v1' as const;

export type RiskAdjustmentQualitySufficiencyStatus =
  | 'no-input'
  | 'dependency-blocked'
  | 'quality-sufficiency-blocked'
  | 'categorical-contract-ready';

export type RiskAdjustmentQualitySufficiencyEntry = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  ownerScope: RiskAdjustmentUpstreamOwnerScope;
  dependencyStatus: 'usable' | 'blocked';
  unresolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  blockingQualityIssues: readonly RiskAdjustmentQualityIssue[];
  nonBlockingQualityIssues: readonly RiskAdjustmentQualityIssue[];
  evidenceRefs: readonly string[];
  readyForCategoricalContract: boolean;
}>;

export type RiskAdjustmentQualitySufficiencyWitness = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_WITNESS_VERSION;
  status: RiskAdjustmentQualitySufficiencyStatus;
  readyForCategoricalContract: boolean;
  unresolvedOwnerCount: number;
  unresolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  blockingQualityIssues: readonly RiskAdjustmentQualityIssue[];
  entries: readonly RiskAdjustmentQualitySufficiencyEntry[];
  numericEligible: false;
  score: null;
  penalty: null;
  weight: null;
}>;

const REQUIRED_DIMENSION_BY_FAIL_CLOSED_QUALITY_ISSUE:
  Readonly<Record<
    typeof RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES[number],
    RiskAdjustmentRequiredQualityDimension
  >> = Object.freeze({
    'availability-unresolved': 'availability',
    'identity-unresolved': 'identity',
    'identity-conflict': 'identity',
    'coverage-unknown': 'coverage',
    'freshness-unknown': 'freshness',
    'conflict-unknown': 'conflict',
    'revision-state-unknown': 'revision',
    'confidence-insufficient': 'confidence',
    'history-insufficient': 'history',
    'history-unknown': 'history',
  });

export const RISK_ADJUSTMENT_FAIL_CLOSED_DIMENSION_MAP =
  REQUIRED_DIMENSION_BY_FAIL_CLOSED_QUALITY_ISSUE;

function orderedUnique<T extends string>(
  values: readonly T[],
): readonly T[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) =>
      left.localeCompare(right)
    ),
  );
}

function isFailClosedIssue(
  issue: RiskAdjustmentQualityIssue,
): issue is typeof RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES[number] {
  return RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES.includes(
    issue as typeof RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES[number],
  );
}

export function deriveRiskAdjustmentQualitySufficiencyWitness(
  inputs: readonly RiskAdjustmentUpstreamInput[],
): RiskAdjustmentQualitySufficiencyWitness {
  const assessment = deriveRiskAdjustmentAssessment(inputs);

  const entries = Object.freeze(
    inputs
      .map((input) => {
        const dependency = assessRiskAdjustmentDependency(input);
        const blockingQualityIssues = orderedUnique(
          dependency.qualityIssues.filter(isFailClosedIssue),
        );
        const nonBlockingQualityIssues = orderedUnique(
          dependency.qualityIssues.filter(
            (issue) => !isFailClosedIssue(issue),
          ),
        );
        const unresolvedRequiredDimensions = orderedUnique(
          blockingQualityIssues.map(
            (issue) =>
              REQUIRED_DIMENSION_BY_FAIL_CLOSED_QUALITY_ISSUE[issue],
          ),
        );

        return Object.freeze({
          variableId: dependency.variableId,
          ownerScope:
            RISK_ADJUSTMENT_UPSTREAM_OWNER_SCOPE[dependency.variableId],
          dependencyStatus: dependency.status,
          unresolvedRequiredDimensions,
          blockingQualityIssues,
          nonBlockingQualityIssues,
          evidenceRefs: dependency.evidenceRefs,
          readyForCategoricalContract:
            dependency.status === 'usable'
            && unresolvedRequiredDimensions.length === 0,
        });
      })
      .sort((left, right) =>
        left.variableId.localeCompare(right.variableId)
      ),
  );

  const unresolvedEntries = entries.filter(
    (entry) => !entry.readyForCategoricalContract,
  );
  const unresolvedRequiredDimensions = orderedUnique(
    entries.flatMap((entry) => entry.unresolvedRequiredDimensions),
  );
  const blockingQualityIssues = orderedUnique(
    entries.flatMap((entry) => entry.blockingQualityIssues),
  );

  let status: RiskAdjustmentQualitySufficiencyStatus;
  if (inputs.length === 0) {
    status = 'no-input';
  } else if (assessment.status === 'dependency_blocked') {
    status = 'dependency-blocked';
  } else if (assessment.status === 'insufficient_data') {
    status = 'quality-sufficiency-blocked';
  } else {
    status = 'categorical-contract-ready';
  }

  return Object.freeze({
    contractVersion:
      RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_WITNESS_VERSION,
    status,
    readyForCategoricalContract:
      status === 'categorical-contract-ready',
    unresolvedOwnerCount: new Set(
      unresolvedEntries.map((entry) => entry.ownerScope),
    ).size,
    unresolvedRequiredDimensions,
    blockingQualityIssues,
    entries,
    numericEligible: false as const,
    score: null,
    penalty: null,
    weight: null,
  });
}
