import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../lib/product/contracts/productMomentumEvidenceConsensus';
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
  getMomentumPublicRouteDesignCandidateForIU,
} from '../lib/server/product/momentumPublicRouteDesignCandidate';

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
  const readiness = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow: source,
    sourceAudit,
  });

  assert.equal(readiness.state, 'public-route-candidate');
  assert.equal(readiness.publicRouteDesignReady, true);
  assert.deepEqual(readiness.blockers, []);

  return { source, readiness };
}

test('current IU Momentum route design fails closed while runtime source audit is stale', async () => {
  const result = await getMomentumPublicRouteDesignCandidateForIU();

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.reason, 'live-shadow-readiness-not-ready');
  assert.equal(result.productActivationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.legacyGrowthMomentumPointReuseAllowed, false);
  assert.equal(result.previewFallbackAllowed, false);
});

test('premature source publication fails closed after freshness is isolated', async () => {
  const { readiness, source } = await getAuditBoundFreshFixture();

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

test('runtime carrier mismatch fails closed after freshness is isolated', async () => {
  const { readiness, source } = await getAuditBoundFreshFixture();

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
