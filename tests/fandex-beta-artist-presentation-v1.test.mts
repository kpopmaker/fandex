import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFandexBetaArtistPresentation,
} from '../lib/product/presentation/fandexBetaArtistPresentation';
import type {
  FandexCurrentRuntimeAssemblyReadiness,
} from '../lib/product/runtime/fandexCurrentRuntimeAssemblyReadiness';
import type {
  FandexVariableProductId,
  FandexVariableProductRecord,
} from '../lib/product/contracts/fandexVariableProduct';

const ids: readonly FandexVariableProductId[] = [
  'musicAlbumPoint',
  'newsIssuePoint',
  'snsFandomPoint',
  'brandFitPoint',
  'comebackActivityPoint',
  'growthMomentumPoint',
  'riskAdjustmentPoint',
];

function record(
  variableId: FandexVariableProductId,
  lifecycleState: FandexVariableProductRecord['lifecycleState'],
  materialClass: FandexVariableProductRecord['materialClass'],
  readinessState: FandexVariableProductRecord['readinessState'],
): FandexVariableProductRecord {
  return {
    contractVersion: 'fandex-variable-product-v1',
    variableId,
    canonicalArtistId: 'iu',
    lifecycleState,
    materialClass,
    readinessState,
    availability: 'available',
    valueRepresentation: {
      kind: 'categorical',
      state: variableId === 'newsIssuePoint' ? 'observed' : 'available',
    },
    asOf: '2026-10-04T13:00:00.000Z',
    observationTime: {
      observedAt: null,
      windowStart: null,
      windowEnd: null,
    },
    collectionTime: null,
    confidence: 'insufficient',
    coverage: 'unknown',
    freshness: 'unknown',
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: ['evidence://one'],
    methodologyVersion: 'methodology-v1',
    sourceVersion: 'source-v1',
    productVersion: 'product-v1',
  } as FandexVariableProductRecord;
}

test('FANDEX Beta presentation exposes runtime state without inventing a final score', () => {
  const records = ids.map((variableId) =>
    record(
      variableId,
      variableId === 'newsIssuePoint' || variableId === 'comebackActivityPoint'
        ? 'production'
        : 'research',
      variableId === 'newsIssuePoint' || variableId === 'comebackActivityPoint'
        ? 'real'
        : 'research',
      variableId === 'newsIssuePoint' || variableId === 'comebackActivityPoint'
        ? 'production'
        : 'research-only',
    ),
  );

  const readiness = {
    contractVersion: 'fandex-current-runtime-assembly-readiness-v1',
    canonicalArtistId: 'iu',
    status: 'assembly-ready',
    variableStates: ids.map((variableId) => ({
      variableId,
      sourceState:
        variableId === 'riskAdjustmentPoint' ? 'derived' : 'resolved',
      adapterState: 'ok',
      reason: null,
    })),
    resolvedVariableIds: ids,
    blockedVariableIds: [],
    records,
    assembly: null,
    scoreCalculated: false,
    methodologyFinalized: false,
    publicRouteActivated: false,
  } as FandexCurrentRuntimeAssemblyReadiness;

  const presentation = createFandexBetaArtistPresentation({
    readiness,
    generatedAt: '2026-10-04T13:30:00.000Z',
  });

  assert.equal(presentation.totalVariableCount, 7);
  assert.equal(presentation.resolvedVariableCount, 7);
  assert.equal(presentation.productionVariableCount, 2);
  assert.equal(presentation.blockedVariableCount, 0);
  assert.equal(presentation.fandexValue, null);
  assert.equal(presentation.ranking, null);
  assert.equal(presentation.scoreStatus, 'not-defined');
  assert.equal(presentation.methodologyFinalized, false);
  assert.equal(presentation.components.length, 7);
  assert.equal(
    'evidenceRefs' in presentation.components[0],
    false,
    'Beta presentation must expose evidence count, not raw evidence references',
  );
});

test('FANDEX Beta presentation keeps runtime blockers explicit', () => {
  const readiness = {
    contractVersion: 'fandex-current-runtime-assembly-readiness-v1',
    canonicalArtistId: 'iu',
    status: 'blocked',
    variableStates: ids.map((variableId) => ({
      variableId,
      sourceState:
        variableId === 'brandFitPoint'
          ? 'runtime-source-unavailable'
          : variableId === 'riskAdjustmentPoint'
            ? 'derived'
            : 'resolved',
      adapterState: variableId === 'brandFitPoint' ? 'not-run' : 'ok',
      reason:
        variableId === 'brandFitPoint'
          ? 'durable-stored-evidence-not-found'
          : null,
    })),
    resolvedVariableIds: ids.filter((id) => id !== 'brandFitPoint'),
    blockedVariableIds: ['brandFitPoint'],
    records: ids
      .filter((id) => id !== 'brandFitPoint')
      .map((id) => record(id, 'research', 'research', 'research-only')),
    assembly: null,
    scoreCalculated: false,
    methodologyFinalized: false,
    publicRouteActivated: false,
  } as FandexCurrentRuntimeAssemblyReadiness;

  const presentation = createFandexBetaArtistPresentation({
    readiness,
    generatedAt: '2026-10-04T13:30:00.000Z',
  });

  const brandFit = presentation.components.find(
    (component) => component.variableId === 'brandFitPoint',
  );

  assert.equal(presentation.runtimeStatus, 'blocked');
  assert.equal(presentation.blockedVariableCount, 1);
  assert.equal(brandFit?.displayValue, '런타임 확인 필요');
  assert.equal(
    brandFit?.statusReason,
    'durable-stored-evidence-not-found',
  );
});
