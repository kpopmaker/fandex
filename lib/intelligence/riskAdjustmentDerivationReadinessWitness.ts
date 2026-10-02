import {
  assembleRiskAdjustmentProductDependencies,
  type RiskAdjustmentProductDependencyCandidate,
  type RiskAdjustmentProductDependencyAssembly,
} from './riskAdjustmentProductDependencyAssembly';
import {
  assessRiskAdjustmentDependency,
  RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES,
  type RiskAdjustmentQualityIssue,
  type RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_DERIVATION_READINESS_WITNESS_VERSION =
  'risk-adjustment-derivation-readiness-witness-v1' as const;

export type RiskAdjustmentDependencyReadinessState =
  | 'metadata-blocked'
  | 'not-production-eligible'
  | 'metadata-consumable-quality-insufficient'
  | 'metadata-consumable-categorical-ready';

export type RiskAdjustmentIntegrationReadinessState =
  | 'none-consumable'
  | 'partially-consumable'
  | 'all-consumable';

export type RiskAdjustmentAcceptedQualityReadinessState =
  | 'not-evaluable'
  | 'insufficient'
  | 'mixed'
  | 'categorical-ready';

export type RiskAdjustmentDerivationReadinessDependency = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  handoffStatus:
    RiskAdjustmentProductDependencyCandidate['handoff']['status'];
  state: RiskAdjustmentDependencyReadinessState;
  projectionPresent: boolean;
  consumed: boolean;
  qualityIssues: readonly RiskAdjustmentQualityIssue[];
  failClosedQualityIssues: readonly RiskAdjustmentQualityIssue[];
}>;

export type RiskAdjustmentDerivationReadinessWitness = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_DERIVATION_READINESS_WITNESS_VERSION;
  integrationState: RiskAdjustmentIntegrationReadinessState;
  acceptedQualityState: RiskAdjustmentAcceptedQualityReadinessState;
  productReadinessState:
    RiskAdjustmentProductDependencyAssembly['productCandidate']['readinessState'];
  dependencies: readonly RiskAdjustmentDerivationReadinessDependency[];
  acceptedVariableIds: readonly RiskAdjustmentUpstreamVariableId[];
  metadataBlockedVariableIds: readonly RiskAdjustmentUpstreamVariableId[];
  notProductionEligibleVariableIds: readonly RiskAdjustmentUpstreamVariableId[];
  qualityInsufficientVariableIds: readonly RiskAdjustmentUpstreamVariableId[];
  categoricalReadyVariableIds: readonly RiskAdjustmentUpstreamVariableId[];
  numericEligible: false;
  score: null;
  penalty: null;
  weight: null;
  activationAuthorized: false;
  publicationAuthorized: false;
  publicRouteAuthorized: false;
}>;

function orderedUnique<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

function integrationState(
  total: number,
  accepted: number,
): RiskAdjustmentIntegrationReadinessState {
  if (total === 0 || accepted === 0) return 'none-consumable';
  if (accepted === total) return 'all-consumable';
  return 'partially-consumable';
}

function acceptedQualityState(
  acceptedDependencies:
    readonly RiskAdjustmentDerivationReadinessDependency[],
): RiskAdjustmentAcceptedQualityReadinessState {
  if (acceptedDependencies.length === 0) return 'not-evaluable';

  const insufficientCount = acceptedDependencies.filter(
    (dependency) =>
      dependency.state === 'metadata-consumable-quality-insufficient',
  ).length;

  if (insufficientCount === acceptedDependencies.length) {
    return 'insufficient';
  }
  if (insufficientCount === 0) {
    return 'categorical-ready';
  }
  return 'mixed';
}

export function createRiskAdjustmentDerivationReadinessWitness(
  input: Readonly<{
    artistId: string;
    dependencies: readonly RiskAdjustmentProductDependencyCandidate[];
  }>,
): RiskAdjustmentDerivationReadinessWitness {
  const assembly = assembleRiskAdjustmentProductDependencies(input);

  const dependencies: RiskAdjustmentDerivationReadinessDependency[] =
    input.dependencies.map((candidate) => {
      const variableId = candidate.handoff.variableId;
      const projectedInput = candidate.projectedInput;

      if (candidate.handoff.status === 'not-production-eligible') {
        return Object.freeze({
          variableId,
          handoffStatus: candidate.handoff.status,
          state: 'not-production-eligible' as const,
          projectionPresent: projectedInput !== null,
          consumed: false,
          qualityIssues: Object.freeze([]),
          failClosedQualityIssues: Object.freeze([]),
        });
      }

      if (!candidate.handoff.acceptedForRiskConsumption) {
        return Object.freeze({
          variableId,
          handoffStatus: candidate.handoff.status,
          state: 'metadata-blocked' as const,
          projectionPresent: projectedInput !== null,
          consumed: false,
          qualityIssues: Object.freeze([]),
          failClosedQualityIssues: Object.freeze([]),
        });
      }

      if (projectedInput === null) {
        throw new Error(
          'risk_adjustment_readiness_accepted_projection_missing',
        );
      }

      const dependency = assessRiskAdjustmentDependency(projectedInput);
      const failClosedQualityIssues = orderedUnique(
        dependency.qualityIssues.filter((issue) =>
          RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES.includes(
            issue as typeof RISK_ADJUSTMENT_FAIL_CLOSED_QUALITY_ISSUES[number],
          ),
        ),
      );
      const state =
        failClosedQualityIssues.length > 0
          ? 'metadata-consumable-quality-insufficient' as const
          : 'metadata-consumable-categorical-ready' as const;

      return Object.freeze({
        variableId,
        handoffStatus: candidate.handoff.status,
        state,
        projectionPresent: true,
        consumed: true,
        qualityIssues: dependency.qualityIssues,
        failClosedQualityIssues,
      });
    });

  const orderedDependencies = Object.freeze(
    [...dependencies].sort((left, right) =>
      left.variableId.localeCompare(right.variableId)
    ),
  );
  const accepted = orderedDependencies.filter(
    (dependency) => dependency.consumed,
  );

  return Object.freeze({
    contractVersion:
      RISK_ADJUSTMENT_DERIVATION_READINESS_WITNESS_VERSION,
    integrationState: integrationState(
      orderedDependencies.length,
      accepted.length,
    ),
    acceptedQualityState: acceptedQualityState(accepted),
    productReadinessState:
      assembly.productCandidate.readinessState,
    dependencies: orderedDependencies,
    acceptedVariableIds: orderedUnique(
      accepted.map((dependency) => dependency.variableId),
    ),
    metadataBlockedVariableIds: orderedUnique(
      orderedDependencies
        .filter((dependency) => dependency.state === 'metadata-blocked')
        .map((dependency) => dependency.variableId),
    ),
    notProductionEligibleVariableIds: orderedUnique(
      orderedDependencies
        .filter(
          (dependency) =>
            dependency.state === 'not-production-eligible',
        )
        .map((dependency) => dependency.variableId),
    ),
    qualityInsufficientVariableIds: orderedUnique(
      orderedDependencies
        .filter(
          (dependency) =>
            dependency.state
              === 'metadata-consumable-quality-insufficient',
        )
        .map((dependency) => dependency.variableId),
    ),
    categoricalReadyVariableIds: orderedUnique(
      orderedDependencies
        .filter(
          (dependency) =>
            dependency.state
              === 'metadata-consumable-categorical-ready',
        )
        .map((dependency) => dependency.variableId),
    ),
    numericEligible: false as const,
    score: null,
    penalty: null,
    weight: null,
    activationAuthorized: false as const,
    publicationAuthorized: false as const,
    publicRouteAuthorized: false as const,
  });
}
