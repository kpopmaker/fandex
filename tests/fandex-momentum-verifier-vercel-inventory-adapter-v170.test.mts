import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptFandexMomentumVerifierVercelInventoryResearch,
  FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_DESCRIPTOR,
  type FandexMomentumVerifierVercelInventoryAdapterInput,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryAdapterResearch';

const base: FandexMomentumVerifierVercelInventoryAdapterInput = {
  request: {
    method: 'GET',
    endpoint: '/v10/projects/{idOrName}/env',
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    decryptRequested: false,
  },
  inventoryAvailable: false,
  inventoryBoundToProjectAndTeam: false,
  completeForProductionTarget: false,
  rows: [],
  opaqueSecretRollbackAttestation: null,
};

test('v170 is read-only and never persists sensitive values', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_DESCRIPTOR.providerReadOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_DESCRIPTOR.decryptRequested,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_DESCRIPTOR.rawProviderResponsePersisted,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_DESCRIPTOR.sensitiveValuePersisted,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_DESCRIPTOR.vercelMutationPerformed,
    false,
  );
});

test('current unavailable inventory remains blocked and unknown, never inferred absent', () => {
  const out = adaptFandexMomentumVerifierVercelInventoryResearch(base);
  assert.equal(out.state, 'inventory-adapter-blocked');
  assert.equal(out.adapterReady, false);
  assert.deepEqual(out.evidence.observations.map((x) => x.presence), [
    'unknown',
    'unknown',
    'unknown',
  ]);
  assert.equal(out.rollbackReadiness.state, 'rollback-readiness-blocked');
  assert.ok(out.blockers.includes('inventory-response-unavailable'));
  assert.ok(out.blockers.includes('pre-mutation-inventory-unavailable'));
});

test('complete empty inventory maps all three keys to absent and rollback-ready', () => {
  const out = adaptFandexMomentumVerifierVercelInventoryResearch({
    ...base,
    inventoryAvailable: true,
    inventoryBoundToProjectAndTeam: true,
    completeForProductionTarget: true,
  });
  assert.equal(out.state, 'inventory-adapter-ready');
  assert.equal(out.adapterReady, true);
  assert.deepEqual(out.evidence.observations.map((x) => x.presence), [
    'absent',
    'absent',
    'absent',
  ]);
  assert.deepEqual(
    out.rollbackReadiness.keyReadiness.map((x) => x.rollbackAction),
    ['remove-created-key', 'remove-created-key', 'remove-created-key'],
  );
});

test('present plain keys preserve exact prior non-secret values for rollback', () => {
  const out = adaptFandexMomentumVerifierVercelInventoryResearch({
    ...base,
    inventoryAvailable: true,
    inventoryBoundToProjectAndTeam: true,
    completeForProductionTarget: true,
    rows: [
      {
        id: 'env_enable',
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
        type: 'plain',
        target: ['production'],
        decrypted: false,
        value: 'old-enable',
      },
      {
        id: 'env_deployment',
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
        type: 'plain',
        target: ['production'],
        decrypted: false,
        value: 'old-deployment',
      },
    ],
  });

  assert.equal(out.state, 'inventory-adapter-ready');
  assert.equal(out.evidence.observations[0].nonSecretPriorValue, 'old-enable');
  assert.equal(
    out.evidence.observations[1].nonSecretPriorValue,
    'old-deployment',
  );
  assert.equal(out.rollbackReadiness.keyReadiness[0].ready, true);
  assert.equal(out.rollbackReadiness.keyReadiness[1].ready, true);
});

test('present sensitive key requires matching opaque rollback attestation and never returns provider value', () => {
  const out = adaptFandexMomentumVerifierVercelInventoryResearch({
    ...base,
    inventoryAvailable: true,
    inventoryBoundToProjectAndTeam: true,
    completeForProductionTarget: true,
    rows: [
      {
        id: 'env_secret',
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
        type: 'sensitive',
        target: ['production'],
        decrypted: false,
        value: 'opaque-provider-value-that-must-not-be-propagated',
      },
    ],
    opaqueSecretRollbackAttestation: {
      envId: 'env_secret',
      handleId: 'opaque-rollback:v170:secret',
      restorable: true,
      source: 'trusted-environment-opaque-snapshot',
      secretValueExposed: false,
    },
  });

  assert.equal(out.state, 'inventory-adapter-ready');
  assert.equal(out.evidence.observations[2].nonSecretPriorValue, null);
  assert.equal(
    out.evidence.observations[2].opaqueRollbackHandleId,
    'opaque-rollback:v170:secret',
  );
  assert.equal(
    JSON.stringify(out).includes('opaque-provider-value-that-must-not-be-propagated'),
    false,
  );
});

test('present sensitive key without opaque rollback attestation remains blocked', () => {
  const out = adaptFandexMomentumVerifierVercelInventoryResearch({
    ...base,
    inventoryAvailable: true,
    inventoryBoundToProjectAndTeam: true,
    completeForProductionTarget: true,
    rows: [
      {
        id: 'env_secret',
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
        type: 'sensitive',
        target: ['production'],
        decrypted: false,
        value: null,
      },
    ],
  });
  assert.equal(out.state, 'inventory-adapter-blocked');
  assert.ok(
    out.blockers.some((x) =>
      x.includes('secret-opaque-rollback-handle-missing-or-invalid'),
    ),
  );
});

test('decrypted provider rows, preview scope, and duplicate rows fail closed', () => {
  for (const rows of [
    [
      {
        id: 'env_enable',
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
        type: 'plain',
        target: ['production'] as const,
        decrypted: true,
        value: 'old',
      },
    ],
    [
      {
        id: 'env_enable',
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
        type: 'plain',
        target: ['production', 'preview'] as const,
        decrypted: false,
        value: 'old',
      },
    ],
    [
      {
        id: 'env_enable_1',
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
        type: 'plain',
        target: ['production'] as const,
        decrypted: false,
        value: 'old',
      },
      {
        id: 'env_enable_2',
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
        type: 'plain',
        target: ['production'] as const,
        decrypted: false,
        value: 'old2',
      },
    ],
  ]) {
    const out = adaptFandexMomentumVerifierVercelInventoryResearch({
      ...base,
      inventoryAvailable: true,
      inventoryBoundToProjectAndTeam: true,
      completeForProductionTarget: true,
      rows,
    } as FandexMomentumVerifierVercelInventoryAdapterInput);
    assert.equal(out.state, 'inventory-adapter-blocked');
  }
});

test('v170 itself has zero provider/mutation/ledger effects', () => {
  const out = adaptFandexMomentumVerifierVercelInventoryResearch(base);
  assert.deepEqual(out.effects, {
    vercelReads: 0,
    vercelWrites: 0,
    environmentMutations: 0,
    secretReads: 0,
    secretWrites: 0,
    productionDeployments: 0,
    verifierActivations: 0,
    nativeVerifierExecutions: 0,
    databaseWrites: 0,
    productMetricWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});
