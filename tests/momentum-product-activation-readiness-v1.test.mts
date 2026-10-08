import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  evaluateMomentumLiveShadowProductReadiness,
  type MomentumLiveShadowSourceCurrentnessAudit,
} from '../lib/product/readiness/momentumLiveShadowProductReadiness';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from '../lib/server/product/momentumEvidenceConsensusRealProductRead';
import {
  getMomentumProductActivationReadinessForIU,
} from '../lib/server/product/momentumProductActivationReadiness';

const AUDIT_URL = new URL(
  '../data/momentum-product/iu_momentum_live_shadow_source_currentness_audit_v1.json',
  import.meta.url,
);

async function getAuditBoundFreshFixture() {
  const [source, rawAudit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readFile(AUDIT_URL, 'utf8'),
  ]);

  if (source.status !== 'ok') {
    throw new Error('momentum-source-read-not-ok');
  }

  const sourceAudit = JSON.parse(
    rawAudit,
  ) as MomentumLiveShadowSourceCurrentnessAudit;
  const liveReadiness = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow: source,
    sourceAudit,
  });
  const routeDesign = createMomentumPublicRouteDesignCandidate(
    liveReadiness,
    source,
  );

  assert.equal(liveReadiness.state, 'public-route-candidate');
  assert.equal(routeDesign.status, 'ready-for-owner-review');

  return { source, liveReadiness, routeDesign };
}

test('current IU Momentum activation readiness fails closed while runtime source audit is stale', async () => {
  const result = await getMomentumProductActivationReadinessForIU();

  assert.equal(result.status, 'blocked');
  assert.equal(result.checks['current-freshness'], false);
  assert.equal(result.checks['current-attestation-binding'], false);
  assert.equal(result.productActivationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.requiredNextGate, null);
});

test('audit-bound fresh fixture remains eligible for activation review without activation', async () => {
  const {
    source,
    liveReadiness,
    routeDesign,
  } = await getAuditBoundFreshFixture();
  const result = evaluateMomentumProductActivationReadiness({
    routeDesign,
    liveReadiness,
    source,
  });

  assert.equal(result.status, 'eligible-for-activation-review');
  assert.equal(Object.values(result.checks).every(Boolean), true);
  assert.equal(result.checks['current-attestation-binding'], true);
  assert.equal(result.freshnessAttestation.attestationPath, null);
  assert.equal(
    result.freshnessAttestation.attestationDigest,
    'f87a72d11c38cbbf17058c625d13847b2eca25f4152e909cf2d8b7d3d59566ce',
  );
  assert.deepEqual(result.freshnessAttestation.attestationWorkflow, {
    kind: 'github-actions-read-only-current-evaluation',
    workflowRunId: 37477927827,
    workflowJobId: 112319410564,
    workflowHeadSha:
      '027d77a4ac6a2a7afd4ca09861b58d4bd3e4ac34',
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

test('premature source publication blocks activation readiness after freshness is isolated', async () => {
  const {
    source,
    liveReadiness,
  } = await getAuditBoundFreshFixture();

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

test('carrier mismatch blocks activation readiness after freshness is isolated', async () => {
  const {
    source,
    liveReadiness,
  } = await getAuditBoundFreshFixture();

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
  const { liveReadiness } = await getAuditBoundFreshFixture();
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
