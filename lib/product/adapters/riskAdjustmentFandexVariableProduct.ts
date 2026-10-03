import {
  RISK_ADJUSTMENT_CATEGORICAL_STATES_VERSION,
} from '../../intelligence/riskAdjustmentCategoricalStates';
import {
  RISK_ADJUSTMENT_CURRENT_READINESS_REPORT_VERSION,
  type RiskAdjustmentCurrentReadinessReport,
} from '../../intelligence/riskAdjustmentCurrentReadinessReport';
import {
  RISK_ADJUSTMENT_POINT_CONTRACT_VERSION,
} from '../../intelligence/riskAdjustmentPointConstruct';
import {
  RISK_ADJUSTMENT_PRODUCT_CONTRACT_CANDIDATE_VERSION,
  type RiskAdjustmentProductContractCandidate,
} from '../../intelligence/riskAdjustmentProductContractCandidate';
import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';

export const RISK_ADJUSTMENT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION =
  'risk-adjustment-fandex-variable-product-adapter-v1' as const;

export type RiskAdjustmentFandexVariableProductAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'candidate-contract-invalid'
        | 'readiness-contract-invalid'
        | 'numeric-boundary-violated'
        | 'authorization-boundary-violated'
        | 'candidate-readiness-mismatch'
        | 'candidate-current-input-mismatch'
        | 'categorical-state-missing';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function expectedCandidateReadiness(
  status: RiskAdjustmentCurrentReadinessReport['currentProductStatus'],
): RiskAdjustmentProductContractCandidate['readinessState'] {
  if (status === 'dependency-blocked') return 'dependency-blocked';
  if (status === 'categorical-contract-ready') {
    return 'categorical-contract-ready';
  }
  return 'insufficient-data';
}

export function adaptRiskAdjustmentToFandexVariableProduct(input: Readonly<{
  candidate: RiskAdjustmentProductContractCandidate;
  readiness: RiskAdjustmentCurrentReadinessReport;
}>): RiskAdjustmentFandexVariableProductAdapterResult {
  const candidate = input.candidate;
  const readiness = input.readiness;

  if (
    candidate.contractVersion
      !== RISK_ADJUSTMENT_PRODUCT_CONTRACT_CANDIDATE_VERSION
    || candidate.identity.variableId !== 'riskAdjustmentPoint'
    || candidate.constructId !== 'validated-product-data-uncertainty-state'
    || candidate.productForm !== 'categorical-adjustment-state'
    || candidate.assessment.contractVersion
      !== RISK_ADJUSTMENT_POINT_CONTRACT_VERSION
    || candidate.categoricalState.contractVersion
      !== RISK_ADJUSTMENT_CATEGORICAL_STATES_VERSION
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'candidate-contract-invalid' as const,
    });
  }

  if (
    readiness.contractVersion
      !== RISK_ADJUSTMENT_CURRENT_READINESS_REPORT_VERSION
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'readiness-contract-invalid' as const,
    });
  }

  if (
    candidate.numericEligible !== false
    || candidate.categoricalState.numericEligible !== false
    || candidate.assessment.numericEligible !== false
    || candidate.score !== null
    || candidate.penalty !== null
    || candidate.weight !== null
    || candidate.assessment.score !== null
    || candidate.assessment.penalty !== null
    || candidate.assessment.weight !== null
    || readiness.numericEligible !== false
    || readiness.score !== null
    || readiness.penalty !== null
    || readiness.weight !== null
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'numeric-boundary-violated' as const,
    });
  }

  if (
    candidate.activationAuthorized !== false
    || candidate.publicationAuthorized !== false
    || candidate.publicRouteAuthorized !== false
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'authorization-boundary-violated' as const,
    });
  }

  if (
    candidate.readinessState
      !== expectedCandidateReadiness(readiness.currentProductStatus)
    || readiness.currentProductReadyForCategoricalContract
      !== (candidate.readinessState === 'categorical-contract-ready')
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'candidate-readiness-mismatch' as const,
    });
  }

  const candidateInputIds = candidate.assessment.dependencies
    .map((dependency) => dependency.variableId)
    .sort((left, right) => left.localeCompare(right));
  const currentAcceptedIds = readiness.entries
    .filter((entry) => entry.acceptedForRiskConsumption)
    .map((entry) => entry.variableId)
    .sort((left, right) => left.localeCompare(right));

  if (
    candidateInputIds.length !== currentAcceptedIds.length
    || candidateInputIds.some(
      (variableId, index) => variableId !== currentAcceptedIds[index],
    )
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'candidate-current-input-mismatch' as const,
    });
  }

  const dependencyBlocked =
    readiness.currentProductStatus === 'dependency-blocked';
  const categoricalReady =
    readiness.currentProductStatus === 'categorical-contract-ready';

  const categoricalState = categoricalReady
    ? candidate.categoricalState.states.join('|')
    : null;

  if (
    categoricalReady
    && (
      categoricalState === null
      || categoricalState.trim().length === 0
    )
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'categorical-state-missing' as const,
    });
  }

  const dependencyEvidence = candidate.assessment.dependencies.flatMap(
    (dependency) => [
      ...dependency.evidenceRefs,
      ...dependency.blockers.map(
        (blocker) =>
          `risk-dependency-blocker:${dependency.variableId}:${blocker}`,
      ),
      ...dependency.qualityIssues.map(
        (issue) =>
          `risk-quality-issue:${dependency.variableId}:${issue}`,
      ),
    ],
  );

  const readinessEvidence = readiness.entries.flatMap((entry) => [
    `risk-readiness-entry:${entry.variableId}:${entry.state}`,
    ...(entry.exclusionReason === null
      ? []
      : [
          `risk-upstream-exclusion:${entry.variableId}:${entry.exclusionReason}`,
        ]),
    ...entry.unresolvedRequiredDimensions.map(
      (dimension) =>
        `risk-unresolved-dimension:${entry.variableId}:${dimension}`,
    ),
  ]);

  const record = createFandexVariableProductRecord({
    variableId: 'riskAdjustmentPoint',
    canonicalArtistId: candidate.identity.sourceArtistId,
    lifecycleState: 'research',
    materialClass: 'real',
    readinessState: dependencyBlocked
      ? 'blocked'
      : categoricalReady
        ? 'research-only'
        : 'building-history',
    availability: dependencyBlocked
      ? 'blocked'
      : categoricalReady
        ? 'available'
        : 'unavailable',
    valueRepresentation: dependencyBlocked
      ? {
          kind: 'none',
          reason: 'blocked',
        }
      : categoricalReady
        ? {
            kind: 'quality',
            state: categoricalState,
          }
        : {
            kind: 'none',
            reason: 'not-produced',
          },
    asOf: null,
    observationTime: { kind: 'unknown' },
    collectionTime: null,
    confidence: 'insufficient',
    coverage:
      readiness.candidateUniverseStatus === 'all-current-real-production'
        ? 'complete'
        : 'incomplete',
    freshness: 'unknown',
    missingReason: null,
    unsupportedReason: null,
    blockerReason: dependencyBlocked
      ? orderedUnique([
          ...candidate.assessment.blockedUpstreamVariables.map(
            (variableId) => `dependency-blocked:${variableId}`,
          ),
          ...candidate.assessment.qualityIssues.map(
            (issue) => `quality-issue:${issue}`,
          ),
        ]).join('|') || 'risk-adjustment-dependency-blocked'
      : null,
    evidenceRefs: orderedUnique([
      `contract:${candidate.contractVersion}`,
      `assessment-contract:${candidate.assessment.contractVersion}`,
      `categorical-contract:${candidate.categoricalState.contractVersion}`,
      `readiness:${readiness.contractVersion}`,
      `risk-current-product-status:${readiness.currentProductStatus}`,
      `risk-candidate-universe-status:${readiness.candidateUniverseStatus}`,
      `risk-current-real-production-count:${readiness.currentRealProductionCount}`,
      `risk-excluded-upstream-count:${readiness.excludedUpstreamCount}`,
      ...candidate.categoricalState.states.map(
        (state) => `risk-categorical-state:${state}`,
      ),
      ...candidate.assessment.trueZeroVariables.map(
        (variableId) => `risk-true-zero:${variableId}`,
      ),
      ...dependencyEvidence,
      ...readinessEvidence,
    ]),
    methodologyVersion: RISK_ADJUSTMENT_POINT_CONTRACT_VERSION,
    sourceVersion: RISK_ADJUSTMENT_PRODUCT_CONTRACT_CANDIDATE_VERSION,
    productVersion:
      RISK_ADJUSTMENT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  });

  return Object.freeze({
    status: 'ok' as const,
    record,
  });
}
