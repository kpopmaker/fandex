import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexArtistAvailabilityMatrix,
} from '../lib/product/contracts/fandexArtistAvailabilityMatrix';
import {
  createFandexHistoricalValidationRun,
  createFandexHistoricalValidationSample,
  FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION,
  FANDEX_HISTORICAL_VALIDATION_PURPOSE,
} from '../lib/product/contracts/fandexHistoricalValidation';
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

function record(
  variableId: FandexVariableProductId,
  options: Readonly<{
    artistId?: string;
    observedAt?: string | null;
    collectedAt?: string | null;
    asOf?: string | null;
    missing?: boolean;
  }> = {},
) {
  const missing = options.missing ?? variableId === 'musicAlbumPoint';
  const availability = missing ? 'missing' : 'available';

  return createFandexVariableProductRecord({
    variableId,
    canonicalArtistId: options.artistId ?? 'iu',
    lifecycleState: 'production',
    materialClass: 'real',
    readinessState: 'production',
    availability,
    valueRepresentation: missing
      ? {
          kind: 'numeric',
          value: null,
          unit: null,
        }
      : {
          kind: 'numeric',
          value: variableId === 'newsIssuePoint' ? 0 : 1,
          unit: null,
        },
    asOf: options.asOf === undefined
      ? '2026-01-31T23:00:00.000Z'
      : options.asOf,
    observationTime: options.observedAt === null
      ? { kind: 'unknown' }
      : {
          kind: 'instant',
          observedAt:
            options.observedAt ?? '2026-01-31T22:00:00.000Z',
        },
    collectionTime: options.collectedAt === null
      ? null
      : {
          collectedAt:
            options.collectedAt ?? '2026-01-31T22:30:00.000Z',
        },
    confidence: missing ? 'low' : 'moderate',
    coverage: missing ? 'incomplete' : 'complete',
    freshness: 'current',
    missingReason: missing ? 'observation-not-available' : null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: [`evidence:${variableId}`],
    methodologyVersion: `${variableId}-method-v1`,
    sourceVersion: `${variableId}-source-v1`,
    productVersion: `${variableId}-product-v1`,
  });
}

function sourcePair(
  input: Readonly<{
    artistId?: string;
    override?: (
      variableId: FandexVariableProductId,
    ) => Parameters<typeof record>[1];
  }> = {},
) {
  const records = FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) =>
    record(variableId, {
      artistId: input.artistId,
      ...(input.override?.(variableId) ?? {}),
    }),
  );

  const snapshot = createFandexVariableProductSnapshot(records);
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'historical-validation-test-v1',
    artists: [{ id: input.artistId ?? 'iu' }],
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
    generatedAt: '2026-10-03T14:30:00.000Z',
  });
  const operations = createFandexProductOperations({ model });

  return { model, operations };
}

test('historical sample preserves as-known inputs without score, ranking or outcome fields', () => {
  const { model, operations } = sourcePair();
  const sample = createFandexHistoricalValidationSample({
    sampleId: 'iu-2026-01',
    evaluationAsOf: '2026-01-31T23:59:59.000Z',
    knowledgeCutoff: '2026-01-31T23:59:59.000Z',
    reconstructedAt: '2026-10-03T14:40:00.000Z',
    model,
    operations,
  });

  assert.equal(
    sample.contractVersion,
    FANDEX_HISTORICAL_VALIDATION_CONTRACT_VERSION,
  );
  assert.equal(sample.purpose, FANDEX_HISTORICAL_VALIDATION_PURPOSE);
  assert.equal(sample.temporalIntegrity.status, 'clear');
  assert.equal(sample.fandexValue, null);
  assert.equal(sample.fandexCandidateEligible, null);
  assert.equal(sample.methodologyVersion, null);
  assert.equal(sample.scoreFieldsPresent, false);
  assert.equal(sample.rankingFieldsPresent, false);
  assert.equal(sample.outcomeFieldsPresent, false);

  assert.deepEqual(
    sample.readModel.byVariable.newsIssuePoint.valueRepresentation,
    { kind: 'numeric', value: 0, unit: null },
  );
  assert.deepEqual(
    sample.readModel.byVariable.musicAlbumPoint.valueRepresentation,
    { kind: 'numeric', value: null, unit: null },
  );
});

test('reconstruction may happen later while source knowledge must remain inside the historical cutoff', () => {
  const { model, operations } = sourcePair();
  const sample = createFandexHistoricalValidationSample({
    sampleId: 'iu-later-reconstruction',
    evaluationAsOf: '2026-01-31T23:59:59.000Z',
    knowledgeCutoff: '2026-01-31T23:59:59.000Z',
    reconstructedAt: '2026-10-03T14:40:00.000Z',
    model,
    operations,
  });

  assert.equal(
    sample.readModelGeneratedAt,
    '2026-10-03T14:30:00.000Z',
  );
  assert.equal(sample.temporalIntegrity.status, 'clear');
});

test('future observations and collection are flagged as temporal violations', () => {
  const { model, operations } = sourcePair({
    override: (variableId) =>
      variableId === 'newsIssuePoint'
        ? {
            observedAt: '2026-02-01T00:10:00.000Z',
            collectedAt: '2026-02-01T00:20:00.000Z',
            asOf: '2026-02-01T00:10:00.000Z',
          }
        : {},
  });

  const sample = createFandexHistoricalValidationSample({
    sampleId: 'iu-future-leak',
    evaluationAsOf: '2026-01-31T23:59:59.000Z',
    knowledgeCutoff: '2026-01-31T23:59:59.000Z',
    reconstructedAt: '2026-10-03T14:40:00.000Z',
    model,
    operations,
  });

  assert.equal(sample.temporalIntegrity.status, 'issues-present');
  assert.ok(
    sample.temporalIntegrity.issues.some(
      (issue) =>
        issue.variableId === 'newsIssuePoint'
        && issue.code === 'observation-after-evaluation'
        && issue.severity === 'violation',
    ),
  );
  assert.ok(
    sample.temporalIntegrity.issues.some(
      (issue) =>
        issue.variableId === 'newsIssuePoint'
        && issue.code === 'collection-after-knowledge-cutoff',
    ),
  );
  assert.ok(
    sample.temporalIntegrity.issues.some(
      (issue) =>
        issue.variableId === 'newsIssuePoint'
        && issue.code === 'component-as-of-after-evaluation',
    ),
  );
});

test('unknown observation or collection times remain indeterminate instead of becoming stable or zero', () => {
  const { model, operations } = sourcePair({
    override: (variableId) =>
      variableId === 'snsFandomPoint'
        ? {
            observedAt: null,
            collectedAt: null,
            asOf: null,
          }
        : {},
  });

  const sample = createFandexHistoricalValidationSample({
    sampleId: 'iu-unknown-time',
    evaluationAsOf: '2026-01-31T23:59:59.000Z',
    knowledgeCutoff: '2026-01-31T23:59:59.000Z',
    reconstructedAt: '2026-10-03T14:40:00.000Z',
    model,
    operations,
  });

  assert.equal(sample.temporalIntegrity.status, 'indeterminate');
  assert.deepEqual(
    sample.temporalIntegrity.issues.filter(
      (issue) => issue.variableId === 'snsFandomPoint',
    ),
    [
      {
        variableId: 'snsFandomPoint',
        severity: 'unknown',
        code: 'observation-time-unknown',
      },
      {
        variableId: 'snsFandomPoint',
        severity: 'unknown',
        code: 'collection-time-unknown',
      },
    ],
  );
});

test('knowledge cutoff cannot extend beyond evaluation as-of', () => {
  const { model, operations } = sourcePair();

  assert.throws(
    () => createFandexHistoricalValidationSample({
      sampleId: 'iu-invalid-cutoff',
      evaluationAsOf: '2026-01-31T23:00:00.000Z',
      knowledgeCutoff: '2026-02-01T00:00:00.000Z',
      reconstructedAt: '2026-10-03T14:40:00.000Z',
      model,
      operations,
    }),
    /knowledge_cutoff_after_evaluation/,
  );
});

test('historical sample requires operations lineage to match the read model', () => {
  const iu = sourcePair();
  const blackpink = sourcePair({ artistId: 'blackpink' });

  assert.throws(
    () => createFandexHistoricalValidationSample({
      sampleId: 'mixed-source',
      evaluationAsOf: '2026-01-31T23:59:59.000Z',
      knowledgeCutoff: '2026-01-31T23:59:59.000Z',
      reconstructedAt: '2026-10-03T14:40:00.000Z',
      model: iu.model,
      operations: blackpink.operations,
    }),
    /source_identity_mismatch/,
  );
});

test('run keeps clear, indeterminate and issue samples instead of dropping data-poor cases', () => {
  const clearSources = sourcePair();
  const unknownSources = sourcePair({
    artistId: 'blackpink',
    override: (variableId) =>
      variableId === 'brandFitPoint'
        ? { observedAt: null, collectedAt: null, asOf: null }
        : {},
  });
  const issueSources = sourcePair({
    artistId: 'twice',
    override: (variableId) =>
      variableId === 'newsIssuePoint'
        ? {
            observedAt: '2026-02-01T00:10:00.000Z',
            collectedAt: '2026-02-01T00:20:00.000Z',
          }
        : {},
  });

  const samples = [
    createFandexHistoricalValidationSample({
      sampleId: 'twice-issue',
      evaluationAsOf: '2026-01-31T23:59:59.000Z',
      knowledgeCutoff: '2026-01-31T23:59:59.000Z',
      reconstructedAt: '2026-10-03T14:40:00.000Z',
      ...issueSources,
    }),
    createFandexHistoricalValidationSample({
      sampleId: 'iu-clear',
      evaluationAsOf: '2026-01-31T23:59:59.000Z',
      knowledgeCutoff: '2026-01-31T23:59:59.000Z',
      reconstructedAt: '2026-10-03T14:40:00.000Z',
      ...clearSources,
    }),
    createFandexHistoricalValidationSample({
      sampleId: 'blackpink-unknown',
      evaluationAsOf: '2026-01-31T23:59:59.000Z',
      knowledgeCutoff: '2026-01-31T23:59:59.000Z',
      reconstructedAt: '2026-10-03T14:40:00.000Z',
      ...unknownSources,
    }),
  ];

  const run = createFandexHistoricalValidationRun({
    runId: 'historical-run-v1',
    cohortVersion: 'cohort-v1',
    createdAt: '2026-10-03T14:45:00.000Z',
    samples,
  });

  assert.equal(run.summary.totalSamples, 3);
  assert.equal(run.summary.temporalClearCount, 1);
  assert.equal(run.summary.temporalIndeterminateCount, 1);
  assert.equal(run.summary.temporalIssueCount, 1);
  assert.equal(run.summary.distinctArtistCount, 3);
  assert.deepEqual(
    run.samples.map((sample) => sample.canonicalArtistId),
    ['blackpink', 'iu', 'twice'],
  );
  assert.equal(run.normalizationVersion, null);
  assert.equal(run.fandexMethodologyVersion, null);
  assert.equal(run.scoreFieldsPresent, false);
  assert.equal(run.rankingFieldsPresent, false);
  assert.equal(run.outcomeFieldsPresent, false);
});

test('run rejects duplicate sample identities instead of silently overwriting them', () => {
  const { model, operations } = sourcePair();
  const sample = createFandexHistoricalValidationSample({
    sampleId: 'iu-dup',
    evaluationAsOf: '2026-01-31T23:59:59.000Z',
    knowledgeCutoff: '2026-01-31T23:59:59.000Z',
    reconstructedAt: '2026-10-03T14:40:00.000Z',
    model,
    operations,
  });

  assert.throws(
    () => createFandexHistoricalValidationRun({
      runId: 'duplicate-run',
      cohortVersion: 'cohort-v1',
      createdAt: '2026-10-03T14:45:00.000Z',
      samples: [sample, sample],
    }),
    /duplicate_sample_id/,
  );
});
