import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierOperatorResponseIntake,
  type FandexMomentumVerifierOperatorResponse,
} from '../lib/intelligence/fandexMomentumVerifierOperatorResponseIntakeResearch';
import {
  projectFandexMomentumVerifierOperatorResponse,
  FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumVerifierOperatorResponseProjectionResearch';
import {
  buildFandexMomentumVerifierVercelInventoryReadChannelPlan,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';
import {
  buildFandexMomentumVerifierVercelInventoryExecutionEnvelope,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';

const V172 =
  'e779f7386db56d4fff7202d45a82c35c522036748018071b8205523a843f4b2a';
const V176 =
  'd66383659245ec10012bfd3575fe4cf16a89299784580a2a5159638d4e146ed5';
const HANDLE = 'opaque-vercel-bearer:v178:synthetic';

function validResponse(): FandexMomentumVerifierOperatorResponse {
  return {
    responseId: 'operator-response:v178:synthetic',
    submittedAt: '2026-09-23T01:20:00.000Z',
    submittedBy: 'synthetic-operator',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    provisioningAuthorization: {
      authorizationId: '1'.repeat(64),
      kind: 'read-channel-provisioning',
      decidedAt: '2026-09-23T01:15:00.000Z',
      decidedBy: 'synthetic-provisioning-reviewer',
      validFrom: '2026-09-23T01:15:00.000Z',
      expiresAt: '2026-09-23T03:00:00.000Z',
      revokedAt: null,
      targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      upstreamV176Digest: V176,
      upstreamV172Digest: V172,
      credentialHandleId: HANDLE,
    },
    credentialHandle: {
      handleId: HANDLE,
      provider: 'vercel',
      kind: 'opaque-bearer-credential-handle',
      tokenValueExposed: false,
      tokenValuePersisted: false,
      targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      bearerCredentialAvailable: true,
      credentialUsableForRead: true,
      credentialRevoked: false,
    },
    readExecutionAuthorization: {
      authorizationId: '2'.repeat(64),
      kind: 'inventory-read-execution',
      decidedAt: '2026-09-23T01:16:00.000Z',
      decidedBy: 'synthetic-read-reviewer',
      validFrom: '2026-09-23T01:16:00.000Z',
      expiresAt: '2026-09-23T02:30:00.000Z',
      revokedAt: null,
      targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      upstreamV176Digest: V176,
      upstreamV172Digest: V172,
      credentialHandleId: HANDLE,
    },
    capabilityReceipt: {
      receiptId: 'capability-receipt:v178:synthetic',
      observedAt: '2026-09-23T01:18:00.000Z',
      interfaceName: 'synthetic-vercel-read-interface',
      exactEnvironmentInventoryActionAvailable: true,
      genericVercelRestActionAvailable: false,
      authenticatedReadOnly: true,
      mutationCapabilityPresent: false,
      exactRequestSupported: true,
      maximumProviderCalls: 1,
      maximumInventoryReads: 1,
      request: {
        method: 'GET',
        endpoint: '/v10/projects/{idOrName}/env',
        teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
        projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
        decrypt: 'false',
        gitBranch: null,
        customEnvironmentId: null,
        customEnvironmentSlug: null,
      },
      credentialHandleId: HANDLE,
      upstreamV176Digest: V176,
      upstreamV172Digest: V172,
    },
  };
}

function readyIntake(response = validResponse()) {
  return evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response,
  });
}

test('v178 is projection-only with zero execution authority side effects', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_DESCRIPTOR.projectionOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_DESCRIPTOR.createsAuthorization,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_DESCRIPTOR.executesProviderRead,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_PROJECTION_DESCRIPTOR.credentialValueAllowed,
    false,
  );
});

test('current missing operator response remains blocked and projects nothing', () => {
  const intake = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: null,
  });

  const out = projectFandexMomentumVerifierOperatorResponse({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV177: intake,
    response: null,
  });

  assert.equal(out.state, 'operator-response-projection-blocked');
  assert.equal(out.projectionReady, false);
  assert.equal(out.projectedV172Authorization, null);
  assert.equal(out.projectedV172CredentialHandle, null);
  assert.equal(out.projectedV173ReadExecutionAuthorization, null);
  assert.ok(out.blockers.includes('upstream-v177-not-intake-ready'));
  assert.ok(out.blockers.includes('validated-operator-response-missing'));
  assert.equal(out.effects.vercelReads, 0);
});

test('valid v177 intake projects losslessly into v172 and v173 prerequisite shapes', () => {
  const response = validResponse();
  const intake = readyIntake(response);
  assert.equal(intake.intakeReady, true);

  const out = projectFandexMomentumVerifierOperatorResponse({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'operator-response-projection',
    upstreamV177: intake,
    response,
  });

  assert.equal(out.state, 'operator-response-projection-ready');
  assert.equal(out.projectionReady, true);
  assert.deepEqual(out.blockers, []);
  assert.equal(out.projectedV172Authorization?.state, 'approved');
  assert.equal(
    out.projectedV172Authorization?.authorizationId,
    response.provisioningAuthorization.authorizationId,
  );
  assert.equal(out.projectedV172CredentialHandle?.handleId, HANDLE);
  assert.equal(
    out.projectedV172CredentialHandle?.providerLevelScopeRestrictedToInventoryRead,
    'not-proven',
  );
  assert.equal(out.projectedV173ReadExecutionAuthorization?.state, 'approved');
  assert.equal(
    out.projectedV173ReadExecutionAuthorization?.authorizationId,
    response.readExecutionAuthorization.authorizationId,
  );
  assert.equal(out.capability.exactReadCapabilityValidated, true);
  assert.equal(JSON.stringify(out).includes('Bearer '), false);
});

test('projected shapes are accepted by v172 and v173 without performing the provider read', () => {
  const response = validResponse();
  const intake = readyIntake(response);
  const projection = projectFandexMomentumVerifierOperatorResponse({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'operator-response-projection',
    upstreamV177: intake,
    response,
  });
  assert.equal(projection.projectionReady, true);

  const v172 = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'explicit-read-channel-authorization',
    authorization: projection.projectedV172Authorization!,
    credentialHandle: projection.projectedV172CredentialHandle!,
  });
  assert.equal(v172.state, 'read-channel-provisioning-ready');
  assert.equal(v172.readExecutionAuthorized, false);

  const v173 = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: v172,
    readExecutionAuthorization: {
      ...projection.projectedV173ReadExecutionAuthorization!,
      upstreamV172Digest: v172.digest,
    },
  });
  assert.equal(v173.state, 'read-execution-ready');
  assert.equal(v173.envelopePrepared, true);
  assert.equal(v173.readExecutionAuthorized, true);
  assert.equal(v173.effects.vercelReads, 0);
  assert.equal(projection.effects.vercelReads, 0);
});

test('projection fails closed if authorization expires after intake', () => {
  const response = validResponse();
  const intake = readyIntake(response);
  const out = projectFandexMomentumVerifierOperatorResponse({
    evaluatedAt: '2026-09-23T02:30:00.000Z',
    requestIntent: 'operator-response-projection',
    upstreamV177: intake,
    response,
  });

  assert.equal(out.state, 'operator-response-projection-blocked');
  assert.equal(out.projectionReady, false);
  assert.ok(
    out.blockers.includes(
      'operator-response-authorization-not-effective-at-projection-time',
    ),
  );
});

test('projection fails closed on v177/response binding mismatch', () => {
  const response = validResponse();
  const intake = readyIntake(response);
  const changed = {
    ...response,
    responseId: 'operator-response:v178:changed',
  };

  const out = projectFandexMomentumVerifierOperatorResponse({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'operator-response-projection',
    upstreamV177: intake,
    response: changed,
  });

  assert.equal(out.projectionReady, false);
  assert.ok(out.blockers.includes('operator-response-v177-binding-mismatch'));
});

test('v178 always has zero provider, Product, ledger, and PR side effects', () => {
  const response = validResponse();
  const out = projectFandexMomentumVerifierOperatorResponse({
    evaluatedAt: '2026-09-23T01:20:00.000Z',
    requestIntent: 'operator-response-projection',
    upstreamV177: readyIntake(response),
    response,
  });

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
