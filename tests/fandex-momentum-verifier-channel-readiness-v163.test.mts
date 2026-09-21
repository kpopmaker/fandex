import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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


test('committed v163 audit reproduces current blocked readiness without mutation or ledger advance', async () => {
  const [auditRaw, watermarkRaw, manifestRaw] = await Promise.all([
    readFile(
      new URL(
        '../data/momentum-research/iu_verifier_channel_readiness_v163_20260921T151200Z.json',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_evaluation_watermark_v151.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_paired_artifact_manifest_v154.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  const audit = JSON.parse(auditRaw);
  const watermarks = watermarkRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const manifests = manifestRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const result =
    evaluateFandexMomentumVerifierChannelActivationReadiness({
      intendedDeploymentCommit: audit.intendedDeployment.commit,
      routePath: audit.intendedDeployment.routePath,
      routeExistsOnIntendedCommit:
        audit.intendedDeployment.routeExistsOnIntendedCommit,
      intendedCommitPreviewDeploymentReady:
        audit.intendedDeployment.previewDeploymentState === 'READY',
      v162ValidationStatus: audit.upstreamValidation.v162ValidationStatus,
      dedicatedAuthorizationDistinctFromScheduler:
        audit.upstreamValidation.dedicatedAuthorizationDistinctFromScheduler,
      productionRuntimeDatabaseAccessObservedIndependently:
        audit.productionRuntimeDatabaseEvidence.observedIndependentlyOfV162,
      verifierEnableConfigurationExplicitlyAvailable:
        audit.configurationEvidence
          .verifierEnableConfigurationExplicitlyAvailable,
      verifierDeploymentConfigurationExplicitlyAvailable:
        audit.configurationEvidence
          .verifierDeploymentConfigurationExplicitlyAvailable,
      dedicatedVerifierSecretExplicitlyAvailable:
        audit.configurationEvidence
          .dedicatedVerifierSecretExplicitlyAvailable,
      previewCredentialInheritanceRequired:
        audit.configurationEvidence.previewCredentialInheritanceRequired,
      rawPayloadExposurePathAbsent:
        audit.upstreamValidation.rawPayloadExposurePathAbsent,
      databaseWritePathAbsent:
        audit.upstreamValidation.databaseWritePathAbsent,
      productRegistryActivationSideEffectsAbsent:
        audit.upstreamValidation.productRegistryActivationSideEffectsAbsent,
      rollbackDisablePlanExplicit: audit.rollbackPlan.explicit,
      rollbackPlan: {
        disableEnableFlag: audit.rollbackPlan.disableEnableFlag,
        removeOrDisableRoute: audit.rollbackPlan.removeOrDisableRoute,
        noLedgerRollbackRequiredBeforeFirstExecution:
          audit.rollbackPlan.noLedgerRollbackRequiredBeforeFirstExecution,
      },
      activationAuthorizationGranted:
        audit.activationDecision.activationAuthorizationGranted,
    });

  assert.equal(
    audit.contractVersion,
    'v163_fandex_momentum_verifier_channel_activation_readiness_audit_v1',
  );
  assert.equal(result.state, audit.readiness.state);
  assert.equal(
    result.readyForSeparateActivationDecision,
    audit.readiness.readyForSeparateActivationDecision,
  );
  assert.equal(result.activationAuthorized, false);
  assert.deepEqual(result.blockers, audit.readiness.blockers);
  assert.equal(result.digest, audit.readiness.digest);
  assert.deepEqual(result.effects, audit.effects);

  assert.equal(
    audit.configurationEvidence.availabilityMeaning,
    'no-explicit-connected-evidence-not-asserted-absent',
  );
  assert.equal(audit.activationDecision.activationPerformed, false);
  assert.equal(audit.effects.productionDeployments, 0);
  assert.equal(audit.effects.environmentMutations, 0);
  assert.equal(audit.effects.activationWrites, 0);

  assert.equal(
    watermarks.length,
    audit.authoritativeLedgerBoundary.v151WatermarkRecordCount,
  );
  assert.equal(
    watermarks.at(-1).sequence,
    audit.authoritativeLedgerBoundary.latestWatermarkSequence,
  );
  assert.equal(
    watermarks.at(-1).evaluationBoundary.sourceEvidence.naverThroughSlotStart,
    audit.authoritativeLedgerBoundary.latestAcceptedNaverThroughSlotStart,
  );
  assert.equal(
    manifests.length,
    audit.authoritativeLedgerBoundary.v154ManifestRecordCount,
  );
  assert.equal(
    manifests.at(-1).sequence,
    audit.authoritativeLedgerBoundary.latestManifestSequence,
  );
  assert.equal(
    manifests.at(-1).manifestDigest,
    audit.authoritativeLedgerBoundary.latestManifestDigest,
  );
  assert.equal(audit.authoritativeLedgerBoundary.fresh1200ZAdvanced, false);
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
