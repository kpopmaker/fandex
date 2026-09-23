import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierExternalCapabilityResumeGate,
  FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumVerifierExternalCapabilityResumeGateResearch';

const currentInput = () => ({
  observedAt: '2026-09-23T08:25:00.000Z',
  upstreamV180Digest:
    '66e38e1ff092131b3e1bb9761e7f173970e937386ef7e4336cb7271d19e7377c',
  target: {
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
    method: 'GET' as const,
    endpoint: '/v10/projects/{idOrName}/env' as const,
    decrypt: 'false' as const,
    maximumProviderCalls: 1 as const,
    maximumInventoryReads: 1 as const,
  },
  connectedCapability: {
    vercelPluginInstalled: true,
    vercelPluginEnabled: true,
    vercelSkillAdvertisesEnvironmentVariableSupport: true,
    exactEnvInventoryReadToolExposed: false,
    genericRestReadToolExposed: false,
    projectMetadataToolExposed: true,
    projectMetadataToolCallableForTarget: false,
    projectMetadataToolFailure:
      'connector-schema-server-argument-mismatch' as const,
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
    validV177PreReadResponseAvailable: false,
    validV179PostReadResponseAvailable: false,
  },
});

test('v181 is resume-gate only with zero execution or mutation effects', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR
      .resumeGateOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR
      .pluginInstallationAloneCountsAsCapability,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR
      .skillDocumentationAloneCountsAsCapability,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR
      .genericContinuationCountsAsAuthorization,
    false,
  );

  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate(currentInput());
  assert.deepEqual(out.effects, {
    authorizationWrites: 0,
    credentialCreates: 0,
    credentialReads: 0,
    credentialRotations: 0,
    vercelReads: 0,
    vercelWrites: 0,
    environmentMutations: 0,
    secretReads: 0,
    secretWrites: 0,
    productionDeployments: 0,
    verifierActivations: 0,
    nativeVerifierExecutions: 0,
    databaseWrites: 0,
    productMetricWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
    pullRequestMerges: 0,
  });
});

test('current connected surface is blocked despite installed Vercel plugin and advertised env support', () => {
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate(currentInput());

  assert.equal(out.state, 'resume-capability-blocked');
  assert.equal(out.internalExecutionCanResume, false);
  assert.equal(out.separateAuthorizationStillRequired, true);
  assert.deepEqual(out.candidateChannels, []);
  assert.deepEqual(out.blockers, [
    'connected-vercel-env-read-capability-not-concretely-exposed',
    'connected-vercel-project-metadata-wrapper-mismatch',
    'resume-gate-no-executable-exact-read-capability',
  ]);
  assert.equal(out.productBoundary.productMomentumScore, null);
  assert.equal(out.productBoundary.productionEligible, false);
  assert.equal(out.productBoundary.productProductionActual, '0/7');
});

test('a concrete exact inventory read tool is enough to make capability resumable, but not authorized', () => {
  const input = currentInput();
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      connectedCapability: {
        ...input.connectedCapability,
        exactEnvInventoryReadToolExposed: true,
      },
    });

  assert.equal(out.state, 'resume-capability-available');
  assert.equal(out.internalExecutionCanResume, true);
  assert.equal(out.separateAuthorizationStillRequired, true);
  assert.deepEqual(out.candidateChannels, [
    'connected-vercel-exact-env-inventory-read',
  ]);
  assert.ok(
    out.blockers.includes(
      'connected-vercel-project-metadata-wrapper-mismatch',
    ),
  );
  assert.equal(out.effects.vercelReads, 0);
});

test('generic REST read tool is also a resume candidate but performs no read', () => {
  const input = currentInput();
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      connectedCapability: {
        ...input.connectedCapability,
        genericRestReadToolExposed: true,
      },
    });

  assert.equal(out.state, 'resume-capability-available');
  assert.deepEqual(out.candidateChannels, [
    'connected-vercel-generic-rest-read',
  ]);
  assert.equal(out.effects.vercelReads, 0);
});

test('local CLI only counts when installed and authenticated', () => {
  const input = currentInput();
  const incomplete =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      localCapability: {
        vercelCliInstalled: true,
        vercelCliAuthenticated: false,
        vercelTokenEnvironmentPresent: false,
      },
    });
  assert.equal(incomplete.state, 'resume-capability-blocked');
  assert.ok(
    incomplete.blockers.includes(
      'local-vercel-cli-authenticated-path-incomplete',
    ),
  );

  const ready =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      localCapability: {
        vercelCliInstalled: true,
        vercelCliAuthenticated: true,
        vercelTokenEnvironmentPresent: false,
      },
    });
  assert.equal(ready.state, 'resume-capability-available');
  assert.deepEqual(ready.candidateChannels, [
    'authenticated-local-vercel-cli-api',
  ]);
});

test('browser capability requires both executable automation and authenticated Vercel session', () => {
  const input = currentInput();
  const incomplete =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      browserCapability: {
        executableBrowserAutomationToolExposed: true,
        authenticatedVercelBrowserSessionAvailable: false,
      },
    });
  assert.equal(incomplete.state, 'resume-capability-blocked');
  assert.ok(
    incomplete.blockers.includes(
      'authenticated-browser-execution-path-incomplete',
    ),
  );

  const ready =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      browserCapability: {
        executableBrowserAutomationToolExposed: true,
        authenticatedVercelBrowserSessionAvailable: true,
      },
    });
  assert.equal(ready.state, 'resume-capability-available');
  assert.deepEqual(ready.candidateChannels, [
    'authenticated-browser-vercel-inventory-export',
  ]);
});

test('complete validated external operator exchange is a downstream resume candidate', () => {
  const input = currentInput();
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      externalOperator: {
        validV177PreReadResponseAvailable: true,
        validV179PostReadResponseAvailable: true,
      },
    });

  assert.equal(out.state, 'resume-capability-available');
  assert.deepEqual(out.candidateChannels, [
    'validated-external-operator-exchange',
  ]);
  assert.equal(out.effects.authorizationWrites, 0);
});

test('invalid target or upstream digest remains fail-closed even when a capability exists', () => {
  const input = currentInput();
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      upstreamV180Digest: 'bad',
      connectedCapability: {
        ...input.connectedCapability,
        exactEnvInventoryReadToolExposed: true,
      },
    });

  assert.equal(out.state, 'resume-capability-blocked');
  assert.equal(out.internalExecutionCanResume, false);
  assert.ok(
    out.blockers.includes('resume-gate-upstream-v180-digest-invalid'),
  );
});
