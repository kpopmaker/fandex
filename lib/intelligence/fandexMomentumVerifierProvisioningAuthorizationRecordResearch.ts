import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_VERSION =
  'v166_fandex_momentum_verifier_provisioning_authorization_record_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_VERSION,
    lifecycle: 'research' as const,
    authorizationRecordOnly: true as const,
    autoApprovalAllowed: false as const,
    environmentMutationPerformed: false as const,
    secretGenerationPerformed: false as const,
    secretValueExposureAllowed: false as const,
    productionDeploymentAuthorizedByThisRecord: false as const,
    verifierActivationAuthorizedByThisRecord: false as const,
    ledgerAdvanceAuthorizedByThisRecord: false as const,
    productMutationAuthorizedByThisRecord: false as const,
    registryMutationAuthorizedByThisRecord: false as const,
  });

export type FandexMomentumVerifierProvisioningAuthorizationDecision =
  | Readonly<{
      state: 'pending';
      decidedAt: null;
      decidedBy: null;
      expiresAt: null;
      reason: null;
    }>
  | Readonly<{
      state: 'approved';
      decidedAt: string;
      decidedBy: string;
      expiresAt: string;
      reason: string | null;
    }>
  | Readonly<{
      state: 'rejected';
      decidedAt: string;
      decidedBy: string;
      expiresAt: null;
      reason: string;
    }>;

export type FandexMomentumVerifierProvisioningAuthorizationRecord =
  Readonly<{
    upstreamV165PlanDigest: string;
    target: Readonly<{
      teamId: string;
      projectId: string;
      projectName: 'fandex';
      environment: 'production';
    }>;
    authorizedChanges: readonly [
      Readonly<{
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED';
        operation: 'set-exact-non-secret-value';
        exactValue: 'approved-v162-research-read-only';
        productionOnly: true;
      }>,
      Readonly<{
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT';
        operation: 'set-exact-non-secret-value';
        exactValue: 'production';
        productionOnly: true;
      }>,
      Readonly<{
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
        operation: 'create-or-set-dedicated-secret-without-output';
        exactValue: null;
        productionOnly: true;
      }>,
    ];
    dedicatedSecretPolicy: Readonly<{
      schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET';
      minimumUtf8Bytes: 24;
      maximumUtf8Bytes: 512;
      whitespaceOrControlCharactersForbidden: true;
      mustDifferFromSchedulerCredential: true;
      nonEqualityProofRequiredWithoutSecretOutput: true;
      secretValueExposureAuthorized: false;
    }>;
    exclusions: Readonly<{
      runtimeDatabaseMutationAuthorized: false;
      schedulerConfigurationMutationAuthorized: false;
      productMutationAuthorized: false;
      registryMutationAuthorized: false;
      productionDeploymentAuthorized: false;
      verifierActivationAuthorized: false;
      nativeVerifierExecutionAuthorized: false;
      ledgerAdvanceAuthorized: false;
    }>;
    decision: FandexMomentumVerifierProvisioningAuthorizationDecision;
  }>;

export type FandexMomentumVerifierProvisioningAuthorizationEvaluation =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_VERSION;
    state:
      | 'authorization-pending'
      | 'authorization-effective'
      | 'authorization-rejected'
      | 'authorization-expired'
      | 'authorization-invalid';
    authorizationEffective: boolean;
    configurationMutationAuthorized: boolean;
    productionDeploymentAuthorized: false;
    verifierActivationAuthorized: false;
    nativeVerifierExecutionAuthorized: false;
    ledgerAdvanceAuthorized: false;
    productMutationAuthorized: false;
    registryMutationAuthorized: false;
    scopeDigest: string;
    blockers: readonly string[];
    record: FandexMomentumVerifierProvisioningAuthorizationRecord;
    evaluationAt: string;
    effects: Readonly<{
      environmentReads: 0;
      environmentMutations: 0;
      secretReads: 0;
      secretWrites: 0;
      secretRotations: 0;
      productionDeployments: 0;
      verifierActivations: 0;
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

function nonEmptyIdentity(value: string): boolean {
  return value.trim().length > 0 && value.length <= 256;
}

function scopePayload(
  record: FandexMomentumVerifierProvisioningAuthorizationRecord,
) {
  return {
    upstreamV165PlanDigest: record.upstreamV165PlanDigest,
    target: record.target,
    authorizedChanges: record.authorizedChanges,
    dedicatedSecretPolicy: record.dedicatedSecretPolicy,
    exclusions: record.exclusions,
  };
}

export function evaluateFandexMomentumVerifierProvisioningAuthorizationRecord(
  input: Readonly<{
    record: FandexMomentumVerifierProvisioningAuthorizationRecord;
    expectedV165PlanDigest: string;
    evaluationAt: string;
  }>,
): FandexMomentumVerifierProvisioningAuthorizationEvaluation {
  const { record } = input;
  const blockers: string[] = [];

  if (!exactIso(input.evaluationAt)) {
    blockers.push('authorization-evaluation-time-invalid');
  }
  if (!/^[0-9a-f]{64}$/.test(input.expectedV165PlanDigest)) {
    blockers.push('authorization-expected-v165-plan-digest-invalid');
  }
  if (!/^[0-9a-f]{64}$/.test(record.upstreamV165PlanDigest)) {
    blockers.push('authorization-v165-plan-digest-invalid');
  } else if (record.upstreamV165PlanDigest !== input.expectedV165PlanDigest) {
    blockers.push('authorization-v165-plan-digest-mismatch');
  }
  if (!/^team_[A-Za-z0-9]+$/.test(record.target.teamId)) {
    blockers.push('authorization-target-team-invalid');
  }
  if (!/^prj_[A-Za-z0-9]+$/.test(record.target.projectId)) {
    blockers.push('authorization-target-project-invalid');
  }

  const [enable, deployment, secret] = record.authorizedChanges;
  if (
    enable.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
    || enable.operation !== 'set-exact-non-secret-value'
    || enable.exactValue !== 'approved-v162-research-read-only'
    || enable.productionOnly !== true
  ) {
    blockers.push('authorization-enable-change-scope-invalid');
  }
  if (
    deployment.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
    || deployment.operation !== 'set-exact-non-secret-value'
    || deployment.exactValue !== 'production'
    || deployment.productionOnly !== true
  ) {
    blockers.push('authorization-deployment-selector-scope-invalid');
  }
  if (
    secret.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
    || secret.operation !== 'create-or-set-dedicated-secret-without-output'
    || secret.exactValue !== null
    || secret.productionOnly !== true
  ) {
    blockers.push('authorization-dedicated-secret-scope-invalid');
  }

  const secretPolicy = record.dedicatedSecretPolicy;
  if (
    secretPolicy.schedulerCredentialKey !== 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET'
    || secretPolicy.minimumUtf8Bytes !== 24
    || secretPolicy.maximumUtf8Bytes !== 512
    || secretPolicy.whitespaceOrControlCharactersForbidden !== true
    || secretPolicy.mustDifferFromSchedulerCredential !== true
    || secretPolicy.nonEqualityProofRequiredWithoutSecretOutput !== true
    || secretPolicy.secretValueExposureAuthorized !== false
  ) {
    blockers.push('authorization-dedicated-secret-policy-invalid');
  }

  if (
    record.exclusions.runtimeDatabaseMutationAuthorized !== false
    || record.exclusions.schedulerConfigurationMutationAuthorized !== false
    || record.exclusions.productMutationAuthorized !== false
    || record.exclusions.registryMutationAuthorized !== false
    || record.exclusions.productionDeploymentAuthorized !== false
    || record.exclusions.verifierActivationAuthorized !== false
    || record.exclusions.nativeVerifierExecutionAuthorized !== false
    || record.exclusions.ledgerAdvanceAuthorized !== false
  ) {
    blockers.push('authorization-exclusion-boundary-invalid');
  }

  const decision = record.decision;
  if (decision.state === 'pending') {
    if (
      decision.decidedAt !== null
      || decision.decidedBy !== null
      || decision.expiresAt !== null
      || decision.reason !== null
    ) {
      blockers.push('authorization-pending-decision-invalid');
    }
  } else if (decision.state === 'approved') {
    if (
      !exactIso(decision.decidedAt)
      || !exactIso(decision.expiresAt)
      || !nonEmptyIdentity(decision.decidedBy)
      || Date.parse(decision.expiresAt) <= Date.parse(decision.decidedAt)
    ) {
      blockers.push('authorization-approved-decision-invalid');
    }
  } else {
    if (
      !exactIso(decision.decidedAt)
      || !nonEmptyIdentity(decision.decidedBy)
      || decision.expiresAt !== null
      || decision.reason.trim().length === 0
    ) {
      blockers.push('authorization-rejected-decision-invalid');
    }
  }

  const scopeDigest = sha256Canonical(scopePayload(record));
  const uniqueBlockers = Object.freeze([...new Set(blockers)]);

  let state:
    | 'authorization-pending'
    | 'authorization-effective'
    | 'authorization-rejected'
    | 'authorization-expired'
    | 'authorization-invalid';
  let authorizationEffective = false;

  if (uniqueBlockers.length > 0) {
    state = 'authorization-invalid';
  } else if (decision.state === 'pending') {
    state = 'authorization-pending';
  } else if (decision.state === 'rejected') {
    state = 'authorization-rejected';
  } else if (Date.parse(input.evaluationAt) >= Date.parse(decision.expiresAt)) {
    state = 'authorization-expired';
  } else {
    state = 'authorization-effective';
    authorizationEffective = true;
  }

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_PROVISIONING_AUTHORIZATION_RECORD_VERSION,
    state,
    authorizationEffective,
    configurationMutationAuthorized: authorizationEffective,
    productionDeploymentAuthorized: false as const,
    verifierActivationAuthorized: false as const,
    nativeVerifierExecutionAuthorized: false as const,
    ledgerAdvanceAuthorized: false as const,
    productMutationAuthorized: false as const,
    registryMutationAuthorized: false as const,
    scopeDigest,
    blockers: uniqueBlockers,
    record,
    expectedV165PlanDigest: input.expectedV165PlanDigest,
    evaluationAt: input.evaluationAt,
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
