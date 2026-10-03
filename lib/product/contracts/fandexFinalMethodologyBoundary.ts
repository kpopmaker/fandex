import {
  FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION,
  FANDEX_NORMALIZATION_RESEARCH_PURPOSE,
  type FandexNormalizationResearchDataset,
  type FandexNormalizationResearchVariableSummary,
} from './fandexNormalizationResearch';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from './fandexVariableProduct';

export const FANDEX_FINAL_METHODOLOGY_BOUNDARY_CONTRACT_VERSION =
  'fandex-final-methodology-boundary-v1' as const;

export const FANDEX_FINAL_METHODOLOGY_BOUNDARY_STATE =
  'awaiting-explicit-methodology-decisions' as const;

export const FANDEX_FINAL_METHODOLOGY_DECISION_IDS = Object.freeze([
  'normalization-method',
  'variable-weighting',
  'candidate-eligibility',
  'aggregate-coverage',
  'aggregate-confidence',
  'aggregate-freshness',
  'risk-adjustment-application',
  'score-composition',
] as const);

export type FandexFinalMethodologyDecisionId =
  typeof FANDEX_FINAL_METHODOLOGY_DECISION_IDS[number];

export type FandexFinalMethodologyDecision = Readonly<{
  decisionId: FandexFinalMethodologyDecisionId;
  state: 'unresolved';
  approvedValue: null;
  approvalRef: null;
}>;

export type FandexFinalMethodologyVariableResearch = Readonly<{
  variableId: FandexVariableProductId;
  summary: FandexNormalizationResearchVariableSummary;
}>;

export type FandexFinalMethodologyBoundary = Readonly<{
  contractVersion:
    typeof FANDEX_FINAL_METHODOLOGY_BOUNDARY_CONTRACT_VERSION;
  state: typeof FANDEX_FINAL_METHODOLOGY_BOUNDARY_STATE;
  sourceNormalizationResearchContractVersion:
    typeof FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION;
  sourceRunId: string;
  sourceCohortVersion: string;
  sourceSampleCount: number;
  sourceDistinctArtistCount: number;
  variableResearch: readonly FandexFinalMethodologyVariableResearch[];
  decisions: readonly FandexFinalMethodologyDecision[];
  unresolvedDecisionIds: readonly FandexFinalMethodologyDecisionId[];
  explicitMethodologyApprovalRequired: true;
  finalizationApproved: false;
  methodologyVersion: null;
  normalizationMethod: null;
  normalizationVersion: null;
  weights: null;
  candidateEligibilityRule: null;
  aggregateCoverageRule: null;
  aggregateConfidenceRule: null;
  aggregateFreshnessRule: null;
  riskAdjustmentApplicationRule: null;
  scoreCompositionRule: null;
  fandexScoreDefined: false;
  rankingDefined: false;
  publicPublicationDecisionOutOfScope: true;
  productionActivationDecisionOutOfScope: true;
}>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertResearchDataset(
  dataset: FandexNormalizationResearchDataset,
): void {
  if (
    dataset.contractVersion
      !== FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION
    || dataset.purpose !== FANDEX_NORMALIZATION_RESEARCH_PURPOSE
  ) {
    throw new Error(
      'fandex_final_methodology_boundary_research_contract_invalid',
    );
  }

  if (
    !isNonEmptyString(dataset.sourceRunId)
    || !isNonEmptyString(dataset.sourceCohortVersion)
  ) {
    throw new Error(
      'fandex_final_methodology_boundary_source_identity_invalid',
    );
  }

  if (
    dataset.normalizationDefined !== false
    || dataset.normalizationMethod !== null
    || dataset.normalizationVersion !== null
    || dataset.crossVariableRawAggregationAllowed !== false
    || dataset.weightsDefined !== false
    || dataset.fandexScoreDefined !== false
    || dataset.rankingDefined !== false
  ) {
    throw new Error(
      'fandex_final_methodology_boundary_preselected_methodology_forbidden',
    );
  }

  if (
    dataset.variableCohorts.length !== FANDEX_VARIABLE_PRODUCT_IDS.length
  ) {
    throw new Error(
      'fandex_final_methodology_boundary_variable_count_invalid',
    );
  }

  const seen = new Set<FandexVariableProductId>();

  for (let index = 0; index < FANDEX_VARIABLE_PRODUCT_IDS.length; index += 1) {
    const expectedVariableId = FANDEX_VARIABLE_PRODUCT_IDS[index];
    const cohort = dataset.variableCohorts[index];

    if (!cohort || cohort.variableId !== expectedVariableId) {
      throw new Error(
        `fandex_final_methodology_boundary_variable_order_invalid:${expectedVariableId}`,
      );
    }
    if (seen.has(cohort.variableId)) {
      throw new Error(
        `fandex_final_methodology_boundary_duplicate_variable:${cohort.variableId}`,
      );
    }
    seen.add(cohort.variableId);

    if (
      dataset.byVariable[expectedVariableId] !== cohort
      || cohort.normalizationDefined !== false
      || cohort.normalizationMethod !== null
      || cohort.normalizedValuesPresent !== false
    ) {
      throw new Error(
        `fandex_final_methodology_boundary_cohort_invalid:${expectedVariableId}`,
      );
    }

    for (const row of cohort.rows) {
      if (
        row.variableId !== expectedVariableId
        || row.rawCrossVariableAggregationAllowed !== false
        || row.normalizedValue !== null
        || row.normalizationMethod !== null
        || row.weight !== null
        || row.weightedValue !== null
      ) {
        throw new Error(
          `fandex_final_methodology_boundary_row_invalid:${expectedVariableId}`,
        );
      }
    }
  }
}

export function createFandexFinalMethodologyBoundary(
  dataset: FandexNormalizationResearchDataset,
): FandexFinalMethodologyBoundary {
  assertResearchDataset(dataset);

  const variableResearch = Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) =>
      Object.freeze({
        variableId,
        summary: dataset.byVariable[variableId].summary,
      }),
    ),
  );

  const decisions = Object.freeze(
    FANDEX_FINAL_METHODOLOGY_DECISION_IDS.map((decisionId) =>
      Object.freeze({
        decisionId,
        state: 'unresolved' as const,
        approvedValue: null,
        approvalRef: null,
      }),
    ),
  );

  return Object.freeze({
    contractVersion:
      FANDEX_FINAL_METHODOLOGY_BOUNDARY_CONTRACT_VERSION,
    state: FANDEX_FINAL_METHODOLOGY_BOUNDARY_STATE,
    sourceNormalizationResearchContractVersion:
      FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION,
    sourceRunId: dataset.sourceRunId,
    sourceCohortVersion: dataset.sourceCohortVersion,
    sourceSampleCount: dataset.sourceSampleCount,
    sourceDistinctArtistCount: dataset.sourceDistinctArtistCount,
    variableResearch,
    decisions,
    unresolvedDecisionIds:
      FANDEX_FINAL_METHODOLOGY_DECISION_IDS,
    explicitMethodologyApprovalRequired: true,
    finalizationApproved: false,
    methodologyVersion: null,
    normalizationMethod: null,
    normalizationVersion: null,
    weights: null,
    candidateEligibilityRule: null,
    aggregateCoverageRule: null,
    aggregateConfidenceRule: null,
    aggregateFreshnessRule: null,
    riskAdjustmentApplicationRule: null,
    scoreCompositionRule: null,
    fandexScoreDefined: false,
    rankingDefined: false,
    publicPublicationDecisionOutOfScope: true,
    productionActivationDecisionOutOfScope: true,
  });
}
