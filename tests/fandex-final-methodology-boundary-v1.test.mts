import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFandexFinalMethodologyBoundary,
  FANDEX_FINAL_METHODOLOGY_BOUNDARY_CONTRACT_VERSION,
  FANDEX_FINAL_METHODOLOGY_BOUNDARY_STATE,
  FANDEX_FINAL_METHODOLOGY_DECISION_IDS,
} from '../lib/product/contracts/fandexFinalMethodologyBoundary';
import {
  FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION,
  FANDEX_NORMALIZATION_RESEARCH_PURPOSE,
  type FandexNormalizationResearchDataset,
  type FandexNormalizationResearchVariableCohort,
} from '../lib/product/contracts/fandexNormalizationResearch';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from '../lib/product/contracts/fandexVariableProduct';

function cohort(
  variableId: FandexVariableProductId,
): FandexNormalizationResearchVariableCohort {
  const rows = Object.freeze([
    Object.freeze({
      sampleId: `sample:${variableId}`,
      canonicalArtistId: 'iu',
      evaluationAsOf: '2026-01-31T23:59:59.000Z',
      knowledgeCutoff: '2026-01-31T23:59:59.000Z',
      variableId,
      disposition: 'eligible-numeric-observation' as const,
      availability: 'available' as const,
      valueRepresentation: {
        kind: 'numeric' as const,
        value: variableId === 'newsIssuePoint' ? 0 : 1,
        unit: null,
      },
      confidence: 'moderate' as const,
      coverage: 'complete' as const,
      freshness: 'current' as const,
      methodologyVersion: `${variableId}-method-v1`,
      sourceVersion: `${variableId}-source-v1`,
      productVersion: `${variableId}-product-v1`,
      rawCrossVariableAggregationAllowed: false as const,
      normalizedValue: null,
      normalizationMethod: null,
      weight: null,
      weightedValue: null,
    }),
  ]);

  return Object.freeze({
    variableId,
    rows,
    summary: Object.freeze({
      variableId,
      totalRowCount: 1,
      eligibleNumericObservationCount: 1,
      zeroValueCount: variableId === 'newsIssuePoint' ? 1 : 0,
      nonNumericObservationCount: 0,
      unavailableObservationCount: 0,
      temporalIndeterminateCount: 0,
      temporalIssueCount: 0,
      observedUnits: Object.freeze([]),
      numericValueMin: variableId === 'newsIssuePoint' ? 0 : 1,
      numericValueMax: variableId === 'newsIssuePoint' ? 0 : 1,
    }),
    normalizationDefined: false,
    normalizationMethod: null,
    normalizedValuesPresent: false,
  });
}

function dataset(): FandexNormalizationResearchDataset {
  const variableCohorts = Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => cohort(variableId)),
  );
  const byVariable = Object.freeze(
    Object.fromEntries(
      variableCohorts.map((entry) => [entry.variableId, entry]),
    ),
  ) as FandexNormalizationResearchDataset['byVariable'];

  return Object.freeze({
    contractVersion: FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION,
    purpose: FANDEX_NORMALIZATION_RESEARCH_PURPOSE,
    sourceHistoricalValidationContractVersion:
      'fandex-historical-validation-v1',
    sourceRunId: 'historical-run-v1',
    sourceCohortVersion: 'cohort-v1',
    createdAt: '2026-10-03T15:45:00.000Z',
    variableCohorts,
    byVariable,
    sourceSampleCount: 7,
    sourceDistinctArtistCount: 1,
    normalizationDefined: false,
    normalizationMethod: null,
    normalizationVersion: null,
    crossVariableRawAggregationAllowed: false,
    weightsDefined: false,
    fandexScoreDefined: false,
    rankingDefined: false,
  });
}

test('final methodology boundary lists required decisions without selecting any', () => {
  const boundary = createFandexFinalMethodologyBoundary(dataset());

  assert.equal(
    boundary.contractVersion,
    FANDEX_FINAL_METHODOLOGY_BOUNDARY_CONTRACT_VERSION,
  );
  assert.equal(boundary.state, FANDEX_FINAL_METHODOLOGY_BOUNDARY_STATE);
  assert.equal(boundary.explicitMethodologyApprovalRequired, true);
  assert.equal(boundary.finalizationApproved, false);
  assert.deepEqual(
    boundary.unresolvedDecisionIds,
    FANDEX_FINAL_METHODOLOGY_DECISION_IDS,
  );
  assert.deepEqual(
    boundary.decisions.map((decision) => decision.decisionId),
    FANDEX_FINAL_METHODOLOGY_DECISION_IDS,
  );
  assert.ok(
    boundary.decisions.every(
      (decision) =>
        decision.state === 'unresolved'
        && decision.approvedValue === null
        && decision.approvalRef === null,
    ),
  );
});

test('no normalization weight eligibility aggregate or score rule is invented', () => {
  const boundary = createFandexFinalMethodologyBoundary(dataset());

  assert.equal(boundary.methodologyVersion, null);
  assert.equal(boundary.normalizationMethod, null);
  assert.equal(boundary.normalizationVersion, null);
  assert.equal(boundary.weights, null);
  assert.equal(boundary.candidateEligibilityRule, null);
  assert.equal(boundary.aggregateCoverageRule, null);
  assert.equal(boundary.aggregateConfidenceRule, null);
  assert.equal(boundary.aggregateFreshnessRule, null);
  assert.equal(boundary.riskAdjustmentApplicationRule, null);
  assert.equal(boundary.scoreCompositionRule, null);
  assert.equal(boundary.fandexScoreDefined, false);
  assert.equal(boundary.rankingDefined, false);
});

test('research summaries are preserved per variable including true zero evidence', () => {
  const boundary = createFandexFinalMethodologyBoundary(dataset());

  assert.deepEqual(
    boundary.variableResearch.map((entry) => entry.variableId),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );

  const news = boundary.variableResearch.find(
    (entry) => entry.variableId === 'newsIssuePoint',
  );
  assert.equal(news?.summary.zeroValueCount, 1);
  assert.equal(news?.summary.numericValueMin, 0);
  assert.equal(news?.summary.numericValueMax, 0);
});

test('publication and production activation remain separate decisions', () => {
  const boundary = createFandexFinalMethodologyBoundary(dataset());

  assert.equal(boundary.publicPublicationDecisionOutOfScope, true);
  assert.equal(boundary.productionActivationDecisionOutOfScope, true);
});

test('boundary rejects a research dataset with a preselected normalization method', () => {
  const source = dataset();
  const forged = {
    ...source,
    normalizationDefined: true,
    normalizationMethod: 'z-score',
  } as unknown as FandexNormalizationResearchDataset;

  assert.throws(
    () => createFandexFinalMethodologyBoundary(forged),
    /preselected_methodology_forbidden/,
  );
});

test('boundary rejects missing or reordered variable cohorts', () => {
  const source = dataset();
  const forged = {
    ...source,
    variableCohorts: source.variableCohorts.slice(1),
  } as unknown as FandexNormalizationResearchDataset;

  assert.throws(
    () => createFandexFinalMethodologyBoundary(forged),
    /variable_count_invalid/,
  );

  const swapped = [...source.variableCohorts];
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];

  const reordered = {
    ...source,
    variableCohorts: swapped,
  } as unknown as FandexNormalizationResearchDataset;

  assert.throws(
    () => createFandexFinalMethodologyBoundary(reordered),
    /variable_order_invalid/,
  );
});

test('boundary rejects rows that already contain normalized or weighted values', () => {
  const source = dataset();
  const news = source.byVariable.newsIssuePoint;
  const forgedNews = {
    ...news,
    rows: [
      {
        ...news.rows[0],
        normalizedValue: 0.5,
        normalizationMethod: 'min-max',
        weight: 0.2,
        weightedValue: 0.1,
      },
    ],
  };

  const forged = {
    ...source,
    variableCohorts: source.variableCohorts.map((entry) =>
      entry.variableId === 'newsIssuePoint' ? forgedNews : entry),
    byVariable: {
      ...source.byVariable,
      newsIssuePoint: forgedNews,
    },
  } as unknown as FandexNormalizationResearchDataset;

  assert.throws(
    () => createFandexFinalMethodologyBoundary(forged),
    /row_invalid/,
  );
});
