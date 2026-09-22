import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_VERSION =
  'v172_fandex_momentum_verifier_vercel_inventory_read_channel_plan_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_VERSION,
    lifecycle: 'research' as const,
    provisioningPlanOnly: true as const,
    providerCredentialCreated: false as const,
    providerCredentialRead: false as const,
    providerCredentialRotated: false as const,
    providerTokenEndpointScopeAssumed: false as const,
    channelCreated: false as const,
    inventoryReadPerformed: false as const,
    vercelMutationPerformed: false as const,
    secretValueExposureAllowed: false as const,
    genericContinuationCountsAsAuthorization: false as const,
  });

export type FandexMomentumVerifierVercelInventoryReadChannelAuthorization =
  | Readonly<{
      state: 'pending';
      authorizationId: null;
      decidedAt: null;
      decidedBy: null;
      validFrom: null;
      expiresAt: null;
      revokedAt: null;
    }>
  | Readonly<{
      state: 'approved';
      authorizationId: string;
      decidedAt: string;
      decidedBy: string;
      validFrom: string;
      expiresAt: string;
      revokedAt: string | null;
    }>
  | Readonly<{
      state: 'rejected';
      authorizationId: string;
      decidedAt: string;
      decidedBy: string;
      validFrom: null;
      expiresAt: null;
      revokedAt: null;
    }>;

export type FandexMomentumVerifierVercelInventoryCredentialHandle =
  Readonly<{
    handleId: string;
    provider: 'vercel';
    kind: 'opaque-bearer-credential-handle';
    tokenValueExposed: false;
    targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
    targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
    bearerCredentialAvailable: boolean;
    credentialUsableForRead: boolean;
    credentialRevoked: boolean;
    providerLevelScopeRestrictedToInventoryRead: 'not-proven';
  }>;

export type FandexMomentumVerifierVercelInventoryReadChannelPlanInput =
  Readonly<{
    evaluatedAt: string;
    requestIntent:
      | 'generic-continuation'
      | 'research-plan-evaluation'
      | 'explicit-read-channel-authorization';
    authorization:
      FandexMomentumVerifierVercelInventoryReadChannelAuthorization;
    credentialHandle:
      FandexMomentumVerifierVercelInventoryCredentialHandle | null;
  }>;

export type FandexMomentumVerifierVercelInventoryReadChannelPlanResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_VERSION;
    state:
      | 'read-channel-plan-ready'
      | 'read-channel-authorization-pending'
      | 'read-channel-authorization-rejected'
      | 'read-channel-authorization-expired'
      | 'read-channel-authorization-invalid'
      | 'read-channel-provisioning-ready';
    planReady: boolean;
    provisioningAuthorized: boolean;
    readExecutionAuthorized: false;
    credentialHandleAccepted: boolean;
    channelContract: Readonly<{
      provider: 'vercel';
      authentication: 'bearer-token-via-opaque-handle';
      allowedRequest: Readonly<{
        method: 'GET';
        endpoint: '/v10/projects/{idOrName}/env';
        teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
        projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
        decrypt: 'false';
        gitBranch: null;
        customEnvironmentId: null;
        customEnvironmentSlug: null;
      }>;
      forbiddenMethods: readonly ['POST', 'PATCH', 'PUT', 'DELETE'];
      forbiddenCapabilities: readonly [
        'environment-mutation',
        'deployment',
        'secret-decryption',
        'decrypted-env-endpoint',
        'credential-output',
        'credential-rotation',
      ];
      credentialBoundary: Readonly<{
        providerCredentialValueMayEnterResearchArtifact: false;
        providerCredentialValueMayEnterLog: false;
        providerLevelEndpointRestrictionAssumed: false;
        interfaceEnforcesRequestAllowlist: true;
        exactTeamProjectBindingRequired: true;
      }>;
      executionBoundary: Readonly<{
        maxInventoryReadsPerEnvelope: 1;
        mutationMethodsExposed: false;
        decryptTrueAllowed: false;
        decryptedEnvValueEndpointAllowed: false;
        rawProviderResponsePersistenceAllowed: false;
        secretValuePersistenceAllowed: false;
      }>;
    }>;
    authorization: FandexMomentumVerifierVercelInventoryReadChannelAuthorization;
    credentialHandle:
      FandexMomentumVerifierVercelInventoryCredentialHandle | null;
    blockers: readonly string[];
    effects: Readonly<{
      credentialCreates: 0;
      credentialReads: 0;
      credentialRotations: 0;
      channelCreates: 0;
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
    }>;
    digest: string;
  }>;

function exactIso(value: string): boolean {
  const t = Date.parse(value);
  return Number.isFinite(t) && new Date(t).toISOString() === value;
}

function nonEmptyIdentity(value: string): boolean {
  return value.trim().length > 0 && value.length <= 256;
}

function validHandle(
  handle: FandexMomentumVerifierVercelInventoryCredentialHandle | null,
): boolean {
  return (
    handle !== null
    && /^[A-Za-z0-9._:-]{8,256}$/.test(handle.handleId)
    && handle.provider === 'vercel'
    && handle.kind === 'opaque-bearer-credential-handle'
    && handle.tokenValueExposed === false
    && handle.targetTeamId === 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    && handle.targetProjectId === 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    && handle.bearerCredentialAvailable === true
    && handle.credentialUsableForRead === true
    && handle.credentialRevoked === false
    && handle.providerLevelScopeRestrictedToInventoryRead === 'not-proven'
  );
}

export function buildFandexMomentumVerifierVercelInventoryReadChannelPlan(
  input: FandexMomentumVerifierVercelInventoryReadChannelPlanInput,
): FandexMomentumVerifierVercelInventoryReadChannelPlanResult {
  const blockers: string[] = [];
  if (!exactIso(input.evaluatedAt)) {
    blockers.push('read-channel-evaluation-time-invalid');
  }

  const auth = input.authorization;
  let authState:
    | 'pending'
    | 'rejected'
    | 'expired'
    | 'invalid'
    | 'effective' = 'pending';

  if (auth.state === 'pending') {
    if (
      auth.authorizationId !== null
      || auth.decidedAt !== null
      || auth.decidedBy !== null
      || auth.validFrom !== null
      || auth.expiresAt !== null
      || auth.revokedAt !== null
    ) {
      blockers.push('read-channel-pending-authorization-invalid');
      authState = 'invalid';
    }
  } else if (auth.state === 'rejected') {
    if (
      !/^[0-9a-f]{64}$/.test(auth.authorizationId)
      || !exactIso(auth.decidedAt)
      || !nonEmptyIdentity(auth.decidedBy)
      || auth.validFrom !== null
      || auth.expiresAt !== null
      || auth.revokedAt !== null
    ) {
      blockers.push('read-channel-rejection-invalid');
      authState = 'invalid';
    } else {
      authState = 'rejected';
    }
  } else {
    if (
      !/^[0-9a-f]{64}$/.test(auth.authorizationId)
      || !exactIso(auth.decidedAt)
      || !nonEmptyIdentity(auth.decidedBy)
      || !exactIso(auth.validFrom)
      || !exactIso(auth.expiresAt)
      || Date.parse(auth.decidedAt) > Date.parse(auth.validFrom)
      || Date.parse(auth.validFrom) >= Date.parse(auth.expiresAt)
    ) {
      blockers.push('read-channel-approval-invalid');
      authState = 'invalid';
    } else if (
      auth.revokedAt !== null
      && (
        !exactIso(auth.revokedAt)
        || Date.parse(auth.revokedAt) <= Date.parse(input.evaluatedAt)
      )
    ) {
      blockers.push('read-channel-authorization-revoked');
      authState = 'invalid';
    } else if (Date.parse(input.evaluatedAt) >= Date.parse(auth.expiresAt)) {
      authState = 'expired';
    } else if (Date.parse(input.evaluatedAt) < Date.parse(auth.validFrom)) {
      blockers.push('read-channel-authorization-not-yet-valid');
      authState = 'invalid';
    } else {
      authState = 'effective';
    }
  }

  const credentialHandleAccepted = validHandle(input.credentialHandle);
  if (input.credentialHandle !== null && !credentialHandleAccepted) {
    blockers.push('read-channel-credential-handle-invalid');
  }

  if (
    input.requestIntent === 'generic-continuation'
    && authState === 'effective'
  ) {
    blockers.push('generic-continuation-is-not-read-channel-authorization');
  }

  const planReady = blockers.length === 0 || (
    blockers.length === 1
    && blockers[0] === 'generic-continuation-is-not-read-channel-authorization'
  );

  let provisioningAuthorized = false;
  if (
    authState === 'effective'
    && input.requestIntent === 'explicit-read-channel-authorization'
    && credentialHandleAccepted
    && blockers.length === 0
  ) {
    provisioningAuthorized = true;
  }

  let state:
    FandexMomentumVerifierVercelInventoryReadChannelPlanResult['state'];

  if (blockers.some((b) => b.includes('invalid') || b.includes('revoked') || b.includes('not-yet-valid'))) {
    state = 'read-channel-authorization-invalid';
  } else if (authState === 'rejected') {
    state = 'read-channel-authorization-rejected';
  } else if (authState === 'expired') {
    state = 'read-channel-authorization-expired';
  } else if (provisioningAuthorized) {
    state = 'read-channel-provisioning-ready';
  } else if (authState === 'pending') {
    state = input.requestIntent === 'research-plan-evaluation'
      ? 'read-channel-plan-ready'
      : 'read-channel-authorization-pending';
  } else {
    state = 'read-channel-authorization-pending';
  }

  const channelContract = Object.freeze({
    provider: 'vercel' as const,
    authentication: 'bearer-token-via-opaque-handle' as const,
    allowedRequest: Object.freeze({
      method: 'GET' as const,
      endpoint: '/v10/projects/{idOrName}/env' as const,
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
      decrypt: 'false' as const,
      gitBranch: null,
      customEnvironmentId: null,
      customEnvironmentSlug: null,
    }),
    forbiddenMethods: Object.freeze(['POST', 'PATCH', 'PUT', 'DELETE'] as const),
    forbiddenCapabilities: Object.freeze([
      'environment-mutation',
      'deployment',
      'secret-decryption',
      'decrypted-env-endpoint',
      'credential-output',
      'credential-rotation',
    ] as const),
    credentialBoundary: Object.freeze({
      providerCredentialValueMayEnterResearchArtifact: false as const,
      providerCredentialValueMayEnterLog: false as const,
      providerLevelEndpointRestrictionAssumed: false as const,
      interfaceEnforcesRequestAllowlist: true as const,
      exactTeamProjectBindingRequired: true as const,
    }),
    executionBoundary: Object.freeze({
      maxInventoryReadsPerEnvelope: 1 as const,
      mutationMethodsExposed: false as const,
      decryptTrueAllowed: false as const,
      decryptedEnvValueEndpointAllowed: false as const,
      rawProviderResponsePersistenceAllowed: false as const,
      secretValuePersistenceAllowed: false as const,
    }),
  });

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_VERSION,
    state,
    planReady,
    provisioningAuthorized,
    readExecutionAuthorized: false as const,
    credentialHandleAccepted,
    channelContract,
    authorization: auth,
    credentialHandle: input.credentialHandle,
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      credentialCreates: 0 as const,
      credentialReads: 0 as const,
      credentialRotations: 0 as const,
      channelCreates: 0 as const,
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
    }),
    digest: sha256Canonical(payload),
  });
}
