import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_VERSION =
  'v163_fandex_momentum_verifier_channel_activation_readiness_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_VERSION,
    lifecycle: 'research' as const,
    upstreamChannelContract:
      'v162_naver_news_momentum_native_verifier_execution_channel_v1' as const,
    readinessOnly: true as const,
    productionDeploymentPerformed: false as const,
    environmentMutationPerformed: false as const,
    activationPerformed: false as const,
    ledgerAdvancePerformed: false as const,
    activationAuthorizationSeparateDecision: true as const,
    unknownConfigurationCountsAsReady: false as const,
    databaseWriteAllowed: false as const,
    productMetricWriteAllowed: false as const,
    registryMutationAllowed: false as const,
    productionActivationAllowed: false as const,
  });

export type FandexMomentumVerifierChannelActivationReadinessEvidence =
  Readonly<{
    intendedDeploymentCommit: string;
    routePath: '/api/internal/naver-news/momentum-verifier';
    routeExistsOnIntendedCommit: boolean;
    intendedCommitPreviewDeploymentReady: boolean;
    v162ValidationStatus: 'PASS' | 'FAIL' | 'UNKNOWN';
    dedicatedAuthorizationDistinctFromScheduler: boolean;
    productionRuntimeDatabaseAccessObservedIndependently: boolean;
    verifierEnableConfigurationExplicitlyAvailable: boolean;
    verifierDeploymentConfigurationExplicitlyAvailable: boolean;
    dedicatedVerifierSecretExplicitlyAvailable: boolean;
    previewCredentialInheritanceRequired: boolean;
    rawPayloadExposurePathAbsent: boolean;
    databaseWritePathAbsent: boolean;
    productRegistryActivationSideEffectsAbsent: boolean;
    rollbackDisablePlanExplicit: boolean;
    rollbackPlan: Readonly<{
      disableEnableFlag: boolean;
      removeOrDisableRoute: boolean;
      noLedgerRollbackRequiredBeforeFirstExecution: boolean;
    }>;
    activationAuthorizationGranted: boolean;
  }>;

export type FandexMomentumVerifierChannelActivationReadinessResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_VERSION;
    state: 'activation-readiness-blocked' | 'activation-readiness-pass';
    readyForSeparateActivationDecision: boolean;
    activationAuthorized: false;
    blockers: readonly string[];
    evidence: FandexMomentumVerifierChannelActivationReadinessEvidence;
    effects: Readonly<{
      productionDeployments: 0;
      environmentMutations: 0;
      activationWrites: 0;
      databaseWrites: 0;
      productMetricWrites: 0;
      registryMutations: 0;
      historyWrites: 0;
      watermarkWrites: 0;
      manifestWrites: 0;
    }>;
    digest: string;
  }>;

export function evaluateFandexMomentumVerifierChannelActivationReadiness(
  evidence: FandexMomentumVerifierChannelActivationReadinessEvidence,
): FandexMomentumVerifierChannelActivationReadinessResult {
  const blockers: string[] = [];

  if (!/^[0-9a-f]{40}$/.test(evidence.intendedDeploymentCommit)) {
    blockers.push('intended-deployment-commit-invalid');
  }
  if (!evidence.routeExistsOnIntendedCommit) {
    blockers.push('v162-route-missing-on-intended-commit');
  }
  if (!evidence.intendedCommitPreviewDeploymentReady) {
    blockers.push('intended-commit-deployment-not-proven-ready');
  }
  if (evidence.v162ValidationStatus !== 'PASS') {
    blockers.push('v162-validation-not-pass');
  }
  if (!evidence.dedicatedAuthorizationDistinctFromScheduler) {
    blockers.push('verifier-authorization-not-distinct');
  }
  if (!evidence.productionRuntimeDatabaseAccessObservedIndependently) {
    blockers.push('production-runtime-database-access-not-observed');
  }
  if (!evidence.verifierEnableConfigurationExplicitlyAvailable) {
    blockers.push('verifier-enable-configuration-unavailable');
  }
  if (!evidence.verifierDeploymentConfigurationExplicitlyAvailable) {
    blockers.push('verifier-deployment-configuration-unavailable');
  }
  if (!evidence.dedicatedVerifierSecretExplicitlyAvailable) {
    blockers.push('dedicated-verifier-secret-unavailable');
  }
  if (evidence.previewCredentialInheritanceRequired) {
    blockers.push('preview-credential-inheritance-required');
  }
  if (!evidence.rawPayloadExposurePathAbsent) {
    blockers.push('raw-payload-exposure-path-present');
  }
  if (!evidence.databaseWritePathAbsent) {
    blockers.push('database-write-path-present');
  }
  if (!evidence.productRegistryActivationSideEffectsAbsent) {
    blockers.push('product-registry-activation-side-effect-present');
  }
  if (
    !evidence.rollbackDisablePlanExplicit
    || !evidence.rollbackPlan.disableEnableFlag
    || !evidence.rollbackPlan.removeOrDisableRoute
    || !evidence.rollbackPlan.noLedgerRollbackRequiredBeforeFirstExecution
  ) {
    blockers.push('rollback-disable-plan-incomplete');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const readyForSeparateActivationDecision = uniqueBlockers.length === 0;
  const state = readyForSeparateActivationDecision
    ? 'activation-readiness-pass' as const
    : 'activation-readiness-blocked' as const;

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_CHANNEL_ACTIVATION_READINESS_VERSION,
    state,
    readyForSeparateActivationDecision,
    activationAuthorized: false as const,
    blockers: uniqueBlockers,
    evidence,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      productionDeployments: 0 as const,
      environmentMutations: 0 as const,
      activationWrites: 0 as const,
      databaseWrites: 0 as const,
      productMetricWrites: 0 as const,
      registryMutations: 0 as const,
      historyWrites: 0 as const,
      watermarkWrites: 0 as const,
      manifestWrites: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
