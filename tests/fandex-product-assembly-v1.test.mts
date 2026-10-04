import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTIVITY_EXPOSURE_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/activityExposureFandexVariableProduct';
import {
  BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/brandFitPointFandexVariableProduct';
import {
  MOMENTUM_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/momentumFandexVariableProduct';
import {
  MUSIC_ALBUM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/musicAlbumPointFandexVariableProduct';
import {
  NEWS_ISSUE_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/newsIssuePointFandexVariableProduct';
import {
  RISK_ADJUSTMENT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/riskAdjustmentFandexVariableProduct';
import {
  SNS_FANDOM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/snsFandomPointFandexVariableProduct';
import {
  assembleFandexProduct,
  FANDEX_PRODUCT_ASSEMBLY_ADAPTER_PRODUCT_VERSIONS,
  FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION,
  type FandexProductAssemblyAdapters,
} from '../lib/product/assembly/fandexProductAssembly';
import {
  createFandexVariableProductRecord,
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from '../lib/product/contracts/fandexVariableProduct';

const expectedAdapterVersions = {
  musicAlbumPoint:
    MUSIC_ALBUM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  newsIssuePoint:
    NEWS_ISSUE_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  snsFandomPoint:
    SNS_FANDOM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  brandFitPoint:
    BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  comebackActivityPoint:
    ACTIVITY_EXPOSURE_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  growthMomentumPoint:
    MOMENTUM_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  riskAdjustmentPoint:
    RISK_ADJUSTMENT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} as const;

function record(
  variableId: FandexVariableProductId,
  options: Readonly<{
    artistId?: string;
    productVersion?: string;
  }> = {},
) {
  const production = variableId === 'newsIssuePoint';

  return createFandexVariableProductRecord({
    variableId,
    canonicalArtistId: options.artistId ?? 'iu',
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
    asOf: production ? '2026-10-04T01:00:00.000Z' : null,
    observationTime: production
      ? {
          kind: 'instant',
          observedAt: '2026-10-04T01:00:00.000Z',
        }
      : { kind: 'unknown' },
    collectionTime: production
      ? { collectedAt: '2026-10-04T01:05:00.000Z' }
      : null,
    confidence: production ? 'moderate' : 'insufficient',
    coverage: production ? 'complete' : 'unknown',
    freshness: production ? 'current' : 'unknown',
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: [`assembly-evidence:${variableId}`],
    methodologyVersion: `${variableId}-method-v1`,
    sourceVersion: `${variableId}-source-v1`,
    productVersion:
      options.productVersion ?? expectedAdapterVersions[variableId],
  });
}

function adapters(): FandexProductAssemblyAdapters {
  return {
    musicAlbumPoint: {
      status: 'ok',
      record: record('musicAlbumPoint'),
    },
    newsIssuePoint: {
      status: 'ok',
      record: record('newsIssuePoint'),
    },
    snsFandomPoint: {
      status: 'ok',
      record: record('snsFandomPoint'),
    },
    brandFitPoint: {
      status: 'ok',
      record: record('brandFitPoint'),
    },
    comebackActivityPoint: {
      status: 'ok',
      record: record('comebackActivityPoint'),
    },
    growthMomentumPoint: {
      status: 'ok',
      record: record('growthMomentumPoint'),
    },
    riskAdjustmentPoint: {
      status: 'ok',
      record: record('riskAdjustmentPoint'),
    },
  };
}

function assemble(
  adapterInput: FandexProductAssemblyAdapters = adapters(),
) {
  return assembleFandexProduct({
    adapters: adapterInput,
    universeVersion: 'test-artist-universe-v1',
    artists: [{ id: 'iu' }, { id: 'blackpink' }],
    generatedAt: '2026-10-04T02:00:00.000Z',
  });
}

test('assembly wires all seven adapter records through the internal Product read path without defining a score', () => {
  const result = assemble();

  assert.equal(result.contractVersion, FANDEX_PRODUCT_ASSEMBLY_CONTRACT_VERSION);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(
    result.records.map((entry) => entry.variableId),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
  assert.deepEqual(
    result.snapshot.records.map((entry) => entry.variableId),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
  assert.equal(result.availabilityMatrix.summary.totalArtists, 2);
  assert.equal(result.availabilityRow.canonicalArtistId, 'iu');
  assert.equal(result.candidate.components.length, 7);
  assert.equal(result.explainability.components.length, 7);
  assert.equal(result.readModel.components.length, 7);
  assert.equal(result.api.status, 'ok');

  assert.equal(result.candidate.fandexValue, null);
  assert.equal(result.candidate.fandexCandidateEligible, null);
  assert.equal(result.candidate.methodologyVersion, null);
  assert.equal(result.readModel.fandexValue, null);
  assert.equal(result.readModel.fandexCandidateEligible, null);
  assert.equal(result.readModel.methodologyVersion, null);
});

test('assembly preserves true zero and keeps generated time separate from observation and collection time', () => {
  const result = assemble();

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(
    result.readModel.byVariable.newsIssuePoint.valueRepresentation,
    {
      kind: 'numeric',
      value: 0,
      unit: null,
    },
  );
  assert.deepEqual(result.readModel.generatedTime, {
    generatedAt: '2026-10-04T02:00:00.000Z',
  });
  assert.deepEqual(
    result.readModel.byVariable.newsIssuePoint.time.observationTime,
    {
      kind: 'instant',
      observedAt: '2026-10-04T01:00:00.000Z',
    },
  );
  assert.deepEqual(
    result.readModel.byVariable.newsIssuePoint.time.collectionTime,
    {
      collectedAt: '2026-10-04T01:05:00.000Z',
    },
  );
});

test('assembly fails closed when any adapter is blocked instead of fabricating a seven-variable snapshot', () => {
  const input: FandexProductAssemblyAdapters = {
    ...adapters(),
    snsFandomPoint: {
      status: 'blocked',
      reason: 'upstream-product-boundary-violated',
    },
    riskAdjustmentPoint: {
      status: 'blocked',
      reason: 'candidate-current-input-mismatch',
    },
  };

  const result = assemble(input);

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;

  assert.deepEqual(result.blockedAdapterIds, [
    'snsFandomPoint',
    'riskAdjustmentPoint',
  ]);
  assert.equal(result.api.status, 'data-issue');
  assert.equal(result.api.reason, 'product-candidate-unavailable');
  assert.deepEqual(result.api.details, [
    'riskAdjustmentPoint:candidate-current-input-mismatch',
    'snsFandomPoint:upstream-product-boundary-violated',
  ]);
  assert.equal('readModel' in result, false);
});

test('assembly rejects adapter records whose common contract provenance does not match the merged adapter', () => {
  const input: FandexProductAssemblyAdapters = {
    ...adapters(),
    newsIssuePoint: {
      status: 'ok',
      record: record('newsIssuePoint', {
        productVersion: 'not-the-news-adapter-version',
      }),
    },
  };

  const result = assemble(input);

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.api.reason, 'source-contract-invalid');
  assert.deepEqual(result.api.details, [
    'newsIssuePoint:adapter-record-contract-or-provenance-invalid',
  ]);
});

test('assembly fails closed when the seven adapter records do not resolve to one artist identity', () => {
  const input: FandexProductAssemblyAdapters = {
    ...adapters(),
    riskAdjustmentPoint: {
      status: 'ok',
      record: record('riskAdjustmentPoint', {
        artistId: 'blackpink',
      }),
    },
  };

  const result = assemble(input);

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.api.reason, 'source-inconsistent');
  assert.ok(
    result.api.details.some((detail) =>
      detail.includes('artist_identity_mismatch'),
    ),
  );
});

test('assembly returns artist-not-known when adapter identity is outside the supplied artist universe', () => {
  const result = assembleFandexProduct({
    adapters: adapters(),
    universeVersion: 'test-artist-universe-v1',
    artists: [{ id: 'blackpink' }],
    generatedAt: '2026-10-04T02:00:00.000Z',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.api.reason, 'artist-not-known');
  assert.deepEqual(result.api.details, ['canonical-artist-id:iu']);
});

test('assembly adapter provenance map covers exactly the canonical seven variables', () => {
  assert.deepEqual(
    Object.keys(FANDEX_PRODUCT_ASSEMBLY_ADAPTER_PRODUCT_VERSIONS).sort(),
    [...FANDEX_VARIABLE_PRODUCT_IDS].sort(),
  );
  assert.deepEqual(
    FANDEX_PRODUCT_ASSEMBLY_ADAPTER_PRODUCT_VERSIONS,
    expectedAdapterVersions,
  );
});
