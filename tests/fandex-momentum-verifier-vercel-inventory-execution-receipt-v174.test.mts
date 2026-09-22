import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt,
  FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryExecutionReceiptResearch';
import {
  buildFandexMomentumVerifierVercelInventoryExecutionEnvelope,
  type FandexMomentumVerifierVercelInventoryReadExecutionAuthorization,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';
import {
  buildFandexMomentumVerifierVercelInventoryReadChannelPlan,
  type FandexMomentumVerifierVercelInventoryCredentialHandle,
  type FandexMomentumVerifierVercelInventoryReadChannelAuthorization,
} from '../lib/intelligence/fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';

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
  handleId: 'opaque-vercel-bearer:v174:synthetic',
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

function approvedExecution(
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

function readExecutionReady() {
  const upstream = provisioningReady();
  return buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:50:00.000Z',
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: upstream,
    readExecutionAuthorization: approvedExecution(upstream.digest),
  });
}

function blockedCurrentV173() {
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
  return buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: '2026-09-22T00:45:00.000Z',
    requestIntent: 'generic-continuation',
    upstreamV172: upstream,
    readExecutionAuthorization: {
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
    },
  });
}

function successExecution(envelopeId: string) {
  return {
    status: 'success' as const,
    envelopeId,
    interfaceName: 'synthetic-v174-read-only',
    method: 'GET' as const,
    endpoint: '/v10/projects/{idOrName}/env' as const,
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
    decryptRequested: false as const,
    readCount: 1,
    mutationCapabilityPresent: false,
    decryptTruePathPresent: false,
    decryptedValueEndpointPresent: false,
    credentialValueExposed: false,
    providerResponseReceived: true,
    responseBoundToProjectAndTeam: true,
    completeForProductionTarget: true,
    truncationOrAdditionalPageRisk: false,
    rawProviderResponsePersisted: false as const,
    secretValueLogged: false as const,
    secretValuePersisted: false as const,
  };
}

test('v174 is receipt-only and cannot execute the provider read itself', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_DESCRIPTOR
      .receiptValidationOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_DESCRIPTOR
      .actualInventoryReadPerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_DESCRIPTOR
      .exactlyOneReadRequired,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_DESCRIPTOR
      .credentialValueExposureAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_DESCRIPTOR
      .v171InvokedOnlyAfterValidCompleteReceipt,
    true,
  );
});

test('current blocked v173 cannot invoke v171', () => {
  let calls = 0;
  const out =
    evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt(
      {
        evaluatedAt: '2026-09-22T08:15:00.000Z',
        upstreamV173: blockedCurrentV173(),
        execution: {
          ...successExecution('1'.repeat(64)),
          status: 'not-executed',
          envelopeId: null,
          interfaceName: null,
          readCount: 0,
          providerResponseReceived: false,
          responseBoundToProjectAndTeam: false,
          completeForProductionTarget: false,
        },
        providerRows: [],
        opaqueSecretRollbackAttestation: null,
      },
      {
        acquireV171: (() => {
          calls += 1;
          throw new Error('v171_must_not_run');
        }) as any,
      },
    );

  assert.equal(calls, 0);
  assert.equal(out.state, 'execution-receipt-blocked');
  assert.equal(out.receiptReady, false);
  assert.equal(out.v171HandoffInvoked, false);
  assert.equal(out.v171, null);
  assert.ok(out.blockers.includes('upstream-v173-not-read-execution-ready'));
  assert.equal(out.effects.vercelReads, 0);
});

test('a complete exactly-once synthetic receipt can hand off to v171', () => {
  const upstream = readExecutionReady();
  assert.equal(upstream.state, 'read-execution-ready');
  assert.notEqual(upstream.envelope, null);

  const out =
    evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
      evaluatedAt: '2026-09-22T00:55:00.000Z',
      upstreamV173: upstream,
      execution: successExecution(upstream.envelope!.envelopeId),
      providerRows: [],
      opaqueSecretRollbackAttestation: null,
    });

  assert.equal(out.receiptReady, true);
  assert.equal(out.v171HandoffInvoked, true);
  assert.equal(out.state, 'v171-handoff-ready');
  assert.equal(out.v171?.state, 'inventory-acquisition-ready');
  assert.equal(out.v171?.acquisitionReady, true);
  assert.deepEqual(out.blockers, []);
  assert.equal(out.receipt.readCount, 1);
  assert.equal(out.receipt.envelopeId, upstream.envelope!.envelopeId);
  assert.equal(out.effects.vercelReads, 0);
  assert.equal(out.v171?.effects.vercelReads, 1);
});

test('receipt must bind the exact v173 envelope and exactly one read', () => {
  const upstream = readExecutionReady();

  const out =
    evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
      evaluatedAt: '2026-09-22T00:55:00.000Z',
      upstreamV173: upstream,
      execution: {
        ...successExecution('1'.repeat(64)),
        readCount: 2,
      },
      providerRows: [],
      opaqueSecretRollbackAttestation: null,
    });

  assert.equal(out.receiptReady, false);
  assert.equal(out.v171HandoffInvoked, false);
  assert.ok(
    out.blockers.includes('inventory-execution-envelope-binding-mismatch'),
  );
  assert.ok(
    out.blockers.includes('inventory-execution-read-count-must-equal-one'),
  );
});

test('mutation capability, decryption paths, or credential exposure block handoff', () => {
  const upstream = readExecutionReady();
  const out =
    evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
      evaluatedAt: '2026-09-22T00:55:00.000Z',
      upstreamV173: upstream,
      execution: {
        ...successExecution(upstream.envelope!.envelopeId),
        mutationCapabilityPresent: true,
        decryptTruePathPresent: true,
        decryptedValueEndpointPresent: true,
        credentialValueExposed: true,
      },
      providerRows: [],
      opaqueSecretRollbackAttestation: null,
    });

  assert.equal(out.receiptReady, false);
  assert.equal(out.v171HandoffInvoked, false);
  assert.ok(
    out.blockers.includes(
      'inventory-execution-interface-has-mutation-capability',
    ),
  );
  assert.ok(
    out.blockers.includes('inventory-execution-decrypt-true-path-present'),
  );
  assert.ok(
    out.blockers.includes(
      'inventory-execution-decrypted-value-endpoint-present',
    ),
  );
  assert.ok(
    out.blockers.includes('inventory-execution-credential-value-exposed'),
  );
});

test('completeness or truncation uncertainty blocks v171 handoff', () => {
  const upstream = readExecutionReady();
  let calls = 0;
  const out =
    evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt(
      {
        evaluatedAt: '2026-09-22T00:55:00.000Z',
        upstreamV173: upstream,
        execution: {
          ...successExecution(upstream.envelope!.envelopeId),
          completeForProductionTarget: false,
          truncationOrAdditionalPageRisk: true,
        },
        providerRows: [],
        opaqueSecretRollbackAttestation: null,
      },
      {
        acquireV171: (() => {
          calls += 1;
          throw new Error('v171_must_not_run');
        }) as any,
      },
    );

  assert.equal(calls, 0);
  assert.equal(out.v171HandoffInvoked, false);
  assert.ok(
    out.blockers.includes(
      'inventory-execution-production-completeness-unproven',
    ),
  );
  assert.ok(
    out.blockers.includes(
      'inventory-execution-truncation-or-additional-page-risk',
    ),
  );
});

test('secret-like provider values are discarded before v171 receives bounded rows', () => {
  const upstream = readExecutionReady();
  const out =
    evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
      evaluatedAt: '2026-09-22T00:55:00.000Z',
      upstreamV173: upstream,
      execution: successExecution(upstream.envelope!.envelopeId),
      providerRows: [
        {
          id: 'env_other_secret',
          key: 'UNRELATED_SECRET',
          type: 'sensitive',
          target: ['production'],
          decrypted: false,
          value: 'must-never-propagate',
        },
      ],
      opaqueSecretRollbackAttestation: null,
    });

  assert.equal(out.receiptReady, true);
  assert.equal(out.v171HandoffInvoked, true);
  assert.equal(out.receipt.sensitiveValueObservedAndDiscarded, true);
  assert.equal(out.boundedRows[0]?.value, null);
  assert.equal(JSON.stringify(out).includes('must-never-propagate'), false);
  assert.equal(out.v171?.state, 'inventory-acquisition-ready');
});

test('v174 itself always has zero provider and Product/ledger side effects', () => {
  const upstream = readExecutionReady();
  const out =
    evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
      evaluatedAt: '2026-09-22T00:55:00.000Z',
      upstreamV173: upstream,
      execution: successExecution(upstream.envelope!.envelopeId),
      providerRows: [],
      opaqueSecretRollbackAttestation: null,
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

test('committed v173 audit still blocks any v174 handoff under generic continuation', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_vercel_inventory_execution_envelope_v173_20260922T080700Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);
  const upstream = blockedCurrentV173();
  assert.equal(upstream.digest, audit.result.digest);

  const out =
    evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
      evaluatedAt: '2026-09-22T08:15:00.000Z',
      upstreamV173: upstream,
      execution: {
        ...successExecution('1'.repeat(64)),
        status: 'not-executed',
        envelopeId: null,
        interfaceName: null,
        readCount: 0,
        providerResponseReceived: false,
        responseBoundToProjectAndTeam: false,
        completeForProductionTarget: false,
      },
      providerRows: [],
      opaqueSecretRollbackAttestation: null,
    });

  assert.equal(out.state, 'execution-receipt-blocked');
  assert.equal(out.receiptReady, false);
  assert.equal(out.v171HandoffInvoked, false);
  assert.equal(out.v171, null);
  assert.equal(out.effects.vercelReads, 0);
});

// v174 authoritative rerun after upstream path correction
