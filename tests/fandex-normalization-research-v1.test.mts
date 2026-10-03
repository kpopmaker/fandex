import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexArtistAvailabilityMatrix,
} from '../lib/product/contracts/fandexArtistAvailabilityMatrix';
import {
  createFandexHistoricalValidationRun,
  createFandexHistoricalValidationSample,
} from '../lib/product/contracts/fandexHistoricalValidation';
import {
  createFandexNormalizationResearchDataset,
  FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION,
  FANDEX_NORMALIZATION_RESEARCH_PURPOSE,
} from '../lib/product/contracts/fandexNormalizationResearch';
import {
  createFandexProductCandidate,
} from '../lib/product/contracts/fandexProductCandidate';
import {
  createFandexProductExplainability,
} from '../lib/product/contracts/fandexProductExplainability';
import {
  createFandexProductOperations,
} from '../lib/product/contracts/fandexProductOperations';
import {
  createFandexProductReadModel,
} from '../lib/product/contracts/fandexProductReadModel';
import {
  createFandexVariableProductRecord,
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from '../lib/product/contracts/fandexVariableProduct';
import {
  createFandexVariableProductSnapshot,
} from '../lib/product/contracts/fandexVariableProductSnapshot';

type SampleMode = 'clear' | 'sns-time-unknown' | 'news-future';

function record(
  variableId: FandexVariableProductId,
  artistId: string,
  newsValue: number,
  mode: SampleMode,
) {
  const timeUnknown =
    mode === 'sns-time-unknown' && variableId === 'snsFandomPoint';
  const future =
    mode === 'news-future' && variableId === 'newsIssuePoint';

  if (variableId === 'musicAlbumPoint') {
    return createFandexVariableProductRecord({
      variableId,
      canonicalArtistId: artistId,
      lifecycleState: 'production',
      materialClass: 'real',
      readinessState: 'production',
      availability: 'missing',
      valueRepresentation: {
        kind: 'numeric',
        value: null,
        unit: 'physical-units',
      },
      asOf: '2026-01-31T22:00:00.000Z',
      observationTime: {
        kind: 'instant',
        observedAt: '2026-01-31T21:00:00.000Z',
      },
      collectionTime: {
        collectedAt: '2026-01-31T21:30:00.000Z',
      },
      confidence: 'low',
      coverage: 'incomplete',
      freshness: 'current',
      missingReason: 'historical-observation-missing',
      unsupportedReason: null,
      blockerReason: null,
      evidenceRefs: [`evidence:${artistId}:${variableId}`],
      methodologyVersion: `${variableId}-method-v1`,
      sourceVersion: `${variableId}-source-v1`,
      productVersion: `${variableId}-product-v1`,
    });
  }

  if (variableId === 'brandFitPoint') {
    return createFandexVariableProductRecord({
      variableId,
      canonicalArtistId: artistId,
      lifecycleState: 'production',
      materialClass: 'real',
      readinessState: 'production',
      availability: 'available',
      valueRepresentation: {
        kind: 'categorical',
        state: 'evidence-present',
      },
      asOf: '2026-01-31T22:00:00.000Z',
      observationTime: {
        kind: 'instant',
        observedAt: '2026-01-31T21:00:00.000Z',
      },
      collectionTime: {
        collectedAt: '2026-01-31T21:30:00.000Z',
      },
      confidence: 'moderate',
      coverage: 'complete',
      freshness: 'current',
      missingReason: null,
      unsupportedReason: null,
      blockerReason: null,
      evidenceRefs: [`evidence:${artistId}:${variableId}`],
      methodologyVersion: `${variableId}-method-v1`,
      sourceVersion: `${variableId}-source-v1`,
      productVersion: `${variableId}-product-v1`,
    });
  }

  const value = variableId === 'newsIssuePoint' ? newsValue : 1;

  return createFandexVariableProductRecord({
    variableId,
    canonicalArtistId: artistId,
    lifecycleState: 'production',
    materialClass: 'real',
    readinessState: 'production',
    availability: 'available',
    valueRepresentation: {
      kind: 'numeric',
      value,
      unit: variableId === 'newsIssuePoint' ? 'count' : null,
    },
    asOf: future
      ? '2026-02-01T00:10:00.000Z'
      : timeUnknown
        ? null
        : '2026-01-31T22:00:00.000Z',
    observationTime: timeUnknown
      ? { kind: 'unknown' }
      : {
          kind: 'instant',
          observedAt: future
            ? '2026-02-01T00:10:00.000Z'
            : '2026-01-31T21:00:00.000Z',
        },
    collectionTime: timeUnknown
      ? null
      : {
          collectedAt: future
            ? '2026-02-01T00:20:00.000Z'
            : '2026-01-31T21:30:00.000Z',
        },
    confidence: 'moderate',
    coverage: 'complete',
    freshness: 'current',
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: [`evidence:${artistId}:${variableId}`],
    methodologyVersion: `${variableId}-method-v1`,
    sourceVersion: `${variableId}-source-v1`,
    productVersion: `${variableId}-product-v1`,
  });
}

function historicalSample(input: Readonly<{
  sampleId: string;
  artistId: string;
  newsValue: number;
  mode: SampleMode;
}>) {
  const records = FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) =>
    record(variableId, input.artistId, input.newsValue, input.mode),
  );
  const snapshot = createFandexVariableProductSnapshot(records);
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'normalization-research-test-v1',
    artists: [{ id: input.artistId }],
    products: records,
  });
  const candidate = createFandexProductCandidate({
    snapshot,
    availabilityRow: matrix.rows[0],
  });
  const explainability = createFandexProductExplainability(candidate);
  const model = createFandexProductReadModel({
    candidate,
    explainability,
    generatedAt: '2026-10-03T15:30:00.000Z',
  });
  const operations = createFandexProductOperations({ model });

  return createFandexHistoricalValidationSample({
    sampleId: input.sampleId,
    evaluationAsOf: '2026-01-31T23:59:59.000Z',
    knowledgeCutoff: '2026-01-31T23:59:59.000Z',
    reconstructedAt: '2026-10-03T15:40:00.000Z',
    model,
    operations,
  });
}

function dataset() {
  const run = createFandexHistoricalValidationRun({
    runId: 'normalization-source-run-v1',
    cohortVersion: 'normalization-source-cohort-v1',
    createdAt: '2026-10-03T15:45:00.000Z',
    samples: [
      historicalSample({
        sampleId: 'iu-clear',
        artistId: 'iu',
        newsValue: 0,
        mode: 'clear',
      }),
      historicalSample({
        sampleId: 'blackpink-unknown',
        artistId: 'blackpink',
        newsValue: 5,
        mode: 'sns-time-unknown',
      }),
      historicalSample({
        sampleId: 'twice-future',
        artistId: 'twice',
        newsValue: 10,
        mode: 'news-future',
      }),
    ],
  });

  return createFandexNormalizationResearchDataset(run);
}

test('normalization research dataset is research-only and defines no normalization or score', () => {
  const result = dataset();

  assert.equal(
    result.contractVersion,
    FANDEX_NORMALIZATION_RESEARCH_CONTRACT_VERSION,
  );
  assert.equal(result.purpose, FANDEX_NORMALIZATION_RESEARCH_PURPOSE);
  assert.equal(result.normalizationDefined, false);
  assert.equal(result.normalizationMethod, null);
  assert.equal(result.normalizationVersion, null);
  assert.equal(result.crossVariableRawAggregationAllowed, false);
  assert.equal(result.weightsDefined, false);
  assert.equal(result.fandexScoreDefined, false);
  assert.equal(result.rankingDefined, false);
  assert.deepEqual(
    result.variableCohorts.map((cohort) => cohort.variableId),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
});

test('numeric zero is preserved as an eligible observation and not treated as missing', () => {
  const result = dataset();
  const news = result.byVariable.newsIssuePoint;

  assert.equal(news.summary.eligibleNumericObservationCount, 2);
  assert.equal(news.summary.zeroValueCount, 1);
  assert.equal(news.summary.numericValueMin, 0);
  assert.equal(news.summary.numericValueMax, 5);

  const iu = news.rows.find((row) => row.sampleId === 'iu-clear');
  assert.equal(iu?.disposition, 'eligible-numeric-observation');
  assert.deepEqual(iu?.valueRepresentation, {
    kind: 'numeric',
    value: 0,
    unit: 'count',
  });
});

test('temporal violations are excluded from numeric research by variable without contaminating other variables', () => {
  const result = dataset();

  const futureNews = result.byVariable.newsIssuePoint.rows.find(
    (row) => row.sampleId === 'twice-future',
  );
  assert.equal(futureNews?.disposition, 'temporal-issue');

  const sameSampleActivity =
    result.byVariable.comebackActivityPoint.rows.find(
      (row) => row.sampleId === 'twice-future',
    );
  assert.equal(
    sameSampleActivity?.disposition,
    'eligible-numeric-observation',
  );
});

test('unknown timing stays indeterminate only for the affected variable', () => {
  const result = dataset();

  const sns = result.byVariable.snsFandomPoint.rows.find(
    (row) => row.sampleId === 'blackpink-unknown',
  );
  assert.equal(sns?.disposition, 'temporal-indeterminate');

  const news = result.byVariable.newsIssuePoint.rows.find(
    (row) => row.sampleId === 'blackpink-unknown',
  );
  assert.equal(news?.disposition, 'eligible-numeric-observation');
});

test('missing numeric and available non-numeric observations remain distinct research dispositions', () => {
  const result = dataset();

  assert.equal(
    result.byVariable.musicAlbumPoint.summary.unavailableObservationCount,
    3,
  );
  assert.equal(
    result.byVariable.musicAlbumPoint.summary.eligibleNumericObservationCount,
    0,
  );

  assert.equal(
    result.byVariable.brandFitPoint.summary.nonNumericObservationCount,
    3,
  );
  assert.equal(
    result.byVariable.brandFitPoint.summary.eligibleNumericObservationCount,
    0,
  );
});

test('research summaries are per-variable and never average or combine raw values across variables', () => {
  const result = dataset();

  for (const cohort of result.variableCohorts) {
    assert.equal(cohort.normalizationDefined, false);
    assert.equal(cohort.normalizationMethod, null);
    assert.equal(cohort.normalizedValuesPresent, false);

    for (const row of cohort.rows) {
      assert.equal(row.variableId, cohort.variableId);
      assert.equal(row.rawCrossVariableAggregationAllowed, false);
      assert.equal(row.normalizedValue, null);
      assert.equal(row.normalizationMethod, null);
      assert.equal(row.weight, null);
      assert.equal(row.weightedValue, null);
    }
  }
});

test('source sample and artist counts are preserved from historical validation', () => {
  const result = dataset();

  assert.equal(result.sourceSampleCount, 3);
  assert.equal(result.sourceDistinctArtistCount, 3);
  assert.equal(result.sourceRunId, 'normalization-source-run-v1');
  assert.equal(
    result.sourceCohortVersion,
    'normalization-source-cohort-v1',
  );
});
