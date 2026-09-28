import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vercel Blob private adapter candidate remains unbound and non-mutating', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-product/iu_momentum_vercel_blob_private_adapter_candidate_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  const evidence = JSON.parse(raw);

  assert.equal(
    evidence.contractVersion,
    'momentum-vercel-blob-private-adapter-candidate-v1',
  );
  assert.equal(evidence.adapter.provider, 'vercel-blob');
  assert.equal(evidence.adapter.access, 'private');
  assert.equal(evidence.adapter.freshReadsUseCache, false);
  assert.equal(evidence.adapter.listPagination, true);
  assert.equal(evidence.adapter.addRandomSuffix, false);
  assert.equal(evidence.adapter.allowOverwrite, false);
  assert.equal(evidence.adapter.raceReclassification, true);
  assert.equal(evidence.currentBoundary.blobStoreProvisionedByThisCandidate, false);
  assert.equal(evidence.currentBoundary.productionBlobCredentialBound, false);
  assert.equal(evidence.currentBoundary.liveMirrorWritesEnabled, false);
  assert.equal(evidence.currentBoundary.productionMirrorReadsEnabled, false);
  assert.equal(evidence.currentBoundary.historicalBackfillComplete, false);
  assert.equal(
    evidence.currentBoundary.current20260928ReevaluationUnblocked,
    false,
  );
  assert.equal(evidence.currentBoundary.neonRemoved, false);
  assert.deepEqual(evidence.productionSafety, {
    externalStorageWrites: 0,
    databaseWrites: 0,
    registryMutations: 0,
    productPublications: 0,
    publicRouteCutovers: 0,
    productionVerifierExecutions: 0,
  });
  assert.equal(
    evidence.requiredNextGate,
    'explicit-private-vercel-blob-store-provisioning-and-binding',
  );
});
