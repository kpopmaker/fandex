import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumVerifierVercelMutationDryRunResult,
  FandexMomentumVerifierVercelMutationDryRunPlan,
} from './fandexMomentumVerifierVercelMutationDryRunResearch';

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_VERSION =
  'v169_fandex_momentum_verifier_vercel_configuration_mutation_executor_contract_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_VERSION,
    lifecycle: 'research' as const,
    interfaceContractOnly: true as const,
    upstreamV168Contract:
      'v168_fandex_momentum_verifier_vercel_configuration_mutation_dry_run_research_v1' as const,
    vercelCallPerformed: false as const,
    environmentMutationPerformed: false as const,
    secretReadPerformed: false as const,
    secretWritePerformed: false as const,
    secretValueExposureAllowed: false as const,
    postWriteReadbackRequired: true as const,
    providerBatchAtomicityAssumed: false as const,
    partialFailureRollbackRequired: true as const,
    boundedReceiptRequired: true as const,
    productionDeploymentPerformed: false as const,
    verifierActivationPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
  });

export type FandexMomentumVerifierVercelPreMutationStateEntry =
  | Readonly<{
      key:
        | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
        | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT';
      existed: boolean;
      envId: string | null;
      target: readonly ['production'];
      type: 'plain' | null;
      priorPlainValue: string | null;
      opaqueRollbackHandleId: null;
      secretValueExposed: false;
    }>
  | Readonly<{
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
      existed: boolean;
      envId: string | null;
      target: readonly ['production'];
      type: 'sensitive' | null;
      priorPlainValue: null;
      opaqueRollbackHandleId: string | null;
      secretValueExposed: false;
    }>;

export type FandexMomentumVerifierVercelPreMutationStateCapture =
  Readonly<{
    contractVersion:
      'v169_fandex_momentum_verifier_vercel_pre_mutation_state_capture_v1';
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
    environment: 'production';
    capturedAt: string;
    entries: readonly [
      FandexMomentumVerifierVercelPreMutationStateEntry,
      FandexMomentumVerifierVercelPreMutationStateEntry,
      FandexMomentumVerifierVercelPreMutationStateEntry,
    ];
    excludedKeysObservedButNotCaptured: readonly [
      'FANDEX_RUNTIME_DATABASE_URL',
      'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
    ];
    sensitiveValuesRecorded: false;
  }>;

export type FandexMomentumVerifierVercelExecutorInterface = Readonly<{
  provider: 'vercel';
  mutation: Readonly<{
    method: 'POST';
    endpoint: '/v10/projects/{idOrName}/env';
    upsert: 'true';
    singleBatchRequest: true;
  }>;
  readback: Readonly<{
    method: 'GET';
    endpoint: '/v9/projects/{idOrName}/env';
    exactThreeKeysMustMatchProductionTarget: true;
    plainValuesMustMatchExactly: true;
    secretValueMayBeReturnedToResearchLayer: false;
    secretVerificationMethod:
      'trusted-environment-secret-contract-attestation-without-value-output';
  }>;
  rollback: Readonly<{
    updateExistingMethod: 'PATCH';
    updateExistingEndpoint: '/v9/projects/{idOrName}/env/{id}';
    removeCreatedMethod: 'DELETE';
    removeCreatedEndpoint: '/v9/projects/{idOrName}/env/{id}';
    touchedKeysOnly: true;
    rollbackOnProviderPartialFailure: true;
    rollbackOnReadbackMismatch: true;
    rollbackOnUnexpectedExtraTarget: true;
    secretRollbackRequiresOpaqueRestorableHandleIfPreviouslyPresent: true;
  }>;
}>;

export type FandexMomentumVerifierVercelBoundedMutationReceipt =
  Readonly<{
    contractVersion:
      'v169_fandex_momentum_verifier_vercel_bounded_mutation_receipt_v1';
    state:
      | 'not-executed'
      | 'mutation-applied-readback-verified'
      | 'mutation-failed-rollback-required'
      | 'mutation-readback-mismatch-rollback-required'
      | 'rollback-completed'
      | 'rollback-failed-manual-intervention-required';
    v168Digest: string;
    v169ExecutorContractDigest: string;
    providerMutationRequestCount: 0 | 1;
    providerMutationFailedEntryCount: number | null;
    postWriteReadbackPerformed: boolean;
    postWriteReadbackMatched: boolean | null;
    rollbackRequired: boolean;
    rollbackPerformed: boolean;
    rollbackSucceeded: boolean | null;
    touchedKeys: readonly [
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    ];
    sensitiveValuesIncluded: false;
    productionDeploymentAuthorized: false;
    verifierActivationAuthorized: false;
    nativeVerifierExecutionAuthorized: false;
    ledgerAdvanceAuthorized: false;
    digest: string;
  }>;

export type FandexMomentumVerifierVercelMutationExecutorContractResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_VERSION;
    state: 'executor-contract-blocked' | 'executor-contract-ready';
    executorContractReady: boolean;
    dryRunDigest: string;
    plan: FandexMomentumVerifierVercelMutationDryRunPlan | null;
    preMutationStateCapture:
      FandexMomentumVerifierVercelPreMutationStateCapture | null;
    executorInterface: FandexMomentumVerifierVercelExecutorInterface | null;
    initialReceipt: FandexMomentumVerifierVercelBoundedMutationReceipt;
    blockers: readonly string[];
    effects: Readonly<{
      vercelCalls: 0;
      environmentReads: 0;
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

function exactIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function validId(value: string | null): boolean {
  return value === null || /^[A-Za-z0-9._:-]{3,256}$/.test(value);
}

function validCapture(
  capture: FandexMomentumVerifierVercelPreMutationStateCapture | null,
): boolean {
  if (capture === null) return false;
  if (
    capture.contractVersion
      !== 'v169_fandex_momentum_verifier_vercel_pre_mutation_state_capture_v1'
    || capture.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || capture.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || capture.environment !== 'production'
    || !exactIso(capture.capturedAt)
    || capture.sensitiveValuesRecorded !== false
    || capture.excludedKeysObservedButNotCaptured.length !== 2
    || capture.excludedKeysObservedButNotCaptured[0] !== 'FANDEX_RUNTIME_DATABASE_URL'
    || capture.excludedKeysObservedButNotCaptured[1] !== 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET'
  ) {
    return false;
  }

  const [enable, deployment, secret] = capture.entries;
  if (
    enable.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
    || deployment.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
    || secret.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
  ) {
    return false;
  }

  for (const row of capture.entries) {
    if (
      row.target.length !== 1
      || row.target[0] !== 'production'
      || row.secretValueExposed !== false
      || !validId(row.envId)
    ) {
      return false;
    }
    if (row.existed && row.envId === null) return false;
    if (!row.existed && row.envId !== null) return false;
  }

  if (
    enable.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
    && (
      enable.opaqueRollbackHandleId !== null
      || (enable.existed && enable.type !== 'plain')
      || (!enable.existed && enable.type !== null)
      || (enable.existed && enable.priorPlainValue === null)
      || (!enable.existed && enable.priorPlainValue !== null)
    )
  ) {
    return false;
  }

  if (
    deployment.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
    && (
      deployment.opaqueRollbackHandleId !== null
      || (deployment.existed && deployment.type !== 'plain')
      || (!deployment.existed && deployment.type !== null)
      || (deployment.existed && deployment.priorPlainValue === null)
      || (!deployment.existed && deployment.priorPlainValue !== null)
    )
  ) {
    return false;
  }

  if (
    secret.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
    && (
      secret.priorPlainValue !== null
      || (secret.existed && secret.type !== 'sensitive')
      || (!secret.existed && secret.type !== null)
      || (secret.existed
        && (
          secret.opaqueRollbackHandleId === null
          || !/^[A-Za-z0-9._:-]{8,256}$/.test(secret.opaqueRollbackHandleId)
        ))
      || (!secret.existed && secret.opaqueRollbackHandleId !== null)
    )
  ) {
    return false;
  }

  return true;
}

function buildInterface(): FandexMomentumVerifierVercelExecutorInterface {
  return Object.freeze({
    provider: 'vercel' as const,
    mutation: Object.freeze({
      method: 'POST' as const,
      endpoint: '/v10/projects/{idOrName}/env' as const,
      upsert: 'true' as const,
      singleBatchRequest: true as const,
    }),
    readback: Object.freeze({
      method: 'GET' as const,
      endpoint: '/v9/projects/{idOrName}/env' as const,
      exactThreeKeysMustMatchProductionTarget: true as const,
      plainValuesMustMatchExactly: true as const,
      secretValueMayBeReturnedToResearchLayer: false as const,
      secretVerificationMethod:
        'trusted-environment-secret-contract-attestation-without-value-output' as const,
    }),
    rollback: Object.freeze({
      updateExistingMethod: 'PATCH' as const,
      updateExistingEndpoint: '/v9/projects/{idOrName}/env/{id}' as const,
      removeCreatedMethod: 'DELETE' as const,
      removeCreatedEndpoint: '/v9/projects/{idOrName}/env/{id}' as const,
      touchedKeysOnly: true as const,
      rollbackOnProviderPartialFailure: true as const,
      rollbackOnReadbackMismatch: true as const,
      rollbackOnUnexpectedExtraTarget: true as const,
      secretRollbackRequiresOpaqueRestorableHandleIfPreviouslyPresent:
        true as const,
    }),
  });
}

export function evaluateFandexMomentumVerifierVercelMutationExecutorContract(
  input: Readonly<{
    dryRun: FandexMomentumVerifierVercelMutationDryRunResult;
    expectedDryRunDigest: string;
    preMutationStateCapture:
      FandexMomentumVerifierVercelPreMutationStateCapture | null;
  }>,
): FandexMomentumVerifierVercelMutationExecutorContractResult {
  const blockers: string[] = [];
  const dryRun = input.dryRun;

  if (
    dryRun.state !== 'dry-run-ready'
    || dryRun.dryRunReady !== true
    || dryRun.plan === null
  ) {
    blockers.push('v168-dry-run-not-ready');
  }
  if (
    !/^[0-9a-f]{64}$/.test(input.expectedDryRunDigest)
    || dryRun.digest !== input.expectedDryRunDigest
  ) {
    blockers.push('v168-dry-run-digest-mismatch');
  }
  if (!validCapture(input.preMutationStateCapture)) {
    blockers.push('pre-mutation-state-capture-missing-or-invalid');
  }

  if (dryRun.plan !== null) {
    const plan = dryRun.plan;
    if (
      plan.provider !== 'vercel'
      || plan.sdkMethod !== 'vercel.projects.createProjectEnv'
      || plan.http.method !== 'POST'
      || plan.http.path !== '/v10/projects/{idOrName}/env'
      || plan.http.query.upsert !== 'true'
      || plan.target.environment !== 'production'
      || plan.executionPolicy.providerBatchAtomicityAssumed !== false
      || plan.executionPolicy.partialFailureFailsClosed !== true
      || plan.executionPolicy.preMutationStateCaptureRequired !== true
      || plan.executionPolicy.noMutationMayStartWithoutRollbackReadiness !== true
      || plan.rollbackIntent.restoreExactPreMutationState !== true
      || plan.rollbackIntent.secretValueMayBeStoredInResearchArtifact !== false
    ) {
      blockers.push('v168-execution-policy-mismatch');
    }
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const executorContractReady = uniqueBlockers.length === 0;
  const state = executorContractReady
    ? 'executor-contract-ready' as const
    : 'executor-contract-blocked' as const;
  const executorInterface = executorContractReady ? buildInterface() : null;

  const contractPayload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_VERSION,
    state,
    executorContractReady,
    dryRunDigest: dryRun.digest,
    plan: executorContractReady ? dryRun.plan : null,
    preMutationStateCapture:
      executorContractReady ? input.preMutationStateCapture : null,
    executorInterface,
    blockers: uniqueBlockers,
  };
  const executorContractDigest = sha256Canonical(contractPayload);

  const receiptWithoutDigest = {
    contractVersion:
      'v169_fandex_momentum_verifier_vercel_bounded_mutation_receipt_v1' as const,
    state: 'not-executed' as const,
    v168Digest: dryRun.digest,
    v169ExecutorContractDigest: executorContractDigest,
    providerMutationRequestCount: 0 as const,
    providerMutationFailedEntryCount: null,
    postWriteReadbackPerformed: false,
    postWriteReadbackMatched: null,
    rollbackRequired: false,
    rollbackPerformed: false,
    rollbackSucceeded: null,
    touchedKeys: [
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    ] as const,
    sensitiveValuesIncluded: false as const,
    productionDeploymentAuthorized: false as const,
    verifierActivationAuthorized: false as const,
    nativeVerifierExecutionAuthorized: false as const,
    ledgerAdvanceAuthorized: false as const,
  };

  return Object.freeze({
    ...contractPayload,
    initialReceipt: Object.freeze({
      ...receiptWithoutDigest,
      digest: sha256Canonical(receiptWithoutDigest),
    }),
    effects: Object.freeze({
      vercelCalls: 0 as const,
      environmentReads: 0 as const,
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
    digest: executorContractDigest,
  });
}
