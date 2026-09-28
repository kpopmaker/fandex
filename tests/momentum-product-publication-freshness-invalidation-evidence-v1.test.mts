import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('2026-09-28 source advancement invalidates reuse of the prior publication candidate', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-product/iu_momentum_product_publication_freshness_invalidation_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  const evidence = JSON.parse(raw);

  assert.equal(
    evidence.contractVersion,
    'momentum-product-publication-freshness-invalidation-v1',
  );
  assert.equal(evidence.priorPublicationCandidate.pullRequestNumber, 269);
  assert.equal(
    evidence.priorPublicationCandidate.productionDeploymentState,
    'READY',
  );
  assert.equal(evidence.sourceAdvancement.lastfmSnapshotDate, '2026-09-28');
  assert.equal(evidence.sourceAdvancement.lastfmHistoryRowCount, 500);
  assert.equal(
    evidence.sourceAdvancement.sourceAdvancedAfterBoundAttestation,
    true,
  );
  assert.equal(
    evidence.freshnessDecision.priorPublicationApprovalCandidateMayBeReused,
    false,
  );
  assert.equal(
    evidence.freshnessDecision.currentDualSourceCategoricalEvaluationRequired,
    true,
  );
  assert.equal(evidence.freshnessDecision.productPublicationAuthorized, false);
  assert.equal(evidence.freshnessDecision.publicRouteActivated, false);
  assert.equal(evidence.freshnessDecision.productMomentumScore, null);
  assert.equal(
    evidence.freshnessDecision.requiredNextGate,
    'current-dual-source-categorical-reevaluation',
  );
  assert.equal(evidence.boundary.productionVerifierExecutions, 0);
});
