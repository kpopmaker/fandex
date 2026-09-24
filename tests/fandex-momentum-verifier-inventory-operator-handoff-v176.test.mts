import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildFandexMomentumVerifierInventoryOperatorHandoff,
  FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumVerifierInventoryOperatorHandoffResearch';
import type {
  FandexMomentumVerifierRealInventoryAcquisitionReadinessResult,
} from '../lib/intelligence/fandexMomentumVerifierRealInventoryAcquisitionReadinessResearch';

function zeroEffects() {
  return {
    credentialCreates: 0 as const,
    credentialReads: 0 as const,
    credentialRotations: 0 as const,
    vercelReads: 0 as const,
    vercelWrites: 0 as const,
    environmentMutations: 0 as const,
    secretReads: 0 as const,
    secretWrites: 0 as const,
    productionDeployments: 0 as const,
    verifierActivations: 0 as const,
    nativeVerifierExecutions: 0 as const,
    databaseWrites: 0 as const,
    productMetricWrites: 0 as const,
    registryMutations: 0 as const,
    historyWrites: 0 as const,
    watermarkWrites: 0 as const,
    manifestWrites: 0 as const,
  };
}

function currentV175(): FandexMomentumVerifierRealInventoryAcquisitionReadinessResult {
  return {
    contractVersion:
      'v175_fandex_momentum_verifier_real_inventory_acquisition_readiness_research_v1',
    state: 'real-acquisition-blocked',
    realAcquisitionReady: false,
    externalReadReady: false,
    stages: {
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
    },
    upstreamDigests: {
      v172: 'e779f7386db56d4fff7202d45a82c35c522036748018071b8205523a843f4b2a',
      v173: '58ba8bce3a9e9fbe01e9cc8e76fe93d2c7fb6b43f5c8d60ba7bdb229af18ecd5',
      v174: 'e7fdfc24328c9361653c3aec70f4f8eba1ef02f5c5b9c49b1badd26b82f0882a',
    },
    blockers: [
      'read-channel-provisioning-authorization-missing',
      'opaque-vercel-credential-handle-missing',
      'v172-read-channel-provisioning-not-ready',
      'inventory-read-execution-authorization-missing',
      'v173-execution-envelope-not-prepared',
      'v173-read-execution-not-authorized',
      'v173-read-execution-not-ready',
      'actual-inventory-read-receipt-missing',
      'v174-execution-receipt-not-ready',
      'v174-v171-handoff-not-invoked',
      'v171-handoff-not-ready',
    ],
    effects: zeroEffects(),
    productBoundary: {
      productMomentumScore: null,
      productionEligible: false,
      productProductionActual: '0/7',
    },
    digest: 'b2ce5a2cfb416964bada29c93db1fb05808a33abb6e7f3c8a340f6adc3c5464d',
  };
}

function externalReadReadyV175(): FandexMomentumVerifierRealInventoryAcquisitionReadinessResult {
  return {
    ...currentV175(),
    state: 'external-read-ready',
    externalReadReady: true,
    stages: {
      ...currentV175().stages,
      readChannelProvisioningAuthorizationPresent: true,
      opaqueCredentialHandlePresent: true,
      opaqueCredentialHandleAccepted: true,
      v172ProvisioningReady: true,
      readExecutionAuthorizationPresent: true,
      v173EnvelopePrepared: true,
      v173ReadExecutionAuthorized: true,
      v173ReadExecutionReady: true,
    },
    blockers: [
      'actual-inventory-read-receipt-missing',
      'v174-execution-receipt-not-ready',
      'v174-v171-handoff-not-invoked',
      'v171-handoff-not-ready',
    ],
    digest: '1'.repeat(64),
  };
}

test('v176 is handoff-only and cannot grant authorization or perform provider actions', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_DESCRIPTOR
      .handoffPacketOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_DESCRIPTOR
      .genericContinuationCountsAsAuthorization,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_DESCRIPTOR
      .operatorAuthorizationGrantedByPacket,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_DESCRIPTOR
      .providerCredentialRead,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_INVENTORY_OPERATOR_HANDOFF_DESCRIPTOR
      .providerReadExecuted,
    false,
  );
});

test('current real state reports missing execution capability and exact external prerequisites', () => {
  const out = buildFandexMomentumVerifierInventoryOperatorHandoff({
    v175: currentV175(),
    connectedExecutionCapability: {
      exactVercelEnvironmentInventoryReadActionAvailable: false,
      genericVercelRestActionAvailable: false,
    },
  });

  assert.equal(out.state, 'operator-capability-missing');
  assert.equal(out.handoffRequired, true);
  assert.equal(out.readPrerequisitesReady, false);
  assert.equal(
    out.connectedExecutionCapability.currentConnectorCanExecuteRequiredRead,
    false,
  );
  assert.equal(
    out.requiredAuthorizations.readChannelProvisioningAuthorization.currentlyPresent,
    false,
  );
  assert.equal(
    out.requiredAuthorizations.inventoryReadExecutionAuthorization.currentlyPresent,
    false,
  );
  assert.equal(out.credentialRequirement.currentlyPresent, false);
  assert.ok(
    out.blockers.includes(
      'operator-read-channel-provisioning-authorization-required',
    ),
  );
  assert.ok(
    out.blockers.includes('operator-opaque-vercel-credential-handle-required'),
  );
  assert.ok(
    out.blockers.includes(
      'operator-inventory-read-execution-authorization-required',
    ),
  );
  assert.ok(out.blockers.includes('operator-execution-capability-unavailable'));
  assert.ok(out.blockers.includes('v175-external-read-not-ready'));
});

test('connector capability alone does not replace authorization or credential prerequisites', () => {
  const out = buildFandexMomentumVerifierInventoryOperatorHandoff({
    v175: currentV175(),
    connectedExecutionCapability: {
      exactVercelEnvironmentInventoryReadActionAvailable: true,
      genericVercelRestActionAvailable: false,
    },
  });

  assert.equal(out.state, 'operator-handoff-required');
  assert.equal(out.readPrerequisitesReady, false);
  assert.equal(
    out.connectedExecutionCapability.currentConnectorCanExecuteRequiredRead,
    true,
  );
  assert.ok(
    out.blockers.includes(
      'operator-read-channel-provisioning-authorization-required',
    ),
  );
  assert.ok(
    out.blockers.includes(
      'operator-inventory-read-execution-authorization-required',
    ),
  );
});

test('synthetic external-read-ready v175 plus exact connector capability reaches prerequisites-ready without executing a read', () => {
  const out = buildFandexMomentumVerifierInventoryOperatorHandoff({
    v175: externalReadReadyV175(),
    connectedExecutionCapability: {
      exactVercelEnvironmentInventoryReadActionAvailable: true,
      genericVercelRestActionAvailable: false,
    },
  });

  assert.equal(out.state, 'operator-read-prerequisites-ready');
  assert.equal(out.handoffRequired, false);
  assert.equal(out.readPrerequisitesReady, true);
  assert.deepEqual(out.blockers, []);
  assert.equal(out.exactReadRequest.method, 'GET');
  assert.equal(out.exactReadRequest.decrypt, 'false');
  assert.equal(out.exactReadRequest.maximumInventoryReads, 1);
  assert.equal(out.expectedExecutionReceipt.readCountRequired, 1);
  assert.equal(
    out.expectedExecutionReceipt.mutationCapabilityPresentRequired,
    false,
  );
  assert.equal(
    out.expectedExecutionReceipt.completeForProductionTargetRequired,
    true,
  );
  assert.equal(out.effects.vercelReads, 0);
});

test('generic continuation satisfies neither authorization slot', () => {
  const out = buildFandexMomentumVerifierInventoryOperatorHandoff({
    v175: currentV175(),
    connectedExecutionCapability: {
      exactVercelEnvironmentInventoryReadActionAvailable: false,
      genericVercelRestActionAvailable: false,
    },
  });

  assert.equal(
    out.requiredAuthorizations.readChannelProvisioningAuthorization
      .satisfiedByGenericContinuation,
    false,
  );
  assert.equal(
    out.requiredAuthorizations.inventoryReadExecutionAuthorization
      .satisfiedByGenericContinuation,
    false,
  );
});

test('v176 packet never carries a raw token and fixes exact read and receipt boundaries', () => {
  const out = buildFandexMomentumVerifierInventoryOperatorHandoff({
    v175: currentV175(),
    connectedExecutionCapability: {
      exactVercelEnvironmentInventoryReadActionAvailable: false,
      genericVercelRestActionAvailable: false,
    },
  });

  assert.equal(
    out.credentialRequirement.rawTokenMayBeProvidedToResearchArtifact,
    false,
  );
  assert.equal(out.credentialRequirement.rawTokenMayBeLogged, false);
  assert.equal(out.credentialRequirement.rawTokenMayBePersisted, false);
  assert.deepEqual(out.exactReadRequest, {
    method: 'GET',
    endpoint: '/v10/projects/{idOrName}/env',
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
    decrypt: 'false',
    gitBranch: null,
    customEnvironmentId: null,
    customEnvironmentSlug: null,
    maximumProviderCalls: 1,
    maximumInventoryReads: 1,
  });
  assert.equal(out.expectedExecutionReceipt.exactEnvelopeBindingRequired, true);
  assert.equal(out.expectedExecutionReceipt.credentialValueExposedRequired, false);
  assert.equal(
    out.expectedExecutionReceipt.rawProviderResponsePersistedRequired,
    false,
  );
});

test('v176 itself always has zero external, Product, ledger, and merge side effects', () => {
  const out = buildFandexMomentumVerifierInventoryOperatorHandoff({
    v175: currentV175(),
    connectedExecutionCapability: {
      exactVercelEnvironmentInventoryReadActionAvailable: false,
      genericVercelRestActionAvailable: false,
    },
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
  assert.equal(out.productBoundary.productProductionActual, '0/7');
});


test('committed v176 audit reproduces the current operator-capability-missing packet', async () => {
  const [auditRaw, watermarkRaw, manifestRaw] = await Promise.all([
    readFile(
      new URL(
        '../data/momentum-research/iu_verifier_inventory_operator_handoff_v176_20260923T004727Z.json',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_evaluation_watermark_v151.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_paired_artifact_manifest_v154.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  const audit = JSON.parse(auditRaw);
  const watermarks = watermarkRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const manifests = manifestRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const out = buildFandexMomentumVerifierInventoryOperatorHandoff({
    v175: currentV175(),
    connectedExecutionCapability: {
      exactVercelEnvironmentInventoryReadActionAvailable:
        audit.connectedExecutionCapability
          .exactVercelEnvironmentInventoryReadActionAvailable,
      genericVercelRestActionAvailable:
        audit.connectedExecutionCapability.genericVercelRestActionAvailable,
    },
  });

  assert.equal(
    audit.contractVersion,
    'v176_fandex_momentum_verifier_inventory_operator_handoff_audit_v1',
  );
  assert.equal(out.state, audit.currentResult.state);
  assert.equal(out.handoffRequired, audit.currentResult.handoffRequired);
  assert.equal(
    out.readPrerequisitesReady,
    audit.currentResult.readPrerequisitesReady,
  );
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.equal(out.digest, audit.currentResult.digest);
  assert.deepEqual(
    out.requiredAuthorizations,
    audit.requiredAuthorizations,
  );
  assert.deepEqual(out.credentialRequirement, audit.credentialRequirement);
  assert.deepEqual(out.exactReadRequest, audit.exactReadRequest);
  assert.deepEqual(
    out.expectedExecutionReceipt,
    audit.expectedExecutionReceipt,
  );
  assert.deepEqual(out.forbiddenActions, audit.forbiddenActions);
  assert.deepEqual(out.effects, audit.effects);

  assert.equal(
    watermarks.length,
    audit.authoritativeLedgerBoundary.v151WatermarkRecordCount,
  );
  assert.equal(
    watermarks.at(-1).sequence,
    audit.authoritativeLedgerBoundary.latestWatermarkSequence,
  );
  assert.equal(
    watermarks.at(-1).evaluationBoundary.sourceEvidence.naverThroughSlotStart,
    audit.authoritativeLedgerBoundary.latestAcceptedNaverThroughSlotStart,
  );
  assert.equal(
    manifests.length,
    audit.authoritativeLedgerBoundary.v154ManifestRecordCount,
  );
  assert.equal(
    manifests.at(-1).sequence,
    audit.authoritativeLedgerBoundary.latestManifestSequence,
  );
  assert.equal(
    manifests.at(-1).manifestDigest,
    audit.authoritativeLedgerBoundary.latestManifestDigest,
  );
  assert.equal(audit.authoritativeLedgerBoundary.fresh1200ZAdvanced, false);
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
