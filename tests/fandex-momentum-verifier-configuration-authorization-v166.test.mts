import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierConfigurationMutationAuthorization,
  FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR,
  FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_STATEMENT,
  type FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
} from '../lib/intelligence/fandexMomentumVerifierConfigurationMutationAuthorizationResearch';

const EVALUATED_AT = '2026-09-21T23:35:00.000Z';
const V165_DIGEST =
  'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f';

const validRecord: FandexMomentumVerifierConfigurationMutationAuthorizationRecord = {
  contractVersion:
    'v166_fandex_momentum_verifier_configuration_mutation_authorization_record_v1',
  authorizationId:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  authorizationStatement:
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_STATEMENT,
  authority: 'explicit-user-authorization',
  authorizedAt: '2026-09-21T23:34:00.000Z',
  validFrom: '2026-09-21T23:34:00.000Z',
  expiresAt: '2026-09-22T23:34:00.000Z',
  revokedAt: null,
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
      mustDifferFromSchedulerCredential: true,
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
    ledgerAdvance: 'not-authorized-by-this-record',
  },
};

test('v166 is authorization-record-only and performs no mutation', () => {
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
      .ledgerAdvancePerformed,
    false,
  );
});

test('generic continuation with no record remains authorization-pending', () => {
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'generic-continuation',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: null,
    });

  assert.equal(out.state, 'authorization-pending');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
  assert.equal(out.ledgerAdvanceAuthorized, false);
  assert.deepEqual(out.blockers, [
    'explicit-configuration-mutation-authorization-record-missing',
    'generic-continuation-is-not-authorization',
  ]);
  assert.equal(out.record, null);
  assert.equal(out.recordDigest, null);
});

test('research evaluation without a record is pending but not mistaken for explicit authorization', () => {
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'research-authorization-record-evaluation',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: null,
    });

  assert.equal(out.state, 'authorization-pending');
  assert.deepEqual(out.blockers, [
    'explicit-configuration-mutation-authorization-record-missing',
  ]);
});

test('an exact explicit record can authorize only configuration mutation', () => {
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: validRecord,
    });

  assert.equal(out.state, 'configuration-mutation-authorized');
  assert.equal(out.configurationMutationAuthorized, true);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
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

test('a valid record presented under generic continuation is rejected', () => {
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'generic-continuation',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: validRecord,
    });

  assert.equal(out.state, 'authorization-record-rejected');
  assert.equal(out.configurationMutationAuthorized, false);
  assert.ok(
    out.blockers.includes(
      'request-intent-not-explicit-configuration-authorization',
    ),
  );
});

test('expired or revoked authorization fails closed', () => {
  const expired =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: '2026-09-23T00:00:00.000Z',
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: validRecord,
    });
  assert.equal(expired.state, 'authorization-record-rejected');
  assert.ok(
    expired.blockers.includes(
      'authorization-record-outside-validity-window',
    ),
  );

  const revoked =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: {
        ...validRecord,
        revokedAt: '2026-09-21T23:34:30.000Z',
      },
    });
  assert.equal(revoked.state, 'authorization-record-rejected');
  assert.ok(revoked.blockers.includes('authorization-record-revoked'));
});

test('target or configuration scope drift is rejected', () => {
  const targetDrift =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: {
        ...validRecord,
        target: {
          ...validRecord.target,
          intendedDeploymentCommit:
            '1111111111111111111111111111111111111111',
        },
      } as unknown as FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
    });
  assert.equal(targetDrift.state, 'authorization-record-rejected');
  assert.ok(targetDrift.blockers.includes('authorization-target-mismatch'));

  const scopeDrift =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: {
        ...validRecord,
        authorizedConfiguration: [
          validRecord.authorizedConfiguration[1],
          validRecord.authorizedConfiguration[0],
          validRecord.authorizedConfiguration[2],
        ],
      } as unknown as FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
    });
  assert.equal(scopeDrift.state, 'authorization-record-rejected');
  assert.ok(
    scopeDrift.blockers.includes('authorization-configuration-scope-mismatch'),
  );
});

test('forbidden mutation boundaries and rollback acknowledgement are mandatory', () => {
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: {
        ...validRecord,
        forbiddenMutationScope: {
          ...validRecord.forbiddenMutationScope,
          schedulerCredentialMutation: false,
        },
        rollbackAcknowledgement: {
          ...validRecord.rollbackAcknowledgement,
          removeOrDisableVerifierRoute: false,
        },
      } as unknown as FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
    });

  assert.equal(out.state, 'authorization-record-rejected');
  assert.ok(
    out.blockers.includes('authorization-forbidden-scope-incomplete'),
  );
  assert.ok(
    out.blockers.includes('authorization-rollback-acknowledgement-incomplete'),
  );
});

test('v166 never authorizes downstream deployment, activation, or ledger advance', () => {
  const out =
    evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
      evaluatedAt: EVALUATED_AT,
      requestIntent: 'explicit-configuration-mutation-authorization',
      upstreamV165Digest: V165_DIGEST,
      upstreamV165State: 'provisioning-plan-ready',
      record: {
        ...validRecord,
        downstreamAuthorizations: {
          productionDeployment: 'not-authorized-by-this-record',
          verifierActivation: 'not-authorized-by-this-record',
          ledgerAdvance: 'not-authorized-by-this-record',
        },
      },
    });

  assert.equal(out.configurationMutationAuthorized, true);
  assert.equal(out.productionDeploymentAuthorized, false);
  assert.equal(out.verifierActivationAuthorized, false);
  assert.equal(out.ledgerAdvanceAuthorized, false);
});
