import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierPreMutationRollbackReadiness,
  FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_DESCRIPTOR,
  type FandexMomentumVerifierPreMutationRollbackReadinessInput,
} from '../lib/intelligence/fandexMomentumVerifierPreMutationRollbackReadinessResearch';

const currentEvidence: FandexMomentumVerifierPreMutationRollbackReadinessInput = {
  target: {
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    projectName: 'fandex',
    environment: 'production',
  },
  inventoryEvidence: {
    endpoint: '/v10/projects/{idOrName}/env',
    method: 'GET',
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    decryptRequested: false,
    inventoryQueryable: false,
    evidenceBoundToProjectAndTeam: false,
    completeForProductionTarget: false,
  },
  observations: [
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      presence: 'unknown',
      targetScope: 'unknown',
      providerType: 'unknown',
      nonSecretPriorValueKnown: false,
      nonSecretPriorValue: null,
      secretValueExposed: false,
      opaqueRollbackHandleId: null,
      opaqueRollbackRestorableAttested: false,
    },
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      presence: 'unknown',
      targetScope: 'unknown',
      providerType: 'unknown',
      nonSecretPriorValueKnown: false,
      nonSecretPriorValue: null,
      secretValueExposed: false,
      opaqueRollbackHandleId: null,
      opaqueRollbackRestorableAttested: false,
    },
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
      presence: 'unknown',
      targetScope: 'unknown',
      providerType: 'unknown',
      nonSecretPriorValueKnown: false,
      nonSecretPriorValue: null,
      secretValueExposed: false,
      opaqueRollbackHandleId: null,
      opaqueRollbackRestorableAttested: false,
    },
  ],
  touchedKeys: [
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
  ],
  excludedKeys: [
    'FANDEX_RUNTIME_DATABASE_URL',
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  ],
};

test('v169 is read-only evidence evaluation and never treats unknown as absent', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_DESCRIPTOR
      .readOnlyEvidenceContract,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_DESCRIPTOR
      .unknownIsAbsent,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_DESCRIPTOR
      .decryptSecretAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_DESCRIPTOR
      .secretValueExposureAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_DESCRIPTOR
      .vercelMutationPerformed,
    false,
  );
});

test('current unavailable inventory keeps all three keys unknown and rollback blocked', () => {
  const out =
    evaluateFandexMomentumVerifierPreMutationRollbackReadiness(currentEvidence);

  assert.equal(out.state, 'rollback-readiness-blocked');
  assert.equal(out.rollbackReady, false);
  assert.deepEqual(out.keyReadiness.map((row) => row.presence), [
    'unknown',
    'unknown',
    'unknown',
  ]);
  assert.ok(out.blockers.includes('pre-mutation-inventory-unavailable'));
  assert.ok(out.blockers.includes('pre-mutation-inventory-not-bound-to-target'));
  assert.ok(out.blockers.includes('pre-mutation-production-inventory-incomplete'));
  assert.ok(
    out.blockers.includes(
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET:pre-mutation-key-presence-unknown',
    ),
  );
  assert.deepEqual(out.effects, {
    vercelReads: 0,
    vercelWrites: 0,
    environmentMutations: 0,
    secretReads: 0,
    secretWrites: 0,
    secretRotations: 0,
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

test('synthetic complete inventory with all three keys absent is rollback-ready by removal', () => {
  const out = evaluateFandexMomentumVerifierPreMutationRollbackReadiness({
    ...currentEvidence,
    inventoryEvidence: {
      ...currentEvidence.inventoryEvidence,
      inventoryQueryable: true,
      evidenceBoundToProjectAndTeam: true,
      completeForProductionTarget: true,
    },
    observations: currentEvidence.observations.map((row) => ({
      ...row,
      presence: 'absent' as const,
      targetScope: 'production-only' as const,
    })) as unknown as FandexMomentumVerifierPreMutationRollbackReadinessInput['observations'],
  });

  assert.equal(out.state, 'rollback-readiness-ready');
  assert.equal(out.rollbackReady, true);
  assert.deepEqual(out.keyReadiness.map((row) => row.rollbackAction), [
    'remove-created-key',
    'remove-created-key',
    'remove-created-key',
  ]);
});

test('synthetic existing non-secret keys require exact prior values while secret requires opaque restorable handle', () => {
  const out = evaluateFandexMomentumVerifierPreMutationRollbackReadiness({
    ...currentEvidence,
    inventoryEvidence: {
      ...currentEvidence.inventoryEvidence,
      inventoryQueryable: true,
      evidenceBoundToProjectAndTeam: true,
      completeForProductionTarget: true,
    },
    observations: [
      {
        ...currentEvidence.observations[0],
        presence: 'present',
        targetScope: 'production-only',
        providerType: 'plain',
        nonSecretPriorValueKnown: true,
        nonSecretPriorValue: 'old-enable-value',
      },
      {
        ...currentEvidence.observations[1],
        presence: 'present',
        targetScope: 'production-only',
        providerType: 'plain',
        nonSecretPriorValueKnown: true,
        nonSecretPriorValue: 'old-deployment-value',
      },
      {
        ...currentEvidence.observations[2],
        presence: 'present',
        targetScope: 'production-only',
        providerType: 'sensitive',
        opaqueRollbackHandleId: 'opaque-secret-rollback:v169:test',
        opaqueRollbackRestorableAttested: true,
      },
    ],
  });

  assert.equal(out.state, 'rollback-readiness-ready');
  assert.equal(out.rollbackReady, true);
  assert.deepEqual(out.keyReadiness.map((row) => row.rollbackAction), [
    'restore-exact-prior-value',
    'restore-exact-prior-value',
    'restore-from-opaque-secret-handle',
  ]);
  assert.equal(
    out.keyReadiness[2].opaqueRollbackHandleId,
    'opaque-secret-rollback:v169:test',
  );
  assert.ok(
    out.keyReadiness.every(
      (row) => row.priorValuePersistedInResearchArtifact === false,
    ),
  );
});

test('existing secret without opaque rollback capability blocks overwrite readiness', () => {
  const out = evaluateFandexMomentumVerifierPreMutationRollbackReadiness({
    ...currentEvidence,
    inventoryEvidence: {
      ...currentEvidence.inventoryEvidence,
      inventoryQueryable: true,
      evidenceBoundToProjectAndTeam: true,
      completeForProductionTarget: true,
    },
    observations: [
      {
        ...currentEvidence.observations[0],
        presence: 'absent',
        targetScope: 'production-only',
      },
      {
        ...currentEvidence.observations[1],
        presence: 'absent',
        targetScope: 'production-only',
      },
      {
        ...currentEvidence.observations[2],
        presence: 'present',
        targetScope: 'production-only',
        providerType: 'sensitive',
      },
    ],
  });

  assert.equal(out.state, 'rollback-readiness-blocked');
  assert.equal(out.rollbackReady, false);
  assert.ok(
    out.blockers.includes(
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET:secret-opaque-rollback-handle-missing-or-invalid',
    ),
  );
  assert.ok(
    out.blockers.includes(
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET:secret-opaque-rollback-restorability-not-attested',
    ),
  );
});

test('non-secret present key without exact prior value blocks rollback readiness', () => {
  const observations = [
    {
      ...currentEvidence.observations[0],
      presence: 'present' as const,
      targetScope: 'production-only' as const,
      providerType: 'plain' as const,
    },
    {
      ...currentEvidence.observations[1],
      presence: 'absent' as const,
      targetScope: 'production-only' as const,
    },
    {
      ...currentEvidence.observations[2],
      presence: 'absent' as const,
      targetScope: 'production-only' as const,
    },
  ] as FandexMomentumVerifierPreMutationRollbackReadinessInput['observations'];

  const out = evaluateFandexMomentumVerifierPreMutationRollbackReadiness({
    ...currentEvidence,
    inventoryEvidence: {
      ...currentEvidence.inventoryEvidence,
      inventoryQueryable: true,
      evidenceBoundToProjectAndTeam: true,
      completeForProductionTarget: true,
    },
    observations,
  });

  assert.equal(out.state, 'rollback-readiness-blocked');
  assert.ok(
    out.blockers.includes(
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED:non-secret-prior-value-not-known',
    ),
  );
});

test('Preview scope is forbidden even when key presence is known', () => {
  const out = evaluateFandexMomentumVerifierPreMutationRollbackReadiness({
    ...currentEvidence,
    inventoryEvidence: {
      ...currentEvidence.inventoryEvidence,
      inventoryQueryable: true,
      evidenceBoundToProjectAndTeam: true,
      completeForProductionTarget: true,
    },
    observations: [
      {
        ...currentEvidence.observations[0],
        presence: 'absent',
        targetScope: 'includes-preview',
      },
      {
        ...currentEvidence.observations[1],
        presence: 'absent',
        targetScope: 'production-only',
      },
      {
        ...currentEvidence.observations[2],
        presence: 'absent',
        targetScope: 'production-only',
      },
    ],
  });

  assert.equal(out.state, 'rollback-readiness-blocked');
  assert.ok(
    out.blockers.includes(
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED:pre-mutation-preview-scope-forbidden',
    ),
  );
});

test('runtime DB and scheduler credential must stay outside touched key set', () => {
  const out = evaluateFandexMomentumVerifierPreMutationRollbackReadiness({
    ...currentEvidence,
    touchedKeys: [
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      'FANDEX_RUNTIME_DATABASE_URL',
    ] as unknown as FandexMomentumVerifierPreMutationRollbackReadinessInput['touchedKeys'],
  });

  assert.equal(out.state, 'rollback-readiness-blocked');
  assert.ok(out.blockers.includes('pre-mutation-touched-key-set-invalid'));
});


test('committed v169 audit reproduces the current blocked rollback state', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_premutation_rollback_readiness_v169_20260922T001941Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);
  const out =
    evaluateFandexMomentumVerifierPreMutationRollbackReadiness(currentEvidence);

  assert.equal(out.state, 'rollback-readiness-blocked');
  assert.equal(out.rollbackReady, false);
  assert.equal(
    out.digest,
    '926ee773c0f7bcc8bcc02166b5133e50d99c60132793e9b6f540a41db91e24e6',
  );
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.deepEqual(out.keyReadiness, audit.currentResult.keyReadiness);
  assert.equal(audit.providerReadContract.connectedToolInventoryAvailable, false);
  assert.equal(
    audit.providerReadContract.interpretation,
    'inventory could not be queried through the connected interface; key state is unknown, not absent',
  );
  assert.equal(audit.readinessSemantics.unknownIsAbsent, false);
  assert.equal(audit.readinessSemantics.secretDecryptionRequested, false);
  assert.deepEqual(audit.excludedKeys, [
    'FANDEX_RUNTIME_DATABASE_URL',
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  ]);
  assert.equal(audit.validation.realInventoryReadPerformed, false);
  assert.equal(audit.validation.realSecretValueRead, false);
  assert.equal(audit.effects.vercelReads, 0);
  assert.equal(audit.effects.vercelWrites, 0);
  assert.equal(audit.effects.environmentMutations, 0);
  assert.equal(audit.effects.secretReads, 0);
  assert.equal(audit.effects.secretWrites, 0);
  assert.equal(audit.effects.productionDeployments, 0);
  assert.equal(audit.effects.nativeVerifierExecutions, 0);
  assert.equal(audit.effects.historyWrites, 0);
  assert.equal(audit.effects.watermarkWrites, 0);
  assert.equal(audit.effects.manifestWrites, 0);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
