import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildFandexMomentumVerifierVercelInventoryExecutionEnvelope,
  FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_DESCRIPTOR,
  type FandexMomentumVerifierVercelInventoryReadExecutionAuthorization,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';
import {
  buildFandexMomentumVerifierVercelInventoryReadChannelPlan,
  type FandexMomentumVerifierVercelInventoryCredentialHandle,
  type FandexMomentumVerifierVercelInventoryReadChannelAuthorization,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';

const provisioningAuthorization: FandexMomentumVerifierVercelInventoryReadChannelAuthorization = {
  state: 'approved',
  authorizationId:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  decidedAt: '2026-09-22T00:35:00.000Z',
  decidedBy: 'synthetic-test-reviewer',
  validFrom: '2026-09-22T00:35:00.000Z',
  expiresAt: '2026-09-22T02:35:00.000Z',
  revokedAt: null,
};

const credentialHandle: FandexMomentumVerifierVercelInventoryCredentialHandle = {
  handleId: 'opaque-vercel-bearer:v173:synthetic',
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

function provisioningReady() {
  return buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:40:00.000Z',
    requestIntent: 'explicit-read-channel-authorization',
    authorization: provisioningAuthorization,
    credentialHandle,
  });
}

const pending: FandexMomentumVerifierVercelInventoryReadExecutionAuthorization = {
  state: 'pending',
  authorizationId: null,
  decidedAt: null,
  decidedBy: null,
  validFrom: null,
  expiresAt: null,
  revokedAt: null,
  upstreamV172Digest: null,
  provisioningAuthorizationId: null,
  credentialHandleId: null,
};

function approvedExecution(
  upstreamDigest: string,
): FandexMomentumVerifierVercelInventoryReadExecutionAuthorization {
  return {
    state: 'approved',
    authorizationId:
      'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    decidedAt: '2026-09-22T00:45:00.000Z',
    decidedBy: 'synthetic-read-execution-reviewer',
    validFrom: '2026-09-22T00:45:00.000Z',
    expiresAt: '2026-09-22T01:15:00.000Z',
    revokedAt: null,
    upstreamV172Digest: upstreamDigest,
    provisioningAuthorizationId:
      provisioningAuthorization.authorizationId,
    credentialHandleId: credentialHandle.handleId,
  };
}

test('v173 is envelope-only and generic continuation is never read execution authorization', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_DESCRIPTOR
      .envelopeOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_DESCRIPTOR
      .actualInventoryReadPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_DESCRIPTOR
      .genericContinuationCountsAsReadAuthorization,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_DESCRIPTOR
      .credentialValueMayEnterEnvelope,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_ENVELOPE_DESCRIPTOR
      .maxReadsPerEnvelope,
    1,
  );
});

test('v173 prepares exactly one bounded GET envelope from synthetic provisioning-ready v172', () => {
  const upstream = provisioningReady();
  assert.equal(upstream.state, 'read-channel-provisioning-ready');

  const out = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:45:00.000Z',
    requestIntent: 'research-envelope-evaluation',
    upstreamV172: upstream,
    readExecutionAuthorization: pending,
  });

  assert.equal(out.state, 'execution-envelope-prepared');
  assert.equal(out.envelopePrepared, true);
  assert.equal(out.readExecutionAuthorized, false);
  assert.deepEqual(out.blockers, []);
  assert.notEqual(out.envelope, null);
  assert.equal(out.envelope?.credentialHandleId, credentialHandle.handleId);
  assert.equal(out.envelope?.request.method, 'GET');
  assert.equal(
    out.envelope?.request.endpoint,
    '/v10/projects/{idOrName}/env',
  );
  assert.equal(out.envelope?.request.decrypt, 'false');
  assert.equal(out.envelope?.request.gitBranch, null);
  assert.equal(out.envelope?.request.customEnvironmentId, null);
  assert.equal(out.envelope?.request.customEnvironmentSlug, null);
  assert.equal(out.envelope?.boundary.maxReads, 1);
  assert.equal(out.envelope?.boundary.mutationMethodsExposed, false);
  assert.equal(out.envelope?.boundary.decryptTrueAllowed, false);
  assert.equal(out.envelope?.boundary.credentialValueIncluded, false);
  assert.equal(
    JSON.stringify(out.envelope).includes('Bearer '),
    false,
  );
});

test('current plan-ready v172 cannot be promoted into an execution envelope', () => {
  const upstream = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:35:00.000Z',
    requestIntent: 'research-plan-evaluation',
    authorization: {
      state: 'pending',
      authorizationId: null,
      decidedAt: null,
      decidedBy: null,
      validFrom: null,
      expiresAt: null,
      revokedAt: null,
    },
    credentialHandle: null,
  });

  const out = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:45:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV172: upstream,
    readExecutionAuthorization: pending,
  });

  assert.equal(out.state, 'execution-envelope-blocked');
  assert.equal(out.envelopePrepared, false);
  assert.equal(out.readExecutionAuthorized, false);
  assert.equal(out.envelope, null);
  assert.deepEqual(out.blockers, [
    'upstream-v172-not-provisioning-ready',
  ]);
});

test('synthetic explicit read-execution approval can make envelope ready without executing the read', () => {
  const upstream = provisioningReady();
  const auth = approvedExecution(upstream.digest);

  const out = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:50:00.000Z',
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: upstream,
    readExecutionAuthorization: auth,
  });

  assert.equal(out.state, 'read-execution-ready');
  assert.equal(out.envelopePrepared, true);
  assert.equal(out.readExecutionAuthorized, true);
  assert.deepEqual(out.blockers, []);
  assert.equal(out.effects.vercelReads, 0);
  assert.equal(out.effects.vercelWrites, 0);
});

test('generic continuation cannot use an otherwise effective read authorization', () => {
  const upstream = provisioningReady();
  const auth = approvedExecution(upstream.digest);

  const out = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:50:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV172: upstream,
    readExecutionAuthorization: auth,
  });

  assert.equal(out.state, 'read-execution-authorization-pending');
  assert.equal(out.readExecutionAuthorized, false);
  assert.ok(
    out.blockers.includes(
      'generic-continuation-is-not-read-execution-authorization',
    ),
  );
});

test('read execution authorization is bound to exact upstream digest, provisioning authorization, and handle id', () => {
  const upstream = provisioningReady();
  const auth = {
    ...approvedExecution(upstream.digest),
    upstreamV172Digest: '1'.repeat(64),
    provisioningAuthorizationId: '2'.repeat(64),
    credentialHandleId: 'opaque-vercel-bearer:v173:wrong',
  };

  const out = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:50:00.000Z',
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: upstream,
    readExecutionAuthorization: auth,
  });

  assert.equal(out.state, 'read-execution-authorization-invalid');
  assert.equal(out.readExecutionAuthorized, false);
  assert.ok(
    out.blockers.includes('read-execution-upstream-v172-binding-mismatch'),
  );
  assert.ok(
    out.blockers.includes(
      'read-execution-provisioning-authorization-binding-mismatch',
    ),
  );
  assert.ok(
    out.blockers.includes('read-execution-credential-handle-binding-mismatch'),
  );
});

test('expired or revoked synthetic read authorization fails closed', () => {
  const upstream = provisioningReady();
  const expired = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T01:15:00.000Z',
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: upstream,
    readExecutionAuthorization: approvedExecution(upstream.digest),
  });
  assert.equal(expired.state, 'read-execution-authorization-expired');
  assert.equal(expired.readExecutionAuthorized, false);

  const revokedAuth = {
    ...approvedExecution(upstream.digest),
    revokedAt: '2026-09-22T00:49:00.000Z',
  };
  const revoked = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:50:00.000Z',
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: upstream,
    readExecutionAuthorization: revokedAuth,
  });
  assert.equal(revoked.state, 'read-execution-authorization-invalid');
  assert.equal(revoked.readExecutionAuthorized, false);
  assert.ok(
    revoked.blockers.includes('read-execution-authorization-revoked'),
  );
});

test('v173 always has zero side effects', () => {
  const upstream = provisioningReady();
  const out = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:45:00.000Z',
    requestIntent: 'research-envelope-evaluation',
    upstreamV172: upstream,
    readExecutionAuthorization: pending,
  });

  assert.deepEqual(out.effects, {
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
  });
});

test('committed v172 state remains non-executable under generic continuation', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_vercel_inventory_read_channel_plan_v172_20260922T003721Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);
  const upstream = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:35:00.000Z',
    requestIntent: 'research-plan-evaluation',
    authorization: audit.currentAuthorization,
    credentialHandle: audit.currentCredentialHandle,
  });

  const out = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:45:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV172: upstream,
    readExecutionAuthorization: pending,
  });

  assert.equal(upstream.digest, audit.currentResult.digest);
  assert.equal(out.state, 'execution-envelope-blocked');
  assert.equal(out.envelopePrepared, false);
  assert.equal(out.readExecutionAuthorized, false);
  assert.equal(out.effects.vercelReads, 0);
});
