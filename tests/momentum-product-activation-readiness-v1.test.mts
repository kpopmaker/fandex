import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../lib/product/contracts/productMomentumEvidenceConsensus';
import {
  evaluateMomentumProductActivationReadiness,
} from '../lib/product/activation/momentumProductActivationReadiness';
import {
  createMomentumPublicRouteDesignCandidate,
} from '../lib/product/readiness/momentumPublicRouteDesignCandidate';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from '../lib/server/product/momentumEvidenceConsensusRealProductRead';
import {
  getMomentumLiveShadowProductReadinessForIU,
} from '../lib/server/product/momentumLiveShadowProductReadiness';
import {
  getMomentumProductActivationReadinessForIU,
} from '../lib/server/product/momentumProductActivationReadiness';

test('current IU Momentum is eligible for activation review without activation', async () => {
  const result = await getMomentumProductActivationReadinessForIU();

  assert.equal(result.status, 'eligible-for-activation-review');
  assert.equal(Object.values(result.checks).every(Boolean), true);
  assert.equal(result.checks['current-attestation-binding'], true);
  assert.equal(result.freshnessAttestation.attestationPath, null);
  assert.equal(
    result.freshnessAttestation.attestationDigest,
    'faf5d09e3f0b74c9fb2f05342fa4c34e6a685334e08cb726de2e02ea4e73c98e',
  );
  assert.deepEqual(result.freshnessAttestation.attestationWorkflow, {
    kind: 'github-actions-read-only-current-evaluation',
    workflowRunId: 37469812804,
    workflowJobId: 112290054657,
    workflowHeadSha:
      'efcf3b2a3f1f0180ef2e68a9b619b81d48be3890',
  });
  assert.equal(result.target.artistId, 'iu');
  assert.equal(result.target.legacyVariableId, 'growthMomentumPoint');
  assert.equal(result.target.constructId, 'momentumEvidenceConsensus');
  assert.equal(result.directionalConsensus, 'direction-conflicted');
  assert.equal(result.persistenceConsensus, 'persistence-not-applicable');
  assert.equal(result.productActivationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.legacyGrowthMomentumPointReuseAllowed, false);
  assert.equal(result.previewFallbackAllowed, false);
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(
    result.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );
});

test('premature source publication blocks activation readiness', async () => {
  const [liveReadiness, source] = await Promise.all([
    getMomentumLiveShadowProductReadinessForIU(),
    getMomentumEvidenceConsensusShadowProductForIU(),
  ]);
  assert.equal(source.status, 'ok');
  if (source.status !== 'ok') return;

  const mutated: ProductMomentumEvidenceConsensusReadModelResult =
    Object.freeze({
      status: 'ok' as const,
      model: Object.freeze({
        ...source.model,
        publication: 'production' as const,
      }),
    });
  const routeDesign = createMomentumPublicRouteDesignCandidate(
    liveReadiness,
    mutated,
  );
  const result = evaluateMomentumProductActivationReadiness({
    routeDesign,
    liveReadiness,
    source: mutated,
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.checks['shadow-publication-boundary'], false);
  assert.equal(result.productActivationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
});

test('carrier mismatch blocks activation readiness', async () => {
  const [liveReadiness, source] = await Promise.all([
    getMomentumLiveShadowProductReadinessForIU(),
    getMomentumEvidenceConsensusShadowProductForIU(),
  ]);
  assert.equal(source.status, 'ok');
  if (source.status !== 'ok') return;

  const mutated: ProductMomentumEvidenceConsensusReadModelResult =
    Object.freeze({
      status: 'ok' as const,
      model: Object.freeze({
        ...source.model,
        evidence: Object.freeze({
          ...source.model.evidence,
          directionalConsensus: 'direction-corroborated-up' as const,
        }),
      }),
    });
  const routeDesign = createMomentumPublicRouteDesignCandidate(
    liveReadiness,
    mutated,
  );
  const result = evaluateMomentumProductActivationReadiness({
    routeDesign,
    liveReadiness,
    source: mutated,
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.checks['stored-evidence-binding'], false);
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
});

test('source read failure blocks activation readiness without fallback', async () => {
  const liveReadiness = await getMomentumLiveShadowProductReadinessForIU();
  const source: ProductMomentumEvidenceConsensusReadModelResult =
    Object.freeze({
      status: 'missing' as const,
      reason: 'no-stored-categorical-evidence' as const,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    });
  const routeDesign = createMomentumPublicRouteDesignCandidate(
    liveReadiness,
    source,
  );
  const result = evaluateMomentumProductActivationReadiness({
    routeDesign,
    liveReadiness,
    source,
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.previewFallbackAllowed, false);
  assert.equal(result.requiredNextGate, null);
});
