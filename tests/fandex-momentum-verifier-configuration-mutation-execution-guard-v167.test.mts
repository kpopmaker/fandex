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
  FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_DESCRIPTOR,
  type FandexMomentumVerifierTrustedSecretHandleAttestation,
} from '../lib/intelligence/fandexMomentumVerifierConfigurationMutationExecutionGuardResearch';

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
  handleId: 'trusted-secret-handle:v167:synthetic',
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

function pendingAuthorization() {
  return evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
    evaluatedAt: '2026-09-21T23:40:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV165Digest: V165_DIGEST,
    upstreamV165State: 'provisioning-plan-ready',
    record: null,
  });
}

function authorizedAuthorization() {
  return evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
    evaluatedAt: '2026-09-21T23:40:00.000Z',
    requestIntent: 'explicit-configuration-mutation-authorization',
    upstreamV165Digest: V165_DIGEST,
    upstreamV165State: 'provisioning-plan-ready',
    record: approvedRecord,
  });
}

test('v167 is envelope-preparation-only and performs no Vercel or mutation effects', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_DESCRIPTOR
      .envelopePreparationOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_DESCRIPTOR
      .vercelCallPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_DESCRIPTOR
      .environmentMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_DESCRIPTOR
      .secretReadPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_DESCRIPTOR
      .secretWritePerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_DESCRIPTOR
      .productionDeploymentPerformed,
    false,
  );
});

test('current pending v166 state is fail-closed before any mutation envelope exists', () => {
  const authorization = pendingAuthorization();
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
      authorization,
      expectedV165PlanDigest: V165_DIGEST,
      expectedAuthorizationRecordDigest: null,
      secretHandleAttestation: null,
    });

  assert.equal(authorization.state, 'authorization-pending');
  assert.equal(out.state, 'mutation-envelope-blocked');
  assert.equal(out.mutationEnvelopeReady, false);
  assert.equal(out.configurationMutationAuthorized, false);
  assert.equal(out.envelope, null);
  assert.ok(
    out.blockers.includes('configuration-mutation-authorization-not-effective'),
  );
  assert.ok(
    out.blockers.includes(
      'expected-authorization-record-digest-missing-or-invalid',
    ),
  );
  assert.ok(
    out.blockers.includes(
      'trusted-secret-handle-attestation-missing-or-invalid',
    ),
  );
  assert.deepEqual(out.effects, {
    vercelCalls: 0,
    environmentReads: 0,
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

test('synthetic authorized v166 result can prepare the exact envelope only with a trusted non-revealing secret handle', () => {
  const authorization = authorizedAuthorization();
  assert.equal(authorization.state, 'configuration-mutation-authorized');
  assert.match(authorization.recordDigest ?? '', /^[0-9a-f]{64}$/);

  const out =
    evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
      authorization,
      expectedV165PlanDigest: V165_DIGEST,
      expectedAuthorizationRecordDigest: authorization.recordDigest,
      secretHandleAttestation: secretHandle,
    });

  assert.equal(out.state, 'mutation-envelope-ready');
  assert.equal(out.mutationEnvelopeReady, true);
  assert.equal(out.configurationMutationAuthorized, true);
  assert.deepEqual(out.blockers, []);
  assert.ok(out.envelope);
  assert.deepEqual(out.envelope?.operations, [
    {
      order: 1,
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      operation: 'set-exact-non-secret-value',
      exactValue: 'approved-v162-research-read-only',
      target: 'production',
    },
    {
      order: 2,
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      operation: 'set-exact-non-secret-value',
      exactValue: 'production',
      target: 'production',
    },
    {
      order: 3,
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
      operation: 'set-from-trusted-secret-handle',
      exactValue: null,
      target: 'production',
      secretHandleId: 'trusted-secret-handle:v167:synthetic',
      secretValueIncluded: false,
    },
  ]);
  assert.deepEqual(out.envelope?.excludedKeys, [
    'FANDEX_RUNTIME_DATABASE_URL',
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  ]);
  assert.deepEqual(out.envelope?.downstreamAuthorizations, {
    productionDeployment: false,
    verifierActivation: false,
    nativeVerifierExecution: false,
    ledgerAdvance: false,
  });
});

test('authorized v166 result without trusted secret handle is still blocked', () => {
  const authorization = authorizedAuthorization();
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
      authorization,
      expectedV165PlanDigest: V165_DIGEST,
      expectedAuthorizationRecordDigest: authorization.recordDigest,
      secretHandleAttestation: null,
    });

  assert.equal(out.state, 'mutation-envelope-blocked');
  assert.equal(out.envelope, null);
  assert.ok(
    out.blockers.includes(
      'trusted-secret-handle-attestation-missing-or-invalid',
    ),
  );
});

test('authorization record digest mismatch blocks envelope preparation', () => {
  const authorization = authorizedAuthorization();
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
      authorization,
      expectedV165PlanDigest: V165_DIGEST,
      expectedAuthorizationRecordDigest: '1'.repeat(64),
      secretHandleAttestation: secretHandle,
    });

  assert.equal(out.state, 'mutation-envelope-blocked');
  assert.equal(out.envelope, null);
  assert.ok(out.blockers.includes('authorization-record-digest-mismatch'));
});

test('v165 plan binding mismatch blocks envelope preparation', () => {
  const authorization = {
    ...authorizedAuthorization(),
    record: {
      ...approvedRecord,
      upstreamV165PlanDigest: '1'.repeat(64),
    },
  } as unknown as ReturnType<typeof authorizedAuthorization>;

  const out =
    evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
      authorization,
      expectedV165PlanDigest: V165_DIGEST,
      expectedAuthorizationRecordDigest: authorization.recordDigest,
      secretHandleAttestation: secretHandle,
    });

  assert.equal(out.state, 'mutation-envelope-blocked');
  assert.equal(out.envelope, null);
  assert.ok(
    out.blockers.includes('authorization-v165-plan-binding-invalid'),
  );
});

test('rejected, expired, or invalid v166 results never prepare envelopes', () => {
  const rejectedRecord: FandexMomentumVerifierConfigurationMutationAuthorizationRecord = {
    ...approvedRecord,
    decision: {
      state: 'rejected',
      decidedAt: '2026-09-21T23:34:00.000Z',
      decidedBy: 'synthetic-test-reviewer',
      validFrom: null,
      expiresAt: null,
      revokedAt: null,
      reason: 'synthetic rejection',
    },
  };

  const rejected =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: '2026-09-21T23:40:00.000Z',
      requestIntent: 'research-authorization-record-evaluation',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: rejectedRecord,
    });
  const expired =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: '2026-09-22T23:34:00.000Z',
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: approvedRecord,
    });
  const invalid =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: '2026-09-21T23:40:00.000Z',
      requestIntent: 'generic-continuation',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: approvedRecord,
    });

  for (const authorization of [rejected, expired, invalid]) {
    const out =
      evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
        authorization,
        expectedV165PlanDigest: V165_DIGEST,
        expectedAuthorizationRecordDigest: authorization.recordDigest,
        secretHandleAttestation: secretHandle,
      });
    assert.equal(out.state, 'mutation-envelope-blocked');
    assert.equal(out.envelope, null);
    assert.ok(
      out.blockers.includes(
        'configuration-mutation-authorization-not-effective',
      ),
    );
  }
});

test('invalid secret attestation never leaks a secret and blocks the envelope', () => {
  const authorization = authorizedAuthorization();
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
      authorization,
      expectedV165PlanDigest: V165_DIGEST,
      expectedAuthorizationRecordDigest: authorization.recordDigest,
      secretHandleAttestation: {
        ...secretHandle,
        valueExposed: true,
      } as unknown as FandexMomentumVerifierTrustedSecretHandleAttestation,
    });

  assert.equal(out.state, 'mutation-envelope-blocked');
  assert.equal(out.envelope, null);
  assert.ok(
    out.blockers.includes(
      'trusted-secret-handle-attestation-missing-or-invalid',
    ),
  );
});


test('committed v167 audit reproduces the current blocked guard state', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_configuration_mutation_guard_v167_20260922T000239Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);
  const authorization = pendingAuthorization();
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
      authorization,
      expectedV165PlanDigest: V165_DIGEST,
      expectedAuthorizationRecordDigest: null,
      secretHandleAttestation: null,
    });

  assert.equal(out.state, 'mutation-envelope-blocked');
  assert.equal(out.mutationEnvelopeReady, false);
  assert.equal(out.configurationMutationAuthorized, false);
  assert.equal(out.envelope, null);
  assert.equal(
    out.digest,
    '3c911851c681a9b5f3142dd5856b9484c3d877218e14fee46c987d96a9296211',
  );
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.equal(audit.upstream.v166State, 'authorization-pending');
  assert.equal(audit.upstream.v166AuthorizationRecordDigest, null);
  assert.equal(audit.currentInput.trustedSecretHandleAttestationPresent, false);
  assert.equal(audit.readyEnvelopeRequirements.exactAuthorizationRecordDigestRequired, true);
  assert.equal(audit.readyEnvelopeRequirements.trustedSecretHandleRequired, true);
  assert.equal(audit.readyEnvelopeRequirements.trustedSecretHandleMayExposeValue, false);
  assert.deepEqual(audit.readyEnvelopeRequirements.excludedKeys, [
    'FANDEX_RUNTIME_DATABASE_URL',
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  ]);
  assert.deepEqual(audit.readyEnvelopeRequirements.downstreamAuthorizations, {
    productionDeployment: false,
    verifierActivation: false,
    nativeVerifierExecution: false,
    ledgerAdvance: false,
  });
  assert.equal(audit.validation.realAuthorizationRecordUsed, false);
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
