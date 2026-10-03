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
  FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION,
  FANDEX_PRODUCT_EXPLAINABILITY_LIMITATIONS,
  FANDEX_PRODUCT_EXPLAINABILITY_STATE,
} from '../lib/product/contracts/fandexProductExplainability';
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
    lifecycleState?: 'research' | 'shadow' | 'production-candidate' | 'production' | 'blocked';
    materialClass?: 'real' | 'fixture' | 'synthetic' | 'preview';
    readinessState?: 'research-only' | 'preview-only' | 'building-history' | 'production-ready' | 'production' | 'blocked';
    availability?: 'available' | 'unavailable' | 'unsupported' | 'missing' | 'blocked';
    confidence?: 'high' | 'moderate' | 'low' | 'insufficient';
    coverage?: 'complete' | 'incomplete' | 'unknown';
    freshness?: 'current' | 'stale' | 'unknown';
  }> = {},
) {
  const availability = options.availability ?? 'unavailable';
  const lifecycleState = options.lifecycleState ?? 'research';
  const materialClass = options.materialClass ?? 'real';
  const readinessState = options.readinessState ?? 'research-only';

  const valueRepresentation = availability === 'available'
    ? {
        kind: 'numeric' as const,
        value: 0,
        unit: null,
      }
    : availability === 'missing'
      ? {
          kind: 'numeric' as const,
          value: null,
          unit: null,
        }
      : availability === 'unsupported'
        ? {
            kind: 'none' as const,
            reason: 'unsupported' as const,
          }
        : availability === 'blocked'
          ? {
              kind: 'none' as const,
              reason: 'blocked' as const,
            }
          : {
              kind: 'none' as const,
              reason: 'not-produced' as const,
            };

  return createFandexVariableProductRecord({
    variableId,
    canonicalArtistId: 'iu',
    lifecycleState,
    materialClass,
    readinessState,
    availability,
    valueRepresentation,
    asOf: '2026-10-03T12:00:00.000Z',
    observationTime: {
      kind: 'period',
      start: '2026-10-03T10:00:00.000Z',
      end: '2026-10-03T11:00:00.000Z',
    },
    collectionTime: {
      collectedAt: '2026-10-03T11:05:00.000Z',
    },
    confidence: options.confidence ?? 'insufficient',
    coverage: options.coverage ?? 'unknown',
    freshness: options.freshness ?? 'unknown',
    missingReason: availability === 'missing'
      ? 'provider-observation-absent'
      : null,
    unsupportedReason: availability === 'unsupported'
      ? 'artist-source-not-supported'
      : null,
    blockerReason: availability === 'blocked'
      ? 'upstream-readiness-blocked'
      : null,
    evidenceRefs: [
      `evidence:b:${variableId}`,
      `evidence:a:${variableId}`,
    ],
    methodologyVersion: `${variableId}-method-v1`,
    sourceVersion: `${variableId}-source-v1`,
    productVersion: `${variableId}-product-v1`,
  });
}

function records() {
  return FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => {
    if (variableId === 'newsIssuePoint') {
      return record(variableId, {
        lifecycleState: 'production',
        readinessState: 'production',
        availability: 'available',
        confidence: 'moderate',
        coverage: 'complete',
        freshness: 'current',
      });
    }

    if (variableId === 'musicAlbumPoint') {
      return record(variableId, {
        lifecycleState: 'production',
        readinessState: 'production',
        availability: 'missing',
        confidence: 'low',
        coverage: 'incomplete',
        freshness: 'current',
      });
    }

    if (variableId === 'snsFandomPoint') {
      return record(variableId, {
        lifecycleState: 'production',
        readinessState: 'production',
        availability: 'unsupported',
        confidence: 'insufficient',
        coverage: 'unknown',
        freshness: 'unknown',
      });
    }

    if (variableId === 'brandFitPoint') {
      return record(variableId, {
        lifecycleState: 'research',
        readinessState: 'research-only',
        availability: 'unavailable',
        confidence: 'low',
        coverage: 'incomplete',
        freshness: 'stale',
      });
    }

    if (variableId === 'riskAdjustmentPoint') {
      return record(variableId, {
        lifecycleState: 'blocked',
        readinessState: 'blocked',
        availability: 'blocked',
        confidence: 'insufficient',
        coverage: 'unknown',
        freshness: 'unknown',
      });
    }

    return record(variableId);
  });
}

function candidate(inputRecords = records()) {
  const snapshot = createFandexVariableProductSnapshot(inputRecords);
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    products: inputRecords,
  });

  return createFandexProductCandidate({
    snapshot,
    availabilityRow: matrix.rows[0],
  });
}

test('explainability projects all seven components without creating a FANDEX score', () => {
  const explanation = createFandexProductExplainability(candidate());

  assert.equal(
    explanation.contractVersion,
    FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION,
  );
  assert.equal(explanation.state, FANDEX_PRODUCT_EXPLAINABILITY_STATE);
  assert.equal(explanation.canonicalArtistId, 'iu');
  assert.equal(explanation.fandexValue, null);
  assert.equal(explanation.fandexCandidateEligible, null);
  assert.equal(explanation.methodologyVersion, null);
  assert.deepEqual(
    explanation.components.map((component) => component.variableId),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
  assert.deepEqual(
    explanation.limitations,
    FANDEX_PRODUCT_EXPLAINABILITY_LIMITATIONS,
  );
});

test('true zero and missing remain different in the explainability projection', () => {
  const explanation = createFandexProductExplainability(candidate());

  const news = explanation.byVariable.newsIssuePoint;
  assert.equal(news.availability, 'available');
  assert.deepEqual(news.valueRepresentation, {
    kind: 'numeric',
    value: 0,
    unit: null,
  });
  assert.equal(news.reasons.missingReason, null);

  const album = explanation.byVariable.musicAlbumPoint;
  assert.equal(album.availability, 'missing');
  assert.deepEqual(album.valueRepresentation, {
    kind: 'numeric',
    value: null,
    unit: null,
  });
  assert.equal(
    album.reasons.missingReason,
    'provider-observation-absent',
  );
  assert.deepEqual(explanation.summary.missingComponentIds, [
    'musicAlbumPoint',
  ]);
});

test('support, blocked, freshness, coverage and confidence limitations stay explicit', () => {
  const explanation = createFandexProductExplainability(candidate());

  assert.equal(
    explanation.byVariable.snsFandomPoint.support.variableSupported,
    false,
  );
  assert.equal(
    explanation.byVariable.snsFandomPoint.reasons.unsupportedReason,
    'artist-source-not-supported',
  );
  assert.deepEqual(explanation.summary.unsupportedComponentIds, [
    'snsFandomPoint',
  ]);
  assert.deepEqual(explanation.summary.blockedComponentIds, [
    'riskAdjustmentPoint',
  ]);
  assert.deepEqual(explanation.summary.staleComponentIds, [
    'brandFitPoint',
  ]);
  assert.ok(
    explanation.summary.incompleteOrUnknownCoverageComponentIds
      .includes('brandFitPoint'),
  );
  assert.ok(
    explanation.summary.lowOrInsufficientConfidenceComponentIds
      .includes('musicAlbumPoint'),
  );
});

test('observation and collection time are preserved independently', () => {
  const explanation = createFandexProductExplainability(candidate());
  const news = explanation.byVariable.newsIssuePoint;

  assert.deepEqual(news.time.observationTime, {
    kind: 'period',
    start: '2026-10-03T10:00:00.000Z',
    end: '2026-10-03T11:00:00.000Z',
  });
  assert.deepEqual(news.time.collectionTime, {
    collectedAt: '2026-10-03T11:05:00.000Z',
  });
  assert.equal(news.time.asOf, '2026-10-03T12:00:00.000Z');
});

test('evidence and versions remain traceable per component and globally', () => {
  const explanation = createFandexProductExplainability(candidate());
  const news = explanation.byVariable.newsIssuePoint;

  assert.deepEqual(news.evidenceRefs, [
    'evidence:a:newsIssuePoint',
    'evidence:b:newsIssuePoint',
  ]);
  assert.deepEqual(news.versions, {
    methodologyVersion: 'newsIssuePoint-method-v1',
    sourceVersion: 'newsIssuePoint-source-v1',
    productVersion: 'newsIssuePoint-product-v1',
  });
  assert.deepEqual(
    explanation.evidenceRefs,
    [...new Set(explanation.evidenceRefs)]
      .sort((left, right) => left.localeCompare(right)),
  );
});

test('explainability fails closed if a candidate crosses the methodology boundary', () => {
  const base = candidate();
  const forged = {
    ...base,
    fandexValue: 42,
  } as unknown as FandexProductCandidate;

  assert.throws(
    () => createFandexProductExplainability(forged),
    /methodology_boundary_invalid/,
  );
});

test('explainability rejects inconsistent component availability projections', () => {
  const base = candidate();
  const forged = {
    ...base,
    components: base.components.map((component) =>
      component.variableId === 'newsIssuePoint'
        ? {
            ...component,
            availability: {
              ...component.availability,
              variableProductionAvailable: false,
            },
          }
        : component),
  } as FandexProductCandidate;

  assert.throws(
    () => createFandexProductExplainability(forged),
    /availability_mismatch/,
  );
});
