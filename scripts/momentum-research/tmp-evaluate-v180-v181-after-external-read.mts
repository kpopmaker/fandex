import {
  resolveFandexMomentumVerifierExternalExecutionChannel,
} from '../../lib/intelligence/fandexMomentumVerifierExternalExecutionChannelResolutionResearch';
import {
  evaluateFandexMomentumVerifierExternalCapabilityResumeGate,
} from '../../lib/intelligence/fandexMomentumVerifierExternalCapabilityResumeGateResearch';

const v180 = resolveFandexMomentumVerifierExternalExecutionChannel({
  observedAt: '2026-09-25T12:17:18.009Z',
  upstream: {
    v172Digest: 'e779f7386db56d4fff7202d45a82c35c522036748018071b8205523a843f4b2a',
    v176Digest: 'd66383659245ec10012bfd3575fe4cf16a89299784580a2a5159638d4e146ed5',
    v177Digest: '169c1f11b946521e986ec0f33ee4de444a681f867cfb008bf6dea6c77f526d69',
    v178Digest: '812aaa8508662a84d6fbbc63469cb29599cbfc017f754bdce3c5e1a4b0a155e1',
    v179Digest: '0913a2ef4f129509aac65494ef923851e0dcd30a4764c02df31c1302576bc315',
  },
  providerContract: {
    provider: 'vercel',
    endpointConfirmedFromOfficialDocumentation: true,
    method: 'GET',
    endpoint: '/v10/projects/{idOrName}/env',
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    decrypt: 'false',
    maximumProviderCalls: 1,
    maximumInventoryReads: 1,
  },
  capabilityObservations: {
    connectedVercelExactInventoryReadAvailable: false,
    connectedVercelGenericRestReadAvailable: false,
    connectedVercelProjectMetadataReadAvailable: true,
    connectedVercelGetProjectCallable: true,
    githubActionsCredentialBackedVercelCliReadAvailable: false,
    localAuthenticatedVercelCliReadAvailable: false,
    authenticatedBrowserStructuredInventoryExportAvailable: false,
  },
});

const v181 = evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
  observedAt: '2026-09-25T12:17:18.010Z',
  upstreamV180Digest: v180.digest,
  productProductionActual: '1/7',
  target: {
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    method: 'GET',
    endpoint: '/v10/projects/{idOrName}/env',
    decrypt: 'false',
    maximumProviderCalls: 1,
    maximumInventoryReads: 1,
  },
  connectedCapability: {
    vercelPluginInstalled: true,
    vercelPluginEnabled: true,
    vercelSkillAdvertisesEnvironmentVariableSupport: true,
    exactEnvInventoryReadToolExposed: false,
    genericRestReadToolExposed: false,
    projectMetadataToolExposed: true,
    projectMetadataToolCallableForTarget: true,
    projectMetadataToolFailure: null,
  },
  localCapability: {
    vercelCliInstalled: false,
    vercelCliAuthenticated: false,
    vercelTokenEnvironmentPresent: false,
  },
  browserCapability: {
    executableBrowserAutomationToolExposed: false,
    authenticatedVercelBrowserSessionAvailable: false,
  },
  externalOperator: {
    validV177PreReadResponseAvailable: true,
    validV179PostReadResponseAvailable: true,
  },
});

console.log(JSON.stringify({ v180, v181 }, null, 2));
