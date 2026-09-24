import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildFandexMomentumVerifierProvisioningAuthorizationPlan,
  FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumVerifierProvisioningAuthorizationPlanResearch';

const currentInput = {
  upstreamV164State: 'configuration-evidence-blocked' as const,
  upstreamV164Digest:
    '8fd9585c3b77396bde869a9aec80c022f9231fabf54fcac1cc6dffbeb738ba6c',
  teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
  projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
  projectName: 'fandex' as const,
  environment: 'production' as const,
  intendedDeploymentCommit: '7a1038226b07abf4a130986766ef114a43c1d638',
  intendedPreviewDeploymentId: 'dpl_FbqAfXBDTrZBPMEiwrYswmK5kNm8',
  intendedPreviewDeploymentReady: true,
  freshSourceThroughSlotStart: '2026-09-21T12:00:00.000Z',
  freshSourceAlreadyAdvanced: false,
};

test('v165 is plan-only and performs no mutation, deployment, activation, or ledger advance', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_DESCRIPTOR.planOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_DESCRIPTOR
      .environmentMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_DESCRIPTOR
      .secretGeneratedOrRotated,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_DESCRIPTOR
      .productionDeploymentPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_DESCRIPTOR
      .verifierActivationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_DESCRIPTOR
      .ledgerAdvancePerformed,
    false,
  );
});

test('current v165 plan is ready only for separate authorization', () => {
  const out = buildFandexMomentumVerifierProvisioningAuthorizationPlan(
    currentInput,
  );

  assert.equal(out.state, 'provisioning-plan-ready');
  assert.equal(out.planReadyForSeparateAuthorization, true);
  assert.deepEqual(out.blockers, []);
  assert.deepEqual(out.authorizationSlots, {
    configurationMutation: 'required-ungranted',
    productionDeployment: 'required-ungranted',
    verifierActivation: 'required-ungranted',
    ledgerAdvance: 'required-ungranted',
  });
  assert.deepEqual(out.effects, {
    environmentReads: 0,
    environmentMutations: 0,
    secretReads: 0,
    secretWrites: 0,
    secretRotations: 0,
    productionDeployments: 0,
    verifierActivations: 0,
    databaseWrites: 0,
    productMetricWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});

test('v165 fixes exact Production configuration while never generating a secret', () => {
  const out = buildFandexMomentumVerifierProvisioningAuthorizationPlan(
    currentInput,
  );

  assert.deepEqual(out.configurationPlan.map((row) => row.key), [
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
  ]);
  assert.equal(
    out.configurationPlan[0]?.exactValue,
    'approved-v162-research-read-only',
  );
  assert.equal(out.configurationPlan[1]?.exactValue, 'production');
  assert.equal(out.configurationPlan[2]?.exactValue, null);
  assert.ok(out.configurationPlan.every((row) => row.productionTargetOnly));
  assert.ok(out.configurationPlan.every((row) => !row.mutationAuthorized));

  assert.equal(
    out.dedicatedSecretRequirements.schedulerCredentialKey,
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  );
  assert.equal(out.dedicatedSecretRequirements.generatedByThisPlan, false);
  assert.equal(out.dedicatedSecretRequirements.valueExposedByThisPlan, false);
  assert.equal(out.dedicatedSecretRequirements.minimumUtf8Bytes, 24);
  assert.equal(out.dedicatedSecretRequirements.maximumUtf8Bytes, 512);
  assert.equal(
    out.dedicatedSecretRequirements.exactValueMustDifferFromSchedulerCredential,
    true,
  );
  assert.equal(
    out.dedicatedSecretRequirements.separationProofMustNotRevealEitherSecret,
    true,
  );
});

test('v165 requires exact authorization and verification ordering', () => {
  const out = buildFandexMomentumVerifierProvisioningAuthorizationPlan(
    currentInput,
  );

  assert.deepEqual(out.executionSequence.map((row) => row.order), [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  ]);
  assert.deepEqual(out.executionSequence.map((row) => row.stage), [
    'authorize-configuration-mutation',
    'provision-verifier-configuration',
    'verify-v164-configuration-evidence',
    'reevaluate-v163-activation-readiness',
    'authorize-production-deployment',
    'deploy-intended-verifier-commit',
    'authorize-verifier-activation',
    'execute-first-v162-native-read',
    'accept-first-native-read',
    'authorize-ledger-advance',
  ]);
  assert.equal(out.executionSequence[0]?.allowedNow, true);
  assert.ok(out.executionSequence.slice(1).every((row) => !row.allowedNow));
});

test('first native read acceptance requires exact v162/v160/v159 evidence before ledger authorization', () => {
  const out = buildFandexMomentumVerifierProvisioningAuthorizationPlan(
    currentInput,
  );

  assert.equal(
    out.firstNativeReadAcceptance.contractVersion,
    'v162_naver_news_momentum_native_verifier_execution_channel_v1',
  );
  assert.equal(out.firstNativeReadAcceptance.canonicalArtistId, 'iu');
  assert.equal(
    out.firstNativeReadAcceptance.throughSlotStart,
    '2026-09-21T12:00:00.000Z',
  );
  assert.equal(out.firstNativeReadAcceptance.stateMustBe, 'executed');
  assert.equal(out.firstNativeReadAcceptance.databaseReadOnlyMustBe, true);
  assert.equal(out.firstNativeReadAcceptance.databaseWritesObservedMustBe, 0);
  assert.equal(
    out.firstNativeReadAcceptance.v160StateMustBe,
    'attestation-adapted',
  );
  assert.equal(
    out.firstNativeReadAcceptance.v159StateMustBe,
    'attested-provenance-ready',
  );
  assert.equal(
    out.firstNativeReadAcceptance.v159ProvenanceStateMustBe,
    'stored-evidence-read-reproduced',
  );
  assert.equal(
    out.firstNativeReadAcceptance.v159FutureLiveRefreshEligibleMustBe,
    true,
  );
  assert.equal(
    out.ledgerGate.advancementBeforeAcceptedNativeReadForbidden,
    true,
  );
  assert.equal(out.ledgerGate.currentlyAdvanced, false);
  assert.equal(out.ledgerGate.ledgerAdvanceAuthorized, false);
});

test('runtime database remains outside provisioning and Preview copy is forbidden', () => {
  const out = buildFandexMomentumVerifierProvisioningAuthorizationPlan(
    currentInput,
  );

  assert.equal(out.runtimeDatabaseBoundary.key, 'FANDEX_RUNTIME_DATABASE_URL');
  assert.equal(out.runtimeDatabaseBoundary.provisionedByThisPlan, false);
  assert.equal(
    out.runtimeDatabaseBoundary.productionScopeMustRemainExisting,
    true,
  );
  assert.equal(out.runtimeDatabaseBoundary.previewCopyForbidden, true);
  assert.equal(
    out.runtimeDatabaseBoundary.credentialValueExposureForbidden,
    true,
  );
});

test('rollback before first successful execution requires no research-ledger rollback', () => {
  const out = buildFandexMomentumVerifierProvisioningAuthorizationPlan(
    currentInput,
  );

  assert.deepEqual(out.rollbackPlan.beforeFirstSuccessfulExecution, [
    'disable-or-remove-verifier-enable-flag',
    'remove-or-disable-verifier-route',
    'remove-verifier-specific-deployment-selector-if-provisioned',
    'remove-or-rotate-dedicated-verifier-secret-if-provisioned',
    'no-research-ledger-rollback-required',
  ]);
  assert.equal(
    out.rollbackPlan.afterFirstSuccessfulExecutionRequiresSeparatePlan,
    true,
  );
});

test('invalid identity or premature fresh-source advancement blocks the plan', () => {
  const out = buildFandexMomentumVerifierProvisioningAuthorizationPlan({
    ...currentInput,
    projectId: 'bad',
    intendedPreviewDeploymentReady: false,
    freshSourceAlreadyAdvanced: true,
  });

  assert.equal(out.state, 'provisioning-plan-blocked');
  assert.equal(out.planReadyForSeparateAuthorization, false);
  assert.ok(out.blockers.includes('target-project-invalid'));
  assert.ok(out.blockers.includes('intended-preview-deployment-not-ready'));
  assert.ok(
    out.blockers.includes('fresh-source-already-advanced-before-native-read'),
  );
});


test('committed v165 audit reproduces the exact current authorization plan', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_provisioning_authorization_plan_v165_20260921T232742Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const out = buildFandexMomentumVerifierProvisioningAuthorizationPlan(
    currentInput,
  );

  assert.equal(out.state, 'provisioning-plan-ready');
  assert.equal(out.planReadyForSeparateAuthorization, true);
  assert.equal(
    out.digest,
    'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f',
  );
  assert.deepEqual(out.authorizationSlots, audit.authorizationSlots);
  assert.deepEqual(
    out.executionSequence.map((row) => row.stage),
    audit.executionSequence,
  );
  assert.deepEqual(
    out.firstNativeReadAcceptance,
    audit.firstNativeReadAcceptance,
  );
  assert.deepEqual(out.ledgerGate, audit.ledgerGate);
  assert.deepEqual(out.rollbackPlan, audit.rollbackPlan);
  assert.equal(audit.result.state, 'provisioning-plan-ready');
  assert.equal(audit.result.planReadyForSeparateAuthorization, true);
  assert.deepEqual(audit.result.blockers, []);
  assert.equal(audit.effects.environmentMutations, 0);
  assert.equal(audit.effects.secretWrites, 0);
  assert.equal(audit.effects.productionDeployments, 0);
  assert.equal(audit.effects.verifierActivations, 0);
  assert.equal(audit.effects.databaseWrites, 0);
  assert.equal(audit.effects.historyWrites, 0);
  assert.equal(audit.effects.watermarkWrites, 0);
  assert.equal(audit.effects.manifestWrites, 0);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
