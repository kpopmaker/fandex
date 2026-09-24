import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_VERSION =
  'v169_fandex_momentum_verifier_premutation_rollback_readiness_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_VERSION,
    lifecycle: 'research' as const,
    readOnlyEvidenceContract: true as const,
    unknownIsAbsent: false as const,
    decryptSecretAllowed: false as const,
    secretValueExposureAllowed: false as const,
    vercelMutationPerformed: false as const,
    environmentMutationPerformed: false as const,
    secretMutationPerformed: false as const,
    productionDeploymentPerformed: false as const,
    verifierActivationPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
  });

export type FandexMomentumVerifierPreMutationPresence =
  | 'present'
  | 'absent'
  | 'unknown';

export type FandexMomentumVerifierPreMutationTargetScope =
  | 'production-only'
  | 'includes-preview'
  | 'unknown';

export type FandexMomentumVerifierPreMutationObservation = Readonly<{
  key:
    | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
    | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
    | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
  presence: FandexMomentumVerifierPreMutationPresence;
  targetScope: FandexMomentumVerifierPreMutationTargetScope;
  providerType: 'plain' | 'sensitive' | 'encrypted' | 'unknown';
  nonSecretPriorValueKnown: boolean;
  nonSecretPriorValue: string | null;
  secretValueExposed: false;
  opaqueRollbackHandleId: string | null;
  opaqueRollbackRestorableAttested: boolean;
}>;

export type FandexMomentumVerifierPreMutationRollbackReadinessInput =
  Readonly<{
    target: Readonly<{
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      projectName: 'fandex';
      environment: 'production';
    }>;
    inventoryEvidence: Readonly<{
      endpoint: '/v10/projects/{idOrName}/env';
      method: 'GET';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decryptRequested: false;
      inventoryQueryable: boolean;
      evidenceBoundToProjectAndTeam: boolean;
      completeForProductionTarget: boolean;
    }>;
    observations: readonly [
      FandexMomentumVerifierPreMutationObservation,
      FandexMomentumVerifierPreMutationObservation,
      FandexMomentumVerifierPreMutationObservation,
    ];
    touchedKeys: readonly [
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    ];
    excludedKeys: readonly [
      'FANDEX_RUNTIME_DATABASE_URL',
      'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
    ];
  }>;

export type FandexMomentumVerifierKeyRollbackReadiness = Readonly<{
  key:
    | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
    | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
    | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
  presence: FandexMomentumVerifierPreMutationPresence;
  ready: boolean;
  rollbackAction:
    | 'remove-created-key'
    | 'restore-exact-prior-value'
    | 'restore-from-opaque-secret-handle'
    | null;
  priorValuePersistedInResearchArtifact: false;
  opaqueRollbackHandleId: string | null;
  blockers: readonly string[];
}>;

export type FandexMomentumVerifierPreMutationRollbackReadinessResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_VERSION;
    state: 'rollback-readiness-blocked' | 'rollback-readiness-ready';
    rollbackReady: boolean;
    keyReadiness: readonly [
      FandexMomentumVerifierKeyRollbackReadiness,
      FandexMomentumVerifierKeyRollbackReadiness,
      FandexMomentumVerifierKeyRollbackReadiness,
    ];
    blockers: readonly string[];
    evidence: FandexMomentumVerifierPreMutationRollbackReadinessInput;
    effects: Readonly<{
      vercelReads: 0;
      vercelWrites: 0;
      environmentMutations: 0;
      secretReads: 0;
      secretWrites: 0;
      secretRotations: 0;
      productionDeployments: 0;
      verifierActivations: 0;
      nativeVerifierExecutions: 0;
      databaseWrites: 0;
      productMetricWrites: 0;
      registryMutations: 0;
      historyWrites: 0;
      watermarkWrites: 0;
      manifestWrites: 0;
    }>;
    digest: string;
  }>;

function validHandle(value: string | null): boolean {
  return value !== null && /^[A-Za-z0-9._:-]{8,256}$/.test(value);
}

function expectedKeyAtIndex(index: number) {
  return [
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
  ][index] as FandexMomentumVerifierPreMutationObservation['key'];
}

function evaluateObservation(
  observation: FandexMomentumVerifierPreMutationObservation,
  index: number,
  inventoryUsable: boolean,
): FandexMomentumVerifierKeyRollbackReadiness {
  const blockers: string[] = [];
  const expectedKey = expectedKeyAtIndex(index);

  if (observation.key !== expectedKey) {
    blockers.push('pre-mutation-key-order-invalid');
  }
  if (!inventoryUsable) {
    blockers.push('pre-mutation-inventory-unusable');
  }
  if (observation.presence === 'unknown') {
    blockers.push('pre-mutation-key-presence-unknown');
  }
  if (observation.targetScope === 'unknown') {
    blockers.push('pre-mutation-target-scope-unknown');
  } else if (observation.targetScope === 'includes-preview') {
    blockers.push('pre-mutation-preview-scope-forbidden');
  }

  const isSecret = observation.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';

  if (observation.secretValueExposed !== false) {
    blockers.push('pre-mutation-secret-value-exposure-forbidden');
  }

  let rollbackAction:
    | 'remove-created-key'
    | 'restore-exact-prior-value'
    | 'restore-from-opaque-secret-handle'
    | null = null;

  if (observation.presence === 'absent') {
    if (observation.nonSecretPriorValueKnown || observation.nonSecretPriorValue !== null) {
      blockers.push('absent-key-cannot-have-prior-value');
    }
    if (
      observation.opaqueRollbackHandleId !== null
      || observation.opaqueRollbackRestorableAttested
    ) {
      blockers.push('absent-key-cannot-have-rollback-handle');
    }
    rollbackAction = 'remove-created-key';
  } else if (observation.presence === 'present') {
    if (isSecret) {
      if (
        observation.nonSecretPriorValueKnown
        || observation.nonSecretPriorValue !== null
      ) {
        blockers.push('secret-prior-value-cannot-be-recorded');
      }
      if (!validHandle(observation.opaqueRollbackHandleId)) {
        blockers.push('secret-opaque-rollback-handle-missing-or-invalid');
      }
      if (!observation.opaqueRollbackRestorableAttested) {
        blockers.push('secret-opaque-rollback-restorability-not-attested');
      }
      rollbackAction = 'restore-from-opaque-secret-handle';
    } else {
      if (!observation.nonSecretPriorValueKnown) {
        blockers.push('non-secret-prior-value-not-known');
      }
      if (
        observation.nonSecretPriorValue === null
        || observation.nonSecretPriorValue.length === 0
      ) {
        blockers.push('non-secret-prior-value-missing');
      }
      if (
        observation.opaqueRollbackHandleId !== null
        || observation.opaqueRollbackRestorableAttested
      ) {
        blockers.push('non-secret-key-cannot-use-secret-rollback-handle');
      }
      rollbackAction = 'restore-exact-prior-value';
    }
  }

  const unique = Object.freeze([...new Set(blockers)]);
  return Object.freeze({
    key: observation.key,
    presence: observation.presence,
    ready: unique.length === 0,
    rollbackAction: unique.length === 0 ? rollbackAction : null,
    priorValuePersistedInResearchArtifact: false as const,
    opaqueRollbackHandleId:
      isSecret && observation.presence === 'present'
        ? observation.opaqueRollbackHandleId
        : null,
    blockers: unique,
  });
}

export function evaluateFandexMomentumVerifierPreMutationRollbackReadiness(
  input: FandexMomentumVerifierPreMutationRollbackReadinessInput,
): FandexMomentumVerifierPreMutationRollbackReadinessResult {
  const blockers: string[] = [];

  if (
    input.target.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || input.target.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || input.target.projectName !== 'fandex'
    || input.target.environment !== 'production'
  ) {
    blockers.push('pre-mutation-target-invalid');
  }

  const inventory = input.inventoryEvidence;
  if (
    inventory.endpoint !== '/v10/projects/{idOrName}/env'
    || inventory.method !== 'GET'
    || inventory.teamId !== input.target.teamId
    || inventory.projectId !== input.target.projectId
    || inventory.decryptRequested !== false
  ) {
    blockers.push('pre-mutation-inventory-request-invalid');
  }
  if (!inventory.inventoryQueryable) {
    blockers.push('pre-mutation-inventory-unavailable');
  }
  if (!inventory.evidenceBoundToProjectAndTeam) {
    blockers.push('pre-mutation-inventory-not-bound-to-target');
  }
  if (!inventory.completeForProductionTarget) {
    blockers.push('pre-mutation-production-inventory-incomplete');
  }

  if (
    input.touchedKeys[0] !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
    || input.touchedKeys[1]
      !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
    || input.touchedKeys[2] !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
  ) {
    blockers.push('pre-mutation-touched-key-set-invalid');
  }
  if (
    input.excludedKeys[0] !== 'FANDEX_RUNTIME_DATABASE_URL'
    || input.excludedKeys[1] !== 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET'
  ) {
    blockers.push('pre-mutation-excluded-key-set-invalid');
  }

  const inventoryUsable =
    inventory.inventoryQueryable
    && inventory.evidenceBoundToProjectAndTeam
    && inventory.completeForProductionTarget;

  const keyReadiness = Object.freeze([
    evaluateObservation(input.observations[0], 0, inventoryUsable),
    evaluateObservation(input.observations[1], 1, inventoryUsable),
    evaluateObservation(input.observations[2], 2, inventoryUsable),
  ] as const);

  for (const row of keyReadiness) {
    blockers.push(...row.blockers.map((item) => `${row.key}:${item}`));
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const rollbackReady =
    uniqueBlockers.length === 0 && keyReadiness.every((row) => row.ready);
  const state = rollbackReady
    ? 'rollback-readiness-ready' as const
    : 'rollback-readiness-blocked' as const;

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_PREMUTATION_ROLLBACK_READINESS_VERSION,
    state,
    rollbackReady,
    keyReadiness,
    blockers: uniqueBlockers,
    evidence: input,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      vercelReads: 0 as const,
      vercelWrites: 0 as const,
      environmentMutations: 0 as const,
      secretReads: 0 as const,
      secretWrites: 0 as const,
      secretRotations: 0 as const,
      productionDeployments: 0 as const,
      verifierActivations: 0 as const,
      nativeVerifierExecutions: 0 as const,
      databaseWrites: 0 as const,
      productMetricWrites: 0 as const,
      registryMutations: 0 as const,
      historyWrites: 0 as const,
      watermarkWrites: 0 as const,
      manifestWrites: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
