import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierConfigurationMutationAuthorization,
  FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_STATEMENT,
  type FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
} from '../lib/intelligence/fandexMomentumVerifierConfigurationMutationAuthorizationResearch';
import {
  evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard,
  type FandexMomentumVerifierTrustedSecretHandleAttestation,
} from '../lib/intelligence/fandexMomentumVerifierConfigurationMutationExecutionGuardResearch';
import {
  buildFandexMomentumVerifierVercelMutationDryRun,
  FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumVerifierVercelMutationDryRunResearch';

const V165_DIGEST =
  'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f';

const approvedRecord: FandexMomentumVerifierConfigurationMutationAuthorizationRecord = {
  contractVersion:
    'v166_fandex_momentum_verifier_configuration_mutation_authorization_record_v1',
  authorizationId:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  upstreamV165PlanDigest: V165_DIGEST,
  authorizationStatement:
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_STATEMENT,
  authority: 'explicit-user-decision',
  decision: {
    state: 'approved',
    decidedAt: '2026-09-21T23:34:00.000Z',
    decidedBy: 'synthetic-test-reviewer',
    validFrom: '2026-09-21T23:34:00.000Z',
    expiresAt: '2026-09-22T23:34:00.000Z',
    revokedAt: null,
    reason: 'synthetic approval fixture only',
  },
  target: {
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    projectName: 'fandex',
    environment: 'production',
    intendedDeploymentCommit: '7a1038226b07abf4a130986766ef114a43c1d638',
    routePath: '/api/internal/naver-news/momentum-verifier',
  },
  authorizedConfiguration: [
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      exactValue: 'approved-v162-research-read-only',
      target: 'production',
    },
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      exactValue: 'production',
      target: 'production',
    },
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
      exactValue: null,
      target: 'production',
      dedicatedSecretOnly: true,
      secretValueMayBeRecordedHere: false,
      schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
      minimumUtf8Bytes: 24,
      maximumUtf8Bytes: 512,
      whitespaceOrControlCharactersForbidden: true,
      mustDifferFromSchedulerCredential: true,
      separationProofMethod:
        'trusted-environment-non-equality-attestation-without-secret-output',
    },
  ],
  forbiddenMutationScope: {
    runtimeDatabaseCredentialMutation: true,
    schedulerCredentialMutation: true,
    previewCredentialCopy: true,
    productRegistryMutation: true,
    productActivation: true,
    researchLedgerAdvance: true,
  },
  rollbackAcknowledgement: {
    disableVerifierEnableFlag: true,
    removeOrDisableVerifierRoute: true,
    removeVerifierDeploymentSelectorIfProvisioned: true,
    revokeOrRotateDedicatedVerifierSecretIfProvisioned: true,
    noLedgerRollbackRequiredBeforeFirstAcceptedNativeRead: true,
  },
  downstreamAuthorizations: {
    productionDeployment: 'not-authorized-by-this-record',
    verifierActivation: 'not-authorized-by-this-record',
    nativeVerifierExecution: 'not-authorized-by-this-record',
    ledgerAdvance: 'not-authorized-by-this-record',
  },
};

const secretHandle: FandexMomentumVerifierTrustedSecretHandleAttestation = {
  handleId: 'trusted-secret-handle:v168:synthetic',
  key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
  target: 'production',
  valueExposed: false,
  secretContractSatisfied: true,
  minimumUtf8BytesSatisfied: true,
  maximumUtf8BytesSatisfied: true,
  whitespaceOrControlCharactersAbsent: true,
  differsFromSchedulerCredential: true,
  schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  attestationMethod:
    'trusted-environment-non-equality-attestation-without-secret-output',
};

function pendingGuard() {
  const authorization =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: '2026-09-21T23:40:00.000Z',
      requestIntent: 'generic-continuation',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: null,
    });

  return evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
    authorization,
    expectedV165PlanDigest: V165_DIGEST,
    expectedAuthorizationRecordDigest: null,
    secretHandleAttestation: null,
  });
}

function readyGuard() {
  const authorization =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: '2026-09-21T23:40:00.000Z',
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: approvedRecord,
    });

  return evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
    authorization,
    expectedV165PlanDigest: V165_DIGEST,
    expectedAuthorizationRecordDigest: authorization.recordDigest,
    secretHandleAttestation: secretHandle,
  });
}

test('v168 is dry-run-only and performs no Vercel/environment/secret mutation', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_DESCRIPTOR.dryRunOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_DESCRIPTOR
      .vercelCallPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_DESCRIPTOR
      .environmentReadPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_DESCRIPTOR
      .environmentMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_DESCRIPTOR
      .secretReadPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_MUTATION_DRY_RUN_DESCRIPTOR
      .secretWritePerformed,
    false,
  );
});

test('current real pending v167 guard blocks v168 before a Vercel dry-run plan exists', () => {
  const guard = pendingGuard();
  const out = buildFandexMomentumVerifierVercelMutationDryRun({ guard });

  assert.equal(guard.state, 'mutation-envelope-blocked');
  assert.equal(out.state, 'dry-run-blocked');
  assert.equal(out.dryRunReady, false);
  assert.equal(out.plan, null);
  assert.deepEqual(out.blockers, ['v167-mutation-envelope-not-ready']);
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

test('synthetic ready v167 envelope maps to exact Vercel Production upsert intent', () => {
  const guard = readyGuard();
  const out = buildFandexMomentumVerifierVercelMutationDryRun({ guard });

  assert.equal(guard.state, 'mutation-envelope-ready');
  assert.equal(out.state, 'dry-run-ready');
  assert.equal(out.dryRunReady, true);
  assert.deepEqual(out.blockers, []);
  assert.ok(out.plan);

  assert.equal(out.plan?.provider, 'vercel');
  assert.equal(out.plan?.sdkMethod, 'vercel.projects.createProjectEnv');
  assert.deepEqual(out.plan?.http, {
    method: 'POST',
    path: '/v10/projects/{idOrName}/env',
    idOrName: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    query: {
      upsert: 'true',
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    },
  });
  assert.deepEqual(out.plan?.target, {
    projectName: 'fandex',
    environment: 'production',
  });
});

test('v168 request intent preserves exact operation order and Production-only targets', () => {
  const out = buildFandexMomentumVerifierVercelMutationDryRun({
    guard: readyGuard(),
  });
  assert.ok(out.plan);

  assert.deepEqual(out.plan?.requestBodyIntent, [
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
      secretHandleId: 'trusted-secret-handle:v168:synthetic',
      apiValueIncludedInDryRun: false,
    },
  ]);
});

test('v168 never serializes a secret value and excludes runtime DB plus scheduler credential', () => {
  const out = buildFandexMomentumVerifierVercelMutationDryRun({
    guard: readyGuard(),
  });
  assert.ok(out.plan);

  const serialized = JSON.stringify(out.plan);
  assert.equal(out.plan?.secretPolicy.secretValuePresentInDryRun, false);
  assert.equal(
    out.plan?.secretPolicy.trustedHandleResolutionRequiredAtExecution,
    true,
  );
  assert.equal(out.plan?.secretPolicy.resolvedValueMayBeLogged, false);
  assert.equal(
    out.plan?.secretPolicy.schedulerCredentialMutationForbidden,
    true,
  );
  assert.equal(
    out.plan?.secretPolicy.runtimeDatabaseCredentialMutationForbidden,
    true,
  );
  assert.equal(serialized.includes('"value":"'), false);
  assert.equal(serialized.includes('FANDEX_RUNTIME_DATABASE_URL'), false);
  assert.equal(
    serialized.includes('FANDEX_NAVER_NEWS_SCHEDULER_SECRET'),
    true,
  );
});

test('v168 does not assume Vercel batch atomicity and requires rollback readiness first', () => {
  const out = buildFandexMomentumVerifierVercelMutationDryRun({
    guard: readyGuard(),
  });
  assert.ok(out.plan);

  assert.deepEqual(out.plan?.executionPolicy, {
    singleBatchRequestRequired: true,
    providerBatchAtomicityAssumed: false,
    partialFailureFailsClosed: true,
    responseFailedEntriesMustBeEmptyForSuccess: true,
    preMutationStateCaptureRequired: true,
    preMutationSecretValueExposureForbidden: true,
    existingDedicatedSecretRequiresOpaqueRollbackCapability: true,
    rollbackIntentRequiredBeforeFutureMutation: true,
    noMutationMayStartWithoutRollbackReadiness: true,
  });
  assert.deepEqual(out.plan?.rollbackIntent, {
    touchedKeysOnly: true,
    restoreExactPreMutationState: true,
    removeKeysThatWereAbsentBeforeMutation: true,
    restoreKeysThatExistedBeforeMutation: true,
    secretRollbackMayUseOnlyOpaqueRestorableHandle: true,
    secretValueMayBeStoredInResearchArtifact: false,
    rollbackExecutionPerformedByV168: false,
  });
});

test('v168 preserves downstream authorization separation', () => {
  const out = buildFandexMomentumVerifierVercelMutationDryRun({
    guard: readyGuard(),
  });
  assert.deepEqual(out.plan?.downstreamAuthorizations, {
    productionDeployment: false,
    verifierActivation: false,
    nativeVerifierExecution: false,
    ledgerAdvance: false,
  });
});

test('target drift, reordered operations, extra privilege, or excluded-key drift fails closed', () => {
  const ready = readyGuard();
  assert.ok(ready.envelope);

  const cases = [
    {
      ...ready,
      envelope: {
        ...ready.envelope!,
        target: {
          ...ready.envelope!.target,
          environment: 'preview',
        },
      },
    },
    {
      ...ready,
      envelope: {
        ...ready.envelope!,
        operations: [
          ready.envelope!.operations[1],
          ready.envelope!.operations[0],
          ready.envelope!.operations[2],
        ],
      },
    },
    {
      ...ready,
      envelope: {
        ...ready.envelope!,
        downstreamAuthorizations: {
          ...ready.envelope!.downstreamAuthorizations,
          productionDeployment: true,
        },
      },
    },
    {
      ...ready,
      envelope: {
        ...ready.envelope!,
        excludedKeys: [
          'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
          'FANDEX_RUNTIME_DATABASE_URL',
        ],
      },
    },
  ] as unknown as Parameters<
    typeof buildFandexMomentumVerifierVercelMutationDryRun
  >[0]['guard'][];

  for (const guard of cases) {
    const out = buildFandexMomentumVerifierVercelMutationDryRun({ guard });
    assert.equal(out.state, 'dry-run-blocked');
    assert.equal(out.plan, null);
    assert.ok(out.blockers.length > 0);
  }
});


test('committed v168 audit reproduces the current blocked dry-run state', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_vercel_mutation_dry_run_v168_20260922T001023Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);
  const out = buildFandexMomentumVerifierVercelMutationDryRun({
    guard: pendingGuard(),
  });

  assert.equal(out.state, 'dry-run-blocked');
  assert.equal(out.dryRunReady, false);
  assert.equal(out.plan, null);
  assert.equal(
    out.digest,
    '596cdd5ed06dda9f3bcb8327138f997a4bf70511e38b37b3841aabf926e2bcc2',
  );
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.equal(audit.upstream.v166State, 'authorization-pending');
  assert.equal(audit.upstream.v167State, 'mutation-envelope-blocked');
  assert.equal(audit.upstream.v167Envelope, null);
  assert.equal(audit.providerContract.httpMethod, 'POST');
  assert.equal(
    audit.providerContract.endpoint,
    '/v10/projects/{idOrName}/env',
  );
  assert.equal(audit.providerContract.upsertQuery, 'true');
  assert.equal(audit.providerContract.providerBatchAtomicityAssumed, false);
  assert.deepEqual(
    audit.readyDryRunRequirements.exactOperationOrder,
    [
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    ],
  );
  assert.equal(
    audit.readyDryRunRequirements.futureVercelIntent
      .requestBodyIntent[2].apiValueIncludedInDryRun,
    false,
  );
  assert.deepEqual(audit.readyDryRunRequirements.excludedKeys, [
    'FANDEX_RUNTIME_DATABASE_URL',
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  ]);
  assert.equal(audit.failureAndRollbackPolicy.partialFailureFailsClosed, true);
  assert.equal(
    audit.failureAndRollbackPolicy.preMutationStateCaptureRequired,
    true,
  );
  assert.equal(
    audit.failureAndRollbackPolicy.secretValueMayBeStoredInResearchArtifact,
    false,
  );
  assert.equal(audit.validation.realV166AuthorizationRecordUsed, false);
  assert.equal(audit.validation.realV167ReadyEnvelopeUsed, false);
  assert.equal(audit.validation.realSecretHandleUsed, false);
  assert.equal(audit.effects.vercelCalls, 0);
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
