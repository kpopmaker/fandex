import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_VERSION =
  'v165_fandex_momentum_verifier_configuration_provisioning_authorization_plan_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_VERSION,
    lifecycle: 'research' as const,
    upstreamConfigurationEvidenceContract:
      'v164_fandex_momentum_verifier_configuration_evidence_closure_research_v1' as const,
    planningOnly: true as const,
    provisioningPerformed: false as const,
    environmentMutationPerformed: false as const,
    secretGenerationPerformed: false as const,
    secretValueExposureAllowed: false as const,
    productionDeploymentPerformed: false as const,
    channelActivationPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
    productMutationPerformed: false as const,
    provisioningAuthorizationSeparateDecision: true as const,
    activationAuthorizationSeparateDecision: true as const,
  });

export type FandexMomentumVerifierProvisioningPlanInput = Readonly<{
  upstreamV164: Readonly<{
    state: 'configuration-evidence-blocked' | 'configuration-evidence-ready';
    digest: string;
    blockers: readonly string[];
  }>;
  target: Readonly<{
    teamId: string;
    projectId: string;
    projectName: 'fandex';
    environment: 'production';
    intendedDeploymentCommit: string;
    routePath: '/api/internal/naver-news/momentum-verifier';
  }>;
  configurationPlan: Readonly<{
    enableFlag: Readonly<{
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED';
      exactValue: 'approved-v162-research-read-only';
      target: 'production';
    }>;
    deploymentSelector: Readonly<{
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT';
      exactValue: 'production';
      target: 'production';
    }>;
    dedicatedSecret: Readonly<{
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
      schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET';
      target: 'production';
      generateValueInPlan: false;
      exposeValueInPlan: false;
      minimumUtf8Bytes: 24;
      maximumUtf8Bytes: 512;
      whitespaceOrControlCharactersForbidden: true;
      mustBeDistinctFromSchedulerCredential: true;
      separationProofMethod:
        'compare-non-reversible-fingerprints-without-exposing-secret-values';
    }>;
  }>;
  runtimeDatabasePlan: Readonly<{
    key: 'FANDEX_RUNTIME_DATABASE_URL';
    reuseExistingProductionScopedCredentialOnly: true;
    copyToPreviewForbidden: true;
    rotateCredentialInPlan: false;
    exposeCredentialInPlan: false;
  }>;
  orderedSteps: readonly [
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
    'only-then-allow-v158-v155-v156-v157-and-ledger-advance'
  ];
  postConfigurationVerification: Readonly<{
    requireV164Ready: true;
    requireV163Ready: true;
    requireSeparateActivationAuthorization: true;
    requireProductionRouteOnExactCommit: true;
    requirePreviewCredentialInheritanceAbsent: true;
    requireRawPayloadExposureAbsent: true;
    requireDatabaseWritePathAbsent: true;
  }>;
  firstNativeReadAcceptance: Readonly<{
    sourceBoundary: string;
    requireV162Executed: true;
    requireV161NativeOutput: true;
    requireV160AttestationAdapted: true;
    requireV159AttestedProvenanceReady: true;
    requireDatabaseWritesZero: true;
    requireRawPayloadResponseAbsent: true;
    requireExactSourceBoundaryMatch: true;
  }>;
  ledgerPolicy: Readonly<{
    historyAdvanceBeforeAcceptedNativeReadForbidden: true;
    watermarkAdvanceBeforeAcceptedNativeReadForbidden: true;
    manifestAdvanceBeforeAcceptedNativeReadForbidden: true;
  }>;
  rollbackPlan: Readonly<{
    disableEnableFlagFirst: true;
    removeOrDisableVerifierRoute: true;
    leaveSchedulerAuthorizationUntouched: true;
    leaveExistingRuntimeDatabaseCredentialUntouched: true;
    revokeOrRotateDedicatedVerifierSecretIfProvisioned: true;
    noLedgerRollbackRequiredIfNoAcceptedNativeReadOccurred: true;
  }>;
  authorizationRecords: Readonly<{
    provisioning: Readonly<{
      slotDefined: true;
      granted: false;
      recordId: null;
    }>;
    productionDeployment: Readonly<{
      slotDefined: true;
      granted: false;
      recordId: null;
    }>;
    activation: Readonly<{
      slotDefined: true;
      granted: false;
      recordId: null;
    }>;
    ledgerAdvance: Readonly<{
      slotDefined: true;
      granted: false;
      recordId: null;
    }>;
  }>;
}>;

export type FandexMomentumVerifierProvisioningPlanResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_VERSION;
  state: 'provisioning-plan-invalid' | 'provisioning-plan-ready';
  planComplete: boolean;
  readyForSeparateProvisioningAuthorization: boolean;
  provisioningAuthorized: false;
  activationAuthorized: false;
  blockers: readonly string[];
  plan: FandexMomentumVerifierProvisioningPlanInput;
  effects: Readonly<{
    environmentReads: 0;
    environmentMutations: 0;
    secretReads: 0;
    secretWrites: 0;
    productionDeployments: 0;
    channelActivations: 0;
    nativeVerifierExecutions: 0;
    databaseWrites: 0;
    productWrites: 0;
    registryMutations: 0;
    historyWrites: 0;
    watermarkWrites: 0;
    manifestWrites: 0;
  }>;
  digest: string;
}>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function evaluateFandexMomentumVerifierProvisioningPlan(
  plan: FandexMomentumVerifierProvisioningPlanInput,
): FandexMomentumVerifierProvisioningPlanResult {
  const blockers: string[] = [];

  if (!/^[0-9a-f]{64}$/.test(plan.upstreamV164.digest)) {
    blockers.push('upstream-v164-digest-invalid');
  }
  if (!/^team_[A-Za-z0-9]+$/.test(plan.target.teamId)) {
    blockers.push('target-team-id-invalid');
  }
  if (!/^prj_[A-Za-z0-9]+$/.test(plan.target.projectId)) {
    blockers.push('target-project-id-invalid');
  }
  if (!/^[0-9a-f]{40}$/.test(plan.target.intendedDeploymentCommit)) {
    blockers.push('target-deployment-commit-invalid');
  }

  if (
    plan.configurationPlan.enableFlag.key
      !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
    || plan.configurationPlan.enableFlag.exactValue
      !== 'approved-v162-research-read-only'
    || plan.configurationPlan.enableFlag.target !== 'production'
  ) {
    blockers.push('enable-flag-plan-mismatch');
  }

  if (
    plan.configurationPlan.deploymentSelector.key
      !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
    || plan.configurationPlan.deploymentSelector.exactValue !== 'production'
    || plan.configurationPlan.deploymentSelector.target !== 'production'
  ) {
    blockers.push('deployment-selector-plan-mismatch');
  }

  const secret = plan.configurationPlan.dedicatedSecret;
  if (
    secret.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
    || secret.schedulerCredentialKey !== 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET'
    || secret.target !== 'production'
    || secret.generateValueInPlan !== false
    || secret.exposeValueInPlan !== false
    || secret.minimumUtf8Bytes !== 24
    || secret.maximumUtf8Bytes !== 512
    || secret.whitespaceOrControlCharactersForbidden !== true
    || secret.mustBeDistinctFromSchedulerCredential !== true
    || secret.separationProofMethod
      !== 'compare-non-reversible-fingerprints-without-exposing-secret-values'
  ) {
    blockers.push('dedicated-secret-plan-invalid');
  }

  if (
    plan.runtimeDatabasePlan.key !== 'FANDEX_RUNTIME_DATABASE_URL'
    || plan.runtimeDatabasePlan.reuseExistingProductionScopedCredentialOnly
      !== true
    || plan.runtimeDatabasePlan.copyToPreviewForbidden !== true
    || plan.runtimeDatabasePlan.rotateCredentialInPlan !== false
    || plan.runtimeDatabasePlan.exposeCredentialInPlan !== false
  ) {
    blockers.push('runtime-database-plan-invalid');
  }

  const requiredSteps: FandexMomentumVerifierProvisioningPlanInput['orderedSteps'] = [
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
  ];
  if (JSON.stringify(plan.orderedSteps) !== JSON.stringify(requiredSteps)) {
    blockers.push('ordered-provisioning-sequence-invalid');
  }

  if (
    !plan.postConfigurationVerification.requireV164Ready
    || !plan.postConfigurationVerification.requireV163Ready
    || !plan.postConfigurationVerification.requireSeparateActivationAuthorization
    || !plan.postConfigurationVerification.requireProductionRouteOnExactCommit
    || !plan.postConfigurationVerification.requirePreviewCredentialInheritanceAbsent
    || !plan.postConfigurationVerification.requireRawPayloadExposureAbsent
    || !plan.postConfigurationVerification.requireDatabaseWritePathAbsent
  ) {
    blockers.push('post-configuration-verification-incomplete');
  }

  if (
    !exactIso(plan.firstNativeReadAcceptance.sourceBoundary)
    || !plan.firstNativeReadAcceptance.requireV162Executed
    || !plan.firstNativeReadAcceptance.requireV161NativeOutput
    || !plan.firstNativeReadAcceptance.requireV160AttestationAdapted
    || !plan.firstNativeReadAcceptance.requireV159AttestedProvenanceReady
    || !plan.firstNativeReadAcceptance.requireDatabaseWritesZero
    || !plan.firstNativeReadAcceptance.requireRawPayloadResponseAbsent
    || !plan.firstNativeReadAcceptance.requireExactSourceBoundaryMatch
  ) {
    blockers.push('first-native-read-acceptance-incomplete');
  }

  if (
    !plan.ledgerPolicy.historyAdvanceBeforeAcceptedNativeReadForbidden
    || !plan.ledgerPolicy.watermarkAdvanceBeforeAcceptedNativeReadForbidden
    || !plan.ledgerPolicy.manifestAdvanceBeforeAcceptedNativeReadForbidden
  ) {
    blockers.push('ledger-policy-incomplete');
  }

  if (
    !plan.rollbackPlan.disableEnableFlagFirst
    || !plan.rollbackPlan.removeOrDisableVerifierRoute
    || !plan.rollbackPlan.leaveSchedulerAuthorizationUntouched
    || !plan.rollbackPlan.leaveExistingRuntimeDatabaseCredentialUntouched
    || !plan.rollbackPlan.revokeOrRotateDedicatedVerifierSecretIfProvisioned
    || !plan.rollbackPlan.noLedgerRollbackRequiredIfNoAcceptedNativeReadOccurred
  ) {
    blockers.push('rollback-plan-incomplete');
  }

  if (
    !plan.authorizationRecords.provisioning.slotDefined
    || plan.authorizationRecords.provisioning.granted !== false
    || plan.authorizationRecords.provisioning.recordId !== null
    || !plan.authorizationRecords.productionDeployment.slotDefined
    || plan.authorizationRecords.productionDeployment.granted !== false
    || plan.authorizationRecords.productionDeployment.recordId !== null
    || !plan.authorizationRecords.activation.slotDefined
    || plan.authorizationRecords.activation.granted !== false
    || plan.authorizationRecords.activation.recordId !== null
    || !plan.authorizationRecords.ledgerAdvance.slotDefined
    || plan.authorizationRecords.ledgerAdvance.granted !== false
    || plan.authorizationRecords.ledgerAdvance.recordId !== null
  ) {
    blockers.push('authorization-record-slots-invalid');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const planComplete = uniqueBlockers.length === 0;
  const state = planComplete
    ? 'provisioning-plan-ready' as const
    : 'provisioning-plan-invalid' as const;

  const payload = {
    contractVersion: FANDEX_MOMENTUM_VERIFIER_PROVISIONING_PLAN_VERSION,
    state,
    planComplete,
    readyForSeparateProvisioningAuthorization: planComplete,
    provisioningAuthorized: false as const,
    activationAuthorized: false as const,
    blockers: uniqueBlockers,
    plan,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      environmentReads: 0 as const,
      environmentMutations: 0 as const,
      secretReads: 0 as const,
      secretWrites: 0 as const,
      productionDeployments: 0 as const,
      channelActivations: 0 as const,
      nativeVerifierExecutions: 0 as const,
      databaseWrites: 0 as const,
      productWrites: 0 as const,
      registryMutations: 0 as const,
      historyWrites: 0 as const,
      watermarkWrites: 0 as const,
      manifestWrites: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
