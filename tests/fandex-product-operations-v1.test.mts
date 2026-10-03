import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexArtistAvailabilityMatrix,
} from '../lib/product/contracts/fandexArtistAvailabilityMatrix';
import {
  createFandexProductCandidate,
} from '../lib/product/contracts/fandexProductCandidate';
import {
  createFandexProductExplainability,
} from '../lib/product/contracts/fandexProductExplainability';
import {
  createFandexProductOperations,
  FANDEX_PRODUCT_OPERATIONS_CONTRACT_VERSION,
} from '../lib/product/contracts/fandexProductOperations';
import {
  createFandexProductReadModel,
  type FandexProductReadModel,
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
  if (variableId === 'newsIssuePoint') {
    return createFandexVariableProductRecord({
      variableId,
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
      asOf: '2026-10-03T12:00:00.000Z',
      observationTime: {
        kind: 'period',
        start: '2026-10-03T10:00:00.000Z',
        end: '2026-10-03T11:00:00.000Z',
      },
      collectionTime: {
        collectedAt: '2026-10-03T11:05:00.000Z',
      },
      confidence: 'moderate',
      coverage: 'complete',
      freshness: 'current',
      missingReason: null,
      unsupportedReason: null,
      blockerReason: null,
      evidenceRefs: [`evidence:${variableId}`],
      methodologyVersion: `${variableId}-method-v1`,
      sourceVersion: `${variableId}-source-v1`,
      productVersion: `${variableId}-product-v1`,
    });
  }

  if (variableId === 'musicAlbumPoint') {
    return createFandexVariableProductRecord({
      variableId,
      canonicalArtistId: 'iu',
      lifecycleState: 'production',
      materialClass: 'real',
      readinessState: 'production',
      availability: 'missing',
      valueRepresentation: {
        kind: 'numeric',
        value: null,
        unit: null,
      },
      asOf: null,
      observationTime: { kind: 'unknown' },
      collectionTime: null,
      confidence: 'low',
      coverage: 'incomplete',
      freshness: 'current',
      missingReason: 'provider-observation-absent',
      unsupportedReason: null,
      blockerReason: null,
      evidenceRefs: [`evidence:${variableId}`],
      methodologyVersion: `${variableId}-method-v1`,
      sourceVersion: `${variableId}-source-v1`,
      productVersion: `${variableId}-product-v1`,
    });
  }

  if (variableId === 'brandFitPoint') {
    return createFandexVariableProductRecord({
      variableId,
      canonicalArtistId: 'iu',
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
      freshness: 'stale',
      missingReason: null,
      unsupportedReason: null,
      blockerReason: null,
      evidenceRefs: [`evidence:${variableId}`],
      methodologyVersion: `${variableId}-method-v1`,
      sourceVersion: `${variableId}-source-v1`,
      productVersion: `${variableId}-product-v1`,
    });
  }

  if (variableId === 'riskAdjustmentPoint') {
    return createFandexVariableProductRecord({
      variableId,
      canonicalArtistId: 'iu',
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
      evidenceRefs: [`evidence:${variableId}`],
      methodologyVersion: `${variableId}-method-v1`,
      sourceVersion: `${variableId}-source-v1`,
      productVersion: `${variableId}-product-v1`,
    });
  }

  return createFandexVariableProductRecord({
    variableId,
    canonicalArtistId: 'iu',
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
    evidenceRefs: [`evidence:${variableId}`],
    methodologyVersion: `${variableId}-method-v1`,
    sourceVersion: `${variableId}-source-v1`,
    productVersion: `${variableId}-product-v1`,
  });
}

function model() {
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

  return createFandexProductReadModel({
    candidate,
    explainability,
    generatedAt: '2026-10-03T14:30:00.000Z',
  });
}

test('operations contract exposes monitoring rights and versioning without score logic', () => {
  const operations = createFandexProductOperations({ model: model() });

  assert.equal(
    operations.contractVersion,
    FANDEX_PRODUCT_OPERATIONS_CONTRACT_VERSION,
  );
  assert.equal(operations.audience, 'internal');
  assert.equal(operations.canonicalArtistId, 'iu');
  assert.equal(operations.generatedAt, '2026-10-03T14:30:00.000Z');
  assert.equal(operations.monitoring.state, 'issues-present');
  assert.equal(operations.rights.publicPublicationAllowed, null);
  assert.equal(operations.rights.unresolvedVariableIds.length, 7);
  assert.equal(operations.versioning.variableLineage.length, 7);
});

test('monitoring reflects existing structural states without threshold invention', () => {
  const operations = createFandexProductOperations({ model: model() });

  assert.ok(
    operations.monitoring.issues.some(
      (issue) =>
        issue.variableId === 'musicAlbumPoint'
        && issue.code === 'missing',
    ),
  );
  assert.ok(
    operations.monitoring.issues.some(
      (issue) =>
        issue.variableId === 'brandFitPoint'
        && issue.code === 'stale',
    ),
  );
  assert.ok(
    operations.monitoring.issues.some(
      (issue) =>
        issue.variableId === 'riskAdjustmentPoint'
        && issue.code === 'blocked',
    ),
  );
  assert.ok(
    operations.monitoring.issues.some(
      (issue) =>
        issue.variableId === 'musicAlbumPoint'
        && issue.code === 'confidence-low-or-insufficient',
    ),
  );
});

test('rights default to unknown when no explicit claim exists', () => {
  const operations = createFandexProductOperations({ model: model() });

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    assert.deepEqual(operations.rights.byVariable[variableId], {
      variableId,
      state: 'unknown',
      basis: 'rights-not-established',
      evidenceRefs: [],
    });
  }

  assert.equal(operations.rights.publicPublicationAllowed, null);
});

test('explicit restricted or internal-only rights block public publication', () => {
  const operations = createFandexProductOperations({
    model: model(),
    rightsClaims: [
      {
        variableId: 'newsIssuePoint',
        state: 'restricted',
        basis: 'provider-contract-restriction',
        evidenceRefs: ['rights:news-contract'],
      },
      {
        variableId: 'musicAlbumPoint',
        state: 'internal-only',
        basis: 'internal-analysis-only',
        evidenceRefs: ['rights:album-policy'],
      },
    ],
  });

  assert.equal(operations.rights.publicPublicationAllowed, false);
  assert.deepEqual(operations.rights.restrictedVariableIds, [
    'musicAlbumPoint',
    'newsIssuePoint',
  ]);
  assert.ok(
    operations.rights.unresolvedVariableIds.includes('snsFandomPoint'),
  );
});

test('public publication becomes allowed only when every variable is explicitly permitted', () => {
  const operations = createFandexProductOperations({
    model: model(),
    rightsClaims: FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => ({
      variableId,
      state: 'public-permitted' as const,
      basis: `rights-confirmed:${variableId}`,
      evidenceRefs: [`rights:${variableId}`],
    })),
  });

  assert.equal(operations.rights.publicPublicationAllowed, true);
  assert.deepEqual(operations.rights.unresolvedVariableIds, []);
  assert.deepEqual(operations.rights.restrictedVariableIds, []);
});

test('rights claims reject duplicates and blank basis', () => {
  const readModel = model();

  assert.throws(
    () => createFandexProductOperations({
      model: readModel,
      rightsClaims: [
        {
          variableId: 'newsIssuePoint',
          state: 'public-permitted',
          basis: 'confirmed',
        },
        {
          variableId: 'newsIssuePoint',
          state: 'restricted',
          basis: 'conflicting',
        },
      ],
    }),
    /duplicate_claim/,
  );

  assert.throws(
    () => createFandexProductOperations({
      model: readModel,
      rightsClaims: [{
        variableId: 'newsIssuePoint',
        state: 'public-permitted',
        basis: ' ',
      }],
    }),
    /basis_required/,
  );
});

test('versioning preserves per-variable methodology source and product lineage', () => {
  const operations = createFandexProductOperations({ model: model() });
  const news = operations.versioning.variableLineage.find(
    (entry) => entry.variableId === 'newsIssuePoint',
  );

  assert.deepEqual(news, {
    variableId: 'newsIssuePoint',
    methodologyVersion: 'newsIssuePoint-method-v1',
    sourceVersion: 'newsIssuePoint-source-v1',
    productVersion: 'newsIssuePoint-product-v1',
  });
  assert.equal(
    operations.versioning.readModelContractVersion,
    'fandex-product-read-model-v1',
  );
  assert.equal(
    operations.versioning.candidateContractVersion,
    'fandex-product-candidate-v1',
  );
  assert.equal(
    operations.versioning.explainabilityContractVersion,
    'fandex-product-explainability-v1',
  );
});

test('operations layer refuses a read model that crosses the methodology boundary', () => {
  const base = model();
  const forged = {
    ...base,
    fandexValue: 77,
  } as unknown as FandexProductReadModel;

  assert.throws(
    () => createFandexProductOperations({ model: forged }),
    /methodology_boundary_invalid/,
  );
});
