import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierRealInventoryAcquisitionReadiness,
  FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumVerifierRealInventoryAcquisitionReadinessResearch';
import {
  buildFandexMomentumVerifierVercelInventoryReadChannelPlan,
  type FandexMomentumVerifierVercelInventoryCredentialHandle,
  type FandexMomentumVerifierVercelInventoryReadChannelAuthorization,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';
import {
  buildFandexMomentumVerifierVercelInventoryExecutionEnvelope,
  type FandexMomentumVerifierVercelInventoryReadExecutionAuthorization,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';
import {
  evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryExecutionReceiptResearch';

const PROVISIONING_AUTHORIZATION_ID =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const provisioningAuthorization: Extract<
  FandexMomentumVerifierVercelInventoryReadChannelAuthorization,
  { state: 'approved' }
> = {
  state: 'approved',
  authorizationId: PROVISIONING_AUTHORIZATION_ID,
  decidedAt: '2026-09-22T00:35:00.000Z',
  decidedBy: 'synthetic-test-reviewer',
  validFrom: '2026-09-22T00:35:00.000Z',
  expiresAt: '2026-09-22T02:35:00.000Z',
  revokedAt: null,
};

const credentialHandle: FandexMomentumVerifierVercelInventoryCredentialHandle = {
  handleId: 'opaque-vercel-bearer:v175:synthetic',
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

function currentV172() {
  return buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
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
}

function provisioningReadyV172() {
  return buildFandexMomentumVerifierVercelInventoryReadChannelPlan({
    evaluatedAt: '2026-09-22T00:40:00.000Z',
    requestIntent: 'explicit-read-channel-authorization',
    authorization: provisioningAuthorization,
    credentialHandle,
  });
}

function pendingExecutionAuthorization(): FandexMomentumVerifierVercelInventoryReadExecutionAuthorization {
  return {
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
}

function approvedExecutionAuthorization(
  upstreamDigest: string,
): Extract<
  FandexMomentumVerifierVercelInventoryReadExecutionAuthorization,
  { state: 'approved' }
> {
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
    provisioningAuthorizationId: PROVISIONING_AUTHORIZATION_ID,
    credentialHandleId: credentialHandle.handleId,
  };
}

function currentV173() {
  return buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T08:07:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV172: currentV172(),
    readExecutionAuthorization: pendingExecutionAuthorization(),
  });
}

function externalReadReadyV173() {
  const v172 = provisioningReadyV172();
  return buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:50:00.000Z',
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: v172,
    readExecutionAuthorization: approvedExecutionAuthorization(v172.digest),
  });
}

function blockedV174() {
  return evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
    evaluatedAt: '2026-09-22T08:20:00.000Z',
    upstreamV173: currentV173(),
    execution: {
      status: 'not-executed',
      envelopeId: null,
      interfaceName: null,
      method: 'GET',
      endpoint: '/v10/projects/{idOrName}/env',
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      decryptRequested: false,
      readCount: 0,
      mutationCapabilityPresent: false,
      decryptTruePathPresent: false,
      decryptedValueEndpointPresent: false,
      credentialValueExposed: false,
      providerResponseReceived: false,
      responseBoundToProjectAndTeam: false,
      completeForProductionTarget: false,
      truncationOrAdditionalPageRisk: false,
      rawProviderResponsePersisted: false,
      secretValueLogged: false,
      secretValuePersisted: false,
    },
    providerRows: [],
    opaqueSecretRollbackAttestation: null,
  });
}

function handoffReadyV174() {
  const v173 = externalReadReadyV173();
  assert.ok(v173.envelope);
  return evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
    evaluatedAt: '2026-09-22T00:55:00.000Z',
    upstreamV173: v173,
    execution: {
      status: 'success',
      envelopeId: v173.envelope!.envelopeId,
      interfaceName: 'synthetic-v175-read-only',
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
  });
}

test('v175 is readiness-only and generic continuation cannot create authorization', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_DESCRIPTOR
      .readinessOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_DESCRIPTOR
      .genericContinuationCountsAsAuthorization,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_DESCRIPTOR
      .credentialCreatedOrRead,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_DESCRIPTOR
      .inventoryReadPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_DESCRIPTOR
      .productMutationPerformed,
    false,
  );
});

test('current real chain exposes exact external blockers and stays fully blocked', () => {
  const out =
    evaluateFandexMomentumVerifierRealInventoryAcquisitionReadiness({
      v172: currentV172(),
      v173: currentV173(),
      v174: blockedV174(),
    });

  assert.equal(out.state, 'real-acquisition-blocked');
  assert.equal(out.realAcquisitionReady, false);
  assert.equal(out.externalReadReady, false);
  assert.deepEqual(out.stages, {
    v172PlanReady: true,
    readChannelProvisioningAuthorizationPresent: false,
    opaqueCredentialHandlePresent: false,
    opaqueCredentialHandleAccepted: false,
    v172ProvisioningReady: false,
    readExecutionAuthorizationPresent: false,
    v173EnvelopePrepared: false,
    v173ReadExecutionAuthorized: false,
    v173ReadExecutionReady: false,
    actualReadReceiptPresent: false,
    v174ReceiptReady: false,
    v174HandoffInvoked: false,
    v171HandoffReady: false,
  });
  assert.ok(
    out.blockers.includes('read-channel-provisioning-authorization-missing'),
  );
  assert.ok(out.blockers.includes('opaque-vercel-credential-handle-missing'));
  assert.ok(
    out.blockers.includes('inventory-read-execution-authorization-missing'),
  );
  assert.ok(out.blockers.includes('actual-inventory-read-receipt-missing'));
  assert.ok(out.blockers.includes('v171-handoff-not-ready'));
  assert.equal(out.productBoundary.productProductionActual, '0/7');
});

test('synthetic provisioning-ready stage still requires separate read-execution authorization', () => {
  const v172 = provisioningReadyV172();
  const v173 = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:45:00.000Z',
    requestIntent: 'research-envelope-evaluation',
    upstreamV172: v172,
    readExecutionAuthorization: pendingExecutionAuthorization(),
  });
  const v174 = evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
    evaluatedAt: '2026-09-22T00:46:00.000Z',
    upstreamV173: v173,
    execution: {
      status: 'not-executed',
      envelopeId: v173.envelope?.envelopeId ?? null,
      interfaceName: null,
      method: 'GET',
      endpoint: '/v10/projects/{idOrName}/env',
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      decryptRequested: false,
      readCount: 0,
      mutationCapabilityPresent: false,
      decryptTruePathPresent: false,
      decryptedValueEndpointPresent: false,
      credentialValueExposed: false,
      providerResponseReceived: false,
      responseBoundToProjectAndTeam: false,
      completeForProductionTarget: false,
      truncationOrAdditionalPageRisk: false,
      rawProviderResponsePersisted: false,
      secretValueLogged: false,
      secretValuePersisted: false,
    },
    providerRows: [],
    opaqueSecretRollbackAttestation: null,
  });

  const out =
    evaluateFandexMomentumVerifierRealInventoryAcquisitionReadiness({
      v172,
      v173,
      v174,
    });

  assert.equal(out.stages.v172ProvisioningReady, true);
  assert.equal(out.stages.readExecutionAuthorizationPresent, false);
  assert.equal(out.stages.v173ReadExecutionReady, false);
  assert.equal(out.state, 'real-acquisition-blocked');
  assert.ok(
    out.blockers.includes('inventory-read-execution-authorization-missing'),
  );
});

test('synthetic explicit read authorization reaches external-read-ready but no receipt is invented', () => {
  const v172 = provisioningReadyV172();
  const v173 = externalReadReadyV173();
  const v174 = evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
    evaluatedAt: '2026-09-22T00:51:00.000Z',
    upstreamV173: v173,
    execution: {
      status: 'not-executed',
      envelopeId: v173.envelope?.envelopeId ?? null,
      interfaceName: null,
      method: 'GET',
      endpoint: '/v10/projects/{idOrName}/env',
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
      decryptRequested: false,
      readCount: 0,
      mutationCapabilityPresent: false,
      decryptTruePathPresent: false,
      decryptedValueEndpointPresent: false,
      credentialValueExposed: false,
      providerResponseReceived: false,
      responseBoundToProjectAndTeam: false,
      completeForProductionTarget: false,
      truncationOrAdditionalPageRisk: false,
      rawProviderResponsePersisted: false,
      secretValueLogged: false,
      secretValuePersisted: false,
    },
    providerRows: [],
    opaqueSecretRollbackAttestation: null,
  });

  const out =
    evaluateFandexMomentumVerifierRealInventoryAcquisitionReadiness({
      v172,
      v173,
      v174,
    });

  assert.equal(out.state, 'external-read-ready');
  assert.equal(out.externalReadReady, true);
  assert.equal(out.realAcquisitionReady, false);
  assert.equal(out.stages.actualReadReceiptPresent, false);
  assert.equal(out.stages.v174ReceiptReady, false);
  assert.ok(out.blockers.includes('actual-inventory-read-receipt-missing'));
});

test('synthetic exactly-once successful receipt reaches v171 handoff-ready', () => {
  const v172 = provisioningReadyV172();
  const v173 = externalReadReadyV173();
  const v174 = handoffReadyV174();

  const out =
    evaluateFandexMomentumVerifierRealInventoryAcquisitionReadiness({
      v172,
      v173,
      v174,
    });

  assert.equal(v174.state, 'v171-handoff-ready');
  assert.equal(out.state, 'v171-handoff-ready');
  assert.equal(out.externalReadReady, true);
  assert.equal(out.realAcquisitionReady, true);
  assert.equal(out.stages.actualReadReceiptPresent, true);
  assert.equal(out.stages.v174ReceiptReady, true);
  assert.equal(out.stages.v174HandoffInvoked, true);
  assert.equal(out.stages.v171HandoffReady, true);
  assert.deepEqual(out.blockers, []);
});

test('v175 itself always has zero external and Product/ledger side effects', () => {
  const out =
    evaluateFandexMomentumVerifierRealInventoryAcquisitionReadiness({
      v172: currentV172(),
      v173: currentV173(),
      v174: blockedV174(),
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
  assert.deepEqual(out.productBoundary, {
    productMomentumScore: null,
    productionEligible: false,
    productProductionActual: '0/7',
  });
});
