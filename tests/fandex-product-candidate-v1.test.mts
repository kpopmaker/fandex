import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexArtistAvailabilityMatrix,
} from '../lib/product/contracts/fandexArtistAvailabilityMatrix';
import {
  createFandexProductCandidate,
  FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION,
  FANDEX_PRODUCT_CANDIDATE_STATE,
} from '../lib/product/contracts/fandexProductCandidate';
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
    lifecycleState?: 'research' | 'shadow' | 'production-candidate' | 'production' | 'blocked';
    materialClass?: 'real' | 'fixture' | 'synthetic' | 'preview';
    readinessState?: 'research-only' | 'preview-only' | 'building-history' | 'production-ready' | 'production' | 'blocked';
    availability?: 'available' | 'unavailable' | 'unsupported' | 'missing' | 'blocked';
  }> = {},
) {
  const lifecycleState = options.lifecycleState ?? 'research';
  const materialClass = options.materialClass ?? 'real';
  const readinessState = options.readinessState ?? 'research-only';
  const availability = options.availability ?? 'unavailable';

  const missingReason = availability === 'missing'
    ? 'observation-not-available'
    : null;
  const unsupportedReason = availability === 'unsupported'
    ? 'source-not-supported'
    : null;
  const blockerReason = availability === 'blocked'
    ? 'upstream-blocked'
    : null;

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
    canonicalArtistId: options.artistId ?? 'iu',
    lifecycleState,
    materialClass,
    readinessState,
    availability,
    valueRepresentation,
    asOf: null,
    observationTime: { kind: 'unknown' },
    collectionTime: null,
    confidence: variableId === 'newsIssuePoint' ? 'moderate' : 'insufficient',
    coverage: variableId === 'newsIssuePoint' ? 'complete' : 'unknown',
    freshness: variableId === 'newsIssuePoint' ? 'current' : 'unknown',
    missingReason,
    unsupportedReason,
    blockerReason,
    evidenceRefs: [
      `evidence:common:${variableId}`,
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
        materialClass: 'real',
        readinessState: 'production',
        availability: 'available',
      });
    }

    if (variableId === 'riskAdjustmentPoint') {
      return record(variableId, {
        lifecycleState: 'blocked',
        materialClass: 'real',
        readinessState: 'blocked',
        availability: 'blocked',
      });
    }

    return record(variableId);
  });
}

function candidateFor(inputRecords = records()) {
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

test('candidate assembles all seven components without calculating a FANDEX value', () => {
  const candidate = candidateFor();

  assert.equal(
    candidate.contractVersion,
    FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION,
  );
  assert.equal(candidate.canonicalArtistId, 'iu');
  assert.equal(candidate.state, FANDEX_PRODUCT_CANDIDATE_STATE);
  assert.equal(candidate.fandexValue, null);
  assert.equal(candidate.fandexCandidateEligible, null);
  assert.equal(candidate.methodologyVersion, null);

  assert.deepEqual(
    candidate.components.map((component) => component.variableId),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );

  assert.equal(candidate.coverage.totalComponentCount, 7);
  assert.equal(candidate.coverage.productionAvailableComponentCount, 1);
  assert.equal(candidate.coverage.aggregate, null);
  assert.equal(candidate.confidence.aggregate, null);
  assert.equal(candidate.freshness.aggregate, null);

  assert.equal(
    candidate.componentAvailability.newsIssuePoint
      .variableProductionAvailable,
    true,
  );
  assert.equal(
    candidate.componentAvailability.riskAdjustmentPoint
      .variableProductionAvailable,
    false,
  );
});

test('candidate preserves per-variable coverage, confidence, freshness and evidence', () => {
  const candidate = candidateFor();

  assert.equal(candidate.coverage.byVariable.newsIssuePoint, 'complete');
  assert.equal(candidate.confidence.byVariable.newsIssuePoint, 'moderate');
  assert.equal(candidate.freshness.byVariable.newsIssuePoint, 'current');

  assert.ok(
    candidate.evidenceRefs.includes(
      'evidence:common:newsIssuePoint',
    ),
  );
  assert.ok(
    candidate.evidenceRefs.includes(
      'evidence:common:riskAdjustmentPoint',
    ),
  );
});

test('production lifecycle with a missing observation stays unavailable and never becomes zero', () => {
  const inputRecords = records().map((entry) => {
    if (entry.variableId !== 'newsIssuePoint') return entry;

    return createFandexVariableProductRecord({
      ...entry,
      availability: 'missing',
      valueRepresentation: {
        kind: 'numeric',
        value: null,
        unit: null,
      },
      missingReason: 'observation-not-available',
    });
  });

  const candidate = candidateFor(inputRecords);
  const news = candidate.components.find(
    (component) => component.variableId === 'newsIssuePoint',
  );

  assert.ok(news);
  assert.equal(
    candidate.componentAvailability.newsIssuePoint
      .variableProductionAvailable,
    false,
  );
  assert.equal(
    candidate.componentAvailability.newsIssuePoint
      .productionAvailabilityReason,
    'availability-missing',
  );
  assert.equal(news.record.availability, 'missing');
  assert.deepEqual(news.record.valueRepresentation, {
    kind: 'numeric',
    value: null,
    unit: null,
  });
  assert.equal(candidate.fandexValue, null);
});

test('unsupported stays distinct from missing and is not treated as candidate eligibility', () => {
  const inputRecords = records().map((entry) => {
    if (entry.variableId !== 'musicAlbumPoint') return entry;

    return record('musicAlbumPoint', {
      lifecycleState: 'production',
      materialClass: 'real',
      readinessState: 'production',
      availability: 'unsupported',
    });
  });

  const candidate = candidateFor(inputRecords);

  assert.equal(
    candidate.componentAvailability.musicAlbumPoint.variableSupported,
    false,
  );
  assert.equal(
    candidate.componentAvailability.musicAlbumPoint
      .variableProductionAvailable,
    false,
  );
  assert.equal(candidate.fandexCandidateEligible, null);
  assert.equal(candidate.fandexValue, null);
});

test('candidate refuses snapshot and availability rows for different artists', () => {
  const inputRecords = records();
  const snapshot = createFandexVariableProductSnapshot(inputRecords);
  const otherProducts = inputRecords.map((entry) =>
    createFandexVariableProductRecord({
      ...entry,
      canonicalArtistId: 'blackpink',
    }),
  );
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'blackpink' }],
    products: otherProducts,
  });

  assert.throws(
    () => createFandexProductCandidate({
      snapshot,
      availabilityRow: matrix.rows[0],
    }),
    /artist_identity_mismatch/,
  );
});

test('candidate fails closed when matrix metadata no longer matches the snapshot record', () => {
  const inputRecords = records();
  const snapshot = createFandexVariableProductSnapshot(inputRecords);
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    products: inputRecords,
  });

  const row = matrix.rows[0];
  const forgedRow = {
    ...row,
    variables: {
      ...row.variables,
      newsIssuePoint: {
        ...row.variables.newsIssuePoint,
        freshness: 'stale' as const,
      },
    },
  };

  assert.throws(
    () => createFandexProductCandidate({
      snapshot,
      availabilityRow: forgedRow,
    }),
    /matrix_freshness_mismatch/,
  );
});

test('candidate evidence is sorted and de-duplicated across component sources', () => {
  const inputRecords = records();
  const snapshot = createFandexVariableProductSnapshot(inputRecords);
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    products: inputRecords,
    supportClaims: [{
      canonicalArtistId: 'iu',
      variableId: 'newsIssuePoint',
      supported: true,
      reason: 'support-established',
      evidenceRefs: [
        'evidence:z-support',
        'evidence:common:newsIssuePoint',
      ],
    }],
  });

  const candidate = createFandexProductCandidate({
    snapshot,
    availabilityRow: matrix.rows[0],
  });

  assert.deepEqual(
    candidate.evidenceRefs,
    [...new Set(candidate.evidenceRefs)].sort((a, b) => a.localeCompare(b)),
  );
  assert.equal(
    candidate.evidenceRefs.filter(
      (ref) => ref === 'evidence:common:newsIssuePoint',
    ).length,
    1,
  );
  assert.ok(candidate.evidenceRefs.includes('evidence:z-support'));
});
