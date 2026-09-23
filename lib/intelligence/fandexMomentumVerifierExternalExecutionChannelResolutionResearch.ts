import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_EXTERNAL_EXECUTION_CHANNEL_RESOLUTION_VERSION =
  'v180_fandex_momentum_verifier_external_execution_channel_resolution_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_EXTERNAL_EXECUTION_CHANNEL_RESOLUTION_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_EXTERNAL_EXECUTION_CHANNEL_RESOLUTION_VERSION,
    lifecycle: 'research' as const,
    capabilityResolutionOnly: true as const,
    genericContinuationCountsAsAuthorization: false as const,
    authorizationCreated: false as const,
    providerCredentialCreated: false as const,
    providerCredentialRead: false as const,
    providerReadPerformed: false as const,
    providerWritePerformed: false as const,
    productOrLedgerMutationAllowed: false as const,
    upstreamPreReadIntakeContract:
      'v177_fandex_momentum_verifier_operator_response_intake_research_v1' as const,
    upstreamProjectionContract:
      'v178_fandex_momentum_verifier_operator_response_projection_research_v1' as const,
    downstreamPostReadIntakeContract:
      'v179_fandex_momentum_verifier_external_inventory_execution_response_intake_research_v1' as const,
  });

export type FandexMomentumVerifierExternalExecutionChannel =
  | 'connected-vercel-exact-inventory-read'
  | 'connected-vercel-generic-rest-read'
  | 'github-actions-credential-backed-vercel-cli-read'
  | 'local-authenticated-vercel-cli-read'
  | 'authenticated-browser-structured-inventory-export';

export type FandexMomentumVerifierExternalExecutionChannelResolutionInput =
  Readonly<{
    observedAt: string;
    upstream: Readonly<{
      v172Digest: string;
      v176Digest: string;
      v177Digest: string;
      v178Digest: string;
      v179Digest: string;
    }>;
    providerContract: Readonly<{
      provider: 'vercel';
      endpointConfirmedFromOfficialDocumentation: boolean;
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decrypt: 'false';
      maximumProviderCalls: 1;
      maximumInventoryReads: 1;
    }>;
    capabilityObservations: Readonly<{
      connectedVercelExactInventoryReadAvailable: boolean;
      connectedVercelGenericRestReadAvailable: boolean;
      connectedVercelProjectMetadataReadAvailable: boolean;
      connectedVercelGetProjectCallable: boolean;
      githubActionsCredentialBackedVercelCliReadAvailable: boolean;
      localAuthenticatedVercelCliReadAvailable: boolean;
      authenticatedBrowserStructuredInventoryExportAvailable: boolean;
    }>;
  }>;

export type FandexMomentumVerifierExternalExecutionChannelResolutionResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_EXTERNAL_EXECUTION_CHANNEL_RESOLUTION_VERSION;
    state:
      | 'external-execution-channel-unavailable'
      | 'external-execution-channel-candidate';
    executionChannelCandidateAvailable: boolean;
    candidateChannels:
      readonly FandexMomentumVerifierExternalExecutionChannel[];
    upstream: FandexMomentumVerifierExternalExecutionChannelResolutionInput['upstream'];
    providerContract:
      FandexMomentumVerifierExternalExecutionChannelResolutionInput['providerContract'];
    capabilityObservations:
      FandexMomentumVerifierExternalExecutionChannelResolutionInput['capabilityObservations'];
    operatorExchange: Readonly<{
      preRead: Readonly<{
        contractVersion:
          'v177_fandex_momentum_verifier_operator_response_intake_research_v1';
        requestIntent: 'operator-response-intake';
        upstreamV176Digest: string;
        upstreamV172Digest: string;
        requiredComponents: readonly [
          'read-channel-provisioning-authorization',
          'opaque-vercel-bearer-credential-handle',
          'inventory-read-execution-authorization',
          'exact-read-execution-capability-receipt',
        ];
        rawCredentialValueForbidden: true;
        genericContinuationIsNotAuthorization: true;
      }>;
      projection: Readonly<{
        contractVersion:
          'v178_fandex_momentum_verifier_operator_response_projection_research_v1';
        providerReadPerformed: false;
        expectedV172StateAfterValidProjection:
          'read-channel-provisioning-ready';
        expectedV173StateAfterValidProjection:
          'read-execution-ready';
      }>;
      execution: Readonly<{
        exactlyOneReadRequired: true;
        request: Readonly<{
          method: 'GET';
          endpoint: '/v10/projects/{idOrName}/env';
          teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
          projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
          decrypt: 'false';
        }>;
        mutationCapabilityAllowed: false;
        decryptedValueEndpointAllowed: false;
        credentialValueExposureAllowed: false;
        completenessProofRequired: true;
        truncationOrAdditionalPageRiskAllowed: false;
      }>;
      postRead: Readonly<{
        contractVersion:
          'v179_fandex_momentum_verifier_external_inventory_execution_response_intake_research_v1';
        requestIntent: 'external-inventory-execution-response-intake';
        exactV173BindingRequired: true;
        rawProviderResponsePersistenceAllowed: false;
        secretValueLoggingAllowed: false;
        secretValuePersistenceAllowed: false;
        decryptedProviderRowsAllowed: false;
        sensitiveProviderValuesAllowed: false;
        existingDedicatedSecretRequiresExactEnvIdBoundOpaqueRollbackAttestation: true;
        absentDedicatedSecretRequiresRollbackAttestation: false;
      }>;
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
    productBoundary: Readonly<{
      productMomentumScore: null;
      productionEligible: false;
      productProductionActual: '0/7';
    }>;
    digest: string;
  }>;

function exactIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function resolveFandexMomentumVerifierExternalExecutionChannel(
  input: FandexMomentumVerifierExternalExecutionChannelResolutionInput,
): FandexMomentumVerifierExternalExecutionChannelResolutionResult {
  const blockers: string[] = [];

  if (!exactIso(input.observedAt)) {
    blockers.push('execution-channel-observation-time-invalid');
  }

  for (const [name, digest] of Object.entries(input.upstream)) {
    if (!validDigest(digest)) {
      blockers.push(`execution-channel-upstream-${name}-invalid`);
    }
  }

  const provider = input.providerContract;
  if (
    provider.provider !== 'vercel'
    || provider.method !== 'GET'
    || provider.endpoint !== '/v10/projects/{idOrName}/env'
    || provider.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || provider.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || provider.decrypt !== 'false'
    || provider.maximumProviderCalls !== 1
    || provider.maximumInventoryReads !== 1
  ) {
    blockers.push('execution-channel-provider-contract-invalid');
  }
  if (!provider.endpointConfirmedFromOfficialDocumentation) {
    blockers.push('execution-channel-provider-endpoint-unconfirmed');
  }

  const observed = input.capabilityObservations;
  const candidateChannels: FandexMomentumVerifierExternalExecutionChannel[] = [];

  if (observed.connectedVercelExactInventoryReadAvailable) {
    candidateChannels.push('connected-vercel-exact-inventory-read');
  }
  if (observed.connectedVercelGenericRestReadAvailable) {
    candidateChannels.push('connected-vercel-generic-rest-read');
  }
  if (observed.githubActionsCredentialBackedVercelCliReadAvailable) {
    candidateChannels.push('github-actions-credential-backed-vercel-cli-read');
  }
  if (observed.localAuthenticatedVercelCliReadAvailable) {
    candidateChannels.push('local-authenticated-vercel-cli-read');
  }
  if (observed.authenticatedBrowserStructuredInventoryExportAvailable) {
    candidateChannels.push('authenticated-browser-structured-inventory-export');
  }

  if (candidateChannels.length === 0) {
    blockers.push('execution-channel-no-authenticated-exact-read-capability');
  }

  const executionChannelCandidateAvailable =
    blockers.length === 0
    && provider.endpointConfirmedFromOfficialDocumentation
    && candidateChannels.length > 0;

  const state = executionChannelCandidateAvailable
    ? 'external-execution-channel-candidate' as const
    : 'external-execution-channel-unavailable' as const;

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_EXTERNAL_EXECUTION_CHANNEL_RESOLUTION_VERSION,
    state,
    executionChannelCandidateAvailable,
    candidateChannels: Object.freeze([...candidateChannels]),
    upstream: input.upstream,
    providerContract: input.providerContract,
    capabilityObservations: input.capabilityObservations,
    operatorExchange: Object.freeze({
      preRead: Object.freeze({
        contractVersion:
          'v177_fandex_momentum_verifier_operator_response_intake_research_v1' as const,
        requestIntent: 'operator-response-intake' as const,
        upstreamV176Digest: input.upstream.v176Digest,
        upstreamV172Digest: input.upstream.v172Digest,
        requiredComponents: Object.freeze([
          'read-channel-provisioning-authorization',
          'opaque-vercel-bearer-credential-handle',
          'inventory-read-execution-authorization',
          'exact-read-execution-capability-receipt',
        ] as const),
        rawCredentialValueForbidden: true as const,
        genericContinuationIsNotAuthorization: true as const,
      }),
      projection: Object.freeze({
        contractVersion:
          'v178_fandex_momentum_verifier_operator_response_projection_research_v1' as const,
        providerReadPerformed: false as const,
        expectedV172StateAfterValidProjection:
          'read-channel-provisioning-ready' as const,
        expectedV173StateAfterValidProjection:
          'read-execution-ready' as const,
      }),
      execution: Object.freeze({
        exactlyOneReadRequired: true as const,
        request: Object.freeze({
          method: 'GET' as const,
          endpoint: '/v10/projects/{idOrName}/env' as const,
          teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
          projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
          decrypt: 'false' as const,
        }),
        mutationCapabilityAllowed: false as const,
        decryptedValueEndpointAllowed: false as const,
        credentialValueExposureAllowed: false as const,
        completenessProofRequired: true as const,
        truncationOrAdditionalPageRiskAllowed: false as const,
      }),
      postRead: Object.freeze({
        contractVersion:
          'v179_fandex_momentum_verifier_external_inventory_execution_response_intake_research_v1' as const,
        requestIntent: 'external-inventory-execution-response-intake' as const,
        exactV173BindingRequired: true as const,
        rawProviderResponsePersistenceAllowed: false as const,
        secretValueLoggingAllowed: false as const,
        secretValuePersistenceAllowed: false as const,
        decryptedProviderRowsAllowed: false as const,
        sensitiveProviderValuesAllowed: false as const,
        existingDedicatedSecretRequiresExactEnvIdBoundOpaqueRollbackAttestation:
          true as const,
        absentDedicatedSecretRequiresRollbackAttestation: false as const,
      }),
    }),
    blockers: Object.freeze([...new Set(blockers)]),
    productBoundary: Object.freeze({
      productMomentumScore: null,
      productionEligible: false as const,
      productProductionActual: '0/7' as const,
    }),
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
