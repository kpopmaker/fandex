import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexMomentumVerifierVercelInventoryReadChannelPlan,
  FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_DESCRIPTOR,
  type FandexMomentumVerifierVercelInventoryCredentialHandle,
  type FandexMomentumVerifierVercelInventoryReadChannelAuthorization,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';

const pending: FandexMomentumVerifierVercelInventoryReadChannelAuthorization = {
  state: 'pending',
  authorizationId: null,
  decidedAt: null,
  decidedBy: null,
  validFrom: null,
  expiresAt: null,
  revokedAt: null,
};

const approved: FandexMomentumVerifierVercelInventoryReadChannelAuthorization = {
  state: 'approved',
  authorizationId:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  decidedAt: '2026-09-22T00:35:00.000Z',
  decidedBy: 'synthetic-test-reviewer',
  validFrom: '2026-09-22T00:35:00.000Z',
  expiresAt: '2026-09-22T01:35:00.000Z',
  revokedAt: null,
};

const handle: FandexMomentumVerifierVercelInventoryCredentialHandle = {
  handleId: 'opaque-vercel-bearer:v172:synthetic',
  provider: 'vercel',
  kind: 'opaque-bearer-credential-handle',
  tokenValueExposed: false,
  targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
  targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
  bearerCredentialAvailable: true,
  credentialUsableForRead: true,
  credentialRevoked: false,
  providerLevelScopeRestrictedToInventoryRead: 'not-proven',
};

test('v172 is plan-only and never assumes provider-level endpoint restriction', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_DESCRIPTOR
      .provisioningPlanOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_DESCRIPTOR
      .providerTokenEndpointScopeAssumed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_DESCRIPTOR
      .providerCredentialCreated,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_DESCRIPTOR
      .inventoryReadPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_READ_CHANNEL_PLAN_DESCRIPTOR
      .genericContinuationCountsAsAuthorization,
    false,
  );
});

test('current research evaluation produces a complete plan but no provisioning authorization', () => {
  const out = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:35:00.000Z',
    requestIntent: 'research-plan-evaluation',
    authorization: pending,
    credentialHandle: null,
  });

  assert.equal(out.state, 'read-channel-plan-ready');
  assert.equal(out.planReady, true);
  assert.equal(out.provisioningAuthorized, false);
  assert.equal(out.readExecutionAuthorized, false);
  assert.equal(out.credentialHandleAccepted, false);
  assert.deepEqual(out.blockers, []);
  assert.deepEqual(out.channelContract.allowedRequest, {
    method: 'GET',
    endpoint: '/v10/projects/{idOrName}/env',
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    decrypt: 'false',
    gitBranch: null,
    customEnvironmentId: null,
    customEnvironmentSlug: null,
  });
  assert.deepEqual(out.channelContract.forbiddenMethods, [
    'POST',
    'PATCH',
    'PUT',
    'DELETE',
  ]);
  assert.equal(
    out.channelContract.credentialBoundary
      .providerLevelEndpointRestrictionAssumed,
    false,
  );
  assert.equal(
    out.channelContract.credentialBoundary.interfaceEnforcesRequestAllowlist,
    true,
  );
});

test('generic continuation is never read-channel authorization', () => {
  const out = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:40:00.000Z',
    requestIntent: 'generic-continuation',
    authorization: approved,
    credentialHandle: handle,
  });

  assert.equal(out.state, 'read-channel-authorization-pending');
  assert.equal(out.provisioningAuthorized, false);
  assert.equal(out.readExecutionAuthorized, false);
  assert.ok(
    out.blockers.includes(
      'generic-continuation-is-not-read-channel-authorization',
    ),
  );
});

test('synthetic explicit approval plus valid opaque handle may make provisioning ready but still not authorize the read', () => {
  const out = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:40:00.000Z',
    requestIntent: 'explicit-read-channel-authorization',
    authorization: approved,
    credentialHandle: handle,
  });

  assert.equal(out.state, 'read-channel-provisioning-ready');
  assert.equal(out.planReady, true);
  assert.equal(out.provisioningAuthorized, true);
  assert.equal(out.readExecutionAuthorized, false);
  assert.equal(out.credentialHandleAccepted, true);
  assert.deepEqual(out.blockers, []);
  assert.equal(
    out.credentialHandle?.providerLevelScopeRestrictedToInventoryRead,
    'not-proven',
  );
  assert.equal(
    out.channelContract.executionBoundary.maxInventoryReadsPerEnvelope,
    1,
  );
  assert.equal(
    out.channelContract.executionBoundary.mutationMethodsExposed,
    false,
  );
  assert.equal(
    out.channelContract.executionBoundary.decryptTrueAllowed,
    false,
  );
  assert.equal(
    out.channelContract.executionBoundary.decryptedEnvValueEndpointAllowed,
    false,
  );
});

test('approved authorization without a valid credential handle cannot authorize provisioning', () => {
  const out = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:40:00.000Z',
    requestIntent: 'explicit-read-channel-authorization',
    authorization: approved,
    credentialHandle: null,
  });

  assert.equal(out.provisioningAuthorized, false);
  assert.equal(out.credentialHandleAccepted, false);
  assert.equal(out.readExecutionAuthorized, false);
});

test('token exposure or wrong target makes the opaque credential handle invalid', () => {
  const exposed = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:40:00.000Z',
    requestIntent: 'explicit-read-channel-authorization',
    authorization: approved,
    credentialHandle: {
      ...handle,
      tokenValueExposed: true,
    } as unknown as FandexMomentumVerifierVercelInventoryCredentialHandle,
  });

  assert.equal(exposed.state, 'read-channel-authorization-invalid');
  assert.equal(exposed.provisioningAuthorized, false);
  assert.ok(exposed.blockers.includes('read-channel-credential-handle-invalid'));

  const wrongProject =
    buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
      evaluatedAt: '2026-09-22T00:40:00.000Z',
      requestIntent: 'explicit-read-channel-authorization',
      authorization: approved,
      credentialHandle: {
        ...handle,
        targetProjectId: 'prj_wrong',
      } as unknown as FandexMomentumVerifierVercelInventoryCredentialHandle,
    });

  assert.equal(wrongProject.state, 'read-channel-authorization-invalid');
  assert.equal(wrongProject.provisioningAuthorized, false);
});

test('synthetic rejected authorization is distinct and non-effective', () => {
  const rejected: FandexMomentumVerifierVercelInventoryReadChannelAuthorization = {
    state: 'rejected',
    authorizationId:
      'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    decidedAt: '2026-09-22T00:35:00.000Z',
    decidedBy: 'synthetic-test-reviewer',
    validFrom: null,
    expiresAt: null,
    revokedAt: null,
  };

  const out = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:40:00.000Z',
    requestIntent: 'research-plan-evaluation',
    authorization: rejected,
    credentialHandle: null,
  });

  assert.equal(out.state, 'read-channel-authorization-rejected');
  assert.equal(out.provisioningAuthorized, false);
  assert.equal(out.readExecutionAuthorized, false);
});

test('synthetic approval becomes expired exactly at its supplied expiry', () => {
  const out = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T01:35:00.000Z',
    requestIntent: 'explicit-read-channel-authorization',
    authorization: approved,
    credentialHandle: handle,
  });

  assert.equal(out.state, 'read-channel-authorization-expired');
  assert.equal(out.provisioningAuthorized, false);
  assert.equal(out.readExecutionAuthorized, false);
});

test('revoked approval fails closed as invalid', () => {
  const revoked: FandexMomentumVerifierVercelInventoryReadChannelAuthorization = {
    ...approved,
    revokedAt: '2026-09-22T00:39:00.000Z',
  };

  const out = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:40:00.000Z',
    requestIntent: 'explicit-read-channel-authorization',
    authorization: revoked,
    credentialHandle: handle,
  });

  assert.equal(out.state, 'read-channel-authorization-invalid');
  assert.equal(out.provisioningAuthorized, false);
  assert.ok(out.blockers.includes('read-channel-authorization-revoked'));
});

test('v172 always has zero side effects', () => {
  const out = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:35:00.000Z',
    requestIntent: 'research-plan-evaluation',
    authorization: pending,
    credentialHandle: null,
  });

  assert.deepEqual(out.effects, {
    credentialCreates: 0,
    credentialReads: 0,
    credentialRotations: 0,
    channelCreates: 0,
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
  });
});
