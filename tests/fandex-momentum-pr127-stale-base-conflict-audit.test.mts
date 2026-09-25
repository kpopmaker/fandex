import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('PR #127 stale-base audit identifies only vercel.json as overlapping changed path', async () => {
  const raw = await readFile(
    new URL('../data/momentum-research/pr127_stale_base_conflict_audit_20260925T090451KST.json', import.meta.url),
    'utf8',
  );
  const audit = JSON.parse(raw);

  assert.equal(audit.pullRequest.number, 127);
  assert.equal(audit.pullRequest.mergeable, false);
  assert.equal(audit.pullRequest.mergeableState, 'dirty');
  assert.equal(audit.diffInventory.overlappingChangedFileCount, 1);
  assert.deepEqual(audit.diffInventory.overlappingChangedFiles, ['vercel.json']);
  assert.equal(audit.conflict.path, 'vercel.json');
  assert.equal(audit.conflict.kind, 'add-add');
  assert.equal(audit.conflict.mergeBaseContainsPath, false);
});

test('resolution candidate preserves main suppression policy and adds only explicit PR #127 suppression', async () => {
  const [auditRaw, vercelRaw] = await Promise.all([
    readFile(new URL('../data/momentum-research/pr127_stale_base_conflict_audit_20260925T090451KST.json', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  ]);
  const audit = JSON.parse(auditRaw);
  const vercel = JSON.parse(vercelRaw);
  const enabled = vercel.git.deploymentEnabled;

  for (const [pattern, expected] of Object.entries(
    audit.conflict.mainPolicy.deploymentEnabled,
  )) {
    assert.equal(enabled[pattern], expected);
  }

  assert.equal(enabled['v131-lastfm-real-signal-read-model'], false);
  assert.equal(
    audit.resolutionCandidate.candidateEqualsCurrentResearchBranchVercelJson,
    true,
  );
  assert.equal(
    audit.resolutionCandidate.removesAnyCurrentMainSuppression,
    false,
  );
  assert.equal(
    audit.resolutionCandidate.preservesExplicitLegacyResearchBranchSuppression,
    true,
  );
  assert.equal(audit.resolutionCandidate.mergeOrRebasePerformed, false);
  assert.equal(audit.resolutionCandidate.prHeadMovedByIntegration, false);
});

test('stale-base audit does not alter momentum/Product or execution boundaries', async () => {
  const raw = await readFile(
    new URL('../data/momentum-research/pr127_stale_base_conflict_audit_20260925T090451KST.json', import.meta.url),
    'utf8',
  );
  const audit = JSON.parse(raw);

  assert.equal(audit.externalCapabilityBoundary.vercelProjectMetadataCallable, true);
  assert.equal(
    audit.externalCapabilityBoundary.exactVercelEnvironmentInventoryReadToolExposed,
    false,
  );
  assert.equal(
    audit.externalCapabilityBoundary.genericVercelRestReadToolExposed,
    false,
  );
  assert.equal(
    audit.externalCapabilityBoundary.v181ResumeConditionSatisfied,
    false,
  );
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '1/7');
  assert.deepEqual(audit.effects, {
    providerReads: 0,
    vercelInventoryReads: 0,
    credentialReads: 0,
    credentialWrites: 0,
    databaseReads: 0,
    databaseWrites: 0,
    deployments: 0,
    productionActivations: 0,
    productWrites: 0,
    registryMutations: 0,
    ledgerWrites: 0,
    pullRequestMerges: 0,
    mainIntoResearchBranchMerges: 0,
    rebases: 0,
  });
});
