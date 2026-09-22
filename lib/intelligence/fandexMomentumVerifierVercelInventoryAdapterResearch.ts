import { sha256Canonical } from '../shared/canonicalDigest';
import {
  evaluateFandexMomentumVerifierPreMutationRollbackReadiness,
  type FandexMomentumVerifierPreMutationRollbackReadinessInput,
  type FandexMomentumVerifierPreMutationRollbackReadinessResult,
} from './fandexMomentumVerifierPreMutationRollbackReadinessResearch';

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_VERSION =
  'v170_fandex_momentum_verifier_vercel_inventory_adapter_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_VERSION,
    lifecycle: 'research' as const,
    upstreamV169Contract:
      'v169_fandex_momentum_verifier_premutation_rollback_readiness_research_v1' as const,
    providerReadOnly: true as const,
    decryptRequested: false as const,
    rawProviderResponsePersisted: false as const,
    sensitiveValuePersisted: false as const,
    sensitiveValueReturned: false as const,
    vercelMutationPerformed: false as const,
    productionDeploymentPerformed: false as const,
    verifierActivationPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
  });

type VercelTarget = 'production' | 'preview' | 'development';

export type FandexMomentumVerifierVercelInventoryRow = Readonly<{
  id: string;
  key: string;
  type: 'plain' | 'sensitive' | 'encrypted' | string;
  target: readonly VercelTarget[];
  decrypted: boolean;
  value: string | null;
}>;

export type FandexMomentumVerifierOpaqueSecretRollbackAttestation =
  Readonly<{
    envId: string;
    handleId: string;
    restorable: true;
    source: 'trusted-environment-opaque-snapshot';
    secretValueExposed: false;
  }>;

export type FandexMomentumVerifierVercelInventoryAdapterInput =
  Readonly<{
    request: Readonly<{
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decryptRequested: false;
    }>;
    inventoryAvailable: boolean;
    inventoryBoundToProjectAndTeam: boolean;
    completeForProductionTarget: boolean;
    rows: readonly FandexMomentumVerifierVercelInventoryRow[];
    opaqueSecretRollbackAttestation:
      FandexMomentumVerifierOpaqueSecretRollbackAttestation | null;
  }>;

export type FandexMomentumVerifierVercelInventoryAdapterResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_VERSION;
    state: 'inventory-adapter-blocked' | 'inventory-adapter-ready';
    adapterReady: boolean;
    evidence:
      FandexMomentumVerifierPreMutationRollbackReadinessInput;
    rollbackReadiness:
      FandexMomentumVerifierPreMutationRollbackReadinessResult;
    blockers: readonly string[];
    effects: Readonly<{
      vercelReads: 0;
      vercelWrites: 0;
      environmentMutations: 0;
      secretReads: 0;
      secretWrites: 0;
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

const TARGET_KEYS = Object.freeze([
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
] as const);

function validProviderRow(row: FandexMomentumVerifierVercelInventoryRow): boolean {
  return (
    /^[A-Za-z0-9._:-]{3,256}$/.test(row.id)
    && row.key.length > 0
    && row.target.length > 0
    && row.target.every((target) =>
      target === 'production'
      || target === 'preview'
      || target === 'development'
    )
  );
}

function targetScope(
  targets: readonly VercelTarget[],
): 'production-only' | 'includes-preview' | 'unknown' {
  if (targets.includes('preview')) return 'includes-preview';
  if (targets.length === 1 && targets[0] === 'production') {
    return 'production-only';
  }
  return 'unknown';
}

function unknownObservation(
  key: typeof TARGET_KEYS[number],
): FandexMomentumVerifierPreMutationRollbackReadinessInput['observations'][number] {
  return Object.freeze({
    key,
    presence: 'unknown' as const,
    targetScope: 'unknown' as const,
    providerType: 'unknown' as const,
    nonSecretPriorValueKnown: false,
    nonSecretPriorValue: null,
    secretValueExposed: false as const,
    opaqueRollbackHandleId: null,
    opaqueRollbackRestorableAttested: false,
  });
}

export function adaptFandexMomentumVerifierVercelInventoryResearch(
  input: FandexMomentumVerifierVercelInventoryAdapterInput,
): FandexMomentumVerifierVercelInventoryAdapterResult {
  const blockers: string[] = [];

  if (
    input.request.method !== 'GET'
    || input.request.endpoint !== '/v10/projects/{idOrName}/env'
    || input.request.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || input.request.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || input.request.decryptRequested !== false
  ) {
    blockers.push('inventory-request-contract-invalid');
  }
  if (!input.inventoryAvailable) blockers.push('inventory-response-unavailable');
  if (!input.inventoryBoundToProjectAndTeam) {
    blockers.push('inventory-response-not-bound-to-target');
  }
  if (!input.completeForProductionTarget) {
    blockers.push('inventory-response-incomplete-for-production');
  }

  const observations = TARGET_KEYS.map((key) => {
    if (
      !input.inventoryAvailable
      || !input.inventoryBoundToProjectAndTeam
      || !input.completeForProductionTarget
    ) {
      return unknownObservation(key);
    }

    const matches = input.rows.filter((row) => row.key === key);
    if (matches.length > 1) {
      blockers.push(`${key}:inventory-duplicate-key-rows`);
      return unknownObservation(key);
    }
    if (matches.length === 0) {
      return Object.freeze({
        key,
        presence: 'absent' as const,
        targetScope: 'production-only' as const,
        providerType: 'unknown' as const,
        nonSecretPriorValueKnown: false,
        nonSecretPriorValue: null,
        secretValueExposed: false as const,
        opaqueRollbackHandleId: null,
        opaqueRollbackRestorableAttested: false,
      });
    }

    const row = matches[0]!;
    if (!validProviderRow(row)) {
      blockers.push(`${key}:inventory-row-invalid`);
      return unknownObservation(key);
    }
    if (row.decrypted) {
      blockers.push(`${key}:decrypted-provider-row-forbidden`);
    }

    const scope = targetScope(row.target);
    const isSecret = key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';

    if (isSecret) {
      const attestation = input.opaqueSecretRollbackAttestation;
      const attestationMatches =
        attestation !== null
        && attestation.envId === row.id
        && /^[A-Za-z0-9._:-]{8,256}$/.test(attestation.handleId)
        && attestation.restorable === true
        && attestation.source === 'trusted-environment-opaque-snapshot'
        && attestation.secretValueExposed === false;

      return Object.freeze({
        key,
        presence: 'present' as const,
        targetScope: scope,
        providerType:
          row.type === 'sensitive' || row.type === 'encrypted'
            ? row.type
            : 'unknown' as const,
        nonSecretPriorValueKnown: false,
        nonSecretPriorValue: null,
        secretValueExposed: false as const,
        opaqueRollbackHandleId:
          attestationMatches ? attestation!.handleId : null,
        opaqueRollbackRestorableAttested: attestationMatches,
      });
    }

    const plainType = row.type === 'plain';
    const priorValueKnown =
      plainType
      && typeof row.value === 'string'
      && row.value.length > 0
      && row.decrypted === false;

    return Object.freeze({
      key,
      presence: 'present' as const,
      targetScope: scope,
      providerType: plainType ? 'plain' as const : 'unknown' as const,
      nonSecretPriorValueKnown: priorValueKnown,
      nonSecretPriorValue: priorValueKnown ? row.value : null,
      secretValueExposed: false as const,
      opaqueRollbackHandleId: null,
      opaqueRollbackRestorableAttested: false,
    });
  }) as unknown as FandexMomentumVerifierPreMutationRollbackReadinessInput['observations'];

  const evidence: FandexMomentumVerifierPreMutationRollbackReadinessInput =
    Object.freeze({
      target: Object.freeze({
        teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
        projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
        projectName: 'fandex' as const,
        environment: 'production' as const,
      }),
      inventoryEvidence: Object.freeze({
        endpoint: '/v10/projects/{idOrName}/env' as const,
        method: 'GET' as const,
        teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
        projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
        decryptRequested: false as const,
        inventoryQueryable: input.inventoryAvailable,
        evidenceBoundToProjectAndTeam: input.inventoryBoundToProjectAndTeam,
        completeForProductionTarget: input.completeForProductionTarget,
      }),
      observations,
      touchedKeys: TARGET_KEYS,
      excludedKeys: Object.freeze([
        'FANDEX_RUNTIME_DATABASE_URL' as const,
        'FANDEX_NAVER_NEWS_SCHEDULER_SECRET' as const,
      ]),
    });

  const rollbackReadiness =
    evaluateFandexMomentumVerifierPreMutationRollbackReadiness(evidence);

  blockers.push(...rollbackReadiness.blockers);
  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const adapterReady =
    uniqueBlockers.length === 0
    && rollbackReadiness.state === 'rollback-readiness-ready';
  const state = adapterReady
    ? 'inventory-adapter-ready' as const
    : 'inventory-adapter-blocked' as const;

  const payload = {
    contractVersion: FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ADAPTER_VERSION,
    state,
    adapterReady,
    evidence,
    rollbackReadiness,
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      vercelReads: 0 as const,
      vercelWrites: 0 as const,
      environmentMutations: 0 as const,
      secretReads: 0 as const,
      secretWrites: 0 as const,
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
