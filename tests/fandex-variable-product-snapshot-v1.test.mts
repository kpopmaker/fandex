import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFandexVariableProductRecord,
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from '../lib/product/contracts/fandexVariableProduct';
import {
  createFandexVariableProductSnapshot,
  FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION,
} from '../lib/product/contracts/fandexVariableProductSnapshot';

function record(
  variableId: FandexVariableProductId,
  options: Readonly<{
    artistId?: string;
    production?: boolean;
    blocked?: boolean;
  }> = {},
) {
  const artistId = options.artistId ?? 'iu';

  if (options.production) {
    return createFandexVariableProductRecord({
      variableId,
      canonicalArtistId: artistId,
      lifecycleState: 'production',
      materialClass: 'real',
      readinessState: 'production',
      availability: 'available',
      valueRepresentation: {
        kind: 'numeric',
        value: 0,
        unit: null,
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

  if (options.blocked) {
    return createFandexVariableProductRecord({
      variableId,
      canonicalArtistId: artistId,
      lifecycleState: 'blocked',
      materialClass: 'real',
      readinessState: 'blocked',
      availability: 'blocked',
      valueRepresentation: {
        kind: 'none',
        reason: 'blocked',
      },
      asOf: null,
      observationTime: { kind: 'unknown' },
      collectionTime: null,
      confidence: 'insufficient',
      coverage: 'unknown',
      freshness: 'unknown',
      missingReason: null,
      unsupportedReason: null,
      blockerReason: 'upstream-readiness-blocked',
      evidenceRefs: [`repo://evidence/${variableId}`],
      methodologyVersion: `${variableId}-method-v1`,
      sourceVersion: `${variableId}-source-v1`,
      productVersion: `${variableId}-product-v1`,
    });
  }

  return createFandexVariableProductRecord({
    variableId,
    canonicalArtistId: artistId,
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

function completeRecords() {
  return FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) =>
    record(variableId, {
      production: variableId === 'newsIssuePoint',
      blocked: variableId === 'riskAdjustmentPoint',
    }),
  );
}

test('snapshot requires exactly one record for all seven FANDEX variables', () => {
  const snapshot = createFandexVariableProductSnapshot(
    completeRecords().toReversed(),
  );

  assert.equal(
    snapshot.contractVersion,
    FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION,
  );
  assert.equal(snapshot.canonicalArtistId, 'iu');
  assert.deepEqual(
    snapshot.records.map((entry) => entry.variableId),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
  assert.deepEqual(snapshot.productionVariableIds, ['newsIssuePoint']);
  assert.equal(
    snapshot.unresolvedVariableIds.includes('newsIssuePoint'),
    false,
  );
  assert.deepEqual(snapshot.blockedVariableIds, ['riskAdjustmentPoint']);
});

test('snapshot rejects missing or duplicate variable identities', () => {
  const complete = completeRecords();

  assert.throws(
    () => createFandexVariableProductSnapshot(complete.slice(0, -1)),
    /record_count_invalid/,
  );

  assert.throws(
    () =>
      createFandexVariableProductSnapshot([
        ...complete.slice(0, -1),
        complete[0],
      ]),
    /duplicate_variable/,
  );
});

test('snapshot rejects mixed artist identities', () => {
  const complete = completeRecords();
  const mixed = complete.map((entry) =>
    entry.variableId === 'brandFitPoint'
      ? record('brandFitPoint', { artistId: 'blackpink' })
      : entry,
  );

  assert.throws(
    () => createFandexVariableProductSnapshot(mixed),
    /artist_identity_mismatch/,
  );
});

test('production accounting is lifecycle/readiness based and does not coerce missing to zero', () => {
  const records = completeRecords().map((entry) => {
    if (entry.variableId !== 'newsIssuePoint') return entry;

    return createFandexVariableProductRecord({
      ...entry,
      lifecycleState: 'production',
      materialClass: 'real',
      readinessState: 'production',
      availability: 'missing',
      valueRepresentation: {
        kind: 'numeric',
        value: null,
        unit: null,
      },
      missingReason: 'observation-not-available',
    });
  });

  const snapshot = createFandexVariableProductSnapshot(records);
  const news = snapshot.records.find(
    (entry) => entry.variableId === 'newsIssuePoint',
  );

  assert.deepEqual(snapshot.productionVariableIds, ['newsIssuePoint']);
  assert.ok(news);
  assert.equal(news.availability, 'missing');
  assert.deepEqual(news.valueRepresentation, {
    kind: 'numeric',
    value: null,
    unit: null,
  });
  assert.equal(news.missingReason, 'observation-not-available');
});

test('snapshot refuses forged production readiness without production lifecycle', () => {
  const records = completeRecords();
  const forged = records.map((entry) =>
    entry.variableId === 'musicAlbumPoint'
      ? ({
          ...entry,
          readinessState: 'production',
        } as typeof entry)
      : entry,
  );

  assert.throws(
    () => createFandexVariableProductSnapshot(forged),
    /production_readiness_invalid/,
  );
});
