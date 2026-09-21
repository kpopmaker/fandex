import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierChannelActivationReadiness,
  FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_DESCRIPTOR,
  type FandexMomentumVerifierChannelActivationReadinessEvidence,
} from '../lib/intelligence/fandexMomentumVerifierChannelActivationReadinessResearch';

const readyEvidence: FandexMomentumVerifierChannelActivationReadinessEvidence = {
  intendedDeploymentCommit: '7a1038226b07abf4a130986766ef114a43c1d638',
  routePath: '/api/internal/naver-news/momentum-verifier',
  routeExistsOnIntendedCommit: true,
  intendedCommitPreviewDeploymentReady: true,
  v162ValidationStatus: 'PASS',
  dedicatedAuthorizationDistinctFromScheduler: true,
  productionRuntimeDatabaseAccessObservedIndependently: true,
  verifierEnableConfigurationExplicitlyAvailable: true,
  verifierDeploymentConfigurationExplicitlyAvailable: true,
  dedicatedVerifierSecretExplicitlyAvailable: true,
  previewCredentialInheritanceRequired: false,
  rawPayloadExposurePathAbsent: true,
  databaseWritePathAbsent: true,
  productRegistryActivationSideEffectsAbsent: true,
  rollbackDisablePlanExplicit: true,
  rollbackPlan: {
    disableEnableFlag: true,
    removeOrDisableRoute: true,
    noLedgerRollbackRequiredBeforeFirstExecution: true,
  },
  activationAuthorizationGranted: false,
};

test('v163 is readiness-only and never performs activation or mutation', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_DESCRIPTOR
      .readinessOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_DESCRIPTOR
      .productionDeploymentPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_DESCRIPTOR
      .environmentMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_DESCRIPTOR
      .activationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_DESCRIPTOR
      .activationAuthorizationSeparateDecision,
    true,
  );
});

test('fully complete readiness can pass while activation remains unauthorized', () => {
  const result =
    evaluateFandexMomentumVerifierChannelActivationReadiness(readyEvidence);

  assert.equal(result.state, 'activation-readiness-pass');
  assert.equal(result.readyForSeparateActivationDecision, true);
  assert.equal(result.activationAuthorized, false);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.effects, {
    productionDeployments: 0,
    environmentMutations: 0,
    activationWrites: 0,
    databaseWrites: 0,
    productMetricWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});

test('current missing v162 dedicated configuration fails closed', () => {
  const result =
    evaluateFandexMomentumVerifierChannelActivationReadiness({
      ...readyEvidence,
      verifierEnableConfigurationExplicitlyAvailable: false,
      verifierDeploymentConfigurationExplicitlyAvailable: false,
      dedicatedVerifierSecretExplicitlyAvailable: false,
    });

  assert.equal(result.state, 'activation-readiness-blocked');
  assert.equal(result.readyForSeparateActivationDecision, false);
  assert.equal(result.activationAuthorized, false);
  assert.deepEqual(result.blockers, [
    'verifier-enable-configuration-unavailable',
    'verifier-deployment-configuration-unavailable',
    'dedicated-verifier-secret-unavailable',
  ]);
});

test('unknown validation, missing route, or missing independent DB access blocks readiness', () => {
  const result =
    evaluateFandexMomentumVerifierChannelActivationReadiness({
      ...readyEvidence,
      routeExistsOnIntendedCommit: false,
      v162ValidationStatus: 'UNKNOWN',
      productionRuntimeDatabaseAccessObservedIndependently: false,
    });

  assert.equal(result.state, 'activation-readiness-blocked');
  assert.ok(result.blockers.includes('v162-route-missing-on-intended-commit'));
  assert.ok(result.blockers.includes('v162-validation-not-pass'));
  assert.ok(
    result.blockers.includes(
      'production-runtime-database-access-not-observed',
    ),
  );
});

test('Preview credential inheritance or any payload/write side-effect path blocks readiness', () => {
  const result =
    evaluateFandexMomentumVerifierChannelActivationReadiness({
      ...readyEvidence,
      previewCredentialInheritanceRequired: true,
      rawPayloadExposurePathAbsent: false,
      databaseWritePathAbsent: false,
      productRegistryActivationSideEffectsAbsent: false,
    });

  assert.equal(result.state, 'activation-readiness-blocked');
  assert.ok(
    result.blockers.includes('preview-credential-inheritance-required'),
  );
  assert.ok(result.blockers.includes('raw-payload-exposure-path-present'));
  assert.ok(result.blockers.includes('database-write-path-present'));
  assert.ok(
    result.blockers.includes(
      'product-registry-activation-side-effect-present',
    ),
  );
});

test('incomplete rollback plan blocks readiness', () => {
  const result =
    evaluateFandexMomentumVerifierChannelActivationReadiness({
      ...readyEvidence,
      rollbackPlan: {
        disableEnableFlag: true,
        removeOrDisableRoute: false,
        noLedgerRollbackRequiredBeforeFirstExecution: true,
      },
    });

  assert.equal(result.state, 'activation-readiness-blocked');
  assert.deepEqual(result.blockers, ['rollback-disable-plan-incomplete']);
});

test('activationAuthorizationGranted never turns v163 into activation authorization', () => {
  const result =
    evaluateFandexMomentumVerifierChannelActivationReadiness({
      ...readyEvidence,
      activationAuthorizationGranted: true,
    });

  assert.equal(result.state, 'activation-readiness-pass');
  assert.equal(result.readyForSeparateActivationDecision, true);
  assert.equal(result.activationAuthorized, false);
});
