import assert from 'node:assert/strict';
import test from 'node:test';

import {
  acquireFandexMomentumVerifierVercelInventoryResearch,
  FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_DESCRIPTOR,
  type FandexMomentumVerifierVercelInventoryAcquisitionInput,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryAcquisitionResearch';

const baseInput: FandexMomentumVerifierVercelInventoryAcquisitionInput = {
  channel: {
    available: false,
    authenticatedReadOnly: false,
    mutationCapabilityPresent: false,
    interfaceName: null,
  },
  request: {
    method: 'GET',
    endpoint: '/v10/projects/{idOrName}/env',
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    decryptRequested: false,
    gitBranchFilter: null,
    customEnvironmentFilter: null,
  },
  execution: {
    status: 'not-attempted',
    readPerformed: false,
    providerResponseReceived: false,
    responseBoundToProjectAndTeam: false,
    completeForProductionTarget: false,
    truncationOrAdditionalPageRisk: false,
    rawProviderResponsePersisted: false,
    secretValueLogged: false,
    secretValuePersisted: false,
  },
  rows: [],
  opaqueSecretRollbackAttestation: null,
};

test('v171 is read-only acquisition only and has no mutation capability', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_DESCRIPTOR
      .readOnlyAcquisition,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_DESCRIPTOR
      .mutationCapabilityAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_DESCRIPTOR
      .decryptRequested,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_DESCRIPTOR
      .providerPaginationShapeInvented,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_DESCRIPTOR
      .completenessProofRequired,
    true,
  );
});

test('current connected-interface absence remains acquisition-blocked and preserves unknown state', () => {
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch(baseInput);

  assert.equal(out.state, 'inventory-acquisition-blocked');
  assert.equal(out.acquisitionReady, false);
  assert.equal(out.receipt.state, 'acquisition-not-attempted');
  assert.equal(out.receipt.readPerformed, false);
  assert.equal(out.receipt.providerRowCount, 0);
  assert.equal(out.effects.vercelReads, 0);
  assert.equal(out.effects.vercelWrites, 0);
  assert.ok(out.blockers.includes('inventory-acquisition-channel-unavailable'));
  assert.ok(
    out.blockers.includes(
      'inventory-acquisition-channel-not-authenticated-read-only',
    ),
  );
  assert.ok(out.blockers.includes('inventory-acquisition-read-not-performed'));
  assert.equal(out.v170.state, 'inventory-adapter-blocked');
  assert.deepEqual(
    out.v170.evidence.observations.map((row) => row.presence),
    ['unknown', 'unknown', 'unknown'],
  );
});

test('a complete authenticated empty Production inventory can prove all three keys absent', () => {
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch({
      ...baseInput,
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: false,
        interfaceName: 'synthetic-read-only-v171',
      },
      execution: {
        ...baseInput.execution,
        status: 'success',
        readPerformed: true,
        providerResponseReceived: true,
        responseBoundToProjectAndTeam: true,
        completeForProductionTarget: true,
        truncationOrAdditionalPageRisk: false,
      },
    });

  assert.equal(out.state, 'inventory-acquisition-ready');
  assert.equal(out.acquisitionReady, true);
  assert.equal(out.receipt.state, 'acquisition-bounded');
  assert.equal(out.receipt.providerRowCount, 0);
  assert.equal(out.receipt.verifierRowCount, 0);
  assert.deepEqual(
    out.v170.evidence.observations.map((row) => row.presence),
    ['absent', 'absent', 'absent'],
  );
  assert.equal(out.v170.rollbackReadiness.rollbackReady, true);
  assert.equal(out.effects.vercelReads, 1);
  assert.equal(out.effects.vercelWrites, 0);
});

test('truncation or additional-page risk forbids absence conclusions', () => {
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch({
      ...baseInput,
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: false,
        interfaceName: 'synthetic-read-only-v171',
      },
      execution: {
        ...baseInput.execution,
        status: 'success',
        readPerformed: true,
        providerResponseReceived: true,
        responseBoundToProjectAndTeam: true,
        completeForProductionTarget: false,
        truncationOrAdditionalPageRisk: true,
      },
    });

  assert.equal(out.state, 'inventory-acquisition-blocked');
  assert.ok(
    out.blockers.includes(
      'inventory-acquisition-production-completeness-unproven',
    ),
  );
  assert.ok(
    out.blockers.includes(
      'inventory-acquisition-truncation-or-additional-page-risk',
    ),
  );
  assert.deepEqual(
    out.v170.evidence.observations.map((row) => row.presence),
    ['unknown', 'unknown', 'unknown'],
  );
});

test('provider/read errors leave verifier keys unknown and emit only bounded failure metadata', () => {
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch({
      ...baseInput,
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: false,
        interfaceName: 'synthetic-read-only-v171',
      },
      execution: {
        ...baseInput.execution,
        status: 'provider-error',
        readPerformed: true,
        providerResponseReceived: false,
        responseBoundToProjectAndTeam: false,
        completeForProductionTarget: false,
      },
    });

  assert.equal(out.state, 'inventory-acquisition-blocked');
  assert.equal(out.receipt.state, 'acquisition-failed');
  assert.equal(out.receipt.providerResponseReceived, false);
  assert.deepEqual(
    out.v170.evidence.observations.map((row) => row.presence),
    ['unknown', 'unknown', 'unknown'],
  );
  assert.equal(out.receipt.rawProviderResponsePersisted, false);
  assert.equal(out.receipt.secretValueLogged, false);
  assert.equal(out.receipt.secretValuePersisted, false);
});

test('duplicate verifier-key rows fail closed', () => {
  const duplicateRow = {
    id: 'env_enable_1',
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
    type: 'plain',
    target: ['production'] as const,
    decrypted: false,
    value: 'old-value',
  };
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch({
      ...baseInput,
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: false,
        interfaceName: 'synthetic-read-only-v171',
      },
      execution: {
        ...baseInput.execution,
        status: 'success',
        readPerformed: true,
        providerResponseReceived: true,
        responseBoundToProjectAndTeam: true,
        completeForProductionTarget: true,
      },
      rows: [
        duplicateRow,
        { ...duplicateRow, id: 'env_enable_2' },
      ],
    });

  assert.equal(out.state, 'inventory-acquisition-blocked');
  assert.equal(out.receipt.duplicateVerifierKeyDetected, true);
  assert.ok(
    out.blockers.includes('inventory-acquisition-duplicate-verifier-key'),
  );
});

test('Preview-scoped verifier key fails closed even in otherwise complete inventory', () => {
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch({
      ...baseInput,
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: false,
        interfaceName: 'synthetic-read-only-v171',
      },
      execution: {
        ...baseInput.execution,
        status: 'success',
        readPerformed: true,
        providerResponseReceived: true,
        responseBoundToProjectAndTeam: true,
        completeForProductionTarget: true,
      },
      rows: [
        {
          id: 'env_enable_preview',
          key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
          type: 'plain',
          target: ['production', 'preview'],
          decrypted: false,
          value: 'old-value',
        },
      ],
    });

  assert.equal(out.state, 'inventory-acquisition-blocked');
  assert.equal(out.receipt.previewScopedVerifierKeyDetected, true);
  assert.ok(
    out.blockers.includes(
      'inventory-acquisition-preview-scoped-verifier-key',
    ),
  );
});

test('decrypted verifier rows are forbidden and never make acquisition ready', () => {
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch({
      ...baseInput,
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: false,
        interfaceName: 'synthetic-read-only-v171',
      },
      execution: {
        ...baseInput.execution,
        status: 'success',
        readPerformed: true,
        providerResponseReceived: true,
        responseBoundToProjectAndTeam: true,
        completeForProductionTarget: true,
      },
      rows: [
        {
          id: 'env_enable_decrypted',
          key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
          type: 'plain',
          target: ['production'],
          decrypted: true,
          value: 'old-value',
        },
      ],
    });

  assert.equal(out.state, 'inventory-acquisition-blocked');
  assert.equal(out.receipt.decryptedVerifierRowDetected, true);
  assert.ok(
    out.blockers.includes(
      'inventory-acquisition-decrypted-verifier-row-forbidden',
    ),
  );
});

test('secret-like provider values are discarded before bounded rows and receipt persistence', () => {
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch({
      ...baseInput,
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: false,
        interfaceName: 'synthetic-read-only-v171',
      },
      execution: {
        ...baseInput.execution,
        status: 'success',
        readPerformed: true,
        providerResponseReceived: true,
        responseBoundToProjectAndTeam: true,
        completeForProductionTarget: true,
      },
      rows: [
        {
          id: 'env_secret_1',
          key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
          type: 'sensitive',
          target: ['production'],
          decrypted: false,
          value: 'synthetic-secret-must-be-dropped',
        },
      ],
      opaqueSecretRollbackAttestation: {
        envId: 'env_secret_1',
        handleId: 'opaque-secret-rollback:v171:test',
        restorable: true,
        source: 'trusted-environment-opaque-snapshot',
        secretValueExposed: false,
      },
    });

  assert.equal(out.receipt.sensitiveValueObservedAndDiscarded, true);
  assert.equal(out.boundedRows[0]?.value, null);
  assert.equal(
    JSON.stringify(out.receipt).includes('synthetic-secret-must-be-dropped'),
    false,
  );
  assert.equal(
    JSON.stringify(out.boundedRows).includes('synthetic-secret-must-be-dropped'),
    false,
  );
  assert.equal(out.receipt.secretValueLogged, false);
  assert.equal(out.receipt.secretValuePersisted, false);
});

test('mutation-capable acquisition channel is forbidden even if a read could succeed', () => {
  const out =
    acquireFandexMomentumVerifierVercelInventoryResearch({
      ...baseInput,
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: true,
        interfaceName: 'synthetic-mixed-capability-v171',
      },
      execution: {
        ...baseInput.execution,
        status: 'success',
        readPerformed: true,
        providerResponseReceived: true,
        responseBoundToProjectAndTeam: true,
        completeForProductionTarget: true,
      },
    });

  assert.equal(out.state, 'inventory-acquisition-blocked');
  assert.ok(
    out.blockers.includes(
      'inventory-acquisition-channel-has-mutation-capability',
    ),
  );
  assert.equal(out.effects.vercelWrites, 0);
});
