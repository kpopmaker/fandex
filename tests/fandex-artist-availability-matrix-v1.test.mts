import assert from 'node:assert/strict';
import test from 'node:test';

import { artistUniverseV4 } from '../app/data/v4/artistUniverse';
import {
  buildFandexArtistAvailabilityMatrix,
  FANDEX_ARTIST_AVAILABILITY_MATRIX_CONTRACT_VERSION,
  FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON,
} from '../lib/product/contracts/fandexArtistAvailabilityMatrix';
import {
  createFandexVariableProductRecord,
  FANDEX_VARIABLE_PRODUCT_IDS,
} from '../lib/product/contracts/fandexVariableProduct';

function productionProduct(overrides: Record<string, unknown> = {}) {
  return createFandexVariableProductRecord({
    variableId: 'newsIssuePoint',
    canonicalArtistId: 'iu',
    lifecycleState: 'production',
    materialClass: 'real',
    readinessState: 'production',
    availability: 'available',
    valueRepresentation: {
      kind: 'numeric',
      value: 0,
      unit: null,
    },
    asOf: '2026-10-03T11:00:00.000Z',
    observationTime: {
      kind: 'period',
      start: '2026-10-03T10:00:00.000Z',
      end: '2026-10-03T11:00:00.000Z',
    },
    collectionTime: {
      collectedAt: '2026-10-03T11:03:00.000Z',
    },
    confidence: 'insufficient',
    coverage: 'unknown',
    freshness: 'current',
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: ['evidence:news'],
    methodologyVersion: 'news-method-v1',
    sourceVersion: 'naver-source-v1',
    productVersion: 'news-product-v1',
    ...overrides,
  } as Parameters<typeof createFandexVariableProductRecord>[0]);
}

test('current artist universe expands to exactly 355 known artists', () => {
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'artist-universe-v4+artist-universe-expansion-v1',
    artists: artistUniverseV4,
  });

  assert.equal(
    matrix.contractVersion,
    FANDEX_ARTIST_AVAILABILITY_MATRIX_CONTRACT_VERSION,
  );
  assert.equal(matrix.rows.length, 355);
  assert.equal(matrix.summary.totalArtists, 355);
  assert.equal(matrix.summary.artistKnownCount, 355);
  assert.equal(matrix.summary.candidateEligibilityDeterminedCount, 0);
  assert.equal(
    matrix.rows.every((row) => row.artistKnown),
    true,
  );
  assert.equal(
    matrix.rows.every(
      (row) => row.fandexCandidateEligible === null
        && row.candidateEligibilityReason
          === FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON,
    ),
    true,
  );
});

test('unknown support stays distinct from production availability', () => {
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
  });
  const row = matrix.rows[0];

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    assert.equal(row.variables[variableId].variableSupported, null);
    assert.equal(
      row.variables[variableId].variableProductionAvailable,
      false,
    );
    assert.equal(
      row.variables[variableId].supportReason,
      'support-not-established',
    );
    assert.equal(
      row.variables[variableId].productionAvailabilityReason,
      'common-product-record-absent',
    );
  }
});

test('real production available common Product makes only that cell production-available', () => {
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    products: [productionProduct()],
  });
  const news = matrix.rows[0].variables.newsIssuePoint;

  assert.equal(news.variableSupported, true);
  assert.equal(news.variableProductionAvailable, true);
  assert.equal(news.productAvailability, 'available');
  assert.equal(news.lifecycleState, 'production');
  assert.equal(news.materialClass, 'real');
  assert.deepEqual(news.evidenceRefs, ['evidence:news']);
  assert.equal(matrix.summary.productionAvailableByVariable.newsIssuePoint, 1);
  assert.equal(matrix.rows[0].fandexCandidateEligible, null);
});

test('missing remains supported but is not production available or zero', () => {
  const missing = productionProduct({
    availability: 'missing',
    valueRepresentation: {
      kind: 'numeric',
      value: null,
      unit: null,
    },
    missingReason: 'provider-observation-absent',
  });

  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    products: [missing],
  });
  const news = matrix.rows[0].variables.newsIssuePoint;

  assert.equal(news.variableSupported, true);
  assert.equal(news.variableProductionAvailable, false);
  assert.equal(news.productAvailability, 'missing');
  assert.equal(
    news.productionAvailabilityReason,
    'availability-missing',
  );
});

test('unsupported remains distinct from missing and production unavailable', () => {
  const unsupported = productionProduct({
    availability: 'unsupported',
    valueRepresentation: {
      kind: 'none',
      reason: 'unsupported',
    },
    unsupportedReason: 'artist-source-not-supported',
  });

  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    products: [unsupported],
  });
  const news = matrix.rows[0].variables.newsIssuePoint;

  assert.equal(news.variableSupported, false);
  assert.equal(news.variableProductionAvailable, false);
  assert.equal(news.productAvailability, 'unsupported');
  assert.equal(news.supportReason, 'artist-source-not-supported');
  assert.equal(matrix.summary.unsupportedByVariable.newsIssuePoint, 1);
});

test('research, shadow, preview and production-candidate records cannot become production available', () => {
  for (const product of [
    productionProduct({
      lifecycleState: 'research',
      readinessState: 'research-only',
    }),
    productionProduct({
      lifecycleState: 'shadow',
      readinessState: 'building-history',
    }),
    productionProduct({
      lifecycleState: 'production-candidate',
      readinessState: 'production-ready',
    }),
    productionProduct({
      lifecycleState: 'shadow',
      materialClass: 'preview',
      readinessState: 'preview-only',
    }),
  ]) {
    const matrix = buildFandexArtistAvailabilityMatrix({
      universeVersion: 'test-universe-v1',
      artists: [{ id: 'iu' }],
      products: [product],
    });

    assert.equal(
      matrix.rows[0].variables.newsIssuePoint.variableProductionAvailable,
      false,
    );
  }
});

test('explicit support evidence can establish support without inventing Product availability', () => {
  const matrix = buildFandexArtistAvailabilityMatrix({
    universeVersion: 'test-universe-v1',
    artists: [{ id: 'iu' }],
    supportClaims: [{
      canonicalArtistId: 'iu',
      variableId: 'musicAlbumPoint',
      supported: true,
      reason: 'methodology-support-established',
      evidenceRefs: ['support:album'],
    }],
  });
  const album = matrix.rows[0].variables.musicAlbumPoint;

  assert.equal(album.variableSupported, true);
  assert.equal(album.variableProductionAvailable, false);
  assert.equal(
    album.productionAvailabilityReason,
    'common-product-record-absent',
  );
  assert.deepEqual(album.evidenceRefs, ['support:album']);
});

test('support claims cannot contradict a common Product unsupported state', () => {
  const unsupported = productionProduct({
    availability: 'unsupported',
    valueRepresentation: {
      kind: 'none',
      reason: 'unsupported',
    },
    unsupportedReason: 'artist-source-not-supported',
  });

  assert.throws(
    () => buildFandexArtistAvailabilityMatrix({
      universeVersion: 'test-universe-v1',
      artists: [{ id: 'iu' }],
      products: [unsupported],
      supportClaims: [{
        canonicalArtistId: 'iu',
        variableId: 'newsIssuePoint',
        supported: true,
        reason: 'conflicting-claim',
      }],
    }),
    /support_conflict/,
  );
});

test('unknown artists and duplicate artist-variable records fail closed', () => {
  assert.throws(
    () => buildFandexArtistAvailabilityMatrix({
      universeVersion: 'test-universe-v1',
      artists: [{ id: 'iu' }],
      products: [productionProduct({
        canonicalArtistId: 'unknown-artist',
      })],
    }),
    /unknown_product_artist/,
  );

  assert.throws(
    () => buildFandexArtistAvailabilityMatrix({
      universeVersion: 'test-universe-v1',
      artists: [{ id: 'iu' }],
      products: [productionProduct(), productionProduct()],
    }),
    /duplicate_product/,
  );
});
