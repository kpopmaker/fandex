import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierProvisioningAuthorizationRecord,
  FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_DESCRIPTOR,
  type FandexMomentumVerifierProvisioningAuthorizationRecord,
} from '../lib/intelligence/fandexMomentumVerifierProvisioningAuthorizationRecordResearch';

const V165_DIGEST =
  'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f';

const pendingRecord: FandexMomentumVerifierProvisioningAuthorizationRecord = {
  upstreamV165PlanDigest: V165_DIGEST,
  target: {
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    projectName: 'fandex',
    environment: 'production',
  },
  authorizedChanges: [
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      operation: 'set-exact-non-secret-value',
      exactValue: 'approved-v162-research-read-only',
      productionOnly: true,
    },
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      operation: 'set-exact-non-secret-value',
      exactValue: 'production',
      productionOnly: true,
    },
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
      operation: 'create-or-set-dedicated-secret-without-output',
      exactValue: null,
      productionOnly: true,
    },
  ],
  dedicatedSecretPolicy: {
    schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
    minimumUtf8Bytes: 24,
    maximumUtf8Bytes: 512,
    whitespaceOrControlCharactersForbidden: true,
    mustDifferFromSchedulerCredential: true,
    nonEqualityProofRequiredWithoutSecretOutput: true,
    secretValueExposureAuthorized: false,
  },
  exclusions: {
    runtimeDatabaseMutationAuthorized: false,
    schedulerConfigurationMutationAuthorized: false,
    productMutationAuthorized: false,
    registryMutationAuthorized: false,
    productionDeploymentAuthorized: false,
    verifierActivationAuthorized: false,
    nativeVerifierExecutionAuthorized: false,
    ledgerAdvanceAuthorized: false,
  },
  decision: {
    state: 'pending',
    decidedAt: null,
    decidedBy: null,
    expiresAt: null,
    reason: null,
  },
};

function evaluate(
  record: FandexMomentumVerifierProvisioningAuthorizationRecord,
  evaluationAt = '2026-09-21T23:35:00.000Z',
) {
  return evaluateFandexMomentumVerifierProvisioningAuthorizationRecord({
    record,
    expectedV165PlanDigest: V165_DIGEST,
    evaluationAt,
  });
}

test('v166 is authorization-record-only and cannot mutate or auto-approve', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_DESCRIPTOR
      .authorizationRecordOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_DESCRIPTOR
      .autoApprovalAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_DESCRIPTOR
      .environmentMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_DESCRIPTOR
      .secretGenerationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_DESCRIPTOR
      .productionDeploymentAuthorizedByThisRecord,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_DESCRIPTOR
      .ledgerAdvanceAuthorizedByThisRecord,
    false,
  );
});

test('current v166 record remains pending and grants no authorization', () => {
  const out = evaluate(pendingRecord);

  assert.equal(out.state, 'authorization-pending');
  assert.equal(out.authorizationEffective, false);
  assert.equal(out.configurationMutationAuthorized, false);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
  assert.equal(out.nativeVerifierExecutionAuthorized, false);
  assert.equal(out.ledgerAdvanceAuthorized, false);
  assert.equal(out.productMutationAuthorized, false);
  assert.equal(out.registryMutationAuthorized, false);
  assert.deepEqual(out.blockers, []);
  assert.deepEqual(out.effects, {
    environmentReads: 0,
    environmentMutations: 0,
    secretReads: 0,
    secretWrites: 0,
    secretRotations: 0,
    productionDeployments: 0,
    verifierActivations: 0,
    nativeVerifierExecutions: 0,
    databaseWrites: 0,
    productWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});

test('v166 scope is exactly the three verifier-specific Production configuration changes', () => {
  const out = evaluate(pendingRecord);

  assert.deepEqual(out.record.authorizedChanges.map((row) => row.key), [
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
  ]);
  assert.ok(out.record.authorizedChanges.every((row) => row.productionOnly));
  assert.equal(
    out.record.authorizedChanges[0]?.exactValue,
    'approved-v162-research-read-only',
  );
  assert.equal(out.record.authorizedChanges[1]?.exactValue, 'production');
  assert.equal(out.record.authorizedChanges[2]?.exactValue, null);
  assert.deepEqual(out.record.exclusions, {
    runtimeDatabaseMutationAuthorized: false,
    schedulerConfigurationMutationAuthorized: false,
    productMutationAuthorized: false,
    registryMutationAuthorized: false,
    productionDeploymentAuthorized: false,
    verifierActivationAuthorized: false,
    nativeVerifierExecutionAuthorized: false,
    ledgerAdvanceAuthorized: false,
  });
});

test('v166 dedicated secret approval can never expose the secret and must prove separation', () => {
  const out = evaluate(pendingRecord);

  assert.equal(
    out.record.dedicatedSecretPolicy.schedulerCredentialKey,
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  );
  assert.equal(out.record.dedicatedSecretPolicy.minimumUtf8Bytes, 24);
  assert.equal(out.record.dedicatedSecretPolicy.maximumUtf8Bytes, 512);
  assert.equal(
    out.record.dedicatedSecretPolicy.mustDifferFromSchedulerCredential,
    true,
  );
  assert.equal(
    out.record.dedicatedSecretPolicy.nonEqualityProofRequiredWithoutSecretOutput,
    true,
  );
  assert.equal(
    out.record.dedicatedSecretPolicy.secretValueExposureAuthorized,
    false,
  );
});

test('synthetic approved decision is effective only before its explicitly supplied expiry and only for configuration mutation', () => {
  const approved: FandexMomentumVerifierProvisioningAuthorizationRecord = {
    ...pendingRecord,
    decision: {
      state: 'approved',
      decidedAt: '2026-09-21T23:40:00.000Z',
      decidedBy: 'explicit-reviewer',
      expiresAt: '2026-09-22T00:40:00.000Z',
      reason: 'synthetic test approval only',
    },
  };

  const out = evaluate(approved, '2026-09-22T00:00:00.000Z');
  assert.equal(out.state, 'authorization-effective');
  assert.equal(out.authorizationEffective, true);
  assert.equal(out.configurationMutationAuthorized, true);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
  assert.equal(out.nativeVerifierExecutionAuthorized, false);
  assert.equal(out.ledgerAdvanceAuthorized, false);
});

test('synthetic approved decision becomes expired at its supplied expiry without mutating the record', () => {
  const approved: FandexMomentumVerifierProvisioningAuthorizationRecord = {
    ...pendingRecord,
    decision: {
      state: 'approved',
      decidedAt: '2026-09-21T23:40:00.000Z',
      decidedBy: 'explicit-reviewer',
      expiresAt: '2026-09-22T00:40:00.000Z',
      reason: null,
    },
  };

  const out = evaluate(approved, '2026-09-22T00:40:00.000Z');
  assert.equal(out.state, 'authorization-expired');
  assert.equal(out.authorizationEffective, false);
  assert.equal(out.configurationMutationAuthorized, false);
});

test('synthetic rejected decision is terminally non-effective', () => {
  const rejected: FandexMomentumVerifierProvisioningAuthorizationRecord = {
    ...pendingRecord,
    decision: {
      state: 'rejected',
      decidedAt: '2026-09-21T23:40:00.000Z',
      decidedBy: 'explicit-reviewer',
      expiresAt: null,
      reason: 'synthetic rejection test',
    },
  };

  const out = evaluate(rejected);
  assert.equal(out.state, 'authorization-rejected');
  assert.equal(out.authorizationEffective, false);
  assert.equal(out.configurationMutationAuthorized, false);
});

test('v166 fails closed when record plan digest does not match the expected v165 plan', () => {
  const out = evaluateFandexMomentumVerifierProvisioningAuthorizationRecord({
    record: {
      ...pendingRecord,
      upstreamV165PlanDigest: '1'.repeat(64),
    },
    expectedV165PlanDigest: V165_DIGEST,
    evaluationAt: '2026-09-21T23:35:00.000Z',
  });

  assert.equal(out.state, 'authorization-invalid');
  assert.equal(out.authorizationEffective, false);
  assert.ok(out.blockers.includes('authorization-v165-plan-digest-mismatch'));
});

test('v166 rejects broadened scope and malformed approval semantics', () => {
  const broadened = evaluate({
    ...pendingRecord,
    exclusions: {
      ...pendingRecord.exclusions,
      productionDeploymentAuthorized: true,
    },
  } as unknown as FandexMomentumVerifierProvisioningAuthorizationRecord);

  assert.equal(broadened.state, 'authorization-invalid');
  assert.ok(
    broadened.blockers.includes('authorization-exclusion-boundary-invalid'),
  );

  const malformedApproval = evaluate({
    ...pendingRecord,
    decision: {
      state: 'approved',
      decidedAt: '2026-09-21T23:40:00.000Z',
      decidedBy: 'explicit-reviewer',
      expiresAt: '2026-09-21T23:30:00.000Z',
      reason: null,
    },
  });
  assert.equal(malformedApproval.state, 'authorization-invalid');
  assert.ok(
    malformedApproval.blockers.includes('authorization-approved-decision-invalid'),
  );
});
