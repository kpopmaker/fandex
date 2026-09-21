import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_VERSION =
  'v166_fandex_momentum_verifier_configuration_mutation_authorization_record_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_VERSION,
    lifecycle: 'research' as const,
    upstreamProvisioningPlanContract:
      'v165_fandex_momentum_verifier_provisioning_authorization_plan_research_v1' as const,
    authorizationRecordOnly: true as const,
    genericContinuationCountsAsAuthorization: false as const,
    environmentMutationPerformed: false as const,
    secretMutationPerformed: false as const,
    productionDeploymentPerformed: false as const,
    verifierActivationPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
    productMutationPerformed: false as const,
    productionDeploymentAuthorizationSeparate: true as const,
    verifierActivationAuthorizationSeparate: true as const,
    ledgerAdvanceAuthorizationSeparate: true as const,
  });

export const FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_STATEMENT =
  'AUTHORIZE_FANDEX_V166_PRODUCTION_VERIFIER_CONFIGURATION_MUTATION' as const;

export type FandexMomentumVerifierConfigurationMutationAuthorizationRecord =
  Readonly<{
    contractVersion:
      'v166_fandex_momentum_verifier_configuration_mutation_authorization_record_v1';
    authorizationId: string;
    authorizationStatement:
      typeof FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_STATEMENT;
    authority: 'explicit-user-authorization';
    authorizedAt: string;
    validFrom: string;
    expiresAt: string;
    revokedAt: null | string;
    target: Readonly<{
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      projectName: 'fandex';
      environment: 'production';
      intendedDeploymentCommit: '7a1038226b07abf4a130986766ef114a43c1d638';
      routePath: '/api/internal/naver-news/momentum-verifier';
    }>;
    authorizedConfiguration: readonly [
      Readonly<{
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED';
        exactValue: 'approved-v162-research-read-only';
        target: 'production';
      }>,
      Readonly<{
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT';
        exactValue: 'production';
        target: 'production';
      }>,
      Readonly<{
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
        exactValue: null;
        target: 'production';
        dedicatedSecretOnly: true;
        secretValueMayBeRecordedHere: false;
        mustDifferFromSchedulerCredential: true;
      }>,
    ];
    forbiddenMutationScope: Readonly<{
      runtimeDatabaseCredentialMutation: true;
      schedulerCredentialMutation: true;
      previewCredentialCopy: true;
      productRegistryMutation: true;
      productActivation: true;
      researchLedgerAdvance: true;
    }>;
    rollbackAcknowledgement: Readonly<{
      disableVerifierEnableFlag: true;
      removeOrDisableVerifierRoute: true;
      removeVerifierDeploymentSelectorIfProvisioned: true;
      revokeOrRotateDedicatedVerifierSecretIfProvisioned: true;
      noLedgerRollbackRequiredBeforeFirstAcceptedNativeRead: true;
    }>;
    downstreamAuthorizations: Readonly<{
      productionDeployment: 'not-authorized-by-this-record';
      verifierActivation: 'not-authorized-by-this-record';
      ledgerAdvance: 'not-authorized-by-this-record';
    }>;
  }>;

export type FandexMomentumVerifierConfigurationMutationAuthorizationInput =
  Readonly<{
    evaluatedAt: string;
    requestIntent:
      | 'generic-continuation'
      | 'research-authorization-record-evaluation'
      | 'explicit-configuration-mutation-authorization';
    upstreamV165Digest: string;
    upstreamV165State: 'provisioning-plan-ready' | 'provisioning-plan-blocked';
    record: FandexMomentumVerifierConfigurationMutationAuthorizationRecord | null;
  }>;

export type FandexMomentumVerifierConfigurationMutationAuthorizationResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_VERSION;
    state:
      | 'authorization-pending'
      | 'authorization-record-rejected'
      | 'configuration-mutation-authorized';
    configurationMutationAuthorized: boolean;
    productionDeploymentAuthorized: false;
    verifierActivationAuthorized: false;
    ledgerAdvanceAuthorized: false;
    blockers: readonly string[];
    evaluatedAt: string;
    recordDigest: string | null;
    record: FandexMomentumVerifierConfigurationMutationAuthorizationRecord | null;
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

function validTarget(
  target: FandexMomentumVerifierConfigurationMutationAuthorizationRecord['target'],
): boolean {
  return (
    target.teamId === 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    && target.projectId === 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    && target.projectName === 'fandex'
    && target.environment === 'production'
    && target.intendedDeploymentCommit
      === '7a1038226b07abf4a130986766ef114a43c1d638'
    && target.routePath === '/api/internal/naver-news/momentum-verifier'
  );
}

function validConfiguration(
  rows: FandexMomentumVerifierConfigurationMutationAuthorizationRecord['authorizedConfiguration'],
): boolean {
  return (
    rows.length === 3
    && rows[0]?.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
    && rows[0]?.exactValue === 'approved-v162-research-read-only'
    && rows[0]?.target === 'production'
    && rows[1]?.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
    && rows[1]?.exactValue === 'production'
    && rows[1]?.target === 'production'
    && rows[2]?.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
    && rows[2]?.exactValue === null
    && rows[2]?.target === 'production'
    && rows[2]?.dedicatedSecretOnly === true
    && rows[2]?.secretValueMayBeRecordedHere === false
    && rows[2]?.mustDifferFromSchedulerCredential === true
  );
}

export function evaluateFandexMomentumVerifierConfigurationMutationAuthorization(
  input: FandexMomentumVerifierConfigurationMutationAuthorizationInput,
): FandexMomentumVerifierConfigurationMutationAuthorizationResult {
  const blockers: string[] = [];

  if (!exactIso(input.evaluatedAt)) {
    blockers.push('evaluation-time-invalid');
  }
  if (!/^[0-9a-f]{64}$/.test(input.upstreamV165Digest)) {
    blockers.push('upstream-v165-digest-invalid');
  }
  if (input.upstreamV165State !== 'provisioning-plan-ready') {
    blockers.push('upstream-v165-plan-not-ready');
  }

  if (input.record === null) {
    blockers.push('explicit-configuration-mutation-authorization-record-missing');
    if (input.requestIntent === 'generic-continuation') {
      blockers.push('generic-continuation-is-not-authorization');
    }

    const pendingPayload = {
      contractVersion:
        FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_VERSION,
      state: 'authorization-pending' as const,
      configurationMutationAuthorized: false,
      productionDeploymentAuthorized: false as const,
      verifierActivationAuthorized: false as const,
      ledgerAdvanceAuthorized: false as const,
      blockers: Object.freeze([...new Set(blockers)]),
      evaluatedAt: input.evaluatedAt,
      recordDigest: null,
      record: null,
    };

    return Object.freeze({
      ...pendingPayload,
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
        productMetricWrites: 0 as const,
        registryMutations: 0 as const,
        historyWrites: 0 as const,
        watermarkWrites: 0 as const,
        manifestWrites: 0 as const,
      }),
      digest: sha256Canonical(pendingPayload),
    });
  }

  const record = input.record;
  if (
    record.contractVersion
      !== 'v166_fandex_momentum_verifier_configuration_mutation_authorization_record_v1'
  ) {
    blockers.push('authorization-record-contract-mismatch');
  }
  if (!/^[0-9a-f]{64}$/.test(record.authorizationId)) {
    blockers.push('authorization-record-id-invalid');
  }
  if (
    record.authorizationStatement
      !== FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_STATEMENT
  ) {
    blockers.push('authorization-statement-not-explicit');
  }
  if (record.authority !== 'explicit-user-authorization') {
    blockers.push('authorization-authority-invalid');
  }
  if (
    !exactIso(record.authorizedAt)
    || !exactIso(record.validFrom)
    || !exactIso(record.expiresAt)
  ) {
    blockers.push('authorization-time-boundary-invalid');
  } else {
    const evaluated = Date.parse(input.evaluatedAt);
    const validFrom = Date.parse(record.validFrom);
    const expiresAt = Date.parse(record.expiresAt);
    const authorizedAt = Date.parse(record.authorizedAt);
    if (
      authorizedAt > validFrom
      || validFrom >= expiresAt
      || evaluated < validFrom
      || evaluated >= expiresAt
    ) {
      blockers.push('authorization-record-outside-validity-window');
    }
  }
  if (record.revokedAt !== null) {
    if (!exactIso(record.revokedAt)) {
      blockers.push('authorization-revocation-time-invalid');
    } else if (Date.parse(record.revokedAt) <= Date.parse(input.evaluatedAt)) {
      blockers.push('authorization-record-revoked');
    }
  }
  if (!validTarget(record.target)) {
    blockers.push('authorization-target-mismatch');
  }
  if (!validConfiguration(record.authorizedConfiguration)) {
    blockers.push('authorization-configuration-scope-mismatch');
  }
  if (
    !record.forbiddenMutationScope.runtimeDatabaseCredentialMutation
    || !record.forbiddenMutationScope.schedulerCredentialMutation
    || !record.forbiddenMutationScope.previewCredentialCopy
    || !record.forbiddenMutationScope.productRegistryMutation
    || !record.forbiddenMutationScope.productActivation
    || !record.forbiddenMutationScope.researchLedgerAdvance
  ) {
    blockers.push('authorization-forbidden-scope-incomplete');
  }
  if (
    !record.rollbackAcknowledgement.disableVerifierEnableFlag
    || !record.rollbackAcknowledgement.removeOrDisableVerifierRoute
    || !record.rollbackAcknowledgement.removeVerifierDeploymentSelectorIfProvisioned
    || !record.rollbackAcknowledgement.revokeOrRotateDedicatedVerifierSecretIfProvisioned
    || !record.rollbackAcknowledgement.noLedgerRollbackRequiredBeforeFirstAcceptedNativeRead
  ) {
    blockers.push('authorization-rollback-acknowledgement-incomplete');
  }
  if (
    record.downstreamAuthorizations.productionDeployment
      !== 'not-authorized-by-this-record'
    || record.downstreamAuthorizations.verifierActivation
      !== 'not-authorized-by-this-record'
    || record.downstreamAuthorizations.ledgerAdvance
      !== 'not-authorized-by-this-record'
  ) {
    blockers.push('authorization-downstream-boundary-invalid');
  }
  if (input.requestIntent !== 'explicit-configuration-mutation-authorization') {
    blockers.push('request-intent-not-explicit-configuration-authorization');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const configurationMutationAuthorized = uniqueBlockers.length === 0;
  const state = configurationMutationAuthorized
    ? 'configuration-mutation-authorized' as const
    : 'authorization-record-rejected' as const;
  const recordDigest = sha256Canonical(record);
  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_AUTHORIZATION_VERSION,
    state,
    configurationMutationAuthorized,
    productionDeploymentAuthorized: false as const,
    verifierActivationAuthorized: false as const,
    ledgerAdvanceAuthorized: false as const,
    blockers: uniqueBlockers,
    evaluatedAt: input.evaluatedAt,
    recordDigest,
    record,
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
      productMetricWrites: 0 as const,
      registryMutations: 0 as const,
      historyWrites: 0 as const,
      watermarkWrites: 0 as const,
      manifestWrites: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
