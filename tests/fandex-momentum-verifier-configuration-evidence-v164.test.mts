import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierConfigurationEvidence,
  FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_DESCRIPTOR,
  type FandexMomentumVerifierConfigurationEvidence,
} from '../lib/intelligence/fandexMomentumVerifierConfigurationEvidenceResearch';

const readyEvidence: FandexMomentumVerifierConfigurationEvidence = {
  projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
  projectName: 'fandex',
  teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
  environment: 'production',
  intendedDeploymentCommit: '7a1038226b07abf4a130986766ef114a43c1d638',
  intendedRoutePath: '/api/internal/naver-news/momentum-verifier',
  intendedCommitPreviewDeploymentId: 'dpl_FbqAfXBDTrZBPMEiwrYswmK5kNm8',
  intendedCommitPreviewDeploymentReady: true,
  productionEnvironmentInventoryQueryable: true,
  enableFlag: {
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
    present: true,
    productionTargeted: true,
    exactContractValueProven: true,
    expectedValue: 'approved-v162-research-read-only',
  },
  deploymentSelector: {
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
    present: true,
    productionTargeted: true,
    exactContractValueProven: true,
    expectedValue: 'production',
  },
  dedicatedSecret: {
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    present: true,
    productionTargeted: true,
    valueExposed: false,
    secretContractSatisfiedWithoutExposure: true,
    distinctFromSchedulerCredentialProven: true,
    minimumUtf8Bytes: 24,
    maximumUtf8Bytes: 512,
    whitespaceOrControlCharactersForbidden: true,
  },
  runtimeDatabaseScope: {
    key: 'FANDEX_RUNTIME_DATABASE_URL',
    productionAccessObservedIndependently: true,
    previewAccessObservedUnavailableOrInvalid: true,
    productionScopedWithoutPreviewCopyProven: true,
    credentialValueExposed: false,
  },
  boundedResponseContract: {
    contractVersion:
      'v162_naver_news_momentum_native_verifier_execution_channel_v1',
    exactRoutePath: '/api/internal/naver-news/momentum-verifier',
    rawPayloadBodyAbsent: true,
    normalizedPayloadBodyAbsent: true,
    databaseCredentialAbsent: true,
    authorizationSecretAbsent: true,
    databaseWritesZero: true,
    productWritesZero: true,
    registryMutationsZero: true,
    productionActivationsZero: true,
  },
  rollbackProcedure: {
    explicit: true,
    disableEnableFlag: true,
    removeOrDisableRoute: true,
    noLedgerRollbackRequiredBeforeFirstSuccessfulExecution: true,
  },
  ledgerBoundary: {
    mutationBeforeSuccessfulNativeVerifierExecutionForbidden: true,
    currentFreshSourceAdvanced: false,
  },
  activationAuthorizationRecord: {
    slotDefined: true,
    separateFromReadiness: true,
    authorizationGranted: false,
    recordId: null,
  },
  previewCredentialInheritanceAbsent: true,
  evidenceBoundToProjectAndEnvironment: true,
};

test('v164 is non-mutating configuration evidence only', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_DESCRIPTOR.readinessOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_DESCRIPTOR
      .environmentMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_DESCRIPTOR
      .secretMutationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_DESCRIPTOR
      .activationPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_DESCRIPTOR
      .secretValueExposureAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_EVIDENCE_DESCRIPTOR
      .separateActivationAuthorizationRecordRequired,
    true,
  );
});

test('complete bound production configuration evidence can pass without activation', () => {
  const out = evaluateFandexMomentumVerifierConfigurationEvidence(readyEvidence);
  assert.equal(out.state, 'configuration-evidence-ready');
  assert.equal(out.readyToReevaluateV163, true);
  assert.equal(out.activationAuthorized, false);
  assert.deepEqual(out.blockers, []);
  assert.deepEqual(out.effects, {
    environmentReads: 0,
    environmentMutations: 0,
    secretReads: 0,
    secretMutations: 0,
    productionDeployments: 0,
    activationWrites: 0,
    databaseWrites: 0,
    productMetricWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});

test('current connected-tool evidence fails closed when production env inventory is unavailable', () => {
  const out = evaluateFandexMomentumVerifierConfigurationEvidence({
    ...readyEvidence,
    productionEnvironmentInventoryQueryable: false,
    enableFlag: {
      ...readyEvidence.enableFlag,
      present: false,
      productionTargeted: false,
      exactContractValueProven: false,
    },
    deploymentSelector: {
      ...readyEvidence.deploymentSelector,
      present: false,
      productionTargeted: false,
      exactContractValueProven: false,
    },
    dedicatedSecret: {
      ...readyEvidence.dedicatedSecret,
      present: false,
      productionTargeted: false,
      secretContractSatisfiedWithoutExposure: false,
      distinctFromSchedulerCredentialProven: false,
    },
    evidenceBoundToProjectAndEnvironment: false,
  });

  assert.equal(out.state, 'configuration-evidence-blocked');
  assert.equal(out.readyToReevaluateV163, false);
  assert.equal(out.activationAuthorized, false);
  assert.deepEqual(out.blockers, [
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
  ]);
});

test('secret evidence must remain non-revealing and prove separation', () => {
  const out = evaluateFandexMomentumVerifierConfigurationEvidence({
    ...readyEvidence,
    dedicatedSecret: {
      ...readyEvidence.dedicatedSecret,
      secretContractSatisfiedWithoutExposure: false,
      distinctFromSchedulerCredentialProven: false,
    },
  });
  assert.equal(out.state, 'configuration-evidence-blocked');
  assert.ok(
    out.blockers.includes('dedicated-verifier-secret-contract-not-proven'),
  );
  assert.ok(
    out.blockers.includes('dedicated-verifier-secret-separation-not-proven'),
  );
});

test('runtime DB evidence must prove Production scope without Preview inheritance', () => {
  const out = evaluateFandexMomentumVerifierConfigurationEvidence({
    ...readyEvidence,
    runtimeDatabaseScope: {
      ...readyEvidence.runtimeDatabaseScope,
      previewAccessObservedUnavailableOrInvalid: false,
      productionScopedWithoutPreviewCopyProven: false,
    },
  });
  assert.equal(out.state, 'configuration-evidence-blocked');
  assert.ok(
    out.blockers.includes('runtime-database-preview-isolation-not-observed'),
  );
  assert.ok(
    out.blockers.includes('runtime-database-production-scope-not-proven'),
  );
});

test('bounded response must exclude sensitive output and all mutation side effects', () => {
  const out = evaluateFandexMomentumVerifierConfigurationEvidence({
    ...readyEvidence,
    boundedResponseContract: {
      ...readyEvidence.boundedResponseContract,
      rawPayloadBodyAbsent: false,
      databaseWritesZero: false,
    },
  });
  assert.equal(out.state, 'configuration-evidence-blocked');
  assert.ok(
    out.blockers.includes('bounded-response-sensitive-output-not-excluded'),
  );
  assert.ok(
    out.blockers.includes('bounded-response-side-effect-contract-not-zero'),
  );
});

test('rollback, ledger boundary, and separate authorization slot are mandatory', () => {
  const out = evaluateFandexMomentumVerifierConfigurationEvidence({
    ...readyEvidence,
    rollbackProcedure: {
      ...readyEvidence.rollbackProcedure,
      removeOrDisableRoute: false,
    },
    ledgerBoundary: {
      mutationBeforeSuccessfulNativeVerifierExecutionForbidden: false,
      currentFreshSourceAdvanced: true,
    },
    activationAuthorizationRecord: {
      slotDefined: false,
      separateFromReadiness: false,
      authorizationGranted: false,
      recordId: null,
    },
  });
  assert.equal(out.state, 'configuration-evidence-blocked');
  assert.ok(out.blockers.includes('rollback-procedure-incomplete'));
  assert.ok(out.blockers.includes('ledger-boundary-not-safe'));
  assert.ok(
    out.blockers.includes('activation-authorization-record-slot-invalid'),
  );
});

test('preview-only or unbound evidence cannot clear production readiness', () => {
  const out = evaluateFandexMomentumVerifierConfigurationEvidence({
    ...readyEvidence,
    previewCredentialInheritanceAbsent: false,
    evidenceBoundToProjectAndEnvironment: false,
    enableFlag: {
      ...readyEvidence.enableFlag,
      productionTargeted: false,
    },
    deploymentSelector: {
      ...readyEvidence.deploymentSelector,
      productionTargeted: false,
    },
    dedicatedSecret: {
      ...readyEvidence.dedicatedSecret,
      productionTargeted: false,
    },
  });
  assert.equal(out.state, 'configuration-evidence-blocked');
  assert.ok(
    out.blockers.includes('configuration-evidence-not-bound-to-project-environment'),
  );
  assert.ok(
    out.blockers.includes('preview-credential-inheritance-not-excluded'),
  );
});

test('invalid project, team, deployment, or commit identity fails closed', () => {
  const out = evaluateFandexMomentumVerifierConfigurationEvidence({
    ...readyEvidence,
    projectId: 'bad',
    teamId: 'bad',
    intendedDeploymentCommit: 'bad',
    intendedCommitPreviewDeploymentId: 'bad',
  });
  assert.equal(out.state, 'configuration-evidence-blocked');
  assert.ok(out.blockers.includes('verifier-project-id-invalid'));
  assert.ok(out.blockers.includes('verifier-team-id-invalid'));
  assert.ok(out.blockers.includes('intended-deployment-commit-invalid'));
  assert.ok(out.blockers.includes('intended-preview-deployment-id-invalid'));
});


test('committed v164 audit reproduces the exact current blocked packet', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_configuration_evidence_v164_20260921T151600Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const out = evaluateFandexMomentumVerifierConfigurationEvidence(audit.evidence);

  assert.equal(out.state, 'configuration-evidence-blocked');
  assert.equal(out.readyToReevaluateV163, false);
  assert.equal(out.activationAuthorized, false);
  assert.equal(
    out.digest,
    '8fd9585c3b77396bde869a9aec80c022f9231fabf54fcac1cc6dffbeb738ba6c',
  );
  assert.deepEqual(out.blockers, audit.result.blockers);
  assert.equal(
    audit.vercelInspection.intendedCommitPreviewDeploymentState,
    'READY',
  );
  assert.equal(
    audit.vercelInspection.connectedInterfaceEnvironmentInventoryAvailable,
    false,
  );
  assert.equal(
    audit.repositoryEvidence.verifierVariablesDeclaredInEnvExample,
    false,
  );
  assert.equal(
    audit.evidence.runtimeDatabaseScope.productionAccessObservedIndependently,
    true,
  );
  assert.equal(
    audit.evidence.runtimeDatabaseScope.previewAccessObservedUnavailableOrInvalid,
    true,
  );
  assert.equal(
    audit.evidence.boundedResponseContract.rawPayloadBodyAbsent,
    true,
  );
  assert.equal(audit.evidence.ledgerBoundary.currentFreshSourceAdvanced, false);
  assert.equal(
    audit.evidence.activationAuthorizationRecord.authorizationGranted,
    false,
  );
  assert.equal(audit.effects.environmentMutations, 0);
  assert.equal(audit.effects.secretMutations, 0);
  assert.equal(audit.effects.productionDeployments, 0);
  assert.equal(audit.effects.activationWrites, 0);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
