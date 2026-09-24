import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumVerifierOperatorResponse,
  FandexMomentumVerifierOperatorResponseIntakeResult,
} from './fandexMomentumVerifierOperatorResponseIntakeResearch';
import {
  buildFandexMomentumVerifierVercelInventoryReadChannelPlan,
  type FandexMomentumVerifierVercelInventoryCredentialHandle,
  type FandexMomentumVerifierVercelInventoryReadChannelAuthorization,
  type FandexMomentumVerifierVercelInventoryReadChannelPlanResult,
} from './fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';
import type {
  FandexMomentumVerifierVercelInventoryReadExecutionAuthorization,
} from './fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';

export const FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_VERSION =
  'v178_fandex_momentum_verifier_operator_response_projection_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_VERSION,
    lifecycle: 'research' as const,
    upstreamV177Contract:
      'v177_fandex_momentum_verifier_operator_response_intake_research_v1' as const,
    projectionOnly: true as const,
    createsAuthorization: false as const,
    executesProviderRead: false as const,
    credentialValueAllowed: false as const,
    genericContinuationCountsAsProjectionAuthorization: false as const,
    productOrLedgerMutationAllowed: false as const,
  });

export type FandexMomentumVerifierOperatorResponseProjectionResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_VERSION;
  state: 'operator-response-projection-blocked' | 'operator-response-projection-ready';
  projectionReady: boolean;
  upstreamV177Digest: string;
  projectedV172Authorization:
    FandexMomentumVerifierVercelInventoryReadChannelAuthorization | null;
  projectedV172CredentialHandle:
    FandexMomentumVerifierVercelInventoryCredentialHandle | null;
  projectedV172:
    FandexMomentumVerifierVercelInventoryReadChannelPlanResult | null;
  projectedV173ReadExecutionAuthorization:
    FandexMomentumVerifierVercelInventoryReadExecutionAuthorization | null;
  capability: Readonly<{
    receiptId: string | null;
    interfaceName: string | null;
    exactReadCapabilityValidated: boolean;
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

function effectiveAuthorization(
  record: FandexMomentumVerifierOperatorResponse['provisioningAuthorization']
    | FandexMomentumVerifierOperatorResponse['readExecutionAuthorization'],
  evaluatedAt: string,
): boolean {
  return (
    exactIso(evaluatedAt)
    && exactIso(record.validFrom)
    && exactIso(record.expiresAt)
    && Date.parse(evaluatedAt) >= Date.parse(record.validFrom)
    && Date.parse(evaluatedAt) < Date.parse(record.expiresAt)
    && (
      record.revokedAt === null
      || (
        exactIso(record.revokedAt)
        && Date.parse(record.revokedAt) > Date.parse(evaluatedAt)
      )
    )
  );
}

export function projectFandexMomentumVerifierOperatorResponse(
  input: Readonly<{
    evaluatedAt: string;
    requestIntent: 'generic-continuation' | 'operator-response-projection';
    upstreamV177: FandexMomentumVerifierOperatorResponseIntakeResult;
    response: FandexMomentumVerifierOperatorResponse | null;
  }>,
): FandexMomentumVerifierOperatorResponseProjectionResult {
  const blockers: string[] = [];
  const response = input.response;

  if (!exactIso(input.evaluatedAt)) {
    blockers.push('operator-response-projection-evaluation-time-invalid');
  }
  if (
    input.upstreamV177.contractVersion
      !== 'v177_fandex_momentum_verifier_operator_response_intake_research_v1'
    || input.upstreamV177.state !== 'operator-response-intake-ready'
    || input.upstreamV177.intakeReady !== true
    || input.upstreamV177.readExecutionAuthorizedByIntake !== false
    || input.upstreamV177.blockers.length !== 0
  ) {
    blockers.push('upstream-v177-not-intake-ready');
  }
  if (input.requestIntent !== 'operator-response-projection') {
    blockers.push('generic-continuation-is-not-operator-response-projection');
  }
  if (response === null) {
    blockers.push('validated-operator-response-missing');
  }

  let projectedV172Authorization:
    FandexMomentumVerifierVercelInventoryReadChannelAuthorization | null = null;
  let projectedV172CredentialHandle:
    FandexMomentumVerifierVercelInventoryCredentialHandle | null = null;
  let projectedV172:
    FandexMomentumVerifierVercelInventoryReadChannelPlanResult | null = null;
  let projectedV173ReadExecutionAuthorization:
    FandexMomentumVerifierVercelInventoryReadExecutionAuthorization | null = null;
  let receiptId: string | null = null;
  let interfaceName: string | null = null;
  let exactReadCapabilityValidated = false;

  if (response !== null) {
    const normalized = input.upstreamV177.normalized;
    if (
      input.upstreamV177.responseId !== response.responseId
      || normalized.provisioningAuthorizationId
        !== response.provisioningAuthorization.authorizationId
      || normalized.credentialHandleId !== response.credentialHandle.handleId
      || normalized.readExecutionAuthorizationId
        !== response.readExecutionAuthorization.authorizationId
      || normalized.capabilityReceiptId !== response.capabilityReceipt.receiptId
      || response.upstreamV176Digest !== input.upstreamV177.upstreamV176Digest
      || response.upstreamV172Digest !== input.upstreamV177.upstreamV172Digest
    ) {
      blockers.push('operator-response-v177-binding-mismatch');
    }

    if (
      !effectiveAuthorization(response.provisioningAuthorization, input.evaluatedAt)
      || !effectiveAuthorization(response.readExecutionAuthorization, input.evaluatedAt)
    ) {
      blockers.push('operator-response-authorization-not-effective-at-projection-time');
    }

    exactReadCapabilityValidated =
      normalized.capabilityCanExecuteExactRead === true
      && response.capabilityReceipt.authenticatedReadOnly === true
      && response.capabilityReceipt.mutationCapabilityPresent === false
      && response.capabilityReceipt.exactRequestSupported === true
      && response.capabilityReceipt.maximumProviderCalls === 1
      && response.capabilityReceipt.maximumInventoryReads === 1
      && response.capabilityReceipt.request.method === 'GET'
      && response.capabilityReceipt.request.endpoint === '/v10/projects/{idOrName}/env'
      && response.capabilityReceipt.request.decrypt === 'false'
      && response.capabilityReceipt.request.gitBranch === null
      && response.capabilityReceipt.request.customEnvironmentId === null
      && response.capabilityReceipt.request.customEnvironmentSlug === null
      && response.capabilityReceipt.request.teamId
        === 'team_OrRPxuBxMwCYU3kk0r76AfOs'
      && response.capabilityReceipt.request.projectId
        === 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
      && response.capabilityReceipt.credentialHandleId
        === response.credentialHandle.handleId;

    if (!exactReadCapabilityValidated) {
      blockers.push('operator-response-exact-read-capability-not-preserved');
    }

    receiptId = response.capabilityReceipt.receiptId;
    interfaceName = response.capabilityReceipt.interfaceName;

    if (blockers.length === 0) {
      projectedV172Authorization = Object.freeze({
        state: 'approved' as const,
        authorizationId: response.provisioningAuthorization.authorizationId,
        decidedAt: response.provisioningAuthorization.decidedAt,
        decidedBy: response.provisioningAuthorization.decidedBy,
        validFrom: response.provisioningAuthorization.validFrom,
        expiresAt: response.provisioningAuthorization.expiresAt,
        revokedAt: response.provisioningAuthorization.revokedAt,
      });

      projectedV172CredentialHandle = Object.freeze({
        handleId: response.credentialHandle.handleId,
        provider: 'vercel' as const,
        kind: 'opaque-bearer-credential-handle' as const,
        tokenValueExposed: false as const,
        targetTeamId: response.credentialHandle.targetTeamId,
        targetProjectId: response.credentialHandle.targetProjectId,
        bearerCredentialAvailable: response.credentialHandle.bearerCredentialAvailable,
        credentialUsableForRead: response.credentialHandle.credentialUsableForRead,
        credentialRevoked: response.credentialHandle.credentialRevoked,
        providerLevelScopeRestrictedToInventoryRead: 'not-proven' as const,
      });

      projectedV172 = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
        evaluatedAt: input.evaluatedAt,
        requestIntent: 'explicit-read-channel-authorization',
        authorization: projectedV172Authorization,
        credentialHandle: projectedV172CredentialHandle,
      });

      if (
        projectedV172.state !== 'read-channel-provisioning-ready'
        || projectedV172.provisioningAuthorized !== true
        || projectedV172.credentialHandleAccepted !== true
        || projectedV172.readExecutionAuthorized !== false
      ) {
        blockers.push('projected-v172-not-provisioning-ready');
        projectedV172 = null;
      } else {
        projectedV173ReadExecutionAuthorization = Object.freeze({
          state: 'approved' as const,
          authorizationId: response.readExecutionAuthorization.authorizationId,
          decidedAt: response.readExecutionAuthorization.decidedAt,
          decidedBy: response.readExecutionAuthorization.decidedBy,
          validFrom: response.readExecutionAuthorization.validFrom,
          expiresAt: response.readExecutionAuthorization.expiresAt,
          revokedAt: response.readExecutionAuthorization.revokedAt,
          upstreamV172Digest: projectedV172.digest,
          provisioningAuthorizationId:
            response.provisioningAuthorization.authorizationId,
          credentialHandleId: response.credentialHandle.handleId,
        });
      }
    }
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const projectionReady = uniqueBlockers.length === 0
    && projectedV172Authorization !== null
    && projectedV172CredentialHandle !== null
    && projectedV172 !== null
    && projectedV173ReadExecutionAuthorization !== null;

  const payload = {
    contractVersion: FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_VERSION,
    state: projectionReady
      ? 'operator-response-projection-ready' as const
      : 'operator-response-projection-blocked' as const,
    projectionReady,
    upstreamV177Digest: input.upstreamV177.digest,
    projectedV172Authorization,
    projectedV172CredentialHandle,
    projectedV172,
    projectedV173ReadExecutionAuthorization,
    capability: Object.freeze({
      receiptId,
      interfaceName,
      exactReadCapabilityValidated,
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
