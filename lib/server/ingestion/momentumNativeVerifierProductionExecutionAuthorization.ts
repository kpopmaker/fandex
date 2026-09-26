import {
  MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL,
} from './momentumProductionVerifierActivationApproval';

export const MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION_CONTRACT_VERSION =
  'momentum-native-verifier-production-execution-authorization-v1' as const;

export const MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION =
  Object.freeze({
    contractVersion:
      MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION_CONTRACT_VERSION,
    action: 'authorize-native-verifier-production-execution' as const,
    authority: 'product-operations-owner' as const,
    executionAuthorizationId:
      'ops-execution-momentum-verifier-20260926t082730z-v1',
    authorizedAt: '2026-09-26T08:27:30.000Z',
    authorizationEvidenceCommentId: 5844602378 as const,
    authorizedMain:
      '4bc3671ef6390de42468c95deb46eb6907c2d069' as const,
    productionDeployment: Object.freeze({
      deploymentId: 'dpl_EKqjERWSb6PTkV1xNGybZCN1Kn8T' as const,
      deploymentCommit:
        '4bc3671ef6390de42468c95deb46eb6907c2d069' as const,
      target: 'production' as const,
      readyState: 'READY' as const,
      routePath:
        '/api/internal/naver-news/momentum-verifier' as const,
    }),
    activationBinding: Object.freeze({
      activationAuthorizationId:
        MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL
          .activationAuthorizationId,
      activationContractVersion:
        MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL
          .contractVersion,
      activationAuthorized: true as const,
    }),
    target: Object.freeze({
      canonicalArtistId: 'iu' as const,
      throughSlotStart: '2026-09-21T12:00:00.000Z' as const,
      purpose: 'momentum-native-verifier-read-only' as const,
      requestContractVersion:
        'v162_naver_news_momentum_native_verifier_execution_request_v1' as const,
      maximumExecutions: 1 as const,
    }),
    credentialBoundary: Object.freeze({
      dedicatedSecretUseAllowed: true as const,
      rawSecretLoggingAllowed: false as const,
      rawSecretPersistenceAllowed: false as const,
      credentialMutationAllowed: false as const,
    }),
    executionConsumption: Object.freeze({
      consumed: true as const,
      successEvidenceCommentId: 5845561224 as const,
      workflowRunId: 36236503946 as const,
      workflowJobId: 108389136137 as const,
      executionDeploymentId:
        'dpl_CaPUF257kAeyAHAeUtjyjNkJm93r' as const,
      executionMain:
        '55a962cf9ca1e6260b0ce99858af8021ef8d6b4b' as const,
      executionId:
        '0255b08297f5422f61bcbaffa5139f6173a6996a97a175558421ed978bc80d0d' as const,
      executedAt: '2026-09-26T10:40:43.243Z' as const,
      evidenceRows: 100 as const,
      normalizedRecords: 100 as const,
      databaseReadOnly: true as const,
      databaseWritesObserved: 0 as const,
      verifierOutputAccepted: true as const,
      attestationState: 'attestation-adapted' as const,
    }),
    decision: Object.freeze({
      activationAuthorized: true as const,
      nativeVerifierExecutionAuthorized: true as const,
      nativeVerifierExecutionPerformed: true as const,
      ledgerAdvancementAuthorized: false as const,
      productMetricPublicationAuthorized: false as const,
      registryMutationAuthorized: false as const,
      publicRoutePublicationAuthorized: false as const,
      requiredNextGate:
        'post-execution-product-readiness-review' as const,
    }),
    expectedEffects: Object.freeze({
      databaseWrites: 0 as const,
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      registryMutations: 0 as const,
      productionActivations: 0 as const,
      ledgerWrites: 0 as const,
    }),
  });

function activationBindingValid(): boolean {
  const activation = MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL;
  const execution =
    MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION;

  return (
    activation.decision.activationAuthorized === true
    && activation.decision.nativeVerifierExecutionAuthorized === false
    && activation.decision.nativeVerifierExecutionPerformed === false
    && execution.activationBinding.activationAuthorizationId
      === activation.activationAuthorizationId
    && execution.activationBinding.activationContractVersion
      === activation.contractVersion
  );
}

export function isMomentumProductionVerifierNativeExecutionAuthorized(): boolean {
  const authorization =
    MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION;

  return (
    activationBindingValid()
    && authorization.decision.nativeVerifierExecutionAuthorized === true
    && authorization.decision.nativeVerifierExecutionPerformed === false
    && authorization.target.maximumExecutions === 1
  );
}

export function isMomentumProductionVerifierExecutionRequestAuthorized(
  value: unknown,
): boolean {
  if (
    !isMomentumProductionVerifierNativeExecutionAuthorized()
    || value === null
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return false;
  }

  const row = value as Record<string, unknown>;
  const target =
    MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION.target;

  return (
    row.contractVersion === target.requestContractVersion
    && row.purpose === target.purpose
    && row.canonicalArtistId === target.canonicalArtistId
    && row.throughSlotStart === target.throughSlotStart
  );
}

export function isMomentumProductionVerifierExecutionAuthorizationHeaderValid(
  value: unknown,
): boolean {
  return (
    typeof value === 'string'
    && value
      === MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION
        .executionAuthorizationId
  );
}
