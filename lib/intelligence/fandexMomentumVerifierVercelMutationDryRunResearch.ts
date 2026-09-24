import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumVerifierConfigurationMutationExecutionGuardResult,
} from './fandexMomentumVerifierConfigurationMutationExecutionGuardResearch';

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_VERSION =
  'v168_fandex_momentum_verifier_vercel_configuration_mutation_dry_run_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_VERSION,
    lifecycle: 'research' as const,
    dryRunOnly: true as const,
    upstreamV167Contract:
      'v167_fandex_momentum_verifier_configuration_mutation_execution_guard_research_v1' as const,
    vercelCallPerformed: false as const,
    environmentReadPerformed: false as const,
    environmentMutationPerformed: false as const,
    secretReadPerformed: false as const,
    secretWritePerformed: false as const,
    secretValueExposureAllowed: false as const,
    productionDeploymentPerformed: false as const,
    verifierActivationPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
    productMutationPerformed: false as const,
    registryMutationPerformed: false as const,
  });

export type FandexMomentumVerifierVercelEnvironmentIntent =
  | Readonly<{
      order: 1 | 2;
      key:
        | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
        | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT';
      type: 'plain';
      target: readonly ['production'];
      valueSource: 'literal';
      literalValue: 'approved-v162-research-read-only' | 'production';
      secretHandleId: null;
      apiValueIncludedInDryRun: true;
    }>
  | Readonly<{
      order: 3;
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
      type: 'sensitive';
      target: readonly ['production'];
      valueSource: 'trusted-secret-handle-runtime-resolution';
      literalValue: null;
      secretHandleId: string;
      apiValueIncludedInDryRun: false;
    }>;

export type FandexMomentumVerifierVercelMutationDryRunPlan = Readonly<{
  provider: 'vercel';
  sdkMethod: 'vercel.projects.createProjectEnv';
  http: Readonly<{
    method: 'POST';
    path: '/v10/projects/{idOrName}/env';
    idOrName: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
    query: Readonly<{
      upsert: 'true';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
    }>;
  }>;
  target: Readonly<{
    projectName: 'fandex';
    environment: 'production';
  }>;
  upstream: Readonly<{
    v165PlanDigest:
      'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f';
    v166ResultDigest: string;
    authorizationRecordDigest: string;
    v167ResultDigest: string;
  }>;
  requestBodyIntent: readonly [
    FandexMomentumVerifierVercelEnvironmentIntent,
    FandexMomentumVerifierVercelEnvironmentIntent,
    FandexMomentumVerifierVercelEnvironmentIntent,
  ];
  secretPolicy: Readonly<{
    secretValuePresentInDryRun: false;
    trustedHandleResolutionRequiredAtExecution: true;
    resolvedValueMayBeLogged: false;
    schedulerCredentialKey:
      'FANDEX_NAVER_NEWS_SCHEDULER_SECRET';
    schedulerCredentialMutationForbidden: true;
    runtimeDatabaseCredentialMutationForbidden: true;
  }>;
  executionPolicy: Readonly<{
    singleBatchRequestRequired: true;
    providerBatchAtomicityAssumed: false;
    partialFailureFailsClosed: true;
    responseFailedEntriesMustBeEmptyForSuccess: true;
    preMutationStateCaptureRequired: true;
    preMutationSecretValueExposureForbidden: true;
    existingDedicatedSecretRequiresOpaqueRollbackCapability: true;
    rollbackIntentRequiredBeforeFutureMutation: true;
    noMutationMayStartWithoutRollbackReadiness: true;
  }>;
  rollbackIntent: Readonly<{
    touchedKeysOnly: true;
    restoreExactPreMutationState: true;
    removeKeysThatWereAbsentBeforeMutation: true;
    restoreKeysThatExistedBeforeMutation: true;
    secretRollbackMayUseOnlyOpaqueRestorableHandle: true;
    secretValueMayBeStoredInResearchArtifact: false;
    rollbackExecutionPerformedByV168: false;
  }>;
  downstreamAuthorizations: Readonly<{
    productionDeployment: false;
    verifierActivation: false;
    nativeVerifierExecution: false;
    ledgerAdvance: false;
  }>;
}>;

export type FandexMomentumVerifierVercelMutationDryRunResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_VERSION;
  state: 'dry-run-blocked' | 'dry-run-ready';
  dryRunReady: boolean;
  plan: FandexMomentumVerifierVercelMutationDryRunPlan | null;
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

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function buildFandexMomentumVerifierVercelMutationDryRun(
  input: Readonly<{
    guard: FandexMomentumVerifierConfigurationMutationExecutionGuardResult;
  }>,
): FandexMomentumVerifierVercelMutationDryRunResult {
  const blockers: string[] = [];
  const guard = input.guard;

  if (
    guard.state !== 'mutation-envelope-ready'
    || guard.mutationEnvelopeReady !== true
    || guard.envelope === null
  ) {
    blockers.push('v167-mutation-envelope-not-ready');
  }

  const envelope = guard.envelope;
  if (envelope !== null) {
    if (
      envelope.target.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
      || envelope.target.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
      || envelope.target.projectName !== 'fandex'
      || envelope.target.environment !== 'production'
    ) {
      blockers.push('vercel-target-mismatch');
    }

    if (
      envelope.upstreamV165PlanDigest
        !== 'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f'
      || !validDigest(envelope.upstreamV166ResultDigest)
      || !validDigest(envelope.authorizationRecordDigest)
      || !validDigest(guard.digest)
    ) {
      blockers.push('upstream-digest-binding-invalid');
    }

    const [enable, deployment, secret] = envelope.operations;
    if (
      envelope.operations.length !== 3
      || enable.order !== 1
      || enable.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
      || enable.operation !== 'set-exact-non-secret-value'
      || enable.exactValue !== 'approved-v162-research-read-only'
      || enable.target !== 'production'
      || deployment.order !== 2
      || deployment.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
      || deployment.operation !== 'set-exact-non-secret-value'
      || deployment.exactValue !== 'production'
      || deployment.target !== 'production'
      || secret.order !== 3
      || secret.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
      || secret.operation !== 'set-from-trusted-secret-handle'
      || secret.exactValue !== null
      || secret.target !== 'production'
      || !/^[A-Za-z0-9._:-]{8,256}$/.test(secret.secretHandleId)
      || secret.secretValueIncluded !== false
    ) {
      blockers.push('vercel-operation-sequence-invalid');
    }

    if (
      envelope.excludedKeys.length !== 2
      || envelope.excludedKeys[0] !== 'FANDEX_RUNTIME_DATABASE_URL'
      || envelope.excludedKeys[1] !== 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET'
    ) {
      blockers.push('excluded-key-boundary-invalid');
    }

    if (
      envelope.downstreamAuthorizations.productionDeployment !== false
      || envelope.downstreamAuthorizations.verifierActivation !== false
      || envelope.downstreamAuthorizations.nativeVerifierExecution !== false
      || envelope.downstreamAuthorizations.ledgerAdvance !== false
    ) {
      blockers.push('downstream-authorization-boundary-invalid');
    }
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const dryRunReady = uniqueBlockers.length === 0;
  const state = dryRunReady ? 'dry-run-ready' as const : 'dry-run-blocked' as const;

  const plan: FandexMomentumVerifierVercelMutationDryRunPlan | null =
    dryRunReady && envelope !== null
      ? Object.freeze({
          provider: 'vercel' as const,
          sdkMethod: 'vercel.projects.createProjectEnv' as const,
          http: Object.freeze({
            method: 'POST' as const,
            path: '/v10/projects/{idOrName}/env' as const,
            idOrName: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
            query: Object.freeze({
              upsert: 'true' as const,
              teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
            }),
          }),
          target: Object.freeze({
            projectName: 'fandex' as const,
            environment: 'production' as const,
          }),
          upstream: Object.freeze({
            v165PlanDigest: envelope.upstreamV165PlanDigest,
            v166ResultDigest: envelope.upstreamV166ResultDigest,
            authorizationRecordDigest: envelope.authorizationRecordDigest,
            v167ResultDigest: guard.digest,
          }),
          requestBodyIntent: [
            Object.freeze({
              order: 1 as const,
              key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED' as const,
              type: 'plain' as const,
              target: ['production'] as const,
              valueSource: 'literal' as const,
              literalValue: 'approved-v162-research-read-only' as const,
              secretHandleId: null,
              apiValueIncludedInDryRun: true as const,
            }),
            Object.freeze({
              order: 2 as const,
              key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT' as const,
              type: 'plain' as const,
              target: ['production'] as const,
              valueSource: 'literal' as const,
              literalValue: 'production' as const,
              secretHandleId: null,
              apiValueIncludedInDryRun: true as const,
            }),
            Object.freeze({
              order: 3 as const,
              key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET' as const,
              type: 'sensitive' as const,
              target: ['production'] as const,
              valueSource: 'trusted-secret-handle-runtime-resolution' as const,
              literalValue: null,
              secretHandleId: envelope.operations[2].secretHandleId,
              apiValueIncludedInDryRun: false as const,
            }),
          ] as const,
          secretPolicy: Object.freeze({
            secretValuePresentInDryRun: false as const,
            trustedHandleResolutionRequiredAtExecution: true as const,
            resolvedValueMayBeLogged: false as const,
            schedulerCredentialKey:
              'FANDEX_NAVER_NEWS_SCHEDULER_SECRET' as const,
            schedulerCredentialMutationForbidden: true as const,
            runtimeDatabaseCredentialMutationForbidden: true as const,
          }),
          executionPolicy: Object.freeze({
            singleBatchRequestRequired: true as const,
            providerBatchAtomicityAssumed: false as const,
            partialFailureFailsClosed: true as const,
            responseFailedEntriesMustBeEmptyForSuccess: true as const,
            preMutationStateCaptureRequired: true as const,
            preMutationSecretValueExposureForbidden: true as const,
            existingDedicatedSecretRequiresOpaqueRollbackCapability: true as const,
            rollbackIntentRequiredBeforeFutureMutation: true as const,
            noMutationMayStartWithoutRollbackReadiness: true as const,
          }),
          rollbackIntent: Object.freeze({
            touchedKeysOnly: true as const,
            restoreExactPreMutationState: true as const,
            removeKeysThatWereAbsentBeforeMutation: true as const,
            restoreKeysThatExistedBeforeMutation: true as const,
            secretRollbackMayUseOnlyOpaqueRestorableHandle: true as const,
            secretValueMayBeStoredInResearchArtifact: false as const,
            rollbackExecutionPerformedByV168: false as const,
          }),
          downstreamAuthorizations: Object.freeze({
            productionDeployment: false as const,
            verifierActivation: false as const,
            nativeVerifierExecution: false as const,
            ledgerAdvance: false as const,
          }),
        })
      : null;

  const payload = {
    contractVersion: FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_VERSION,
    state,
    dryRunReady,
    plan,
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    ...payload,
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
    digest: sha256Canonical(payload),
  });
}
