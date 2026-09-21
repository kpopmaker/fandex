import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_VERSION =
  'v165_fandex_momentum_verifier_provisioning_authorization_plan_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_VERSION,
    lifecycle: 'research' as const,
    planOnly: true as const,
    environmentMutationPerformed: false as const,
    secretGeneratedOrRotated: false as const,
    secretValueExposureAllowed: false as const,
    productionDeploymentPerformed: false as const,
    verifierActivationPerformed: false as const,
    ledgerAdvancePerformed: false as const,
    productMutationPerformed: false as const,
    configurationMutationAuthorizationSeparate: true as const,
    productionDeploymentAuthorizationSeparate: true as const,
    verifierActivationAuthorizationSeparate: true as const,
    ledgerAdvanceAuthorizationSeparate: true as const,
  });

export type FandexMomentumVerifierProvisioningAuthorizationPlanInput =
  Readonly<{
    upstreamV164State:
      | 'configuration-evidence-blocked'
      | 'configuration-evidence-ready';
    upstreamV164Digest: string;
    teamId: string;
    projectId: string;
    projectName: 'fandex';
    environment: 'production';
    intendedDeploymentCommit: string;
    intendedPreviewDeploymentId: string;
    intendedPreviewDeploymentReady: boolean;
    freshSourceThroughSlotStart: string;
    freshSourceAlreadyAdvanced: boolean;
  }>;

export type FandexMomentumVerifierProvisioningAuthorizationPlanResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_VERSION;
    state: 'provisioning-plan-ready' | 'provisioning-plan-blocked';
    planReadyForSeparateAuthorization: boolean;
    target: Readonly<{
      teamId: string;
      projectId: string;
      projectName: 'fandex';
      environment: 'production';
      intendedDeploymentCommit: string;
      intendedPreviewDeploymentId: string;
      routePath: '/api/internal/naver-news/momentum-verifier';
    }>;
    configurationPlan: readonly Readonly<{
      key:
        | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
        | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
        | 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
      productionTargetOnly: true;
      kind: 'exact-non-secret-value' | 'dedicated-secret';
      exactValue: 'approved-v162-research-read-only' | 'production' | null;
      mutationAuthorized: false;
    }>[];
    dedicatedSecretRequirements: Readonly<{
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
      schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET';
      generatedByThisPlan: false;
      valueExposedByThisPlan: false;
      minimumUtf8Bytes: 24;
      maximumUtf8Bytes: 512;
      whitespaceOrControlCharactersForbidden: true;
      exactValueMustDifferFromSchedulerCredential: true;
      separationProofMustNotRevealEitherSecret: true;
      acceptableSeparationProof:
        'trusted-environment-non-equality-attestation-without-secret-output';
    }>;
    runtimeDatabaseBoundary: Readonly<{
      key: 'FANDEX_RUNTIME_DATABASE_URL';
      provisionedByThisPlan: false;
      productionScopeMustRemainExisting: true;
      previewCopyForbidden: true;
      credentialValueExposureForbidden: true;
    }>;
    authorizationSlots: Readonly<{
      configurationMutation: 'required-ungranted';
      productionDeployment: 'required-ungranted';
      verifierActivation: 'required-ungranted';
      ledgerAdvance: 'required-ungranted';
    }>;
    executionSequence: readonly Readonly<{
      order: number;
      stage:
        | 'authorize-configuration-mutation'
        | 'provision-verifier-configuration'
        | 'verify-v164-configuration-evidence'
        | 'reevaluate-v163-activation-readiness'
        | 'authorize-production-deployment'
        | 'deploy-intended-verifier-commit'
        | 'authorize-verifier-activation'
        | 'execute-first-v162-native-read'
        | 'accept-first-native-read'
        | 'authorize-ledger-advance';
      requirement: string;
      mutating: boolean;
      allowedNow: boolean;
    }>[];
    firstNativeReadAcceptance: Readonly<{
      contractVersion:
        'v162_naver_news_momentum_native_verifier_execution_channel_v1';
      canonicalArtistId: 'iu';
      throughSlotStart: string;
      stateMustBe: 'executed';
      databaseReadOnlyMustBe: true;
      databaseWritesObservedMustBe: 0;
      v160StateMustBe: 'attestation-adapted';
      verifierOutputAcceptedMustBe: true;
      v159StateMustBe: 'attested-provenance-ready';
      v159ProvenanceStateMustBe: 'stored-evidence-read-reproduced';
      v159FutureLiveRefreshEligibleMustBe: true;
      rawPayloadResponseForbidden: true;
      normalizedPayloadResponseForbidden: true;
      credentialOrSecretResponseForbidden: true;
      sourceBoundaryMustMatchRequestExactly: true;
    }>;
    ledgerGate: Readonly<{
      freshSourceThroughSlotStart: string;
      advancementBeforeAcceptedNativeReadForbidden: true;
      currentlyAdvanced: boolean;
      ledgerAdvanceAuthorized: false;
    }>;
    rollbackPlan: Readonly<{
      beforeFirstSuccessfulExecution: readonly [
        'disable-or-remove-verifier-enable-flag',
        'remove-or-disable-verifier-route',
        'remove-verifier-specific-deployment-selector-if-provisioned',
        'remove-or-rotate-dedicated-verifier-secret-if-provisioned',
        'no-research-ledger-rollback-required',
      ];
      afterFirstSuccessfulExecutionRequiresSeparatePlan: true;
    }>;
    blockers: readonly string[];
    effects: Readonly<{
      environmentReads: 0;
      environmentMutations: 0;
      secretReads: 0;
      secretWrites: 0;
      secretRotations: 0;
      productionDeployments: 0;
      verifierActivations: 0;
      databaseWrites: 0;
      productMetricWrites: 0;
      registryMutations: 0;
      historyWrites: 0;
      watermarkWrites: 0;
      manifestWrites: 0;
    }>;
    digest: string;
  }>;

function exactIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function buildFandexMomentumVerifierProvisioningAuthorizationPlan(
  input: FandexMomentumVerifierProvisioningAuthorizationPlanInput,
): FandexMomentumVerifierProvisioningAuthorizationPlanResult {
  const blockers: string[] = [];

  if (!/^team_[A-Za-z0-9]+$/.test(input.teamId)) {
    blockers.push('target-team-invalid');
  }
  if (!/^prj_[A-Za-z0-9]+$/.test(input.projectId)) {
    blockers.push('target-project-invalid');
  }
  if (!/^[0-9a-f]{40}$/.test(input.intendedDeploymentCommit)) {
    blockers.push('intended-deployment-commit-invalid');
  }
  if (!/^dpl_[A-Za-z0-9]+$/.test(input.intendedPreviewDeploymentId)) {
    blockers.push('intended-preview-deployment-id-invalid');
  }
  if (!input.intendedPreviewDeploymentReady) {
    blockers.push('intended-preview-deployment-not-ready');
  }
  if (!/^[0-9a-f]{64}$/.test(input.upstreamV164Digest)) {
    blockers.push('upstream-v164-digest-invalid');
  }
  if (!exactIso(input.freshSourceThroughSlotStart)) {
    blockers.push('fresh-source-through-slot-invalid');
  }
  if (input.freshSourceAlreadyAdvanced) {
    blockers.push('fresh-source-already-advanced-before-native-read');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const planReadyForSeparateAuthorization = uniqueBlockers.length === 0;
  const state = planReadyForSeparateAuthorization
    ? 'provisioning-plan-ready' as const
    : 'provisioning-plan-blocked' as const;

  const target = Object.freeze({
    teamId: input.teamId,
    projectId: input.projectId,
    projectName: input.projectName,
    environment: input.environment,
    intendedDeploymentCommit: input.intendedDeploymentCommit,
    intendedPreviewDeploymentId: input.intendedPreviewDeploymentId,
    routePath: '/api/internal/naver-news/momentum-verifier' as const,
  });

  const configurationPlan = Object.freeze([
    Object.freeze({
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED' as const,
      productionTargetOnly: true as const,
      kind: 'exact-non-secret-value' as const,
      exactValue: 'approved-v162-research-read-only' as const,
      mutationAuthorized: false as const,
    }),
    Object.freeze({
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT' as const,
      productionTargetOnly: true as const,
      kind: 'exact-non-secret-value' as const,
      exactValue: 'production' as const,
      mutationAuthorized: false as const,
    }),
    Object.freeze({
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET' as const,
      productionTargetOnly: true as const,
      kind: 'dedicated-secret' as const,
      exactValue: null,
      mutationAuthorized: false as const,
    }),
  ]);

  const dedicatedSecretRequirements = Object.freeze({
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET' as const,
    schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET' as const,
    generatedByThisPlan: false as const,
    valueExposedByThisPlan: false as const,
    minimumUtf8Bytes: 24 as const,
    maximumUtf8Bytes: 512 as const,
    whitespaceOrControlCharactersForbidden: true as const,
    exactValueMustDifferFromSchedulerCredential: true as const,
    separationProofMustNotRevealEitherSecret: true as const,
    acceptableSeparationProof:
      'trusted-environment-non-equality-attestation-without-secret-output' as const,
  });

  const runtimeDatabaseBoundary = Object.freeze({
    key: 'FANDEX_RUNTIME_DATABASE_URL' as const,
    provisionedByThisPlan: false as const,
    productionScopeMustRemainExisting: true as const,
    previewCopyForbidden: true as const,
    credentialValueExposureForbidden: true as const,
  });

  const authorizationSlots = Object.freeze({
    configurationMutation: 'required-ungranted' as const,
    productionDeployment: 'required-ungranted' as const,
    verifierActivation: 'required-ungranted' as const,
    ledgerAdvance: 'required-ungranted' as const,
  });

  const executionSequence = Object.freeze([
    Object.freeze({
      order: 1,
      stage: 'authorize-configuration-mutation' as const,
      requirement:
        'explicit authorization record for Production verifier configuration mutation',
      mutating: false,
      allowedNow: true,
    }),
    Object.freeze({
      order: 2,
      stage: 'provision-verifier-configuration' as const,
      requirement:
        'only after configuration-mutation authorization; provision exactly three verifier-specific Production settings',
      mutating: true,
      allowedNow: false,
    }),
    Object.freeze({
      order: 3,
      stage: 'verify-v164-configuration-evidence' as const,
      requirement:
        'v164 must return configuration-evidence-ready with zero blockers and without secret-value exposure',
      mutating: false,
      allowedNow: false,
    }),
    Object.freeze({
      order: 4,
      stage: 'reevaluate-v163-activation-readiness' as const,
      requirement:
        'v163 must return activation-readiness-pass while activationAuthorized remains false',
      mutating: false,
      allowedNow: false,
    }),
    Object.freeze({
      order: 5,
      stage: 'authorize-production-deployment' as const,
      requirement:
        'separate explicit authorization for Production deployment of the intended verifier commit',
      mutating: false,
      allowedNow: false,
    }),
    Object.freeze({
      order: 6,
      stage: 'deploy-intended-verifier-commit' as const,
      requirement:
        'deploy the exact reviewed verifier commit to Production only after deployment authorization',
      mutating: true,
      allowedNow: false,
    }),
    Object.freeze({
      order: 7,
      stage: 'authorize-verifier-activation' as const,
      requirement:
        'separate explicit activation authorization record after configuration/readiness/deployment verification',
      mutating: false,
      allowedNow: false,
    }),
    Object.freeze({
      order: 8,
      stage: 'execute-first-v162-native-read' as const,
      requirement:
        'one bounded read-only request for IU at the frozen fresh source boundary',
      mutating: false,
      allowedNow: false,
    }),
    Object.freeze({
      order: 9,
      stage: 'accept-first-native-read' as const,
      requirement:
        'accept only exact v162/v160/v159 result satisfying all first-read criteria',
      mutating: false,
      allowedNow: false,
    }),
    Object.freeze({
      order: 10,
      stage: 'authorize-ledger-advance' as const,
      requirement:
        'separate authorization only after accepted native read; no ledger advancement is implied by read success',
      mutating: false,
      allowedNow: false,
    }),
  ]);

  const firstNativeReadAcceptance = Object.freeze({
    contractVersion:
      'v162_naver_news_momentum_native_verifier_execution_channel_v1' as const,
    canonicalArtistId: 'iu' as const,
    throughSlotStart: input.freshSourceThroughSlotStart,
    stateMustBe: 'executed' as const,
    databaseReadOnlyMustBe: true as const,
    databaseWritesObservedMustBe: 0 as const,
    v160StateMustBe: 'attestation-adapted' as const,
    verifierOutputAcceptedMustBe: true as const,
    v159StateMustBe: 'attested-provenance-ready' as const,
    v159ProvenanceStateMustBe: 'stored-evidence-read-reproduced' as const,
    v159FutureLiveRefreshEligibleMustBe: true as const,
    rawPayloadResponseForbidden: true as const,
    normalizedPayloadResponseForbidden: true as const,
    credentialOrSecretResponseForbidden: true as const,
    sourceBoundaryMustMatchRequestExactly: true as const,
  });

  const ledgerGate = Object.freeze({
    freshSourceThroughSlotStart: input.freshSourceThroughSlotStart,
    advancementBeforeAcceptedNativeReadForbidden: true as const,
    currentlyAdvanced: input.freshSourceAlreadyAdvanced,
    ledgerAdvanceAuthorized: false as const,
  });

  const rollbackPlan = Object.freeze({
    beforeFirstSuccessfulExecution: Object.freeze([
      'disable-or-remove-verifier-enable-flag',
      'remove-or-disable-verifier-route',
      'remove-verifier-specific-deployment-selector-if-provisioned',
      'remove-or-rotate-dedicated-verifier-secret-if-provisioned',
      'no-research-ledger-rollback-required',
    ] as const),
    afterFirstSuccessfulExecutionRequiresSeparatePlan: true as const,
  });

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_PLAN_VERSION,
    state,
    planReadyForSeparateAuthorization,
    upstreamV164State: input.upstreamV164State,
    upstreamV164Digest: input.upstreamV164Digest,
    target,
    configurationPlan,
    dedicatedSecretRequirements,
    runtimeDatabaseBoundary,
    authorizationSlots,
    executionSequence,
    firstNativeReadAcceptance,
    ledgerGate,
    rollbackPlan,
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      environmentReads: 0 as const,
      environmentMutations: 0 as const,
      secretReads: 0 as const,
      secretWrites: 0 as const,
      secretRotations: 0 as const,
      productionDeployments: 0 as const,
      verifierActivations: 0 as const,
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
