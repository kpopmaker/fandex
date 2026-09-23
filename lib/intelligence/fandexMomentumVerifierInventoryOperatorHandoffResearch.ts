import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumVerifierRealInventoryAcquisitionReadinessResult,
} from './fandexMomentumVerifierRealInventoryAcquisitionReadinessResearch';

export const FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_VERSION =
  'v176_fandex_momentum_verifier_inventory_operator_handoff_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_VERSION,
    lifecycle: 'research' as const,
    handoffPacketOnly: true as const,
    upstreamV175Contract:
      'v175_fandex_momentum_verifier_real_inventory_acquisition_readiness_research_v1' as const,
    genericContinuationCountsAsAuthorization: false as const,
    operatorAuthorizationGrantedByPacket: false as const,
    providerCredentialCreated: false as const,
    providerCredentialRead: false as const,
    providerCredentialRotated: false as const,
    providerReadExecuted: false as const,
    providerMutationExecuted: false as const,
    productionMutationAllowed: false as const,
  });

export type FandexMomentumVerifierInventoryOperatorHandoffResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_VERSION;
    state:
      | 'operator-handoff-required'
      | 'operator-capability-missing'
      | 'operator-read-prerequisites-ready';
    handoffRequired: boolean;
    readPrerequisitesReady: boolean;
    upstream: Readonly<{
      v175Digest: string;
      v175State: FandexMomentumVerifierRealInventoryAcquisitionReadinessResult['state'];
      v175ExternalReadReady: boolean;
      v175RealAcquisitionReady: boolean;
    }>;
    connectedExecutionCapability: Readonly<{
      exactVercelEnvironmentInventoryReadActionAvailable: boolean;
      genericVercelRestActionAvailable: boolean;
      currentConnectorCanExecuteRequiredRead: boolean;
      source: 'connected-tool-surface-inspection';
    }>;
    requiredAuthorizations: Readonly<{
      readChannelProvisioningAuthorization: Readonly<{
        required: true;
        currentlyPresent: boolean;
        satisfiedByGenericContinuation: false;
      }>;
      inventoryReadExecutionAuthorization: Readonly<{
        required: true;
        currentlyPresent: boolean;
        satisfiedByGenericContinuation: false;
      }>;
    }>;
    credentialRequirement: Readonly<{
      opaqueVercelBearerCredentialHandleRequired: true;
      currentlyPresent: boolean;
      currentlyAccepted: boolean;
      rawTokenMayBeProvidedToResearchArtifact: false;
      rawTokenMayBeLogged: false;
      rawTokenMayBePersisted: false;
    }>;
    exactReadRequest: Readonly<{
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decrypt: 'false';
      gitBranch: null;
      customEnvironmentId: null;
      customEnvironmentSlug: null;
      maximumProviderCalls: 1;
      maximumInventoryReads: 1;
    }>;
    expectedExecutionReceipt: Readonly<{
      exactEnvelopeBindingRequired: true;
      executionStatusRequired: 'success';
      readCountRequired: 1;
      mutationCapabilityPresentRequired: false;
      decryptTruePathPresentRequired: false;
      decryptedValueEndpointPresentRequired: false;
      credentialValueExposedRequired: false;
      providerResponseReceivedRequired: true;
      responseBoundToProjectAndTeamRequired: true;
      completeForProductionTargetRequired: true;
      truncationOrAdditionalPageRiskRequired: false;
      rawProviderResponsePersistedRequired: false;
      secretValueLoggedRequired: false;
      secretValuePersistedRequired: false;
    }>;
    forbiddenActions: readonly [
      'create-or-rotate-vercel-credential',
      'expose-vercel-credential-value',
      'mutate-vercel-environment',
      'deploy-production',
      'activate-native-verifier',
      'execute-native-verifier',
      'advance-research-ledger',
      'mutate-product-state',
      'mutate-variable-registry',
      'merge-pr-127',
    ];
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

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function buildFandexMomentumVerifierInventoryOperatorHandoff(
  input: Readonly<{
    v175: FandexMomentumVerifierRealInventoryAcquisitionReadinessResult;
    connectedExecutionCapability: Readonly<{
      exactVercelEnvironmentInventoryReadActionAvailable: boolean;
      genericVercelRestActionAvailable: boolean;
    }>;
  }>,
): FandexMomentumVerifierInventoryOperatorHandoffResult {
  const blockers: string[] = [];
  const v175 = input.v175;

  if (
    v175.contractVersion
      !== 'v175_fandex_momentum_verifier_real_inventory_acquisition_readiness_research_v1'
    || !validDigest(v175.digest)
  ) {
    blockers.push('v175-readiness-binding-invalid');
  }

  const provisioningAuthorizationPresent =
    v175.stages.readChannelProvisioningAuthorizationPresent;
  const readExecutionAuthorizationPresent =
    v175.stages.readExecutionAuthorizationPresent;
  const credentialPresent = v175.stages.opaqueCredentialHandlePresent;
  const credentialAccepted = v175.stages.opaqueCredentialHandleAccepted;

  if (!provisioningAuthorizationPresent) {
    blockers.push('operator-read-channel-provisioning-authorization-required');
  }
  if (!credentialPresent) {
    blockers.push('operator-opaque-vercel-credential-handle-required');
  } else if (!credentialAccepted) {
    blockers.push('operator-opaque-vercel-credential-handle-not-accepted');
  }
  if (!readExecutionAuthorizationPresent) {
    blockers.push('operator-inventory-read-execution-authorization-required');
  }

  const currentConnectorCanExecuteRequiredRead =
    input.connectedExecutionCapability
      .exactVercelEnvironmentInventoryReadActionAvailable
    || input.connectedExecutionCapability.genericVercelRestActionAvailable;

  if (!currentConnectorCanExecuteRequiredRead) {
    blockers.push('operator-execution-capability-unavailable');
  }

  if (!v175.externalReadReady) {
    blockers.push('v175-external-read-not-ready');
  }

  const readPrerequisitesReady =
    provisioningAuthorizationPresent
    && credentialPresent
    && credentialAccepted
    && readExecutionAuthorizationPresent
    && v175.externalReadReady
    && currentConnectorCanExecuteRequiredRead;

  let state:
    FandexMomentumVerifierInventoryOperatorHandoffResult['state'];
  if (readPrerequisitesReady) {
    state = 'operator-read-prerequisites-ready';
  } else if (!currentConnectorCanExecuteRequiredRead) {
    state = 'operator-capability-missing';
  } else {
    state = 'operator-handoff-required';
  }

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_VERSION,
    state,
    handoffRequired: !readPrerequisitesReady,
    readPrerequisitesReady,
    upstream: Object.freeze({
      v175Digest: v175.digest,
      v175State: v175.state,
      v175ExternalReadReady: v175.externalReadReady,
      v175RealAcquisitionReady: v175.realAcquisitionReady,
    }),
    connectedExecutionCapability: Object.freeze({
      exactVercelEnvironmentInventoryReadActionAvailable:
        input.connectedExecutionCapability
          .exactVercelEnvironmentInventoryReadActionAvailable,
      genericVercelRestActionAvailable:
        input.connectedExecutionCapability.genericVercelRestActionAvailable,
      currentConnectorCanExecuteRequiredRead,
      source: 'connected-tool-surface-inspection' as const,
    }),
    requiredAuthorizations: Object.freeze({
      readChannelProvisioningAuthorization: Object.freeze({
        required: true as const,
        currentlyPresent: provisioningAuthorizationPresent,
        satisfiedByGenericContinuation: false as const,
      }),
      inventoryReadExecutionAuthorization: Object.freeze({
        required: true as const,
        currentlyPresent: readExecutionAuthorizationPresent,
        satisfiedByGenericContinuation: false as const,
      }),
    }),
    credentialRequirement: Object.freeze({
      opaqueVercelBearerCredentialHandleRequired: true as const,
      currentlyPresent: credentialPresent,
      currentlyAccepted: credentialAccepted,
      rawTokenMayBeProvidedToResearchArtifact: false as const,
      rawTokenMayBeLogged: false as const,
      rawTokenMayBePersisted: false as const,
    }),
    exactReadRequest: Object.freeze({
      method: 'GET' as const,
      endpoint: '/v10/projects/{idOrName}/env' as const,
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
      decrypt: 'false' as const,
      gitBranch: null,
      customEnvironmentId: null,
      customEnvironmentSlug: null,
      maximumProviderCalls: 1 as const,
      maximumInventoryReads: 1 as const,
    }),
    expectedExecutionReceipt: Object.freeze({
      exactEnvelopeBindingRequired: true as const,
      executionStatusRequired: 'success' as const,
      readCountRequired: 1 as const,
      mutationCapabilityPresentRequired: false as const,
      decryptTruePathPresentRequired: false as const,
      decryptedValueEndpointPresentRequired: false as const,
      credentialValueExposedRequired: false as const,
      providerResponseReceivedRequired: true as const,
      responseBoundToProjectAndTeamRequired: true as const,
      completeForProductionTargetRequired: true as const,
      truncationOrAdditionalPageRiskRequired: false as const,
      rawProviderResponsePersistedRequired: false as const,
      secretValueLoggedRequired: false as const,
      secretValuePersistedRequired: false as const,
    }),
    forbiddenActions: Object.freeze([
      'create-or-rotate-vercel-credential',
      'expose-vercel-credential-value',
      'mutate-vercel-environment',
      'deploy-production',
      'activate-native-verifier',
      'execute-native-verifier',
      'advance-research-ledger',
      'mutate-product-state',
      'mutate-variable-registry',
      'merge-pr-127',
    ] as const),
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
