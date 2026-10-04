import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFandexVariableProductRecord,
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from '../lib/product/contracts/fandexVariableProduct';
import {
  FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION,
} from '../lib/product/contracts/fandexVariableProductSnapshot';
import {
  createFandexArtistVariableProductSnapshotFromAdapterResults,
  FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION,
  type FandexArtistVariableProductAdapterEnvelope,
} from '../lib/product/adapters/fandexArtistVariableProductOrchestrator';

function record(
  variableId: FandexVariableProductId,
  canonicalArtistId = 'iu',
) {
  return createFandexVariableProductRecord({
    variableId,
    canonicalArtistId,
    lifecycleState: 'research',
    materialClass: 'real',
    readinessState: 'research-only',
    availability: 'unavailable',
    valueRepresentation: {
      kind: 'none',
      reason: 'not-produced',
    },
    asOf: null,
    observationTime: { kind: 'unknown' },
    collectionTime: null,
    confidence: 'insufficient',
    coverage: 'unknown',
    freshness: 'unknown',
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: [`repo://evidence/${variableId}`],
    methodologyVersion: `${variableId}-method-v1`,
    sourceVersion: `${variableId}-source-v1`,
    productVersion: `${variableId}-product-v1`,
  });
}

function successfulResults(
  canonicalArtistId = 'iu',
): readonly FandexArtistVariableProductAdapterEnvelope[] {
  return Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) =>
      Object.freeze({
        variableId,
        result: Object.freeze({
          status: 'ok' as const,
          record: record(variableId, canonicalArtistId),
        }),
      }),
    ).toReversed(),
  );
}

test('orchestration assembly creates one canonical seven-variable snapshot', () => {
  const result =
    createFandexArtistVariableProductSnapshotFromAdapterResults({
      canonicalArtistId: 'iu',
      results: successfulResults(),
    });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.orchestratorVersion,
    FANDEX_ARTIST_VARIABLE_PRODUCT_ORCHESTRATOR_VERSION,
  );
  assert.equal(
    result.snapshot.contractVersion,
    FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION,
  );
  assert.equal(result.snapshot.canonicalArtistId, 'iu');
  assert.deepEqual(
    result.snapshot.records.map((entry) => entry.variableId),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
});

test('one blocked adapter fails closed instead of fabricating a variable value', () => {
  const results = successfulResults().map((entry) =>
    entry.variableId === 'riskAdjustmentPoint'
      ? Object.freeze({
          variableId: entry.variableId,
          result: Object.freeze({
            status: 'blocked' as const,
            reason: 'dependency-blocked',
          }),
        })
      : entry,
  );

  const result =
    createFandexArtistVariableProductSnapshotFromAdapterResults({
      canonicalArtistId: 'iu',
      results,
    });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.blocker, 'adapter-output-blocked');
  assert.deepEqual(result.failures, [
    {
      variableId: 'riskAdjustmentPoint',
      reason: 'adapter-blocked:dependency-blocked',
    },
  ]);
  assert.equal('snapshot' in result, false);
});

test('adapter output from another artist is rejected before snapshot publication', () => {
  const results = successfulResults().map((entry) =>
    entry.variableId === 'brandFitPoint'
      ? Object.freeze({
          variableId: entry.variableId,
          result: Object.freeze({
            status: 'ok' as const,
            record: record('brandFitPoint', 'blackpink'),
          }),
        })
      : entry,
  );

  const result =
    createFandexArtistVariableProductSnapshotFromAdapterResults({
      canonicalArtistId: 'iu',
      results,
    });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.blocker, 'adapter-output-blocked');
  assert.deepEqual(result.failures, [
    {
      variableId: 'brandFitPoint',
      reason: 'artist-identity-mismatch:blackpink',
    },
  ]);
});

test('missing or duplicate adapter results are rejected as a structural failure', () => {
  const complete = successfulResults();

  const missing =
    createFandexArtistVariableProductSnapshotFromAdapterResults({
      canonicalArtistId: 'iu',
      results: complete.slice(0, -1),
    });

  assert.equal(missing.status, 'blocked');
  if (missing.status === 'blocked') {
    assert.equal(missing.blocker, 'adapter-result-set-invalid');
  }

  const duplicate =
    createFandexArtistVariableProductSnapshotFromAdapterResults({
      canonicalArtistId: 'iu',
      results: [...complete.slice(0, -1), complete[0]],
    });

  assert.equal(duplicate.status, 'blocked');
  if (duplicate.status === 'blocked') {
    assert.equal(duplicate.blocker, 'adapter-result-set-invalid');
    assert.ok(
      duplicate.failures.some(
        (failure) => failure.reason === 'adapter-result-duplicate',
      ),
    );
  }
});

test('empty canonical artist identity fails closed', () => {
  const result =
    createFandexArtistVariableProductSnapshotFromAdapterResults({
      canonicalArtistId: '   ',
      results: successfulResults(),
    });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.blocker, 'artist-id-invalid');
  assert.deepEqual(result.failures, [
    {
      variableId: null,
      reason: 'canonical-artist-id-empty',
    },
  ]);
});
