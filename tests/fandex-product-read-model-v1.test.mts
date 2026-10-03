import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexArtistAvailabilityMatrix,
} from '../lib/product/contracts/fandexArtistAvailabilityMatrix';
import {
  createFandexProductCandidate,
  type FandexProductCandidate,
} from '../lib/product/contracts/fandexProductCandidate';
import {
  createFandexProductExplainability,
  type FandexProductExplainability,
} from '../lib/product/contracts/fandexProductExplainability';
import {
  createFandexProductInternalApiDataIssue,
  createFandexProductInternalApiOk,
  createFandexProductReadModel,
  FANDEX_PRODUCT_INTERNAL_API_CONTRACT_VERSION,
  FANDEX_PRODUCT_READ_MODEL_AUDIENCE,
  FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION,
} from '../lib/product/contracts/fandexProductReadModel';
import {
  createFandexVariableProductRecord,
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from '../lib/product/contracts/fandexVariableProduct';
import {
  createFandexVariableProductSnapshot,
} from '../lib/product/contracts/fandexVariableProductSnapshot';

function record(variableId: FandexVariableProductId) {
  const production = variableId === 'newsIssuePoint';

  return createFandexVariableProductRecord({
    variableId,
    canonicalArtistId: 'iu',
    lifecycleState: production ? 'production' : 'research',
    materialClass: 'real',
    readinessState: production ? 'production' : 'research-only',
    availability: production ? 'available' : 'unavailable',
    valueRepresentation: production
      ? {
          kind: 'numeric',
          value: 0,
          unit: null,
        }
      : {
          kind: 'none',
          reason: 'not-produced',
        },
    asOf: production ? '2026-10-03T12:00:00.000Z' : null,
    observationTime: production
      ? {
          kind: 'period',
          start: '2026-10-03T10:00:00.000Z',
          end: '2026-10-03T11:00:00.000Z',
        }
      : { kind: 'unknown' },
    collectionTime: production
      ? { collectedAt: '2026-10-03T11:05:00.000Z' }
      : null,
    confidence: production ? 'moderate' : 'insufficient',
    coverage: production ? 'complete' : 'unknown',
    freshness: production ? 'current' : 'unknown',
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: [`evidence:${variableId}`],
    methodologyVersion: `${variableId}-method-v1`,
    sourceVersion: `${variableId}-source-v1`,
    productVersion: `${variableId}-product-v1`,
  });
}

function sources() {
  const records = FANDEX_VARIABLE_PRODUCT_IDS.map(record);
  const snapshot = createFandexVariableProductSnapshot(records);
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    products: records,
  });
  const candidate = createFandexProductCandidate({
    snapshot,
    availabilityRow: matrix.rows[0],
  });
  const explainability = createFandexProductExplainability(candidate);

  return { candidate, explainability };
}

test('internal read model projects candidate and explainability without a FANDEX score', () => {
  const { candidate, explainability } = sources();
  const model = createFandexProductReadModel({
    candidate,
    explainability,
    generatedAt: '2026-10-03T12:30:00.000Z',
  });

  assert.equal(
    model.contractVersion,
    FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION,
  );
  assert.equal(model.audience, FANDEX_PRODUCT_READ_MODEL_AUDIENCE);
  assert.equal(model.canonicalArtistId, 'iu');
  assert.equal(model.fandexValue, null);
  assert.equal(model.fandexCandidateEligible, null);
  assert.equal(model.methodologyVersion, null);
  assert.equal(model.components.length, 7);
  assert.equal(model.summary.productionAvailableComponentCount, 1);
  assert.deepEqual(model.sourceContracts, {
    candidate: 'fandex-product-candidate-v1',
    explainability: 'fandex-product-explainability-v1',
  });
});

test('generated time remains separate from observation and collection time', () => {
  const { candidate, explainability } = sources();
  const model = createFandexProductReadModel({
    candidate,
    explainability,
    generatedAt: '2026-10-03T12:30:00.000Z',
  });

  assert.deepEqual(model.generatedTime, {
    generatedAt: '2026-10-03T12:30:00.000Z',
  });
  assert.deepEqual(
    model.byVariable.newsIssuePoint.time.observationTime,
    {
      kind: 'period',
      start: '2026-10-03T10:00:00.000Z',
      end: '2026-10-03T11:00:00.000Z',
    },
  );
  assert.deepEqual(
    model.byVariable.newsIssuePoint.time.collectionTime,
    {
      collectedAt: '2026-10-03T11:05:00.000Z',
    },
  );
});

test('internal API ok envelope is versioned and remains internal-only', () => {
  const { candidate, explainability } = sources();
  const model = createFandexProductReadModel({
    candidate,
    explainability,
    generatedAt: '2026-10-03T12:30:00.000Z',
  });
  const response = createFandexProductInternalApiOk(model);

  assert.equal(
    response.contractVersion,
    FANDEX_PRODUCT_INTERNAL_API_CONTRACT_VERSION,
  );
  assert.equal(response.status, 'ok');
  if (response.status === 'ok') {
    assert.equal(response.model.audience, 'internal');
    assert.equal(response.model.fandexValue, null);
  }
});

test('internal API data issues are explicit and do not fabricate an empty model', () => {
  const response = createFandexProductInternalApiDataIssue({
    reason: 'product-candidate-unavailable',
    details: ['adapter-not-ready', 'adapter-not-ready', 'upstream-missing'],
  });

  assert.deepEqual(response, {
    contractVersion: FANDEX_PRODUCT_INTERNAL_API_CONTRACT_VERSION,
    status: 'data-issue',
    reason: 'product-candidate-unavailable',
    details: ['adapter-not-ready', 'upstream-missing'],
  });
  assert.equal('model' in response, false);
});

test('read model rejects a candidate and explanation from different artists', () => {
  const { candidate, explainability } = sources();
  const forged = {
    ...explainability,
    canonicalArtistId: 'blackpink',
  } as FandexProductExplainability;

  assert.throws(
    () => createFandexProductReadModel({
      candidate,
      explainability: forged,
      generatedAt: '2026-10-03T12:30:00.000Z',
    }),
    /artist_identity_mismatch/,
  );
});

test('read model fails closed if source summaries disagree', () => {
  const { candidate, explainability } = sources();
  const forged = {
    ...explainability,
    summary: {
      ...explainability.summary,
      productionAvailableComponentCount: 2,
    },
  } as FandexProductExplainability;

  assert.throws(
    () => createFandexProductReadModel({
      candidate,
      explainability: forged,
      generatedAt: '2026-10-03T12:30:00.000Z',
    }),
    /source_inconsistent/,
  );
});

test('read model fails closed if a source crosses the methodology boundary', () => {
  const { candidate, explainability } = sources();
  const forged = {
    ...candidate,
    fandexValue: 42,
  } as unknown as FandexProductCandidate;

  assert.throws(
    () => createFandexProductReadModel({
      candidate: forged,
      explainability,
      generatedAt: '2026-10-03T12:30:00.000Z',
    }),
    /methodology_boundary_invalid/,
  );
});

test('generatedAt must be explicit instead of borrowing observation time', () => {
  const { candidate, explainability } = sources();

  assert.throws(
    () => createFandexProductReadModel({
      candidate,
      explainability,
      generatedAt: ' ',
    }),
    /generated_at_invalid/,
  );
});
