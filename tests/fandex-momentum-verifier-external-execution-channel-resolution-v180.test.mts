import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FANDEX_MOMENTUM_VERIFIER_EXTERNAL_EXECUTION_CHANNEL_RESOLUTION_DESCRIPTOR,
  resolveFandexMomentumVerifierExternalExecutionChannel,
} from '../lib/intelligence/fandexMomentumVerifierExternalExecutionChannelResolutionResearch';

const upstream = Object.freeze({
  v172Digest: 'e779f7386db56d4fff7202d45a82c35c522036748018071b8205523a843f4b2a',
  v176Digest: 'd66383659245ec10012bfd3575fe4cf16a89299784580a2a5159638d4e146ed5',
  v177Digest: '3478a5aceced9142b647c8b43546edc9fd3b4f1c48793df9e91f462b1aa06671',
  v178Digest: '673f266e36cd51b42073f24f902e59f9b1dec24a3d2e0f8de424f553093555b3',
  v179Digest: 'c95844f671fc62bc146fd4b0875ae433de605983389e16d52a8805c6709b889a',
});

function baseInput() {
  return {
    observedAt: '2026-09-23T02:20:00.000Z',
    upstream,
    providerContract: {
      provider: 'vercel' as const,
      endpointConfirmedFromOfficialDocumentation: true,
      method: 'GET' as const,
      endpoint: '/v10/projects/{idOrName}/env' as const,
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
      decrypt: 'false' as const,
      maximumProviderCalls: 1 as const,
      maximumInventoryReads: 1 as const,
    },
    capabilityObservations: {
      connectedVercelExactInventoryReadAvailable: false,
      connectedVercelGenericRestReadAvailable: false,
      connectedVercelProjectMetadataReadAvailable: true,
      connectedVercelGetProjectCallable: false,
      githubActionsCredentialBackedVercelCliReadAvailable: false,
      localAuthenticatedVercelCliReadAvailable: false,
      authenticatedBrowserStructuredInventoryExportAvailable: false,
    },
  };
}

test('v180 remains capability-resolution only with zero effects', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_EXECUTION_CHANNEL_RESOLUTION_DESCRIPTOR.capabilityResolutionOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_EXECUTION_CHANNEL_RESOLUTION_DESCRIPTOR.genericContinuationCountsAsAuthorization,
    false,
  );

  const result = resolveFandexMomentumVerifierExternalExecutionChannel(baseInput());
  assert.equal(result.effects.vercelReads, 0);
  assert.equal(result.effects.vercelWrites, 0);
  assert.equal(result.effects.authorizationWrites, 0);
  assert.equal(result.productBoundary.productMomentumScore, null);
});

test('current observed surfaces resolve to no authenticated exact-read channel', () => {
  const result = resolveFandexMomentumVerifierExternalExecutionChannel(baseInput());

  assert.equal(result.state, 'external-execution-channel-unavailable');
  assert.equal(result.executionChannelCandidateAvailable, false);
  assert.deepEqual(result.candidateChannels, []);
  assert.ok(
    result.blockers.includes(
      'execution-channel-no-authenticated-exact-read-capability',
    ),
  );
  assert.equal(
    result.capabilityObservations.connectedVercelProjectMetadataReadAvailable,
    true,
  );
  assert.equal(
    result.capabilityObservations.connectedVercelGetProjectCallable,
    false,
  );
});

test('an exact connected Vercel inventory action becomes a channel candidate', () => {
  const input = baseInput();
  const result = resolveFandexMomentumVerifierExternalExecutionChannel({
    ...input,
    capabilityObservations: {
      ...input.capabilityObservations,
      connectedVercelExactInventoryReadAvailable: true,
    },
  });

  assert.equal(result.state, 'external-execution-channel-candidate');
  assert.equal(result.executionChannelCandidateAvailable, true);
  assert.deepEqual(
    result.candidateChannels,
    ['connected-vercel-exact-inventory-read'],
  );
  assert.deepEqual(result.blockers, []);
});

test('a credential-backed GitHub Actions vercel CLI path becomes a channel candidate', () => {
  const input = baseInput();
  const result = resolveFandexMomentumVerifierExternalExecutionChannel({
    ...input,
    capabilityObservations: {
      ...input.capabilityObservations,
      githubActionsCredentialBackedVercelCliReadAvailable: true,
    },
  });

  assert.equal(result.executionChannelCandidateAvailable, true);
  assert.deepEqual(
    result.candidateChannels,
    ['github-actions-credential-backed-vercel-cli-read'],
  );
});

test('provider endpoint confirmation is required even if a channel exists', () => {
  const input = baseInput();
  const result = resolveFandexMomentumVerifierExternalExecutionChannel({
    ...input,
    providerContract: {
      ...input.providerContract,
      endpointConfirmedFromOfficialDocumentation: false,
    },
    capabilityObservations: {
      ...input.capabilityObservations,
      connectedVercelExactInventoryReadAvailable: true,
    },
  });

  assert.equal(result.state, 'external-execution-channel-unavailable');
  assert.equal(result.executionChannelCandidateAvailable, false);
  assert.ok(
    result.blockers.includes('execution-channel-provider-endpoint-unconfirmed'),
  );
});

test('operator exchange preserves the exact v177/v178/v179 boundaries', () => {
  const result = resolveFandexMomentumVerifierExternalExecutionChannel(baseInput());

  assert.equal(
    result.operatorExchange.preRead.contractVersion,
    'v177_fandex_momentum_verifier_operator_response_intake_research_v1',
  );
  assert.equal(
    result.operatorExchange.preRead.upstreamV176Digest,
    upstream.v176Digest,
  );
  assert.equal(
    result.operatorExchange.preRead.upstreamV172Digest,
    upstream.v172Digest,
  );
  assert.equal(
    result.operatorExchange.preRead.rawCredentialValueForbidden,
    true,
  );
  assert.equal(
    result.operatorExchange.projection.expectedV173StateAfterValidProjection,
    'read-execution-ready',
  );
  assert.equal(result.operatorExchange.execution.exactlyOneReadRequired, true);
  assert.equal(
    result.operatorExchange.postRead.existingDedicatedSecretRequiresExactEnvIdBoundOpaqueRollbackAttestation,
    true,
  );
  assert.equal(
    result.operatorExchange.postRead.absentDedicatedSecretRequiresRollbackAttestation,
    false,
  );
});
