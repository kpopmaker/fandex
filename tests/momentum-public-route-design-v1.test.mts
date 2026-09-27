import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../lib/product/contracts/productMomentumEvidenceConsensus';
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
  getMomentumPublicRouteDesignCandidateForIU,
} from '../lib/server/product/momentumPublicRouteDesignCandidate';

test('current IU Momentum produces a route design candidate without authorizing publication', async () => {
  const result = await getMomentumPublicRouteDesignCandidateForIU();

  assert.equal(result.status, 'ready-for-owner-review');
  if (result.status !== 'ready-for-owner-review') return;

  assert.deepEqual(result.target, {
    artistId: 'iu',
    legacyVariableId: 'growthMomentumPoint',
    constructId: 'momentumEvidenceConsensus',
  });
  assert.equal(
    result.claimScope,
    'structured-categorical-evidence-only-no-numeric-score',
  );
  assert.deepEqual(result.routeShape, {
    alignmentCutoffAt: true,
    directionalConsensus: true,
    persistenceConsensus: true,
    conflictState: true,
    storedEvidenceTrace: true,
    numericScore: false,
  });
  assert.deepEqual(result.sourceBoundary, {
    dataOrigin: 'observed',
    publication: 'shadow',
    presentation: 'standard',
    previewFallbackUsed: false,
    productMetricReadPerformed: false,
  });
  assert.equal(result.currentCarrier.directionalConsensus, 'direction-conflicted');
  assert.equal(
    result.currentCarrier.persistenceConsensus,
    'persistence-not-applicable',
  );
  assert.equal(result.decision.productActivationAuthorized, false);
  assert.equal(result.decision.productPublicationAuthorized, false);
  assert.equal(result.decision.publicRouteActivated, false);
  assert.equal(result.decision.publication, 'shadow');
  assert.equal(result.decision.productMomentumScore, null);
  assert.equal(result.decision.numericProductEligible, false);
  assert.equal(result.decision.legacyGrowthMomentumPointReuseAllowed, false);
  assert.equal(result.decision.previewFallbackAllowed, false);
  assert.equal(
    result.decision.requiredNextGate,
    'explicit-momentum-product-activation-readiness',
  );
});

test('premature source publication fails closed', async () => {
  const [readiness, source] = await Promise.all([
    getMomentumLiveShadowProductReadinessForIU(),
    getMomentumEvidenceConsensusShadowProductForIU(),
  ]);

  assert.equal(source.status, 'ok');
  if (source.status !== 'ok') return;

  const prematurePublication: ProductMomentumEvidenceConsensusReadModelResult =
    Object.freeze({
      status: 'ok' as const,
      model: Object.freeze({
        ...source.model,
        publication: 'production' as const,
      }),
    });

  const result = createMomentumPublicRouteDesignCandidate(
    readiness,
    prematurePublication,
  );

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.reason, 'source-shadow-boundary-invalid');
  assert.equal(result.productActivationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.productMomentumScore, null);
});

test('runtime carrier mismatch fails closed before route activation design', async () => {
  const [readiness, source] = await Promise.all([
    getMomentumLiveShadowProductReadinessForIU(),
    getMomentumEvidenceConsensusShadowProductForIU(),
  ]);

  assert.equal(source.status, 'ok');
  if (source.status !== 'ok') return;

  const mismatchedCarrier: ProductMomentumEvidenceConsensusReadModelResult =
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

  const result = createMomentumPublicRouteDesignCandidate(
    readiness,
    mismatchedCarrier,
  );

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.reason, 'source-currentness-mismatch');
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.previewFallbackAllowed, false);
});
