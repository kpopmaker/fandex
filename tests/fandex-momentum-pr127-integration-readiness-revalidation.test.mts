import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('current-main revalidation supersedes the expired prior packet without granting integration', async () => {
  const raw = await readFile(
    new URL('../data/momentum-research/pr127_integration_readiness_revalidation_20260925T111500KST.json', import.meta.url),
    'utf8',
  );
  const packet = JSON.parse(raw);

  assert.equal(
    packet.contractVersion,
    'fandex_momentum_pr127_integration_readiness_revalidation_v1',
  );
  assert.equal(packet.supersedes.priorMainSha, '8d68d97a389522c268e976196bc342acc605fd7a');
  assert.equal(packet.currentMain.sha, 'f6cd81625c2cfb3b03d54bfc087b78efcc8af24f');
  assert.equal(packet.handoffDecision.priorPacketExpiredBecauseMainMoved, true);
  assert.equal(packet.handoffDecision.actualMainIntegrationAuthorized, false);
  assert.equal(packet.handoffDecision.pullRequestMergeAuthorized, false);
});

test('new main still overlaps the research branch only at vercel.json', async () => {
  const raw = await readFile(
    new URL('../data/momentum-research/pr127_integration_readiness_revalidation_20260925T111500KST.json', import.meta.url),
    'utf8',
  );
  const packet = JSON.parse(raw);

  assert.equal(packet.conflictInventory.overlappingChangedPathCount, 1);
  assert.deepEqual(packet.conflictInventory.overlappingChangedPaths, ['vercel.json']);
  assert.equal(
    packet.conflictInventory.priorResolutionCandidateStillStructurallyApplicable,
    true,
  );
});

test('revalidation preserves v181 and Product boundaries', async () => {
  const raw = await readFile(
    new URL('../data/momentum-research/pr127_integration_readiness_revalidation_20260925T111500KST.json', import.meta.url),
    'utf8',
  );
  const packet = JSON.parse(raw);

  assert.equal(packet.externalCapability.exactEnvironmentInventoryReadToolExposed, false);
  assert.equal(packet.externalCapability.genericRestReadToolExposed, false);
  assert.equal(packet.externalCapability.newPrCommentAuthorizationFound, false);
  assert.equal(packet.externalCapability.v181State, 'resume-capability-blocked');
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
