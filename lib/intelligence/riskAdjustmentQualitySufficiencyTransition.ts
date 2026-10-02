import type {
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';
import type {
  RiskAdjustmentUpstreamOwnerScope,
} from './riskAdjustmentUpstreamHandoff';
import type {
  RiskAdjustmentRequiredQualityDimension,
} from './riskAdjustmentUpstreamMetadataRequirements';
import type {
  RiskAdjustmentQualitySufficiencyStatus,
  RiskAdjustmentQualitySufficiencyWitness,
} from './riskAdjustmentQualitySufficiencyWitness';

export const RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_TRANSITION_VERSION =
  'risk-adjustment-quality-sufficiency-transition-v1' as const;

export type RiskAdjustmentQualitySufficiencyTransitionStatus =
  | 'no-change'
  | 'progress'
  | 'regression'
  | 'mixed'
  | 'dependency-set-changed';

export type RiskAdjustmentQualitySufficiencyDependencyChange =
  | 'retained'
  | 'added'
  | 'removed';

export type RiskAdjustmentQualitySufficiencyTransitionEntry = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  ownerScope: RiskAdjustmentUpstreamOwnerScope;
  dependencyChange: RiskAdjustmentQualitySufficiencyDependencyChange;
  previousUnresolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  currentUnresolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  resolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  newlyUnresolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  unchangedUnresolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
}>;

export type RiskAdjustmentQualitySufficiencyTransition = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_TRANSITION_VERSION;
  status: RiskAdjustmentQualitySufficiencyTransitionStatus;
  previousWitnessStatus: RiskAdjustmentQualitySufficiencyStatus;
  currentWitnessStatus: RiskAdjustmentQualitySufficiencyStatus;
  previousReadyForCategoricalContract: boolean;
  currentReadyForCategoricalContract: boolean;
  dependencySetChanged: boolean;
  resolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  newlyUnresolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
  entries: readonly RiskAdjustmentQualitySufficiencyTransitionEntry[];
  numericEligible: false;
  score: null;
  penalty: null;
  weight: null;
}>;

function orderedUnique<T extends string>(
  values: readonly T[],
): readonly T[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) =>
      left.localeCompare(right)
    ),
  );
}

function difference<T extends string>(
  left: readonly T[],
  right: readonly T[],
): readonly T[] {
  const rightSet = new Set(right);
  return orderedUnique(left.filter((value) => !rightSet.has(value)));
}

function intersection<T extends string>(
  left: readonly T[],
  right: readonly T[],
): readonly T[] {
  const rightSet = new Set(right);
  return orderedUnique(left.filter((value) => rightSet.has(value)));
}

export function compareRiskAdjustmentQualitySufficiencyWitnesses(
  previous: RiskAdjustmentQualitySufficiencyWitness,
  current: RiskAdjustmentQualitySufficiencyWitness,
): RiskAdjustmentQualitySufficiencyTransition {
  const previousByVariable = new Map(
    previous.entries.map((entry) => [entry.variableId, entry]),
  );
  const currentByVariable = new Map(
    current.entries.map((entry) => [entry.variableId, entry]),
  );
  const variableIds = orderedUnique([
    ...previousByVariable.keys(),
    ...currentByVariable.keys(),
  ]);

  const entries = Object.freeze(
    variableIds.map((variableId) => {
      const previousEntry = previousByVariable.get(variableId);
      const currentEntry = currentByVariable.get(variableId);

      if (!previousEntry && !currentEntry) {
        throw new Error(
          'risk_adjustment_sufficiency_transition_entry_missing',
        );
      }

      const ownerScope =
        currentEntry?.ownerScope ?? previousEntry!.ownerScope;

      if (!previousEntry) {
        return Object.freeze({
          variableId,
          ownerScope,
          dependencyChange: 'added' as const,
          previousUnresolvedRequiredDimensions: Object.freeze([]),
          currentUnresolvedRequiredDimensions:
            currentEntry!.unresolvedRequiredDimensions,
          resolvedRequiredDimensions: Object.freeze([]),
          newlyUnresolvedRequiredDimensions:
            currentEntry!.unresolvedRequiredDimensions,
          unchangedUnresolvedRequiredDimensions: Object.freeze([]),
        });
      }

      if (!currentEntry) {
        return Object.freeze({
          variableId,
          ownerScope,
          dependencyChange: 'removed' as const,
          previousUnresolvedRequiredDimensions:
            previousEntry.unresolvedRequiredDimensions,
          currentUnresolvedRequiredDimensions: Object.freeze([]),
          // Removal is not blocker resolution. Keep these empty so a lost
          // dependency cannot be reported as quality progress.
          resolvedRequiredDimensions: Object.freeze([]),
          newlyUnresolvedRequiredDimensions: Object.freeze([]),
          unchangedUnresolvedRequiredDimensions: Object.freeze([]),
        });
      }

      if (previousEntry.ownerScope !== currentEntry.ownerScope) {
        throw new Error(
          'risk_adjustment_sufficiency_transition_owner_scope_changed',
        );
      }

      return Object.freeze({
        variableId,
        ownerScope,
        dependencyChange: 'retained' as const,
        previousUnresolvedRequiredDimensions:
          previousEntry.unresolvedRequiredDimensions,
        currentUnresolvedRequiredDimensions:
          currentEntry.unresolvedRequiredDimensions,
        resolvedRequiredDimensions: difference(
          previousEntry.unresolvedRequiredDimensions,
          currentEntry.unresolvedRequiredDimensions,
        ),
        newlyUnresolvedRequiredDimensions: difference(
          currentEntry.unresolvedRequiredDimensions,
          previousEntry.unresolvedRequiredDimensions,
        ),
        unchangedUnresolvedRequiredDimensions: intersection(
          previousEntry.unresolvedRequiredDimensions,
          currentEntry.unresolvedRequiredDimensions,
        ),
      });
    }),
  );

  const dependencySetChanged = entries.some(
    (entry) => entry.dependencyChange !== 'retained',
  );

  const resolvedRequiredDimensions =
    orderedUnique<RiskAdjustmentRequiredQualityDimension>(
      entries.reduce<RiskAdjustmentRequiredQualityDimension[]>(
        (values, entry) => {
          values.push(...entry.resolvedRequiredDimensions);
          return values;
        },
        [],
      ),
    );
  const newlyUnresolvedRequiredDimensions =
    orderedUnique<RiskAdjustmentRequiredQualityDimension>(
      entries.reduce<RiskAdjustmentRequiredQualityDimension[]>(
        (values, entry) => {
          values.push(...entry.newlyUnresolvedRequiredDimensions);
          return values;
        },
        [],
      ),
    );

  let status: RiskAdjustmentQualitySufficiencyTransitionStatus;
  if (dependencySetChanged) {
    status = 'dependency-set-changed';
  } else if (
    resolvedRequiredDimensions.length > 0
    && newlyUnresolvedRequiredDimensions.length > 0
  ) {
    status = 'mixed';
  } else if (newlyUnresolvedRequiredDimensions.length > 0) {
    status = 'regression';
  } else if (resolvedRequiredDimensions.length > 0) {
    status = 'progress';
  } else {
    status = 'no-change';
  }

  return Object.freeze({
    contractVersion:
      RISK_ADJUSTMENT_QUALITY_SUFFICIENCY_TRANSITION_VERSION,
    status,
    previousWitnessStatus: previous.status,
    currentWitnessStatus: current.status,
    previousReadyForCategoricalContract:
      previous.readyForCategoricalContract,
    currentReadyForCategoricalContract:
      current.readyForCategoricalContract,
    dependencySetChanged,
    resolvedRequiredDimensions,
    newlyUnresolvedRequiredDimensions,
    entries,
    numericEligible: false as const,
    score: null,
    penalty: null,
    weight: null,
  });
}
