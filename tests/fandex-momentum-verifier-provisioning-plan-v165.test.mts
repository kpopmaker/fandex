import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierProvisioningPlan,
  FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR,
  type FandexMomentumVerifierProvisioningPlanInput,
} from '../lib/intelligence/fandexMomentumVerifierProvisioningPlanResearch';

const completePlan: FandexMomentumVerifierProvisioningPlanInput = {
  upstreamV164: {
    state: 'configuration-evidence-blocked',
    digest: '8fd9585c3b77396bde869a9aec80c022f9231fabf54fcac1cc6dffbeb738ba6c',
    blockers: [
      'configuration-evidence-not-bound-to-project-environment',
      'production-environment-inventory-unavailable',
      'verifier-enable-flag-not-proven-present',
      'verifier-enable-flag-production-target-not-proven',
      'verifier-enable-flag-contract-value-not-proven',
      'verifier-deployment-selector-not-proven-present',
      'verifier-deployment-selector-production-target-not-proven',
      'verifier-deployment-selector-contract-value-not-proven',
      'dedicated-verifier-secret-not-proven-present',
      'dedicated-verifier-secret-production-target-not-proven',
      'dedicated-verifier-secret-contract-not-proven',
      'dedicated-verifier-secret-separation-not-proven',
    ],
  },
  target: {
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    projectName: 'fandex',
    environment: 'production',
    intendedDeploymentCommit: '7a1038226b07abf4a130986766ef114a43c1d638',
    routePath: '/api/internal/naver-news/momentum-verifier',
  },
  configurationPlan: {
    enableFlag: {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      exactValue: 'approved-v162-research-read-only',
      target: 'production',
    },
    deploymentSelector: {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      exactValue: 'production',
      target: 'production',
    },
    dedicatedSecret: {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
      target: 'production',
      generateValueInPlan: false,
      exposeValueInPlan: false,
      minimumUtf8Bytes: 24,
      maximumUtf8Bytes: 512,
      whitespaceOrControlCharactersForbidden: true,
      mustBeDistinctFromSchedulerCredential: true,
      separationProofMethod:
        'compare-non-reversible-fingerprints-without-exposing-secret-values',
    },
  },
  runtimeDatabasePlan: {
    key: 'FANDEX_RUNTIME_DATABASE_URL',
    reuseExistingProductionScopedCredentialOnly: true,
    copyToPreviewForbidden: true,
    rotateCredentialInPlan: false,
    exposeCredentialInPlan: false,
  },
  orderedSteps: [
    'obtain-separate-provisioning-authorization',
    'verify-target-project-team-environment',
    'provision-enable-flag-production-only',
    'provision-deployment-selector-production-only',
    'provision-dedicated-verifier-secret-production-only',
    'prove-verifier-secret-separation-without-value-exposure',
    'confirm-existing-production-runtime-db-scope-without-preview-copy',
    'redeploy-intended-commit-to-production',
    'rerun-v164-configuration-evidence',
    'rerun-v163-activation-readiness',
    'obtain-separate-activation-authorization',
    'execute-first-bounded-v162-native-read',
    'require-v161-v160-v159-chain-acceptance',
    'only-then-allow-v158-v155-v156-v157-and-ledger-advance',
  ],
  postConfigurationVerification: {
    requireV164Ready: true,
    requireV163Ready: true,
    requireSeparateActivationAuthorization: true,
    requireProductionRouteOnExactCommit: true,
    requirePreviewCredentialInheritanceAbsent: true,
    requireRawPayloadExposureAbsent: true,
    requireDatabaseWritePathAbsent: true,
  },
  firstNativeReadAcceptance: {
    sourceBoundary: '2026-09-21T12:00:00.000Z',
    requireV162Executed: true,
    requireV161NativeOutput: true,
    requireV160AttestationAdapted: true,
    requireV159AttestedProvenanceReady: true,
    requireDatabaseWritesZero: true,
    requireRawPayloadResponseAbsent: true,
    requireExactSourceBoundaryMatch: true,
  },
  ledgerPolicy: {
    historyAdvanceBeforeAcceptedNativeReadForbidden: true,
    watermarkAdvanceBeforeAcceptedNativeReadForbidden: true,
    manifestAdvanceBeforeAcceptedNativeReadForbidden: true,
  },
  rollbackPlan: {
    disableEnableFlagFirst: true,
    removeOrDisableVerifierRoute: true,
    leaveSchedulerAuthorizationUntouched: true,
    leaveExistingRuntimeDatabaseCredentialUntouched: true,
    revokeOrRotateDedicatedVerifierSecretIfProvisioned: true,
    noLedgerRollbackRequiredIfNoAcceptedNativeReadOccurred: true,
  },
  authorizationRecords: {
    provisioning: {
      slotDefined: true,
      granted: false,
      recordId: null,
    },
    activation: {
      slotDefined: true,
      granted: false,
      recordId: null,
    },
  },
};

test('v165 is planning-only and performs no provisioning or activation', () => {
  assert.equal(FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.planningOnly, true);
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.environmentMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.secretGenerationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.productionDeploymentPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.channelActivationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.ledgerAdvancePerformed,
    false,
  );
});

test('complete v165 plan can be ready for separate provisioning authorization while both authorizations remain false', () => {
  const out = evaluateFandexMomentumVerifierProvisioningPlan(completePlan);

  assert.equal(out.state, 'provisioning-plan-ready');
  assert.equal(out.planComplete, true);
  assert.equal(out.readyForSeparateProvisioningAuthorization, true);
  assert.equal(out.provisioningAuthorized, false);
  assert.equal(out.activationAuthorized, false);
  assert.deepEqual(out.blockers, []);
  assert.deepEqual(out.effects, {
    environmentReads: 0,
    environmentMutations: 0,
    secretReads: 0,
    secretWrites: 0,
    productionDeployments: 0,
    channelActivations: 0,
    nativeVerifierExecutions: 0,
    databaseWrites: 0,
    productWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});

test('v165 never generates or exposes the dedicated verifier secret', () => {
  const invalid = {
    ...completePlan,
    configurationPlan: {
      ...completePlan.configurationPlan,
      dedicatedSecret: {
        ...completePlan.configurationPlan.dedicatedSecret,
        generateValueInPlan: true,
        exposeValueInPlan: true,
      },
    },
  } as unknown as FandexMomentumVerifierProvisioningPlanInput;

  const out = evaluateFandexMomentumVerifierProvisioningPlan(invalid);
  assert.equal(out.state, 'provisioning-plan-invalid');
  assert.ok(out.blockers.includes('dedicated-secret-plan-invalid'));
  assert.equal(out.provisioningAuthorized, false);
});

test('v165 requires the exact ordered authorization, provisioning, verification, read and ledger sequence', () => {
  const invalid = {
    ...completePlan,
    orderedSteps: [
      ...completePlan.orderedSteps.slice(1),
      completePlan.orderedSteps[0],
    ],
  } as unknown as FandexMomentumVerifierProvisioningPlanInput;

  const out = evaluateFandexMomentumVerifierProvisioningPlan(invalid);
  assert.equal(out.state, 'provisioning-plan-invalid');
  assert.ok(out.blockers.includes('ordered-provisioning-sequence-invalid'));
});

test('v165 forbids copying or rotating the runtime database credential as part of provisioning', () => {
  const invalid = {
    ...completePlan,
    runtimeDatabasePlan: {
      ...completePlan.runtimeDatabasePlan,
      copyToPreviewForbidden: false,
      rotateCredentialInPlan: true,
      exposeCredentialInPlan: true,
    },
  } as unknown as FandexMomentumVerifierProvisioningPlanInput;

  const out = evaluateFandexMomentumVerifierProvisioningPlan(invalid);
  assert.equal(out.state, 'provisioning-plan-invalid');
  assert.ok(out.blockers.includes('runtime-database-plan-invalid'));
});

test('v165 blocks any plan that permits ledger advance before accepted native read', () => {
  const invalid = {
    ...completePlan,
    ledgerPolicy: {
      historyAdvanceBeforeAcceptedNativeReadForbidden: false,
      watermarkAdvanceBeforeAcceptedNativeReadForbidden: true,
      manifestAdvanceBeforeAcceptedNativeReadForbidden: true,
    },
  } as unknown as FandexMomentumVerifierProvisioningPlanInput;

  const out = evaluateFandexMomentumVerifierProvisioningPlan(invalid);
  assert.equal(out.state, 'provisioning-plan-invalid');
  assert.ok(out.blockers.includes('ledger-policy-incomplete'));
});

test('v165 requires explicit rollback and keeps scheduler/runtime DB credentials untouched', () => {
  const invalid = {
    ...completePlan,
    rollbackPlan: {
      ...completePlan.rollbackPlan,
      leaveSchedulerAuthorizationUntouched: false,
      leaveExistingRuntimeDatabaseCredentialUntouched: false,
    },
  } as unknown as FandexMomentumVerifierProvisioningPlanInput;

  const out = evaluateFandexMomentumVerifierProvisioningPlan(invalid);
  assert.equal(out.state, 'provisioning-plan-invalid');
  assert.ok(out.blockers.includes('rollback-plan-incomplete'));
});

test('v165 requires separate provisioning and activation authorization record slots, both ungranted', () => {
  const invalid = {
    ...completePlan,
    authorizationRecords: {
      provisioning: {
        slotDefined: true,
        granted: true,
        recordId: 'not-allowed',
      },
      activation: completePlan.authorizationRecords.activation,
    },
  } as unknown as FandexMomentumVerifierProvisioningPlanInput;

  const out = evaluateFandexMomentumVerifierProvisioningPlan(invalid);
  assert.equal(out.state, 'provisioning-plan-invalid');
  assert.ok(out.blockers.includes('authorization-record-slots-invalid'));
  assert.equal(out.provisioningAuthorized, false);
  assert.equal(out.activationAuthorized, false);
});
