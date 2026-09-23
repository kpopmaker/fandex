import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexMomentumVerifierVercelInventoryReadChannelPlan,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';
import {
  buildFandexMomentumVerifierVercelInventoryExecutionEnvelope,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';
import {
  evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake,
  FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_DESCRIPTOR,
  type FandexMomentumVerifierExternalInventoryExecutionResponse,
} from '../lib/intelligence/fandexMomentumVerifierExternalInventoryExecutionResponseIntakeResearch';

const EVALUATED_AT = '2026-09-23T02:10:00.000Z';
const HANDLE = 'opaque-vercel-bearer:v179:synthetic';

function readyV173() {
  const v172 = buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: EVALUATED_AT,
    requestIntent: 'explicit-read-channel-authorization',
    authorization: {
      state: 'approved',
      authorizationId: '1'.repeat(64),
      decidedAt: '2026-09-23T02:00:00.000Z',
      decidedBy: 'synthetic-provisioning-reviewer',
      validFrom: '2026-09-23T02:00:00.000Z',
      expiresAt: '2026-09-23T04:00:00.000Z',
      revokedAt: null,
    },
    credentialHandle: {
      handleId: HANDLE,
      provider: 'vercel',
      kind: 'opaque-bearer-credential-handle',
      tokenValueExposed: false,
      targetTeamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      targetProjectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      bearerCredentialAvailable: true,
      credentialUsableForRead: true,
      credentialRevoked: false,
      providerLevelScopeRestrictedToInventoryRead: 'not-proven',
    },
  });

  assert.equal(v172.state, 'read-channel-provisioning-ready');

  const v173 = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: EVALUATED_AT,
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: v172,
    readExecutionAuthorization: {
      state: 'approved',
      authorizationId: '2'.repeat(64),
      decidedAt: '2026-09-23T02:01:00.000Z',
      decidedBy: 'synthetic-read-reviewer',
      validFrom: '2026-09-23T02:01:00.000Z',
      expiresAt: '2026-09-23T03:30:00.000Z',
      revokedAt: null,
      upstreamV172Digest: v172.digest,
      provisioningAuthorizationId: '1'.repeat(64),
      credentialHandleId: HANDLE,
    },
  });

  assert.equal(v173.state, 'read-execution-ready');
  assert.ok(v173.envelope);
  return v173;
}

function responseFor(
  v173: ReturnType<typeof readyV173>,
  overrides: Partial<FandexMomentumVerifierExternalInventoryExecutionResponse> = {},
): FandexMomentumVerifierExternalInventoryExecutionResponse {
  return {
    responseId: 'external-inventory-response:v179:synthetic',
    submittedAt: EVALUATED_AT,
    submittedBy: 'synthetic-external-operator',
    upstreamV173Digest: v173.digest,
    execution: {
      status: 'success',
      envelopeId: v173.envelope!.envelopeId,
      interfaceName: 'synthetic-vercel-read-interface',
      method: 'GET',
      endpoint: '/v10/projects/{idOrName}/env',
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      decryptRequested: false,
      readCount: 1,
      mutationCapabilityPresent: false,
      decryptTruePathPresent: false,
      decryptedValueEndpointPresent: false,
      credentialValueExposed: false,
      providerResponseReceived: true,
      responseBoundToProjectAndTeam: true,
      completeForProductionTarget: true,
      truncationOrAdditionalPageRisk: false,
      rawProviderResponsePersisted: false,
      secretValueLogged: false,
      secretValuePersisted: false,
    },
    providerRows: [],
    opaqueSecretRollbackAttestation: null,
    ...overrides,
  };
}

test('v179 is intake-only and cannot perform provider or Product effects', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_DESCRIPTOR.intakeOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_DESCRIPTOR.providerReadPerformedByThisContract,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_DESCRIPTOR.existingDedicatedSecretRequiresOpaqueRollbackAttestation,
    true,
  );
});

test('missing external execution response remains fail-closed', () => {
  const v173 = readyV173();
  const out = evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake({
    evaluatedAt: EVALUATED_AT,
    requestIntent: 'generic-continuation',
    upstreamV173: v173,
    response: null,
  });

  assert.equal(out.state, 'external-inventory-execution-response-missing');
  assert.equal(out.intakeReady, false);
  assert.equal(out.v171HandoffReady, false);
  assert.equal(out.v174, null);
  assert.ok(out.blockers.includes('generic-continuation-is-not-external-inventory-execution-response'));
  assert.ok(out.blockers.includes('external-inventory-execution-response-missing'));
  assert.equal(out.effects.vercelReads, 0);
  assert.equal(out.productBoundary.productMomentumScore, null);
});

test('complete empty inventory can hand off through v174 to v171 without inventing keys', () => {
  const v173 = readyV173();
  const response = responseFor(v173);
  const out = evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake({
    evaluatedAt: EVALUATED_AT,
    requestIntent: 'external-inventory-execution-response-intake',
    upstreamV173: v173,
    response,
  });

  assert.equal(out.state, 'v171-handoff-ready');
  assert.equal(out.intakeReady, true);
  assert.equal(out.v171HandoffReady, true);
  assert.deepEqual(out.blockers, []);
  assert.equal(out.secretRollback.dedicatedSecretRowPresent, false);
  assert.equal(out.secretRollback.opaqueRollbackAttestationRequired, false);
  assert.equal(out.v174?.receiptReady, true);
  assert.equal(out.v174?.v171?.acquisitionReady, true);
});

test('existing dedicated secret requires exact opaque rollback attestation', () => {
  const v173 = readyV173();
  const secretRow = {
    id: 'env_v179_existing_secret',
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    type: 'sensitive',
    target: ['production'] as const,
    decrypted: false,
    value: null,
  };
  const response = responseFor(v173, { providerRows: [secretRow] });
  const out = evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake({
    evaluatedAt: EVALUATED_AT,
    requestIntent: 'external-inventory-execution-response-intake',
    upstreamV173: v173,
    response,
  });

  assert.equal(out.state, 'external-inventory-execution-response-invalid');
  assert.equal(out.intakeReady, false);
  assert.equal(out.secretRollback.dedicatedSecretRowPresent, true);
  assert.equal(out.secretRollback.dedicatedSecretEnvId, secretRow.id);
  assert.equal(out.secretRollback.opaqueRollbackAttestationRequired, true);
  assert.equal(out.secretRollback.opaqueRollbackAttestationAccepted, false);
  assert.ok(
    out.blockers.includes(
      'external-inventory-execution-response-opaque-secret-rollback-attestation-required',
    ),
  );
});

test('matching opaque rollback attestation allows an existing secret to reach v171', () => {
  const v173 = readyV173();
  const secretRow = {
    id: 'env_v179_existing_secret',
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    type: 'sensitive',
    target: ['production'] as const,
    decrypted: false,
    value: null,
  };
  const response = responseFor(v173, {
    providerRows: [secretRow],
    opaqueSecretRollbackAttestation: {
      envId: secretRow.id,
      handleId: 'opaque-secret-rollback:v179:synthetic',
      restorable: true,
      source: 'trusted-environment-opaque-snapshot',
      secretValueExposed: false,
    },
  });

  const out = evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake({
    evaluatedAt: EVALUATED_AT,
    requestIntent: 'external-inventory-execution-response-intake',
    upstreamV173: v173,
    response,
  });

  assert.equal(out.state, 'v171-handoff-ready');
  assert.equal(out.intakeReady, true);
  assert.equal(out.v171HandoffReady, true);
  assert.equal(out.secretRollback.opaqueRollbackAttestationAccepted, true);
  assert.equal(out.v174?.v171?.v170.rollbackReadiness.rollbackReady, true);
});

test('secret-like provider values are rejected before v174 handoff', () => {
  const v173 = readyV173();
  const response = responseFor(v173, {
    providerRows: [{
      id: 'env_v179_existing_secret',
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
      type: 'sensitive',
      target: ['production'],
      decrypted: false,
      value: 'must-not-enter-intake',
    }],
    opaqueSecretRollbackAttestation: {
      envId: 'env_v179_existing_secret',
      handleId: 'opaque-secret-rollback:v179:synthetic',
      restorable: true,
      source: 'trusted-environment-opaque-snapshot',
      secretValueExposed: false,
    },
  });

  const out = evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake({
    evaluatedAt: EVALUATED_AT,
    requestIntent: 'external-inventory-execution-response-intake',
    upstreamV173: v173,
    response,
  });

  assert.equal(out.intakeReady, false);
  assert.equal(out.v174, null);
  assert.ok(
    out.blockers.includes(
      'external-inventory-execution-response-sensitive-value-forbidden',
    ),
  );
});
