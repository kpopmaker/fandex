import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierProvisioningPlan,
  FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR,
  type FandexMomentumVerifierProvisioningPlanInput,
} from '../lib/intelligence/fandexMomentumVerifierProvisioningPlanResearch';

export const completePlan: FandexMomentumVerifierProvisioningPlanInput = {
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
      schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
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
    'obtain-separate-production-deployment-authorization',
    'redeploy-intended-commit-to-production',
    'rerun-v164-configuration-evidence',
    'rerun-v163-activation-readiness',
    'obtain-separate-activation-authorization',
    'execute-first-bounded-v162-native-read',
    'require-v161-v160-v159-chain-acceptance',
    'obtain-separate-ledger-advance-authorization',
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
    provisioning: { slotDefined: true, granted: false, recordId: null },
    productionDeployment: { slotDefined: true, granted: false, recordId: null },
    activation: { slotDefined: true, granted: false, recordId: null },
    ledgerAdvance: { slotDefined: true, granted: false, recordId: null },
  },
};

test('v165 is planning-only and performs no provisioning, deployment, activation or ledger advance', () => {
  assert.equal(FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.planningOnly, true);
  assert.equal(FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.environmentMutationPerformed, false);
  assert.equal(FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.secretGenerationPerformed, false);
  assert.equal(FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.productionDeploymentPerformed, false);
  assert.equal(FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.channelActivationPerformed, false);
  assert.equal(FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR.ledgerAdvancePerformed, false);
});

test('complete current v165 plan is ready only for separate provisioning authorization', () => {
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

test('v165 fixes exact Production settings and explicitly separates verifier secret from scheduler secret', () => {
  const out = evaluateFandexMomentumVerifierProvisioningPlan(completePlan);
  assert.equal(
    out.plan.configurationPlan.enableFlag.exactValue,
    'approved-v162-research-read-only',
  );
  assert.equal(out.plan.configurationPlan.deploymentSelector.exactValue, 'production');
  assert.equal(
    out.plan.configurationPlan.dedicatedSecret.schedulerCredentialKey,
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  );
  assert.equal(out.plan.configurationPlan.dedicatedSecret.generateValueInPlan, false);
  assert.equal(out.plan.configurationPlan.dedicatedSecret.exposeValueInPlan, false);
  assert.equal(
    out.plan.configurationPlan.dedicatedSecret.mustBeDistinctFromSchedulerCredential,
    true,
  );
});

test('v165 requires four separate ungranted authorization records', () => {
  const out = evaluateFandexMomentumVerifierProvisioningPlan(completePlan);
  assert.deepEqual(out.plan.authorizationRecords, {
    provisioning: { slotDefined: true, granted: false, recordId: null },
    productionDeployment: { slotDefined: true, granted: false, recordId: null },
    activation: { slotDefined: true, granted: false, recordId: null },
    ledgerAdvance: { slotDefined: true, granted: false, recordId: null },
  });
  assert.ok(out.plan.orderedSteps.includes('obtain-separate-production-deployment-authorization'));
  assert.ok(out.plan.orderedSteps.includes('obtain-separate-ledger-advance-authorization'));
});

test('v165 requires v164 then v163 then exact Production deploy/activation before first bounded v162 read', () => {
  const out = evaluateFandexMomentumVerifierProvisioningPlan(completePlan);
  const steps = out.plan.orderedSteps;
  assert.ok(steps.indexOf('rerun-v164-configuration-evidence') < steps.indexOf('rerun-v163-activation-readiness'));
  assert.ok(steps.indexOf('rerun-v163-activation-readiness') < steps.indexOf('obtain-separate-production-deployment-authorization'));
  assert.ok(steps.indexOf('obtain-separate-production-deployment-authorization') < steps.indexOf('redeploy-intended-commit-to-production'));
  assert.ok(steps.indexOf('redeploy-intended-commit-to-production') < steps.indexOf('obtain-separate-activation-authorization'));
  assert.ok(steps.indexOf('obtain-separate-activation-authorization') < steps.indexOf('execute-first-bounded-v162-native-read'));
});

test('first native read must pass v162 -> v161 -> v160 -> v159 before ledger authorization', () => {
  const out = evaluateFandexMomentumVerifierProvisioningPlan(completePlan);
  assert.equal(out.plan.firstNativeReadAcceptance.sourceBoundary, '2026-09-21T12:00:00.000Z');
  assert.equal(out.plan.firstNativeReadAcceptance.requireV162Executed, true);
  assert.equal(out.plan.firstNativeReadAcceptance.requireV161NativeOutput, true);
  assert.equal(out.plan.firstNativeReadAcceptance.requireV160AttestationAdapted, true);
  assert.equal(out.plan.firstNativeReadAcceptance.requireV159AttestedProvenanceReady, true);
  assert.equal(out.plan.firstNativeReadAcceptance.requireDatabaseWritesZero, true);
  assert.equal(out.plan.ledgerPolicy.historyAdvanceBeforeAcceptedNativeReadForbidden, true);
  assert.equal(out.plan.ledgerPolicy.watermarkAdvanceBeforeAcceptedNativeReadForbidden, true);
  assert.equal(out.plan.ledgerPolicy.manifestAdvanceBeforeAcceptedNativeReadForbidden, true);
});

test('runtime database and scheduler credentials remain outside provisioning mutation scope', () => {
  const out = evaluateFandexMomentumVerifierProvisioningPlan(completePlan);
  assert.equal(out.plan.runtimeDatabasePlan.reuseExistingProductionScopedCredentialOnly, true);
  assert.equal(out.plan.runtimeDatabasePlan.copyToPreviewForbidden, true);
  assert.equal(out.plan.runtimeDatabasePlan.rotateCredentialInPlan, false);
  assert.equal(out.plan.runtimeDatabasePlan.exposeCredentialInPlan, false);
  assert.equal(out.plan.rollbackPlan.leaveSchedulerAuthorizationUntouched, true);
  assert.equal(out.plan.rollbackPlan.leaveExistingRuntimeDatabaseCredentialUntouched, true);
});

test('authorization slot mutation or ordered-step drift makes v165 invalid', () => {
  const badAuthorization = evaluateFandexMomentumVerifierProvisioningPlan({
    ...completePlan,
    authorizationRecords: {
      ...completePlan.authorizationRecords,
      productionDeployment: {
        slotDefined: true,
        granted: true,
        recordId: 'not-authorized-here',
      },
    },
  } as unknown as FandexMomentumVerifierProvisioningPlanInput);
  assert.equal(badAuthorization.state, 'provisioning-plan-invalid');
  assert.ok(badAuthorization.blockers.includes('authorization-record-slots-invalid'));

  const badOrder = evaluateFandexMomentumVerifierProvisioningPlan({
    ...completePlan,
    orderedSteps: [
      ...completePlan.orderedSteps.slice(1),
      completePlan.orderedSteps[0],
    ],
  } as unknown as FandexMomentumVerifierProvisioningPlanInput);
  assert.equal(badOrder.state, 'provisioning-plan-invalid');
  assert.ok(badOrder.blockers.includes('ordered-provisioning-sequence-invalid'));
});
