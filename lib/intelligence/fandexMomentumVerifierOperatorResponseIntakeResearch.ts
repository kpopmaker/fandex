import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_VERSION =
  'v177_fandex_momentum_verifier_operator_response_intake_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_VERSION,
    lifecycle: 'research' as const,
    upstreamV176Contract:
      'v176_fandex_momentum_verifier_inventory_operator_handoff_research_v1' as const,
    intakeOnly: true as const,
    genericContinuationCountsAsAuthorization: false as const,
    operatorResponseMaySelfAuthorize: false as const,
    rawCredentialValueAllowed: false as const,
    providerReadPerformed: false as const,
    providerWritePerformed: false as const,
    credentialCreateReadRotateAllowed: false as const,
    productOrLedgerMutationAllowed: false as const,
  });

export type FandexMomentumVerifierOperatorAuthorizationRecord = Readonly<{
  authorizationId: string;
  kind:
    | 'read-channel-provisioning'
    | 'inventory-read-execution';
  decidedAt: string;
  decidedBy: string;
  validFrom: string;
  expiresAt: string;
  revokedAt: string | null;
  targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
  targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
  upstreamV176Digest: string;
  upstreamV172Digest: string;
  credentialHandleId: string;
}>;

export type FandexMomentumVerifierOperatorOpaqueCredentialHandle = Readonly<{
  handleId: string;
  provider: 'vercel';
  kind: 'opaque-bearer-credential-handle';
  tokenValueExposed: false;
  tokenValuePersisted: false;
  targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
  targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
  bearerCredentialAvailable: true;
  credentialUsableForRead: true;
  credentialRevoked: false;
}>;

export type FandexMomentumVerifierOperatorCapabilityReceipt = Readonly<{
  receiptId: string;
  observedAt: string;
  interfaceName: string;
  exactEnvironmentInventoryActionAvailable: boolean;
  genericVercelRestActionAvailable: boolean;
  authenticatedReadOnly: boolean;
  mutationCapabilityPresent: false;
  exactRequestSupported: boolean;
  maximumProviderCalls: 1;
  maximumInventoryReads: 1;
  request: Readonly<{
    method: 'GET';
    endpoint: '/v10/projects/{idOrName}/env';
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
    decrypt: 'false';
    gitBranch: null;
    customEnvironmentId: null;
    customEnvironmentSlug: null;
  }>;
  credentialHandleId: string;
  upstreamV176Digest: string;
  upstreamV172Digest: string;
}>;

export type FandexMomentumVerifierOperatorResponse = Readonly<{
  responseId: string;
  submittedAt: string;
  submittedBy: string;
  upstreamV176Digest: string;
  upstreamV172Digest: string;
  provisioningAuthorization:
    FandexMomentumVerifierOperatorAuthorizationRecord;
  credentialHandle: FandexMomentumVerifierOperatorOpaqueCredentialHandle;
  readExecutionAuthorization:
    FandexMomentumVerifierOperatorAuthorizationRecord;
  capabilityReceipt: FandexMomentumVerifierOperatorCapabilityReceipt;
}>;

export type FandexMomentumVerifierOperatorResponseIntakeResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_VERSION;
    state:
      | 'operator-response-missing'
      | 'operator-response-invalid'
      | 'operator-response-expired'
      | 'operator-response-revoked'
      | 'operator-response-intake-ready';
    intakeReady: boolean;
    readExecutionAuthorizedByIntake: false;
    upstreamV176Digest: string;
    upstreamV172Digest: string;
    responseId: string | null;
    normalized: Readonly<{
      provisioningAuthorizationId: string | null;
      credentialHandleId: string | null;
      readExecutionAuthorizationId: string | null;
      capabilityReceiptId: string | null;
      capabilityCanExecuteExactRead: boolean;
    }>;
    blockers: readonly string[];
    effects: Readonly<{
      authorizationWrites: 0;
      credentialCreates: 0;
      credentialReads: 0;
      credentialRotations: 0;
      vercelReads: 0;
      vercelWrites: 0;
      environmentMutations: 0;
      secretReads: 0;
      secretWrites: 0;
      productionDeployments: 0;
      verifierActivations: 0;
      nativeVerifierExecutions: 0;
      databaseWrites: 0;
      productMetricWrites: 0;
      registryMutations: 0;
      historyWrites: 0;
      watermarkWrites: 0;
      manifestWrites: 0;
      pullRequestMerges: 0;
    }>;
    digest: string;
  }>;

function exactIso(value: string): boolean {
  const t = Date.parse(value);
  return Number.isFinite(t) && new Date(t).toISOString() === value;
}

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function validId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{8,256}$/.test(value);
}

function nonEmptyIdentity(value: string): boolean {
  return value.trim().length > 0 && value.length <= 256;
}

function hasForbiddenCredentialMaterial(response: FandexMomentumVerifierOperatorResponse): boolean {
  const serialized = JSON.stringify(response);
  const dynamic = response as unknown as Record<string, unknown>;
  return (
    'token' in dynamic
    || 'accessToken' in dynamic
    || 'bearerToken' in dynamic
    || serialized.includes('"tokenValue"')
    || serialized.includes('"accessToken"')
    || serialized.includes('"bearerToken"')
  );
}

function validateAuthorization(
  record: FandexMomentumVerifierOperatorAuthorizationRecord,
  kind: FandexMomentumVerifierOperatorAuthorizationRecord['kind'],
  evaluatedAt: string,
  upstreamV176Digest: string,
  upstreamV172Digest: string,
  credentialHandleId: string,
  blockers: string[],
): 'valid' | 'expired' | 'revoked' | 'invalid' {
  if (
    record.kind !== kind
    || !validDigest(record.authorizationId)
    || !exactIso(record.decidedAt)
    || !nonEmptyIdentity(record.decidedBy)
    || !exactIso(record.validFrom)
    || !exactIso(record.expiresAt)
    || Date.parse(record.decidedAt) > Date.parse(record.validFrom)
    || Date.parse(record.validFrom) >= Date.parse(record.expiresAt)
    || record.targetTeamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || record.targetProjectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || record.upstreamV176Digest !== upstreamV176Digest
    || record.upstreamV172Digest !== upstreamV172Digest
    || record.credentialHandleId !== credentialHandleId
  ) {
    blockers.push(`${kind}-authorization-invalid`);
    return 'invalid';
  }

  if (record.revokedAt !== null) {
    if (!exactIso(record.revokedAt)) {
      blockers.push(`${kind}-authorization-invalid`);
      return 'invalid';
    }
    if (Date.parse(record.revokedAt) <= Date.parse(evaluatedAt)) {
      blockers.push(`${kind}-authorization-revoked`);
      return 'revoked';
    }
  }

  if (Date.parse(evaluatedAt) < Date.parse(record.validFrom)) {
    blockers.push(`${kind}-authorization-not-yet-valid`);
    return 'invalid';
  }
  if (Date.parse(evaluatedAt) >= Date.parse(record.expiresAt)) {
    blockers.push(`${kind}-authorization-expired`);
    return 'expired';
  }

  return 'valid';
}

export function evaluateFandexMomentumVerifierOperatorResponseIntake(
  input: Readonly<{
    evaluatedAt: string;
    requestIntent: 'generic-continuation' | 'operator-response-intake';
    upstreamV176Digest: string;
    upstreamV172Digest: string;
    response: FandexMomentumVerifierOperatorResponse | null;
  }>,
): FandexMomentumVerifierOperatorResponseIntakeResult {
  const blockers: string[] = [];

  if (!exactIso(input.evaluatedAt)) {
    blockers.push('operator-response-evaluation-time-invalid');
  }
  if (!validDigest(input.upstreamV176Digest)) {
    blockers.push('upstream-v176-digest-invalid');
  }
  if (!validDigest(input.upstreamV172Digest)) {
    blockers.push('upstream-v172-digest-invalid');
  }

  const response = input.response;
  let state:
    FandexMomentumVerifierOperatorResponseIntakeResult['state'] =
      'operator-response-missing';

  let provisioningAuthorizationId: string | null = null;
  let credentialHandleId: string | null = null;
  let readExecutionAuthorizationId: string | null = null;
  let capabilityReceiptId: string | null = null;
  let capabilityCanExecuteExactRead = false;

  if (response === null) {
    blockers.push('operator-response-missing');
  } else {
    if (
      !validId(response.responseId)
      || !exactIso(response.submittedAt)
      || !nonEmptyIdentity(response.submittedBy)
      || response.upstreamV176Digest !== input.upstreamV176Digest
      || response.upstreamV172Digest !== input.upstreamV172Digest
    ) {
      blockers.push('operator-response-binding-invalid');
    }

    if (hasForbiddenCredentialMaterial(response)) {
      blockers.push('operator-response-raw-credential-material-forbidden');
    }

    const provisioningState = validateAuthorization(
      response.provisioningAuthorization,
      'read-channel-provisioning',
      input.evaluatedAt,
      input.upstreamV176Digest,
      input.upstreamV172Digest,
      response.credentialHandle.handleId,
      blockers,
    );
    const readExecutionState = validateAuthorization(
      response.readExecutionAuthorization,
      'inventory-read-execution',
      input.evaluatedAt,
      input.upstreamV176Digest,
      input.upstreamV172Digest,
      response.credentialHandle.handleId,
      blockers,
    );

    provisioningAuthorizationId =
      response.provisioningAuthorization.authorizationId;
    readExecutionAuthorizationId =
      response.readExecutionAuthorization.authorizationId;

    const handle = response.credentialHandle;
    credentialHandleId = handle.handleId;
    if (
      !validId(handle.handleId)
      || handle.provider !== 'vercel'
      || handle.kind !== 'opaque-bearer-credential-handle'
      || handle.tokenValueExposed !== false
      || handle.tokenValuePersisted !== false
      || handle.targetTeamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
      || handle.targetProjectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
      || handle.bearerCredentialAvailable !== true
      || handle.credentialUsableForRead !== true
      || handle.credentialRevoked !== false
    ) {
      blockers.push('operator-response-credential-handle-invalid');
    }

    const capability = response.capabilityReceipt;
    capabilityReceiptId = capability.receiptId;
    capabilityCanExecuteExactRead =
      (
        capability.exactEnvironmentInventoryActionAvailable
        || capability.genericVercelRestActionAvailable
      )
      && capability.authenticatedReadOnly
      && capability.mutationCapabilityPresent === false
      && capability.exactRequestSupported
      && capability.maximumProviderCalls === 1
      && capability.maximumInventoryReads === 1;

    if (
      !validId(capability.receiptId)
      || !exactIso(capability.observedAt)
      || !nonEmptyIdentity(capability.interfaceName)
      || capability.mutationCapabilityPresent !== false
      || capability.maximumProviderCalls !== 1
      || capability.maximumInventoryReads !== 1
      || capability.request.method !== 'GET'
      || capability.request.endpoint !== '/v10/projects/{idOrName}/env'
      || capability.request.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
      || capability.request.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
      || capability.request.decrypt !== 'false'
      || capability.request.gitBranch !== null
      || capability.request.customEnvironmentId !== null
      || capability.request.customEnvironmentSlug !== null
      || capability.credentialHandleId !== handle.handleId
      || capability.upstreamV176Digest !== input.upstreamV176Digest
      || capability.upstreamV172Digest !== input.upstreamV172Digest
    ) {
      blockers.push('operator-response-capability-receipt-invalid');
    }
    if (!capabilityCanExecuteExactRead) {
      blockers.push('operator-response-execution-capability-unavailable');
    }

    if (input.requestIntent === 'generic-continuation') {
      blockers.push('generic-continuation-is-not-operator-response-intake');
    }

    if (
      provisioningState === 'revoked'
      || readExecutionState === 'revoked'
    ) {
      state = 'operator-response-revoked';
    } else if (
      provisioningState === 'expired'
      || readExecutionState === 'expired'
    ) {
      state = 'operator-response-expired';
    } else if (blockers.length > 0) {
      state = 'operator-response-invalid';
    } else {
      state = 'operator-response-intake-ready';
    }
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const intakeReady =
    state === 'operator-response-intake-ready'
    && uniqueBlockers.length === 0;

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_VERSION,
    state,
    intakeReady,
    readExecutionAuthorizedByIntake: false as const,
    upstreamV176Digest: input.upstreamV176Digest,
    upstreamV172Digest: input.upstreamV172Digest,
    responseId: response?.responseId ?? null,
    normalized: Object.freeze({
      provisioningAuthorizationId,
      credentialHandleId,
      readExecutionAuthorizationId,
      capabilityReceiptId,
      capabilityCanExecuteExactRead,
    }),
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      authorizationWrites: 0 as const,
      credentialCreates: 0 as const,
      credentialReads: 0 as const,
      credentialRotations: 0 as const,
      vercelReads: 0 as const,
      vercelWrites: 0 as const,
      environmentMutations: 0 as const,
      secretReads: 0 as const,
      secretWrites: 0 as const,
      productionDeployments: 0 as const,
      verifierActivations: 0 as const,
      nativeVerifierExecutions: 0 as const,
      databaseWrites: 0 as const,
      productMetricWrites: 0 as const,
      registryMutations: 0 as const,
      historyWrites: 0 as const,
      watermarkWrites: 0 as const,
      manifestWrites: 0 as const,
      pullRequestMerges: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
