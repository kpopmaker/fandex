import {
  FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION,
  FANDEX_HISTORICAL_VALIDATION_PURPOSE,
  type FandexHistoricalValidationRun,
  type FandexHistoricalValidationSample,
} from './fandexHistoricalValidation';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
  type FandexVariableProductValueRepresentation,
} from './fandexVariableProduct';

export const FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION =
  'fandex-normalization-research-v1' as const;

export const FANDEX_NORMALIZATION_RESEARCH_PURPOSE =
  'normalization-input-research' as const;

export type FandexNormalizationResearchDisposition =
  | 'eligible-numeric-observation'
  | 'non-numeric-observation'
  | 'unavailable-observation'
  | 'temporal-indeterminate'
  | 'temporal-issue';

export type FandexNormalizationResearchRow = Readonly<{
  sampleId: string;
  canonicalArtistId: string;
  evaluationAsOf: string;
  knowledgeCutoff: string;
  variableId: FandexVariableProductId;
  disposition: FandexNormalizationResearchDisposition;
  availability: FandexHistoricalValidationSample['readModel']['byVariable'][FandexVariableProductId]['availability'];
  valueRepresentation: FandexVariableProductValueRepresentation;
  confidence: FandexHistoricalValidationSample['readModel']['byVariable'][FandexVariableProductId]['confidence'];
  coverage: FandexHistoricalValidationSample['readModel']['byVariable'][FandexVariableProductId]['coverage'];
  freshness: FandexHistoricalValidationSample['readModel']['byVariable'][FandexVariableProductId]['freshness'];
  methodologyVersion: string;
  sourceVersion: string;
  productVersion: string;
  rawCrossVariableAggregationAllowed: false;
  normalizedValue: null;
  normalizationMethod: null;
  weight: null;
  weightedValue: null;
}>;

export type FandexNormalizationResearchVariableSummary = Readonly<{
  variableId: FandexVariableProductId;
  totalRowCount: number;
  eligibleNumericObservationCount: number;
  zeroValueCount: number;
  nonNumericObservationCount: number;
  unavailableObservationCount: number;
  temporalIndeterminateCount: number;
  temporalIssueCount: number;
  observedUnits: readonly string[];
  numericValueMin: number | null;
  numericValueMax: number | null;
}>;

export type FandexNormalizationResearchVariableCohort = Readonly<{
  variableId: FandexVariableProductId;
  rows: readonly FandexNormalizationResearchRow[];
  summary: FandexNormalizationResearchVariableSummary;
  normalizationDefined: false;
  normalizationMethod: null;
  normalizedValuesPresent: false;
}>;

export type FandexNormalizationResearchDataset = Readonly<{
  contractVersion: typeof FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION;
  purpose: typeof FANDEX_NORMALIZATION_RESEARCH_PURPOSE;
  sourceHistoricalValidationContractVersion:
    typeof FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION;
  sourceRunId: string;
  sourceCohortVersion: string;
  createdAt: string;
  variableCohorts: readonly FandexNormalizationResearchVariableCohort[];
  byVariable: Readonly<Record<
    FandexVariableProductId,
    FandexNormalizationResearchVariableCohort
  >>;
  sourceSampleCount: number;
  sourceDistinctArtistCount: number;
  normalizationDefined: false;
  normalizationMethod: null;
  normalizationVersion: null;
  crossVariableRawAggregationAllowed: false;
  weightsDefined: false;
  fandexScoreDefined: false;
  rankingDefined: false;
}>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function dispositionFor(
  sample: FandexHistoricalValidationSample,
  variableId: FandexVariableProductId,
): FandexNormalizationResearchDisposition {
  const variableTemporalIssues = sample.temporalIntegrity.issues.filter(
    (issue) => issue.variableId === variableId,
  );

  if (
    variableTemporalIssues.some(
      (issue) => issue.severity === 'violation',
    )
  ) {
    return 'temporal-issue';
  }
  if (variableTemporalIssues.length > 0) {
    return 'temporal-indeterminate';
  }

  const component = sample.readModel.byVariable[variableId];
  if (component.availability !== 'available') {
    return 'unavailable-observation';
  }

  return component.valueRepresentation.kind === 'numeric'
    ? 'eligible-numeric-observation'
    : 'non-numeric-observation';
}

function rowFor(
  sample: FandexHistoricalValidationSample,
  variableId: FandexVariableProductId,
): FandexNormalizationResearchRow {
  const component = sample.readModel.byVariable[variableId];
  if (!component || component.variableId !== variableId) {
    throw new Error(
      `fandex_normalization_research_component_missing:${variableId}`,
    );
  }

  if (
    !isNonEmptyString(component.versions.methodologyVersion)
    || !isNonEmptyString(component.versions.sourceVersion)
    || !isNonEmptyString(component.versions.productVersion)
  ) {
    throw new Error(
      `fandex_normalization_research_version_invalid:${variableId}`,
    );
  }

  return Object.freeze({
    sampleId: sample.sampleId,
    canonicalArtistId: sample.canonicalArtistId,
    evaluationAsOf: sample.evaluationAsOf,
    knowledgeCutoff: sample.knowledgeCutoff,
    variableId,
    disposition: dispositionFor(sample, variableId),
    availability: component.availability,
    valueRepresentation: component.valueRepresentation,
    confidence: component.confidence,
    coverage: component.coverage,
    freshness: component.freshness,
    methodologyVersion: component.versions.methodologyVersion,
    sourceVersion: component.versions.sourceVersion,
    productVersion: component.versions.productVersion,
    rawCrossVariableAggregationAllowed: false,
    normalizedValue: null,
    normalizationMethod: null,
    weight: null,
    weightedValue: null,
  });
}

function summarize(
  variableId: FandexVariableProductId,
  rows: readonly FandexNormalizationResearchRow[],
): FandexNormalizationResearchVariableSummary {
  const numericRows = rows.filter(
    (row) =>
      row.disposition === 'eligible-numeric-observation'
      && row.valueRepresentation.kind === 'numeric'
      && row.valueRepresentation.value !== null,
  );

  const numericValues = numericRows.map((row) => {
    const representation = row.valueRepresentation;
    if (
      representation.kind !== 'numeric'
      || representation.value === null
      || !Number.isFinite(representation.value)
    ) {
      throw new Error(
        `fandex_normalization_research_numeric_value_invalid:${variableId}`,
      );
    }
    return representation.value;
  });

  const observedUnits = [
    ...new Set(
      numericRows.flatMap((row) => {
        const representation = row.valueRepresentation;
        return representation.kind === 'numeric'
          && representation.unit !== null
          ? [representation.unit]
          : [];
      }),
    ),
  ].sort((left, right) => left.localeCompare(right));

  return Object.freeze({
    variableId,
    totalRowCount: rows.length,
    eligibleNumericObservationCount: numericRows.length,
    zeroValueCount: numericValues.filter((value) => value === 0).length,
    nonNumericObservationCount: rows.filter(
      (row) => row.disposition === 'non-numeric-observation',
    ).length,
    unavailableObservationCount: rows.filter(
      (row) => row.disposition === 'unavailable-observation',
    ).length,
    temporalIndeterminateCount: rows.filter(
      (row) => row.disposition === 'temporal-indeterminate',
    ).length,
    temporalIssueCount: rows.filter(
      (row) => row.disposition === 'temporal-issue',
    ).length,
    observedUnits: Object.freeze(observedUnits),
    numericValueMin:
      numericValues.length > 0 ? Math.min(...numericValues) : null,
    numericValueMax:
      numericValues.length > 0 ? Math.max(...numericValues) : null,
  });
}

function assertHistoricalRun(
  run: FandexHistoricalValidationRun,
): void {
  if (
    run.contractVersion
      !== FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION
    || run.purpose !== FANDEX_HISTORICAL_VALIDATION_PURPOSE
    || run.scoreFieldsPresent !== false
    || run.rankingFieldsPresent !== false
    || run.outcomeFieldsPresent !== false
    || run.normalizationVersion !== null
    || run.fandexMethodologyVersion !== null
  ) {
    throw new Error(
      'fandex_normalization_research_historical_run_invalid',
    );
  }

  if (!isNonEmptyString(run.runId) || !isNonEmptyString(run.cohortVersion)) {
    throw new Error(
      'fandex_normalization_research_source_identity_invalid',
    );
  }

  if (run.samples.length !== run.summary.totalSamples) {
    throw new Error(
      'fandex_normalization_research_sample_count_mismatch',
    );
  }

  for (const sample of run.samples) {
    if (
      sample.contractVersion
        !== FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION
      || sample.purpose !== FANDEX_HISTORICAL_VALIDATION_PURPOSE
      || sample.fandexValue !== null
      || sample.fandexCandidateEligible !== null
      || sample.methodologyVersion !== null
      || sample.scoreFieldsPresent !== false
      || sample.rankingFieldsPresent !== false
      || sample.outcomeFieldsPresent !== false
    ) {
      throw new Error(
        `fandex_normalization_research_sample_invalid:${sample.sampleId}`,
      );
    }
  }
}

export function createFandexNormalizationResearchDataset(
  run: FandexHistoricalValidationRun,
): FandexNormalizationResearchDataset {
  assertHistoricalRun(run);

  const entries = FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => {
    const rows = Object.freeze(
      run.samples
        .map((sample) => rowFor(sample, variableId))
        .sort((left, right) => {
          const evaluation =
            left.evaluationAsOf.localeCompare(right.evaluationAsOf);
          if (evaluation !== 0) return evaluation;

          const artist =
            left.canonicalArtistId.localeCompare(right.canonicalArtistId);
          if (artist !== 0) return artist;

          return left.sampleId.localeCompare(right.sampleId);
        }),
    );

    const cohort: FandexNormalizationResearchVariableCohort =
      Object.freeze({
        variableId,
        rows,
        summary: summarize(variableId, rows),
        normalizationDefined: false,
        normalizationMethod: null,
        normalizedValuesPresent: false,
      });

    return [variableId, cohort] as const;
  });

  const byVariable = Object.freeze(
    Object.fromEntries(entries),
  ) as Readonly<Record<
    FandexVariableProductId,
    FandexNormalizationResearchVariableCohort
  >>;

  return Object.freeze({
    contractVersion: FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION,
    purpose: FANDEX_NORMALIZATION_RESEARCH_PURPOSE,
    sourceHistoricalValidationContractVersion:
      FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION,
    sourceRunId: run.runId,
    sourceCohortVersion: run.cohortVersion,
    createdAt: run.createdAt,
    variableCohorts: Object.freeze(
      FANDEX_VARIABLE_PRODUCT_IDS.map(
        (variableId) => byVariable[variableId],
      ),
    ),
    byVariable,
    sourceSampleCount: run.summary.totalSamples,
    sourceDistinctArtistCount: run.summary.distinctArtistCount,
    normalizationDefined: false,
    normalizationMethod: null,
    normalizationVersion: null,
    crossVariableRawAggregationAllowed: false,
    weightsDefined: false,
    fandexScoreDefined: false,
    rankingDefined: false,
  });
}
