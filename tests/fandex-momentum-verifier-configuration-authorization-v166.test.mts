import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierConfigurationMutationAuthorization,
  FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR,
  FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_STATEMENT,
  type FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
} from '../lib/intelligence/fandexMomentumVerifierConfigurationMutationAuthorizationResearch';

const EVALUATED_AT = '2026-09-21T23:40:00.000Z';
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

function evaluate(
  record: FandexMomentumVerifierConfigurationMutationAuthorizationRecord | null,
  requestIntent:
    | 'generic-continuation'
    | 'research-authorization-record-evaluation'
    | 'explicit-configuration-mutation-authorization',
  evaluatedAt = EVALUATED_AT,
) {
  return evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
    evaluatedAt,
    requestIntent,
    upstreamV165Digest: V165_DIGEST,
    upstreamV165State: 'provisioning-plan-ready',
    record,
  });
}

test('v166 is authorization-record-only; generic continuation is never approval', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR
      .authorizationRecordOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR
      .genericContinuationCountsAsAuthorization,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR
      .autoApprovalAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR
      .environmentMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR
      .productionDeploymentPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR
      .nativeVerifierExecutionPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR
      .ledgerAdvancePerformed,
    false,
  );
});

test('current generic continuation with no explicit record remains pending and ungranted', () => {
  const out = evaluate(null, 'generic-continuation');

  assert.equal(out.state, 'authorization-pending');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
  assert.equal(out.nativeVerifierExecutionAuthorized, false);
  assert.equal(out.ledgerAdvanceAuthorized, false);
  assert.deepEqual(out.blockers, [
    'explicit-configuration-mutation-authorization-record-missing',
    'generic-continuation-is-not-authorization',
  ]);
  assert.equal(out.record, null);
  assert.equal(out.recordDigest, null);
});

test('research evaluation without a record is pending, not rejected or approved', () => {
  const out = evaluate(null, 'research-authorization-record-evaluation');
  assert.equal(out.state, 'authorization-pending');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.deepEqual(out.blockers, [
    'explicit-configuration-mutation-authorization-record-missing',
  ]);
});

test('synthetic explicit approval is effective only inside its supplied validity window and only for configuration mutation', () => {
  const out = evaluate(
    approvedRecord,
    'explicit-configuration-mutation-authorization',
  );

  assert.equal(out.state, 'configuration-mutation-authorized');
  assert.equal(out.configurationMutationAuthorized, true);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
  assert.equal(out.nativeVerifierExecutionAuthorized, false);
  assert.equal(out.ledgerAdvanceAuthorized, false);
  assert.deepEqual(out.blockers, []);
  assert.match(out.recordDigest ?? '', /^[0-9a-f]{64}$/);
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
    productMetricWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});

test('synthetic explicit rejection has a distinct rejected state and can never authorize mutation', () => {
  const rejected: FandexMomentumVerifierConfigurationMutationAuthorizationRecord = {
    ...approvedRecord,
    decision: {
      state: 'rejected',
      decidedAt: '2026-09-21T23:34:00.000Z',
      decidedBy: 'synthetic-test-reviewer',
      validFrom: null,
      expiresAt: null,
      revokedAt: null,
      reason: 'synthetic rejection fixture only',
    },
  };

  const out = evaluate(rejected, 'research-authorization-record-evaluation');
  assert.equal(out.state, 'authorization-record-rejected');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.deepEqual(out.blockers, []);
});

test('synthetic approved record has a distinct expired state at or after its supplied expiry', () => {
  const out = evaluate(
    approvedRecord,
    'explicit-configuration-mutation-authorization',
    '2026-09-22T23:34:00.000Z',
  );

  assert.equal(out.state, 'authorization-expired');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.deepEqual(out.blockers, []);
});

test('a valid approval record under generic continuation is invalid, never implicit authorization', () => {
  const out = evaluate(approvedRecord, 'generic-continuation');
  assert.equal(out.state, 'authorization-record-invalid');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.ok(
    out.blockers.includes(
      'request-intent-not-explicit-configuration-authorization',
    ),
  );
});

test('v166 binds the record to the exact upstream v165 plan digest', () => {
  const out = evaluate(
    {
      ...approvedRecord,
      upstreamV165PlanDigest: '1'.repeat(64),
    },
    'explicit-configuration-mutation-authorization',
  );

  assert.equal(out.state, 'authorization-record-invalid');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.ok(out.blockers.includes('authorization-v165-plan-digest-mismatch'));
});

test('target or authorized configuration drift is invalid', () => {
  const targetDrift = evaluate(
    {
      ...approvedRecord,
      target: {
        ...approvedRecord.target,
        intendedDeploymentCommit:
          '1111111111111111111111111111111111111111',
      },
    } as unknown as FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
    'explicit-configuration-mutation-authorization',
  );
  assert.equal(targetDrift.state, 'authorization-record-invalid');
  assert.ok(targetDrift.blockers.includes('authorization-target-mismatch'));

  const scopeDrift = evaluate(
    {
      ...approvedRecord,
      authorizedConfiguration: [
        approvedRecord.authorizedConfiguration[1],
        approvedRecord.authorizedConfiguration[0],
        approvedRecord.authorizedConfiguration[2],
      ],
    } as unknown as FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
    'explicit-configuration-mutation-authorization',
  );
  assert.equal(scopeDrift.state, 'authorization-record-invalid');
  assert.ok(
    scopeDrift.blockers.includes('authorization-configuration-scope-mismatch'),
  );
});

test('dedicated secret scope is exact and cannot expose or reuse scheduler credential', () => {
  const secret = approvedRecord.authorizedConfiguration[2];
  assert.equal(secret.secretValueMayBeRecordedHere, false);
  assert.equal(
    secret.schedulerCredentialKey,
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  );
  assert.equal(secret.minimumUtf8Bytes, 24);
  assert.equal(secret.maximumUtf8Bytes, 512);
  assert.equal(secret.whitespaceOrControlCharactersForbidden, true);
  assert.equal(secret.mustDifferFromSchedulerCredential, true);
  assert.equal(
    secret.separationProofMethod,
    'trusted-environment-non-equality-attestation-without-secret-output',
  );
});

test('downstream deployment, activation, native read, ledger and excluded mutation scopes remain unauthorized', () => {
  const out = evaluate(
    approvedRecord,
    'explicit-configuration-mutation-authorization',
  );
  assert.equal(out.configurationMutationAuthorized, true);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
  assert.equal(out.nativeVerifierExecutionAuthorized, false);
  assert.equal(out.ledgerAdvanceAuthorized, false);
  assert.deepEqual(approvedRecord.downstreamAuthorizations, {
    productionDeployment: 'not-authorized-by-this-record',
    verifierActivation: 'not-authorized-by-this-record',
    nativeVerifierExecution: 'not-authorized-by-this-record',
    ledgerAdvance: 'not-authorized-by-this-record',
  });
  assert.deepEqual(approvedRecord.forbiddenMutationScope, {
    runtimeDatabaseCredentialMutation: true,
    schedulerCredentialMutation: true,
    previewCredentialCopy: true,
    productRegistryMutation: true,
    productActivation: true,
    researchLedgerAdvance: true,
  });
});

test('revoked or malformed approval fails closed as invalid', () => {
  const revoked = evaluate(
    {
      ...approvedRecord,
      decision: {
        ...approvedRecord.decision,
        revokedAt: '2026-09-21T23:39:00.000Z',
      },
    } as FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
    'explicit-configuration-mutation-authorization',
  );
  assert.equal(revoked.state, 'authorization-record-invalid');
  assert.ok(revoked.blockers.includes('authorization-record-revoked'));

  const malformed = evaluate(
    {
      ...approvedRecord,
      decision: {
        ...approvedRecord.decision,
        validFrom: '2026-09-22T23:34:00.000Z',
        expiresAt: '2026-09-21T23:34:00.000Z',
      },
    } as FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
    'explicit-configuration-mutation-authorization',
  );
  assert.equal(malformed.state, 'authorization-record-invalid');
  assert.ok(
    malformed.blockers.includes('authorization-approval-time-boundary-invalid'),
  );
});


test('committed v166 audit reproduces the current pending state', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_configuration_authorization_v166_20260921T234000Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const out = evaluate(null, 'generic-continuation');

  assert.equal(out.state, 'authorization-pending');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
  assert.equal(out.nativeVerifierExecutionAuthorized, false);
  assert.equal(out.ledgerAdvanceAuthorized, false);
  assert.equal(
    out.digest,
    '42de3a646177267d8f667f2e337e6b987c056ee35bb1083fe3b75169d48f73c0',
  );
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.equal(audit.currentRequest.explicitAuthorizationRecordPresent, false);
  assert.equal(
    audit.currentRequest.interpretation,
    'generic continuation is research progression only and is not configuration-mutation authorization',
  );
  assert.equal(
    audit.requiredAuthorizationRecord.exactV165PlanDigest,
    V165_DIGEST,
  );
  assert.equal(
    audit.requiredAuthorizationRecord.authorizedConfiguration.length,
    3,
  );
  assert.equal(
    audit.requiredAuthorizationRecord.downstreamAuthorizations
      .nativeVerifierExecution,
    'not-authorized-by-this-record',
  );
  assert.equal(
    audit.requiredAuthorizationRecord.decisionSemantics
      .automaticExpiryDurationInvented,
    false,
  );
  assert.equal(audit.effects.environmentMutations, 0);
  assert.equal(audit.effects.secretWrites, 0);
  assert.equal(audit.effects.productionDeployments, 0);
  assert.equal(audit.effects.verifierActivations, 0);
  assert.equal(audit.effects.nativeVerifierExecutions, 0);
  assert.equal(audit.effects.historyWrites, 0);
  assert.equal(audit.effects.watermarkWrites, 0);
  assert.equal(audit.effects.manifestWrites, 0);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
