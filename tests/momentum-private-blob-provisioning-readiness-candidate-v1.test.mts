import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('private Blob provisioning readiness candidate performs no resource mutation', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-product/iu_momentum_private_blob_provisioning_readiness_candidate_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  const evidence = JSON.parse(raw);

  assert.equal(
    evidence.contractVersion,
    'momentum-private-blob-provisioning-readiness-candidate-v1',
  );
  assert.equal(evidence.provisioningPlan.storeName, 'fandex-naver-evidence');
  assert.equal(evidence.provisioningPlan.access, 'private');
  assert.equal(evidence.provisioningPlan.region, 'iad1');
  assert.deepEqual(
    evidence.provisioningPlan.allowedEnvironments,
    ['production'],
  );
  assert.equal(
    evidence.provisioningPlan.preferredAuthentication,
    'oidc',
  );
  assert.equal(evidence.currentBoundary.storeProvisioned, false);
  assert.equal(evidence.currentBoundary.projectBindingMutated, false);
  assert.equal(evidence.currentBoundary.environmentVariablesMutated, false);
  assert.equal(evidence.currentBoundary.externalStorageWrites, 0);
  assert.equal(evidence.currentBoundary.liveMirrorWritesEnabled, false);
  assert.equal(evidence.currentBoundary.productionMirrorReadsEnabled, false);
  assert.equal(evidence.currentBoundary.historicalBackfillComplete, false);
  assert.equal(
    evidence.currentBoundary.current20260928ReevaluationUnblocked,
    false,
  );
  assert.equal(evidence.currentBoundary.neonRemoved, false);
  assert.equal(
    evidence.nextExplicitGate,
    'provision-private-vercel-blob-store-and-bind-production',
  );
});
