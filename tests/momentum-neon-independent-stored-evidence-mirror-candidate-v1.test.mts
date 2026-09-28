import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Neon-independent Stored Evidence mirror candidate preserves production boundaries', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-product/iu_momentum_neon_independent_stored_evidence_mirror_candidate_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  const evidence = JSON.parse(raw);

  assert.equal(
    evidence.contractVersion,
    'momentum-neon-independent-stored-evidence-mirror-candidate-v1',
  );
  assert.equal(evidence.implementation.immutableObjectStorePort, true);
  assert.equal(evidence.implementation.writePlanToMirrorBundle, true);
  assert.equal(
    evidence.implementation.canonicalJobEvidenceReadRepository,
    true,
  );
  assert.equal(
    evidence.implementation.latestOfficialShadowSlotReadRepository,
    true,
  );
  assert.equal(evidence.currentBoundary.durableObjectStoreAdapterBound, false);
  assert.equal(evidence.currentBoundary.vercelBlobBound, false);
  assert.equal(evidence.currentBoundary.liveMirrorWritesEnabled, false);
  assert.equal(evidence.currentBoundary.historicalBackfillComplete, false);
  assert.equal(evidence.currentBoundary.productionReadCutover, false);
  assert.equal(
    evidence.currentBoundary.neonDependencyRemovedFromCurrentProduction,
    false,
  );
  assert.equal(
    evidence.currentBoundary.current20260928ReevaluationUnblocked,
    false,
  );
  assert.deepEqual(evidence.productionSafety, {
    databaseWrites: 0,
    registryMutations: 0,
    productPublications: 0,
    publicRouteCutovers: 0,
    productionVerifierExecutions: 0,
  });
  assert.equal(
    evidence.requiredNextGate,
    'bind-durable-private-object-store-adapter-and-establish-mirror-from-new-ingestion',
  );
});
