import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierOperatorResponseIntake,
  FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_DESCRIPTOR,
  type FandexMomentumVerifierOperatorResponse,
} from '../lib/intelligence/fandexMomentumVerifierOperatorResponseIntakeResearch';

const V172 =
  'e779f7386db56d4fff7202d45a82c35c522036748018071b8205523a843f4b2a';
const V176 =
  'd66383659245ec10012bfd3575fe4cf16a89299784580a2a5159638d4e146ed5';
const HANDLE = 'opaque-vercel-bearer:v177:synthetic';

function validResponse(): FandexMomentumVerifierOperatorResponse {
  return {
    responseId: 'operator-response:v177:synthetic',
    submittedAt: '2026-09-23T01:00:00.000Z',
    submittedBy: 'synthetic-operator',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    provisioningAuthorization: {
      authorizationId:
        '1111111111111111111111111111111111111111111111111111111111111111',
      kind: 'read-channel-provisioning',
      decidedAt: '2026-09-23T00:55:00.000Z',
      decidedBy: 'synthetic-provisioning-reviewer',
      validFrom: '2026-09-23T00:55:00.000Z',
      expiresAt: '2026-09-23T02:00:00.000Z',
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
      authorizationId:
        '2222222222222222222222222222222222222222222222222222222222222222',
      kind: 'inventory-read-execution',
      decidedAt: '2026-09-23T00:56:00.000Z',
      decidedBy: 'synthetic-read-reviewer',
      validFrom: '2026-09-23T00:56:00.000Z',
      expiresAt: '2026-09-23T01:30:00.000Z',
      revokedAt: null,
      targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      upstreamV176Digest: V176,
      upstreamV172Digest: V172,
      credentialHandleId: HANDLE,
    },
    capabilityReceipt: {
      receiptId: 'capability-receipt:v177:synthetic',
      observedAt: '2026-09-23T00:58:00.000Z',
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

test('v177 is intake-only and cannot self-authorize or perform provider actions', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_DESCRIPTOR.intakeOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_DESCRIPTOR
      .genericContinuationCountsAsAuthorization,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_DESCRIPTOR
      .operatorResponseMaySelfAuthorize,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_DESCRIPTOR
      .rawCredentialValueAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OPERATOR_RESPONSE_INTAKE_DESCRIPTOR
      .providerReadPerformed,
    false,
  );
});

test('current missing operator response remains blocked under generic continuation', () => {
  const out = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:00:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: null,
  });

  assert.equal(out.state, 'operator-response-missing');
  assert.equal(out.intakeReady, false);
  assert.equal(out.readExecutionAuthorizedByIntake, false);
  assert.deepEqual(out.blockers, ['operator-response-missing']);
  assert.deepEqual(out.normalized, {
    provisioningAuthorizationId: null,
    credentialHandleId: null,
    readExecutionAuthorizationId: null,
    capabilityReceiptId: null,
    capabilityCanExecuteExactRead: false,
  });
});

test('complete synthetic operator response can pass intake without authorizing or executing the read', () => {
  const out = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:00:00.000Z',
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: validResponse(),
  });

  assert.equal(out.state, 'operator-response-intake-ready');
  assert.equal(out.intakeReady, true);
  assert.equal(out.readExecutionAuthorizedByIntake, false);
  assert.deepEqual(out.blockers, []);
  assert.equal(out.normalized.credentialHandleId, HANDLE);
  assert.equal(out.normalized.capabilityCanExecuteExactRead, true);
  assert.equal(out.effects.vercelReads, 0);
  assert.equal(out.effects.vercelWrites, 0);
});

test('generic continuation cannot consume an otherwise valid operator response as authorization', () => {
  const out = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:00:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: validResponse(),
  });

  assert.equal(out.state, 'operator-response-invalid');
  assert.equal(out.intakeReady, false);
  assert.ok(
    out.blockers.includes('generic-continuation-is-not-operator-response-intake'),
  );
});

test('mismatched v176, v172, or credential-handle binding fails closed', () => {
  const response = validResponse();
  const out = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:00:00.000Z',
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: {
      ...response,
      provisioningAuthorization: {
        ...response.provisioningAuthorization,
        upstreamV172Digest: '3'.repeat(64),
      },
      readExecutionAuthorization: {
        ...response.readExecutionAuthorization,
        credentialHandleId: 'opaque-vercel-bearer:v177:wrong',
      },
      capabilityReceipt: {
        ...response.capabilityReceipt,
        upstreamV176Digest: '4'.repeat(64),
      },
    },
  });

  assert.equal(out.state, 'operator-response-invalid');
  assert.equal(out.intakeReady, false);
  assert.ok(
    out.blockers.includes('read-channel-provisioning-authorization-invalid'),
  );
  assert.ok(
    out.blockers.includes('inventory-read-execution-authorization-invalid'),
  );
  assert.ok(out.blockers.includes('operator-response-capability-receipt-invalid'));
});

test('expired and revoked authorization records fail closed distinctly', () => {
  const expiredResponse = validResponse();
  const expired = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T02:00:00.000Z',
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: expiredResponse,
  });
  assert.equal(expired.state, 'operator-response-expired');
  assert.equal(expired.intakeReady, false);

  const revokedResponse = validResponse();
  const revoked = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:00:00.000Z',
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: {
      ...revokedResponse,
      readExecutionAuthorization: {
        ...revokedResponse.readExecutionAuthorization,
        revokedAt: '2026-09-23T00:59:00.000Z',
      },
    },
  });
  assert.equal(revoked.state, 'operator-response-revoked');
  assert.equal(revoked.intakeReady, false);
  assert.ok(
    revoked.blockers.includes('inventory-read-execution-authorization-revoked'),
  );
});

test('missing exact read capability blocks intake even with valid authorizations and handle', () => {
  const response = validResponse();
  const out = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:00:00.000Z',
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: {
      ...response,
      capabilityReceipt: {
        ...response.capabilityReceipt,
        exactEnvironmentInventoryActionAvailable: false,
        genericVercelRestActionAvailable: false,
        exactRequestSupported: false,
      },
    },
  });

  assert.equal(out.state, 'operator-response-invalid');
  assert.equal(out.intakeReady, false);
  assert.ok(
    out.blockers.includes('operator-response-execution-capability-unavailable'),
  );
});

test('raw credential material in operator response is forbidden', () => {
  const response = {
    ...validResponse(),
    bearerToken: 'synthetic-secret-must-not-be-accepted',
  } as unknown as FandexMomentumVerifierOperatorResponse;

  const out = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:00:00.000Z',
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response,
  });

  assert.equal(out.state, 'operator-response-invalid');
  assert.equal(out.intakeReady, false);
  assert.ok(
    out.blockers.includes('operator-response-raw-credential-material-forbidden'),
  );
});

test('v177 always has zero provider, Product, ledger, and PR side effects', () => {
  const out = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: '2026-09-23T01:00:00.000Z',
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response: validResponse(),
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
