import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Momentum publication candidate evidence stays fail-closed', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-product/iu_momentum_product_publication_approval_candidate_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  const evidence = JSON.parse(raw);

  assert.equal(
    evidence.contractVersion,
    'momentum-product-publication-approval-candidate-evidence-v1',
  );
  assert.equal(evidence.activationProduction.deploymentState, 'READY');
  assert.equal(
    evidence.activationProduction.deploymentCommitSha,
    'a3d5db92206f027be6a015baddb0ac0ce2044348',
  );
  assert.equal(
    evidence.candidate.status,
    'ready-for-owner-attestation',
  );
  assert.equal(evidence.candidate.publicationAuthorizationId, null);
  assert.equal(evidence.candidate.authorizedAt, null);
  assert.equal(evidence.candidate.activationAuthorized, true);
  assert.equal(evidence.candidate.productPublicationAuthorized, false);
  assert.equal(evidence.candidate.publicRouteActivated, false);
  assert.equal(evidence.candidate.publication, 'shadow');
  assert.equal(evidence.candidate.productMomentumScore, null);
  assert.equal(
    evidence.candidate.requiredNextGate,
    'explicit-momentum-product-publication-authorization',
  );
  assert.deepEqual(evidence.safetyBoundary, {
    ownerPublicationApprovalRecorded: false,
    databaseWrites: 0,
    registryMutations: 0,
    productPublications: 0,
    publicRouteCutovers: 0,
    productionVerifierExecutions: 0,
  });
});
