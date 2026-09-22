import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumVerifierConfigurationMutationAuthorizationResult,
} from './fandexMomentumVerifierConfigurationMutationAuthorizationResearch';

export const FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_VERSION =
  'v167_fandex_momentum_verifier_configuration_mutation_execution_guard_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_VERSION,
    lifecycle: 'research' as const,
    envelopePreparationOnly: true as const,
    vercelCallPerformed: false as const,
    environmentMutationPerformed: false as const,
    secretReadPerformed: false as const,
    secretWritePerformed: false as const,
    secretValueExposureAllowed: false as const,
    productionDeploymentPerformed: false as const,
    verifierActivationPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
    productMutationPerformed: false as const,
    registryMutationPerformed: false as const,
  });

export type FandexMomentumVerifierTrustedSecretHandleAttestation = Readonly<{
  handleId: string;
  key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
  target: 'production';
  valueExposed: false;
  secretContractSatisfied: boolean;
  minimumUtf8BytesSatisfied: boolean;
  maximumUtf8BytesSatisfied: boolean;
  whitespaceOrControlCharactersAbsent: boolean;
  differsFromSchedulerCredential: boolean;
  schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET';
  attestationMethod:
    'trusted-environment-non-equality-attestation-without-secret-output';
}>;

export type FandexMomentumVerifierConfigurationMutationEnvelope = Readonly<{
  target: Readonly<{
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
    projectName: 'fandex';
    environment: 'production';
  }>;
  upstreamV165PlanDigest:
    'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f';
  upstreamV166ResultDigest: string;
  authorizationRecordDigest: string;
  operations: readonly [
    Readonly<{
      order: 1;
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED';
      operation: 'set-exact-non-secret-value';
      exactValue: 'approved-v162-research-read-only';
      target: 'production';
    }>,
    Readonly<{
      order: 2;
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT';
      operation: 'set-exact-non-secret-value';
      exactValue: 'production';
      target: 'production';
    }>,
    Readonly<{
      order: 3;
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
      operation: 'set-from-trusted-secret-handle';
      exactValue: null;
      target: 'production';
      secretHandleId: string;
      secretValueIncluded: false;
    }>,
  ];
  excludedKeys: readonly [
    'FANDEX_RUNTIME_DATABASE_URL',
    'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
  ];
  downstreamAuthorizations: Readonly<{
    productionDeployment: false;
    verifierActivation: false;
    nativeVerifierExecution: false;
    ledgerAdvance: false;
  }>;
  rollbackRequiredBeforeFirstAcceptedNativeRead: true;
}>;

export type FandexMomentumVerifierConfigurationMutationExecutionGuardResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_VERSION;
    state: 'mutation-envelope-blocked' | 'mutation-envelope-ready';
    mutationEnvelopeReady: boolean;
    configurationMutationAuthorized: boolean;
    envelope: FandexMomentumVerifierConfigurationMutationEnvelope | null;
    blockers: readonly string[];
    effects: Readonly<{
      vercelCalls: 0;
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

function validDigest(value: string | null): value is string {
  return value !== null && /^[0-9a-f]{64}$/.test(value);
}

function validSecretHandle(
  attestation: FandexMomentumVerifierTrustedSecretHandleAttestation | null,
): attestation is FandexMomentumVerifierTrustedSecretHandleAttestation {
  return (
    attestation !== null
    && /^[A-Za-z0-9._:-]{8,256}$/.test(attestation.handleId)
    && attestation.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
    && attestation.target === 'production'
    && attestation.valueExposed === false
    && attestation.secretContractSatisfied === true
    && attestation.minimumUtf8BytesSatisfied === true
    && attestation.maximumUtf8BytesSatisfied === true
    && attestation.whitespaceOrControlCharactersAbsent === true
    && attestation.differsFromSchedulerCredential === true
    && attestation.schedulerCredentialKey === 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET'
    && attestation.attestationMethod
      === 'trusted-environment-non-equality-attestation-without-secret-output'
  );
}

export function evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard(
  input: Readonly<{
    authorization: FandexMomentumVerifierConfigurationMutationAuthorizationResult;
    expectedV165PlanDigest:
      'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f';
    expectedAuthorizationRecordDigest: string | null;
    secretHandleAttestation: FandexMomentumVerifierTrustedSecretHandleAttestation | null;
  }>,
): FandexMomentumVerifierConfigurationMutationExecutionGuardResult {
  const blockers: string[] = [];
  const authorization = input.authorization;

  if (
    authorization.state !== 'configuration-mutation-authorized'
    || authorization.configurationMutationAuthorized !== true
  ) {
    blockers.push('configuration-mutation-authorization-not-effective');
  }
  if (authorization.productionDeploymentAuthorized !== false) {
    blockers.push('production-deployment-boundary-violated');
  }
  if (authorization.verifierActivationAuthorized !== false) {
    blockers.push('verifier-activation-boundary-violated');
  }
  if (authorization.nativeVerifierExecutionAuthorized !== false) {
    blockers.push('native-verifier-execution-boundary-violated');
  }
  if (authorization.ledgerAdvanceAuthorized !== false) {
    blockers.push('ledger-advance-boundary-violated');
  }
  if (
    authorization.record === null
    || authorization.record.upstreamV165PlanDigest !== input.expectedV165PlanDigest
  ) {
    blockers.push('authorization-v165-plan-binding-invalid');
  }

  if (!validDigest(input.expectedAuthorizationRecordDigest)) {
    blockers.push('expected-authorization-record-digest-missing-or-invalid');
  }
  if (
    !validDigest(authorization.recordDigest)
    || authorization.recordDigest !== input.expectedAuthorizationRecordDigest
  ) {
    blockers.push('authorization-record-digest-mismatch');
  }

  if (authorization.record !== null) {
    const [enable, deployment, secret] = authorization.record.authorizedConfiguration;
    if (
      enable.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED'
      || enable.exactValue !== 'approved-v162-research-read-only'
      || enable.target !== 'production'
      || deployment.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT'
      || deployment.exactValue !== 'production'
      || deployment.target !== 'production'
      || secret.key !== 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
      || secret.exactValue !== null
      || secret.target !== 'production'
      || secret.secretValueMayBeRecordedHere !== false
      || secret.schedulerCredentialKey !== 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET'
      || secret.mustDifferFromSchedulerCredential !== true
    ) {
      blockers.push('authorization-operation-scope-invalid');
    }
  } else {
    blockers.push('authorization-record-missing');
  }

  if (!validSecretHandle(input.secretHandleAttestation)) {
    blockers.push('trusted-secret-handle-attestation-missing-or-invalid');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const mutationEnvelopeReady = uniqueBlockers.length === 0;
  const state = mutationEnvelopeReady
    ? 'mutation-envelope-ready' as const
    : 'mutation-envelope-blocked' as const;

  const operations: FandexMomentumVerifierConfigurationMutationEnvelope['operations'] =
    Object.freeze([
      Object.freeze({
        order: 1 as const,
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED' as const,
        operation: 'set-exact-non-secret-value' as const,
        exactValue: 'approved-v162-research-read-only' as const,
        target: 'production' as const,
      }),
      Object.freeze({
        order: 2 as const,
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT' as const,
        operation: 'set-exact-non-secret-value' as const,
        exactValue: 'production' as const,
        target: 'production' as const,
      }),
      Object.freeze({
        order: 3 as const,
        key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET' as const,
        operation: 'set-from-trusted-secret-handle' as const,
        exactValue: null,
        target: 'production' as const,
        secretHandleId: input.secretHandleAttestation?.handleId ?? '',
        secretValueIncluded: false as const,
      }),
    ] as const);

  const envelope: FandexMomentumVerifierConfigurationMutationEnvelope | null =
    mutationEnvelopeReady
      ? Object.freeze({
          target: Object.freeze({
            teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
            projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
            projectName: 'fandex' as const,
            environment: 'production' as const,
          }),
          upstreamV165PlanDigest: input.expectedV165PlanDigest,
          upstreamV166ResultDigest: authorization.digest,
          authorizationRecordDigest: input.expectedAuthorizationRecordDigest as string,
          operations: [
            Object.freeze({
              order: 1 as const,
              key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED' as const,
              operation: 'set-exact-non-secret-value' as const,
              exactValue: 'approved-v162-research-read-only' as const,
              target: 'production' as const,
            }),
            Object.freeze({
              order: 2 as const,
              key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT' as const,
              operation: 'set-exact-non-secret-value' as const,
              exactValue: 'production' as const,
              target: 'production' as const,
            }),
            Object.freeze({
              order: 3 as const,
              key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET' as const,
              operation: 'set-from-trusted-secret-handle' as const,
              exactValue: null,
              target: 'production' as const,
              secretHandleId: input.secretHandleAttestation!.handleId,
              secretValueIncluded: false as const,
            }),
          ] as const,
          excludedKeys: [
            'FANDEX_RUNTIME_DATABASE_URL',
            'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
          ] as const,
          downstreamAuthorizations: Object.freeze({
            productionDeployment: false as const,
            verifierActivation: false as const,
            nativeVerifierExecution: false as const,
            ledgerAdvance: false as const,
          }),
          rollbackRequiredBeforeFirstAcceptedNativeRead: true as const,
        })
      : null;

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_CONFIGURATION_MUTATION_EXECUTION_GUARD_VERSION,
    state,
    mutationEnvelopeReady,
    configurationMutationAuthorized:
      authorization.configurationMutationAuthorized,
    envelope,
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      vercelCalls: 0 as const,
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
