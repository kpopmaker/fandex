import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evaluateFandexMomentumVerifierConfigurationEvidence,
} from '../../lib/intelligence/fandexMomentumVerifierConfigurationEvidenceResearch';
import {
  evaluateFandexMomentumVerifierChannelActivationReadiness,
} from '../../lib/intelligence/fandexMomentumVerifierChannelActivationReadinessResearch';

const receipt = JSON.parse(readFileSync(
  'data/momentum-research/pr127_v166_configuration_mutation_execution_20260925T232059KST.json',
  'utf8',
));

assert.equal(receipt.result.state, 'configuration-mutation-succeeded');
assert.equal(receipt.result.provider.batchPostStatus, 201);
assert.equal(receipt.result.provider.failedCount, 0);
assert.equal(receipt.result.provider.created.length, 3);
assert.equal(receipt.result.v167.secretContractSatisfied, true);
assert.equal(receipt.result.v167.differsFromSchedulerCredential, true);
assert.equal(receipt.result.v167.secretValueExposed, false);

const v164 = evaluateFandexMomentumVerifierConfigurationEvidence({
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
    contractVersion: 'v162_naver_news_momentum_native_verifier_execution_channel_v1',
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
});

assert.equal(v164.state, 'configuration-evidence-ready');
assert.equal(v164.readyToReevaluateV163, true);
assert.deepEqual(v164.blockers, []);

const v163 = evaluateFandexMomentumVerifierChannelActivationReadiness({
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
});

assert.equal(v163.state, 'activation-readiness-pass');
assert.equal(v163.readyForSeparateActivationDecision, true);
assert.equal(v163.activationAuthorized, false);
assert.deepEqual(v163.blockers, []);

console.log(JSON.stringify({
  v164: {
    state: v164.state,
    readyToReevaluateV163: v164.readyToReevaluateV163,
    activationAuthorized: v164.activationAuthorized,
    blockers: v164.blockers,
    digest: v164.digest,
  },
  v163: {
    state: v163.state,
    readyForSeparateActivationDecision: v163.readyForSeparateActivationDecision,
    activationAuthorized: v163.activationAuthorized,
    blockers: v163.blockers,
    digest: v163.digest,
  },
  effects: {
    additionalVercelCalls: 0,
    environmentMutations: 0,
    productionDeployments: 0,
    verifierActivations: 0,
    nativeVerifierExecutions: 0,
    databaseWrites: 0,
    productMetricWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  },
  productBoundary: {
    productMomentumScore: null,
    productionEligible: false,
    productProductionActual: '1/7',
  },
}, null, 2));
