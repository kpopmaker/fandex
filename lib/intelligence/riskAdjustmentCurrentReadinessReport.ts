import {
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
  type RiskAdjustmentCurrentUpstreamEligibilityEntry,
} from './riskAdjustmentCurrentUpstreamEligibility';
import type {
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';
import type {
  RiskAdjustmentRequiredQualityDimension,
} from './riskAdjustmentUpstreamMetadataRequirements';
import type {
  RiskAdjustmentUpstreamOwnerScope,
} from './riskAdjustmentUpstreamHandoff';
import type {
  RiskAdjustmentQualitySufficiencyStatus,
  RiskAdjustmentQualitySufficiencyWitness,
} from './riskAdjustmentQualitySufficiencyWitness';

export const RISK_ADJUSTMENT_CURRENT_READINESS_REPORT_VERSION =
  'risk-adjustment-current-readiness-report-v1' as const;

export type RiskAdjustmentCandidateUniverseStatus =
  | 'partial-current-real-production'
  | 'all-current-real-production';

export type RiskAdjustmentCurrentReadinessEntryState =
  | 'eligible-quality-blocked'
  | 'eligible-dependency-blocked'
  | 'eligible-categorical-ready'
  | 'excluded-upstream-readiness';

export type RiskAdjustmentCurrentReadinessEntry = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  ownerScope: RiskAdjustmentUpstreamOwnerScope;
  state: RiskAdjustmentCurrentReadinessEntryState;
  acceptedForRiskConsumption: boolean;
  exclusionReason:
    RiskAdjustmentCurrentUpstreamEligibilityEntry['exclusionReason'];
  unresolvedRequiredDimensions:
    readonly RiskAdjustmentRequiredQualityDimension[];
}>;

export type RiskAdjustmentCurrentReadinessReport = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_CURRENT_READINESS_REPORT_VERSION;
  currentProductStatus: RiskAdjustmentQualitySufficiencyStatus;
  currentProductReadyForCategoricalContract: boolean;
  candidateUniverseStatus: RiskAdjustmentCandidateUniverseStatus;
  candidateCount: number;
  currentRealProductionCount: number;
  excludedUpstreamCount: number;
  unresolvedQualityOwnerCount: number;
  excludedOwnerCount: number;
  entries: readonly RiskAdjustmentCurrentReadinessEntry[];
  numericEligible: false;
  score: null;
  penalty: null;
  weight: null;
}>;

function sorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...values].sort((left, right) => left.localeCompare(right)),
  );
}

function stateForEligibleWitnessEntry(
  witnessStatus: RiskAdjustmentQualitySufficiencyStatus,
  readyForCategoricalContract: boolean,
): Exclude<
  RiskAdjustmentCurrentReadinessEntryState,
  'excluded-upstream-readiness'
> {
  if (readyForCategoricalContract) {
    return 'eligible-categorical-ready';
  }
  if (witnessStatus === 'dependency-blocked') {
    return 'eligible-dependency-blocked';
  }
  return 'eligible-quality-blocked';
}

export function buildRiskAdjustmentCurrentReadinessReport(
  witness: RiskAdjustmentQualitySufficiencyWitness,
): RiskAdjustmentCurrentReadinessReport {
  const eligible = RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.filter(
    (entry) => entry.acceptedForRiskConsumption,
  );
  const excluded = RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.filter(
    (entry) => !entry.acceptedForRiskConsumption,
  );

  const eligibleIds = sorted(
    eligible.map((entry) => entry.variableId),
  );
  const witnessIds = sorted(
    witness.entries.map((entry) => entry.variableId),
  );

  if (
    eligibleIds.length !== witnessIds.length
    || eligibleIds.some(
      (variableId, index) => variableId !== witnessIds[index],
    )
  ) {
    throw new Error(
      'risk_adjustment_current_readiness_witness_eligibility_mismatch',
    );
  }

  if (
    eligible.length > 0
    && witness.status === 'no-input'
  ) {
    throw new Error(
      'risk_adjustment_current_readiness_unexpected_no_input',
    );
  }

  const witnessByVariable = new Map(
    witness.entries.map((entry) => [entry.variableId, entry]),
  );

  const entries = Object.freeze(
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.map((eligibility) => {
      if (!eligibility.acceptedForRiskConsumption) {
        return Object.freeze({
          variableId: eligibility.variableId,
          ownerScope: eligibility.ownerScope,
          state: 'excluded-upstream-readiness' as const,
          acceptedForRiskConsumption: false,
          exclusionReason: eligibility.exclusionReason,
          unresolvedRequiredDimensions: Object.freeze(
            [] as RiskAdjustmentRequiredQualityDimension[],
          ),
        });
      }

      const witnessEntry = witnessByVariable.get(
        eligibility.variableId,
      );
      if (!witnessEntry) {
        throw new Error(
          'risk_adjustment_current_readiness_witness_entry_missing',
        );
      }
      if (witnessEntry.ownerScope !== eligibility.ownerScope) {
        throw new Error(
          'risk_adjustment_current_readiness_owner_scope_mismatch',
        );
      }

      return Object.freeze({
        variableId: eligibility.variableId,
        ownerScope: eligibility.ownerScope,
        state: stateForEligibleWitnessEntry(
          witness.status,
          witnessEntry.readyForCategoricalContract,
        ),
        acceptedForRiskConsumption: true,
        exclusionReason: null,
        unresolvedRequiredDimensions:
          witnessEntry.unresolvedRequiredDimensions,
      });
    }),
  );

  const candidateUniverseStatus:
    RiskAdjustmentCandidateUniverseStatus =
      excluded.length === 0
        ? 'all-current-real-production'
        : 'partial-current-real-production';

  return Object.freeze({
    contractVersion:
      RISK_ADJUSTMENT_CURRENT_READINESS_REPORT_VERSION,
    currentProductStatus: witness.status,
    currentProductReadyForCategoricalContract:
      witness.readyForCategoricalContract,
    candidateUniverseStatus,
    candidateCount:
      RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.length,
    currentRealProductionCount: eligible.length,
    excludedUpstreamCount: excluded.length,
    unresolvedQualityOwnerCount: witness.unresolvedOwnerCount,
    excludedOwnerCount: new Set(
      excluded.map((entry) => entry.ownerScope),
    ).size,
    entries,
    numericEligible: false as const,
    score: null,
    penalty: null,
    weight: null,
  });
}
