import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFandexVariableProductRecord,
  FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION,
  FANDEX_VARIABLE_PRODUCT_IDS,
} from '../lib/product/contracts/fandexVariableProduct';

function baseInput() {
  return {
    variableId: 'newsIssuePoint' as const,
    canonicalArtistId: 'iu',
    lifecycleState: 'production' as const,
    materialClass: 'real' as const,
    readinessState: 'production' as const,
    availability: 'available' as const,
    valueRepresentation: {
      kind: 'numeric' as const,
      value: 0,
      unit: null,
    },
    asOf: '2026-10-03T11:00:00.000Z',
    observationTime: {
      kind: 'period' as const,
      start: '2026-10-03T10:00:00.000Z',
      end: '2026-10-03T11:00:00.000Z',
    },
    collectionTime: {
      collectedAt: '2026-10-03T11:03:00.000Z',
    },
    confidence: 'insufficient' as const,
    coverage: 'unknown' as const,
    freshness: 'current' as const,
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: ['evidence:b', 'evidence:a', 'evidence:b'],
    methodologyVersion: 'news-method-v1',
    sourceVersion: 'naver-source-v1',
    productVersion: 'news-product-v1',
  };
}

test('contract owns exactly the seven FANDEX variable identities', () => {
  assert.deepEqual(FANDEX_VARIABLE_PRODUCT_IDS, [
    'musicAlbumPoint',
    'newsIssuePoint',
    'snsFandomPoint',
    'brandFitPoint',
    'comebackActivityPoint',
    'growthMomentumPoint',
    'riskAdjustmentPoint',
  ]);
});

test('true zero remains an available numeric observation and not missing', () => {
  const record = createFandexVariableProductRecord(baseInput());

  assert.equal(
    record.contractVersion,
    FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION,
  );
  assert.equal(record.availability, 'available');
  assert.deepEqual(record.valueRepresentation, {
    kind: 'numeric',
    value: 0,
    unit: null,
  });
  assert.equal(record.missingReason, null);
  assert.deepEqual(record.evidenceRefs, ['evidence:a', 'evidence:b']);
});

test('missing numeric data must stay null and carry an explicit reason', () => {
  const missing = createFandexVariableProductRecord({
    ...baseInput(),
    availability: 'missing',
    valueRepresentation: {
      kind: 'numeric',
      value: null,
      unit: null,
    },
    missingReason: 'provider-observation-absent',
  });

  assert.equal(missing.availability, 'missing');
  assert.equal(missing.valueRepresentation.kind, 'numeric');
  if (missing.valueRepresentation.kind === 'numeric') {
    assert.equal(missing.valueRepresentation.value, null);
  }

  assert.throws(
    () =>
      createFandexVariableProductRecord({
        ...baseInput(),
        availability: 'missing',
        valueRepresentation: {
          kind: 'numeric',
          value: 0,
          unit: null,
        },
        missingReason: 'provider-observation-absent',
      }),
    /unavailable_numeric_value_present/,
  );
});

test('unsupported and blocked states require their own reasons', () => {
  assert.throws(
    () =>
      createFandexVariableProductRecord({
        ...baseInput(),
        availability: 'unsupported',
        valueRepresentation: {
          kind: 'none',
          reason: 'unsupported',
        },
        unsupportedReason: null,
      }),
    /unsupported_reason_required/,
  );

  assert.throws(
    () =>
      createFandexVariableProductRecord({
        ...baseInput(),
        availability: 'blocked',
        valueRepresentation: {
          kind: 'none',
          reason: 'blocked',
        },
        blockerReason: null,
      }),
    /blocker_reason_required/,
  );
});

test('non-numeric variable representations remain first-class', () => {
  const momentum = createFandexVariableProductRecord({
    ...baseInput(),
    variableId: 'growthMomentumPoint',
    valueRepresentation: {
      kind: 'categorical',
      state: 'rising-persistent',
    },
    methodologyVersion: 'momentum-method-v1',
    sourceVersion: 'momentum-source-v1',
    productVersion: 'momentum-product-v1',
  });
  const activity = createFandexVariableProductRecord({
    ...baseInput(),
    variableId: 'comebackActivityPoint',
    valueRepresentation: {
      kind: 'event',
      state: 'active-window',
    },
  });
  const risk = createFandexVariableProductRecord({
    ...baseInput(),
    variableId: 'riskAdjustmentPoint',
    valueRepresentation: {
      kind: 'quality',
      state: 'insufficient_data',
    },
  });

  assert.equal(momentum.valueRepresentation.kind, 'categorical');
  assert.equal(activity.valueRepresentation.kind, 'event');
  assert.equal(risk.valueRepresentation.kind, 'quality');
});

test('observation time and collection time stay independently represented', () => {
  const record = createFandexVariableProductRecord(baseInput());

  assert.deepEqual(record.observationTime, {
    kind: 'period',
    start: '2026-10-03T10:00:00.000Z',
    end: '2026-10-03T11:00:00.000Z',
  });
  assert.deepEqual(record.collectionTime, {
    collectedAt: '2026-10-03T11:03:00.000Z',
  });
});

test('production material cannot be synthetic or preview', () => {
  assert.throws(
    () =>
      createFandexVariableProductRecord({
        ...baseInput(),
        materialClass: 'synthetic',
      }),
    /production_material_invalid/,
  );
});
