import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierVercelMutationExecutorContract,
  FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_DESCRIPTOR,
  type FandexMomentumVerifierVercelPreMutationStateCapture,
} from '../lib/intelligence/fandexMomentumVerifierVercelMutationExecutorContractResearch';
import type {
  FandexMomentumVerifierVercelMutationDryRunResult,
} from '../lib/intelligence/fandexMomentumVerifierVercelMutationDryRunResearch';

const BLOCKED_V168_DIGEST =
  '596cdd5ed06dda9f3bcb8327138f997a4bf70511e38b37b3841aabf926e2bcc2';

function blockedDryRun(): FandexMomentumVerifierVercelMutationDryRunResult {
  return {
    contractVersion:
      'v168_fandex_momentum_verifier_vercel_configuration_mutation_dry_run_research_v1',
    state: 'dry-run-blocked',
    dryRunReady: false,
    plan: null,
    blockers: ['v167-mutation-envelope-not-ready'],
    effects: {
      vercelCalls: 0,
      environmentReads: 0,
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
    },
    digest: BLOCKED_V168_DIGEST,
  };
}

function readyDryRun(): FandexMomentumVerifierVercelMutationDryRunResult {
  return {
    contractVersion:
      'v168_fandex_momentum_verifier_vercel_configuration_mutation_dry_run_research_v1',
    state: 'dry-run-ready',
    dryRunReady: true,
    plan: {
      provider: 'vercel',
      sdkMethod: 'vercel.projects.createProjectEnv',
      http: {
        method: 'POST',
        path: '/v10/projects/{idOrName}/env',
        idOrName: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
        query: {
          upsert: 'true',
          teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
        },
      },
      target: {
        projectName: 'fandex',
        environment: 'production',
      },
      upstream: {
        v165PlanDigest:
          'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f',
        v166ResultDigest: '1'.repeat(64),
        authorizationRecordDigest: '2'.repeat(64),
        v167ResultDigest: '3'.repeat(64),
      },
      requestBodyIntent: [
        {
          order: 1,
          key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
          type: 'plain',
          target: ['production'],
          valueSource: 'literal',
          literalValue: 'approved-v162-research-read-only',
          secretHandleId: null,
          apiValueIncludedInDryRun: true,
        },
        {
          order: 2,
          key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
          type: 'plain',
          target: ['production'],
          valueSource: 'literal',
          literalValue: 'production',
          secretHandleId: null,
          apiValueIncludedInDryRun: true,
        },
        {
          order: 3,
          key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
          type: 'sensitive',
          target: ['production'],
          valueSource: 'trusted-secret-handle-runtime-resolution',
          literalValue: null,
          secretHandleId: 'trusted-secret-handle:v169:synthetic',
          apiValueIncludedInDryRun: false,
        },
      ],
      secretPolicy: {
        secretValuePresentInDryRun: false,
        trustedHandleResolutionRequiredAtExecution: true,
        resolvedValueMayBeLogged: false,
        schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
        schedulerCredentialMutationForbidden: true,
        runtimeDatabaseCredentialMutationForbidden: true,
      },
      executionPolicy: {
        singleBatchRequestRequired: true,
        providerBatchAtomicityAssumed: false,
        partialFailureFailsClosed: true,
        responseFailedEntriesMustBeEmptyForSuccess: true,
        preMutationStateCaptureRequired: true,
        preMutationSecretValueExposureForbidden: true,
        existingDedicatedSecretRequiresOpaqueRollbackCapability: true,
        rollbackIntentRequiredBeforeFutureMutation: true,
        noMutationMayStartWithoutRollbackReadiness: true,
      },
      rollbackIntent: {
        touchedKeysOnly: true,
        restoreExactPreMutationState: true,
        removeKeysThatWereAbsentBeforeMutation: true,
        restoreKeysThatExistedBeforeMutation: true,
        secretRollbackMayUseOnlyOpaqueRestorableHandle: true,
        secretValueMayBeStoredInResearchArtifact: false,
        rollbackExecutionPerformedByV168: false,
      },
      downstreamAuthorizations: {
        productionDeployment: false,
        verifierActivation: false,
        nativeVerifierExecution: false,
        ledgerAdvance: false,
      },
    },
    blockers: [],
    effects: {
      vercelCalls: 0,
      environmentReads: 0,
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
    },
    digest: '4'.repeat(64),
  };
}

function absentCapture(): FandexMomentumVerifierVercelPreMutationStateCapture {
  return {
    contractVersion:
      'v169_fandex_momentum_verifier_vercel_pre_mutation_state_capture_v1',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    environment: 'production',
    capturedAt: '2026-09-22T00:20:00.000Z',
    entries: [
      {
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
        existed: false,
        envId: null,
        target: ['production'],
        type: null,
        priorPlainValue: null,
        opaqueRollbackHandleId: null,
        secretValueExposed: false,
      },
      {
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
        existed: false,
        envId: null,
        target: ['production'],
        type: null,
        priorPlainValue: null,
        opaqueRollbackHandleId: null,
        secretValueExposed: false,
      },
      {
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
        existed: false,
        envId: null,
        target: ['production'],
        type: null,
        priorPlainValue: null,
        opaqueRollbackHandleId: null,
        secretValueExposed: false,
      },
    ],
    excludedKeysObservedButNotCaptured: [
      'FANDEX_RUNTIME_DATABASE_URL',
      'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
    ],
    sensitiveValuesRecorded: false,
  };
}

test('v169 is interface-contract-only and performs no mutation', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_DESCRIPTOR
      .interfaceContractOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_DESCRIPTOR
      .postWriteReadbackRequired,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_DESCRIPTOR
      .providerBatchAtomicityAssumed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_EXECUTOR_CONTRACT_DESCRIPTOR
      .partialFailureRollbackRequired,
    true,
  );
});

test('current blocked v168 state keeps v169 executor blocked and receipt not executed', () => {
  const out = evaluateFandexMomentumVerifierVercelMutationExecutorContract({
    dryRun: blockedDryRun(),
    expectedDryRunDigest: BLOCKED_V168_DIGEST,
    preMutationStateCapture: null,
  });

  assert.equal(out.state, 'executor-contract-blocked');
  assert.equal(out.executorContractReady, false);
  assert.equal(out.executorInterface, null);
  assert.equal(out.plan, null);
  assert.equal(out.preMutationStateCapture, null);
  assert.ok(out.blockers.includes('v168-dry-run-not-ready'));
  assert.ok(
    out.blockers.includes('pre-mutation-state-capture-missing-or-invalid'),
  );
  assert.equal(out.initialReceipt.state, 'not-executed');
  assert.equal(out.initialReceipt.providerMutationRequestCount, 0);
  assert.equal(out.initialReceipt.postWriteReadbackPerformed, false);
  assert.equal(out.initialReceipt.sensitiveValuesIncluded, false);
});

test('synthetic ready v168 plus complete pre-state capture produces exact executor interface only', () => {
  const dryRun = readyDryRun();
  const out = evaluateFandexMomentumVerifierVercelMutationExecutorContract({
    dryRun,
    expectedDryRunDigest: dryRun.digest,
    preMutationStateCapture: absentCapture(),
  });

  assert.equal(out.state, 'executor-contract-ready');
  assert.equal(out.executorContractReady, true);
  assert.deepEqual(out.blockers, []);
  assert.deepEqual(out.executorInterface, {
    provider: 'vercel',
    mutation: {
      method: 'POST',
      endpoint: '/v10/projects/{idOrName}/env',
      upsert: 'true',
      singleBatchRequest: true,
    },
    readback: {
      method: 'GET',
      endpoint: '/v9/projects/{idOrName}/env',
      exactThreeKeysMustMatchProductionTarget: true,
      plainValuesMustMatchExactly: true,
      secretValueMayBeReturnedToResearchLayer: false,
      secretVerificationMethod:
        'trusted-environment-secret-contract-attestation-without-value-output',
    },
    rollback: {
      updateExistingMethod: 'PATCH',
      updateExistingEndpoint: '/v9/projects/{idOrName}/env/{id}',
      removeCreatedMethod: 'DELETE',
      removeCreatedEndpoint: '/v9/projects/{idOrName}/env/{id}',
      touchedKeysOnly: true,
      rollbackOnProviderPartialFailure: true,
      rollbackOnReadbackMismatch: true,
      rollbackOnUnexpectedExtraTarget: true,
      secretRollbackRequiresOpaqueRestorableHandleIfPreviouslyPresent: true,
    },
  });
  assert.equal(out.initialReceipt.state, 'not-executed');
  assert.equal(out.initialReceipt.productionDeploymentAuthorized, false);
  assert.equal(out.initialReceipt.verifierActivationAuthorized, false);
  assert.equal(out.initialReceipt.nativeVerifierExecutionAuthorized, false);
  assert.equal(out.initialReceipt.ledgerAdvanceAuthorized, false);
});

test('existing secret requires opaque rollback capability without exposing its value', () => {
  const capture = absentCapture();
  const bad = {
    ...capture,
    entries: [
      capture.entries[0],
      capture.entries[1],
      {
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
        existed: true,
        envId: 'env_secret_1',
        target: ['production'],
        type: 'sensitive',
        priorPlainValue: null,
        opaqueRollbackHandleId: null,
        secretValueExposed: false,
      },
    ],
  } as unknown as FandexMomentumVerifierVercelPreMutationStateCapture;

  const dryRun = readyDryRun();
  const out = evaluateFandexMomentumVerifierVercelMutationExecutorContract({
    dryRun,
    expectedDryRunDigest: dryRun.digest,
    preMutationStateCapture: bad,
  });
  assert.equal(out.state, 'executor-contract-blocked');
  assert.ok(
    out.blockers.includes('pre-mutation-state-capture-missing-or-invalid'),
  );
});

test('v168 digest mismatch blocks executor contract even with valid capture', () => {
  const dryRun = readyDryRun();
  const out = evaluateFandexMomentumVerifierVercelMutationExecutorContract({
    dryRun,
    expectedDryRunDigest: '5'.repeat(64),
    preMutationStateCapture: absentCapture(),
  });
  assert.equal(out.state, 'executor-contract-blocked');
  assert.ok(out.blockers.includes('v168-dry-run-digest-mismatch'));
});

test('unsafe v168 execution policy cannot be promoted into an executor contract', () => {
  const dryRun = readyDryRun();
  const unsafe = {
    ...dryRun,
    plan: {
      ...dryRun.plan!,
      executionPolicy: {
        ...dryRun.plan!.executionPolicy,
        providerBatchAtomicityAssumed: true,
      },
    },
  } as unknown as FandexMomentumVerifierVercelMutationDryRunResult;

  const out = evaluateFandexMomentumVerifierVercelMutationExecutorContract({
    dryRun: unsafe,
    expectedDryRunDigest: unsafe.digest,
    preMutationStateCapture: absentCapture(),
  });
  assert.equal(out.state, 'executor-contract-blocked');
  assert.ok(out.blockers.includes('v168-execution-policy-mismatch'));
});

test('v169 contract and receipt never contain secret values or downstream authorization', () => {
  const dryRun = readyDryRun();
  const out = evaluateFandexMomentumVerifierVercelMutationExecutorContract({
    dryRun,
    expectedDryRunDigest: dryRun.digest,
    preMutationStateCapture: absentCapture(),
  });
  const serialized = JSON.stringify(out);
  assert.equal(serialized.includes('"value":"'), false);
  assert.equal(out.initialReceipt.sensitiveValuesIncluded, false);
  assert.equal(out.initialReceipt.productionDeploymentAuthorized, false);
  assert.equal(out.initialReceipt.verifierActivationAuthorized, false);
  assert.equal(out.initialReceipt.nativeVerifierExecutionAuthorized, false);
  assert.equal(out.initialReceipt.ledgerAdvanceAuthorized, false);
  assert.deepEqual(out.effects, {
    vercelCalls: 0,
    environmentReads: 0,
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
