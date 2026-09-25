import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('PR127 integration-readiness packet is handoff-only and not merge authorization', async () => {
  const raw = await readFile(
    new URL('../data/momentum-research/pr127_integration_readiness_packet_20260925T093700KST.json', import.meta.url),
    'utf8',
  );
  const packet = JSON.parse(raw);

  assert.equal(
    packet.contractVersion,
    'fandex_momentum_pr127_integration_readiness_packet_v1',
  );
  assert.equal(
    packet.handoffDecision.state,
    'integration-resolution-ready-not-authorized',
  );
  assert.equal(packet.handoffDecision.internalResearchBlockerRemaining, false);
  assert.equal(
    packet.handoffDecision.externalInventoryCapabilityBlockerRemaining,
    true,
  );
  assert.equal(
    packet.handoffDecision.staleBaseResolutionDesignBlockerRemaining,
    false,
  );
  assert.equal(packet.handoffDecision.actualMainIntegrationAuthorized, false);
  assert.equal(packet.handoffDecision.actualRebaseAuthorized, false);
  assert.equal(packet.handoffDecision.pullRequestMergeAuthorized, false);
  assert.equal(
    packet.handoffDecision.readyForProductionMasterControlReview,
    true,
  );
});

test('packet binds the sole tested conflict and exact safe resolution policy', async () => {
  const [packetRaw, vercelRaw, auditRaw] = await Promise.all([
    readFile(new URL('../data/momentum-research/pr127_integration_readiness_packet_20260925T093700KST.json', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../data/momentum-research/pr127_stale_base_conflict_audit_20260925T090451KST.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  const packet = JSON.parse(packetRaw);
  const vercel = JSON.parse(vercelRaw);
  const audit = JSON.parse(auditRaw);

  assert.equal(packet.integrationConflict.overlappingChangedPathCount, 1);
  assert.deepEqual(packet.integrationConflict.overlappingChangedPaths, ['vercel.json']);
  assert.equal(packet.integrationConflict.actualMergeConflictCount, 1);
  assert.deepEqual(packet.integrationConflict.actualMergeConflictPaths, ['vercel.json']);
  assert.equal(packet.integrationConflict.conflictKind, 'add-add');
  assert.equal(packet.integrationConflict.simulationRunId, 36076140864);
  assert.equal(packet.integrationConflict.simulationPassed, true);
  assert.deepEqual(
    audit.mergeSimulation.actualGitMergeConflictPaths,
    packet.integrationConflict.actualMergeConflictPaths,
  );

  const enabled = vercel.git.deploymentEnabled;
  for (const [key, expected] of Object.entries(
    packet.testedResolutionPolicy.requiredDeploymentSuppression,
  )) {
    assert.equal(enabled[key], expected);
  }
});

test('packet preserves v181 and Product boundaries with zero privileged effects', async () => {
  const raw = await readFile(
    new URL('../data/momentum-research/pr127_integration_readiness_packet_20260925T093700KST.json', import.meta.url),
    'utf8',
  );
  const packet = JSON.parse(raw);

  assert.equal(packet.externalCapability.v181State, 'resume-capability-blocked');
  assert.equal(packet.externalCapability.resumeAuthorized, false);
  assert.equal(
    packet.externalCapability.exactEnvironmentInventoryReadToolExposed,
    false,
  );
  assert.equal(packet.externalCapability.genericRestReadToolExposed, false);
  assert.equal(packet.productBoundary.productMomentumScore, null);
  assert.equal(packet.productBoundary.productionEligible, false);
  assert.equal(packet.productBoundary.productProductionActual, '1/7');
  assert.deepEqual(packet.effects, {
    providerReads: 0,
    vercelInventoryReads: 0,
    credentialReads: 0,
    credentialWrites: 0,
    databaseReads: 0,
    databaseWrites: 0,
    deployments: 0,
    productionActivations: 0,
    nativeVerifierExecutions: 0,
    productWrites: 0,
    registryMutations: 0,
    ledgerWrites: 0,
    mainIntoResearchBranchMerges: 0,
    rebases: 0,
    forcePushes: 0,
    pullRequestMerges: 0,
  });
});
