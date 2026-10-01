import {
  createRiskAdjustmentProductContractCandidate,
  type RiskAdjustmentProductContractCandidate,
} from './riskAdjustmentProductContractCandidate';
import type {
  RiskAdjustmentUpstreamInput,
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';
import type {
  RiskAdjustmentUpstreamHandoffAssessment,
} from './riskAdjustmentUpstreamHandoff';

export const RISK_ADJUSTMENT_PRODUCT_DEPENDENCY_ASSEMBLY_VERSION =
  'risk-adjustment-product-dependency-assembly-v1' as const;

export type RiskAdjustmentProductDependencyCandidate = Readonly<{
  handoff: RiskAdjustmentUpstreamHandoffAssessment;
  projectedInput: RiskAdjustmentUpstreamInput | null;
}>;

export type RiskAdjustmentProductDependencyAssemblyEntry = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  handoffStatus: RiskAdjustmentUpstreamHandoffAssessment['status'];
  projectionPresent: boolean;
  consumed: boolean;
}>;

export type RiskAdjustmentProductDependencyAssembly = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_PRODUCT_DEPENDENCY_ASSEMBLY_VERSION;
  productCandidate: RiskAdjustmentProductContractCandidate;
  dependencies: readonly RiskAdjustmentProductDependencyAssemblyEntry[];
  consumedVariableIds: readonly RiskAdjustmentUpstreamVariableId[];
  blockedVariableIds: readonly RiskAdjustmentUpstreamVariableId[];
}>;

function orderedUnique<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

export function assembleRiskAdjustmentProductDependencies(input: Readonly<{
  artistId: string;
  dependencies: readonly RiskAdjustmentProductDependencyCandidate[];
}>): RiskAdjustmentProductDependencyAssembly {
  const variableIds = input.dependencies.map(
    (dependency) => dependency.handoff.variableId,
  );
  if (new Set(variableIds).size !== variableIds.length) {
    throw new Error('risk_adjustment_dependency_handoff_duplicate');
  }

  const consumedInputs: RiskAdjustmentUpstreamInput[] = [];
  const entries = input.dependencies.map((dependency) => {
    const variableId = dependency.handoff.variableId;
    const projected = dependency.projectedInput;

    if (projected !== null && projected.variableId !== variableId) {
      throw new Error('risk_adjustment_dependency_projection_mismatch');
    }

    const consumed = dependency.handoff.acceptedForRiskConsumption;
    if (consumed && projected === null) {
      throw new Error('risk_adjustment_accepted_dependency_projection_missing');
    }

    if (consumed && projected !== null) {
      if (
        projected.lifecycleState !== 'production'
        || projected.materialClass !== 'real'
      ) {
        throw new Error('risk_adjustment_accepted_dependency_boundary_invalid');
      }
      consumedInputs.push(projected);
    }

    return Object.freeze({
      variableId,
      handoffStatus: dependency.handoff.status,
      projectionPresent: projected !== null,
      consumed,
    });
  });

  const productCandidate = createRiskAdjustmentProductContractCandidate({
    artistId: input.artistId,
    inputs: consumedInputs,
  });

  return Object.freeze({
    contractVersion: RISK_ADJUSTMENT_PRODUCT_DEPENDENCY_ASSEMBLY_VERSION,
    productCandidate,
    dependencies: Object.freeze(
      [...entries].sort((left, right) =>
        left.variableId.localeCompare(right.variableId)
      ),
    ),
    consumedVariableIds: orderedUnique(
      entries
        .filter((entry) => entry.consumed)
        .map((entry) => entry.variableId),
    ),
    blockedVariableIds: orderedUnique(
      entries
        .filter((entry) => !entry.consumed)
        .map((entry) => entry.variableId),
    ),
  });
}
