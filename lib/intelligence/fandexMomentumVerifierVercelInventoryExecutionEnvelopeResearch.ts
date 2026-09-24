import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumVerifierVercelInventoryReadChannelPlanResult,
} from './fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_VERSION =
  'v173_fandex_momentum_verifier_vercel_inventory_execution_envelope_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_VERSION,
    lifecycle: 'research' as const,
    upstreamV172Contract:
      'v172_fandex_momentum_verifier_vercel_inventory_read_channel_plan_research_v1' as const,
    envelopeOnly: true as const,
    actualInventoryReadPerformed: false as const,
    genericContinuationCountsAsReadAuthorization: false as const,
    credentialValueMayEnterEnvelope: false as const,
    maxReadsPerEnvelope: 1 as const,
    mutationMethodsAllowed: false as const,
    decryptTrueAllowed: false as const,
    providerCredentialReadAllowed: false as const,
    providerCredentialRotationAllowed: false as const,
    productOrLedgerMutationAllowed: false as const,
  });

export type FandexMomentumVerifierVercelInventoryReadExecutionAuthorization =
  | Readonly<{
      state: 'pending';
      authorizationId: null;
      decidedAt: null;
      decidedBy: null;
      validFrom: null;
      expiresAt: null;
      revokedAt: null;
      upstreamV172Digest: null;
      provisioningAuthorizationId: null;
      credentialHandleId: null;
    }>
  | Readonly<{
      state: 'approved';
      authorizationId: string;
      decidedAt: string;
      decidedBy: string;
      validFrom: string;
      expiresAt: string;
      revokedAt: string | null;
      upstreamV172Digest: string;
      provisioningAuthorizationId: string;
      credentialHandleId: string;
    }>
  | Readonly<{
      state: 'rejected';
      authorizationId: string;
      decidedAt: string;
      decidedBy: string;
      validFrom: null;
      expiresAt: null;
      revokedAt: null;
      upstreamV172Digest: string;
      provisioningAuthorizationId: string;
      credentialHandleId: string;
    }>;

export type FandexMomentumVerifierVercelInventoryExecutionEnvelopeInput =
  Readonly<{
    evaluatedAt: string;
    requestIntent:
      | 'generic-continuation'
      | 'research-envelope-evaluation'
      | 'explicit-inventory-read-execution-authorization';
    upstreamV172:
      FandexMomentumVerifierVercelInventoryReadChannelPlanResult;
    readExecutionAuthorization:
      FandexMomentumVerifierVercelInventoryReadExecutionAuthorization;
  }>;

export type FandexMomentumVerifierVercelInventoryExecutionEnvelope =
  Readonly<{
    envelopeId: string;
    provider: 'vercel';
    credentialHandleId: string;
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
    boundary: Readonly<{
      maxReads: 1;
      mutationMethodsExposed: false;
      decryptTrueAllowed: false;
      decryptedEnvValueEndpointAllowed: false;
      rawProviderResponsePersistenceAllowed: false;
      secretValuePersistenceAllowed: false;
      credentialValueIncluded: false;
    }>;
    upstreamV172Digest: string;
    provisioningAuthorizationId: string;
  }>;

export type FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_VERSION;
    state:
      | 'execution-envelope-blocked'
      | 'execution-envelope-prepared'
      | 'read-execution-authorization-pending'
      | 'read-execution-authorization-rejected'
      | 'read-execution-authorization-expired'
      | 'read-execution-authorization-invalid'
      | 'read-execution-ready';
    envelopePrepared: boolean;
    readExecutionAuthorized: boolean;
    envelope:
      FandexMomentumVerifierVercelInventoryExecutionEnvelope | null;
    authorization:
      FandexMomentumVerifierVercelInventoryReadExecutionAuthorization;
    blockers: readonly string[];
    effects: Readonly<{
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

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function validOpaqueHandleId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{8,256}$/.test(value);
}

function buildEnvelope(
  upstream: FandexMomentumVerifierVercelInventoryReadChannelPlanResult,
): FandexMomentumVerifierVercelInventoryExecutionEnvelope | null {
  const handle = upstream.credentialHandle;
  if (
    upstream.contractVersion
      !== 'v172_fandex_momentum_verifier_vercel_inventory_read_channel_plan_research_v1'
    || upstream.state !== 'read-channel-provisioning-ready'
    || upstream.provisioningAuthorized !== true
    || upstream.readExecutionAuthorized !== false
    || upstream.credentialHandleAccepted !== true
    || handle === null
    || !validOpaqueHandleId(handle.handleId)
    || handle.tokenValueExposed !== false
    || handle.targetTeamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || handle.targetProjectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || handle.credentialRevoked !== false
    || upstream.channelContract.allowedRequest.method !== 'GET'
    || upstream.channelContract.allowedRequest.endpoint
      !== '/v10/projects/{idOrName}/env'
    || upstream.channelContract.allowedRequest.teamId
      !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || upstream.channelContract.allowedRequest.projectId
      !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || upstream.channelContract.allowedRequest.decrypt !== 'false'
    || upstream.channelContract.allowedRequest.gitBranch !== null
    || upstream.channelContract.allowedRequest.customEnvironmentId !== null
    || upstream.channelContract.allowedRequest.customEnvironmentSlug !== null
    || upstream.channelContract.executionBoundary.maxInventoryReadsPerEnvelope
      !== 1
    || upstream.channelContract.executionBoundary.mutationMethodsExposed
      !== false
    || upstream.channelContract.executionBoundary.decryptTrueAllowed !== false
    || upstream.channelContract.executionBoundary
      .decryptedEnvValueEndpointAllowed !== false
    || upstream.channelContract.executionBoundary
      .rawProviderResponsePersistenceAllowed !== false
    || upstream.channelContract.executionBoundary.secretValuePersistenceAllowed
      !== false
    || upstream.authorization.state !== 'approved'
  ) {
    return null;
  }

  const provisioningAuthorizationId = upstream.authorization.authorizationId;
  const base = {
    provider: 'vercel' as const,
    credentialHandleId: handle.handleId,
    request: Object.freeze({
      method: 'GET' as const,
      endpoint: '/v10/projects/{idOrName}/env' as const,
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
      decrypt: 'false' as const,
      gitBranch: null,
      customEnvironmentId: null,
      customEnvironmentSlug: null,
    }),
    boundary: Object.freeze({
      maxReads: 1 as const,
      mutationMethodsExposed: false as const,
      decryptTrueAllowed: false as const,
      decryptedEnvValueEndpointAllowed: false as const,
      rawProviderResponsePersistenceAllowed: false as const,
      secretValuePersistenceAllowed: false as const,
      credentialValueIncluded: false as const,
    }),
    upstreamV172Digest: upstream.digest,
    provisioningAuthorizationId,
  };

  return Object.freeze({
    envelopeId: sha256Canonical(base),
    ...base,
  });
}

export function buildFandexMomentumVerifierVercelInventoryExecutionEnvelope(
  input: FandexMomentumVerifierVercelInventoryExecutionEnvelopeInput,
): FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult {
  const blockers: string[] = [];

  if (!exactIso(input.evaluatedAt)) {
    blockers.push('execution-envelope-evaluation-time-invalid');
  }

  const envelope = buildEnvelope(input.upstreamV172);
  if (envelope === null) {
    blockers.push('upstream-v172-not-provisioning-ready');
  }

  const authorization = input.readExecutionAuthorization;
  let authState:
    | 'pending'
    | 'rejected'
    | 'expired'
    | 'invalid'
    | 'effective' = 'pending';

  if (authorization.state === 'pending') {
    if (
      authorization.authorizationId !== null
      || authorization.decidedAt !== null
      || authorization.decidedBy !== null
      || authorization.validFrom !== null
      || authorization.expiresAt !== null
      || authorization.revokedAt !== null
      || authorization.upstreamV172Digest !== null
      || authorization.provisioningAuthorizationId !== null
      || authorization.credentialHandleId !== null
    ) {
      blockers.push('read-execution-pending-authorization-invalid');
      authState = 'invalid';
    }
  } else if (authorization.state === 'rejected') {
    if (
      !validDigest(authorization.authorizationId)
      || !exactIso(authorization.decidedAt)
      || !nonEmptyIdentity(authorization.decidedBy)
      || authorization.validFrom !== null
      || authorization.expiresAt !== null
      || authorization.revokedAt !== null
      || !validDigest(authorization.upstreamV172Digest)
      || !validDigest(authorization.provisioningAuthorizationId)
      || !validOpaqueHandleId(authorization.credentialHandleId)
    ) {
      blockers.push('read-execution-rejection-invalid');
      authState = 'invalid';
    } else {
      authState = 'rejected';
    }
  } else {
    if (
      !validDigest(authorization.authorizationId)
      || !exactIso(authorization.decidedAt)
      || !nonEmptyIdentity(authorization.decidedBy)
      || !exactIso(authorization.validFrom)
      || !exactIso(authorization.expiresAt)
      || Date.parse(authorization.decidedAt) > Date.parse(authorization.validFrom)
      || Date.parse(authorization.validFrom) >= Date.parse(authorization.expiresAt)
      || !validDigest(authorization.upstreamV172Digest)
      || !validDigest(authorization.provisioningAuthorizationId)
      || !validOpaqueHandleId(authorization.credentialHandleId)
    ) {
      blockers.push('read-execution-approval-invalid');
      authState = 'invalid';
    } else if (
      authorization.revokedAt !== null
      && (
        !exactIso(authorization.revokedAt)
        || Date.parse(authorization.revokedAt) <= Date.parse(input.evaluatedAt)
      )
    ) {
      blockers.push('read-execution-authorization-revoked');
      authState = 'invalid';
    } else if (Date.parse(input.evaluatedAt) >= Date.parse(authorization.expiresAt)) {
      authState = 'expired';
    } else if (Date.parse(input.evaluatedAt) < Date.parse(authorization.validFrom)) {
      blockers.push('read-execution-authorization-not-yet-valid');
      authState = 'invalid';
    } else {
      authState = 'effective';
    }
  }

  if (
    input.requestIntent === 'generic-continuation'
    && authState === 'effective'
  ) {
    blockers.push('generic-continuation-is-not-read-execution-authorization');
  }

  if (envelope !== null && authorization.state !== 'pending') {
    if (authorization.upstreamV172Digest !== envelope.upstreamV172Digest) {
      blockers.push('read-execution-upstream-v172-binding-mismatch');
    }
    if (
      authorization.provisioningAuthorizationId
        !== envelope.provisioningAuthorizationId
    ) {
      blockers.push('read-execution-provisioning-authorization-binding-mismatch');
    }
    if (authorization.credentialHandleId !== envelope.credentialHandleId) {
      blockers.push('read-execution-credential-handle-binding-mismatch');
    }
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const envelopePrepared = envelope !== null
    && !uniqueBlockers.includes('upstream-v172-not-provisioning-ready');

  const readExecutionAuthorized =
    envelopePrepared
    && authState === 'effective'
    && input.requestIntent
      === 'explicit-inventory-read-execution-authorization'
    && uniqueBlockers.length === 0;

  let state:
    FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult['state'];

  if (uniqueBlockers.some((b) => b.includes('invalid') || b.includes('revoked') || b.includes('mismatch') || b.includes('not-yet-valid'))) {
    state = 'read-execution-authorization-invalid';
  } else if (authorization.state === 'rejected') {
    state = 'read-execution-authorization-rejected';
  } else if (authState === 'expired') {
    state = 'read-execution-authorization-expired';
  } else if (!envelopePrepared) {
    state = 'execution-envelope-blocked';
  } else if (readExecutionAuthorized) {
    state = 'read-execution-ready';
  } else if (authState === 'pending') {
    state = input.requestIntent === 'research-envelope-evaluation'
      ? 'execution-envelope-prepared'
      : 'read-execution-authorization-pending';
  } else {
    state = 'read-execution-authorization-pending';
  }

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_VERSION,
    state,
    envelopePrepared,
    readExecutionAuthorized,
    envelope,
    authorization,
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
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
    }),
    digest: sha256Canonical(payload),
  });
}
