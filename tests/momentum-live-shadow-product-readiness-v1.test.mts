import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateMomentumLiveShadowProductReadiness,
  type MomentumLiveShadowSourceCurrentnessAudit,
} from '../lib/product/readiness/momentumLiveShadowProductReadiness';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from '../lib/server/product/momentumEvidenceConsensusRealProductRead';
import {
  getMomentumLiveShadowProductReadinessForIU,
} from '../lib/server/product/momentumLiveShadowProductReadiness';

const AUDIT_URL = new URL(
  '../data/momentum-product/iu_momentum_live_shadow_source_currentness_audit_v1.json',
  import.meta.url,
);

async function readAudit(): Promise<MomentumLiveShadowSourceCurrentnessAudit> {
  return JSON.parse(
    await readFile(AUDIT_URL, 'utf8'),
  ) as MomentumLiveShadowSourceCurrentnessAudit;
}

test('current IU live-shadow readiness requires a fresh dual-source categorical evaluation', async () => {
  const result = await getMomentumLiveShadowProductReadinessForIU();

  assert.equal(result.state, 'current-categorical-evaluation-required');
  assert.equal(result.runtimeShadowReadVerified, true);
  assert.equal(result.productActivationReady, false);
  assert.equal(result.productPublicationReady, false);
  assert.equal(result.publicRouteDesignReady, false);
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.previewFallbackAllowed, false);

  assert.deepEqual(result.currentCarrier, {
    carrierRecordId:
      '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd',
    alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    historicalOnly: true,
  });

  assert.equal(
    result.sourceCurrentness.lastfmSourceAdvancedBeyondCarrierCutoff,
    true,
  );
  assert.equal(
    result.sourceCurrentness.naverSchedulerObservedAfterCarrierCutoff,
    true,
  );
  assert.equal(
    result.sourceCurrentness
      .naverCurrentStoredEvidenceReproducedForReadiness,
    false,
  );
  assert.equal(result.sourceCurrentness.sourceAdvancementObserved, true);

  assert.deepEqual(result.currentEvaluation, {
    performed: false,
    currentCarrierProduced: false,
    currentNoOpEvaluationAttested: false,
    satisfiesFreshness: false,
  });

  assert.ok(
    result.blockers.includes(
      'current-naver-stored-evidence-not-reproduced-for-readiness',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'current-dual-source-categorical-evaluation-not-performed',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'historical-carrier-not-current-activation-evidence',
    ),
  );
});

test('freshness policy does not invent a day threshold or require a history append before evaluation', async () => {
  const result = await getMomentumLiveShadowProductReadinessForIU();

  assert.deepEqual(result.freshnessPolicy, {
    arbitraryAgeThresholdAllowed: false,
    maximumAgeDays: null,
    currentCategoricalEvaluationRequiredAfterSourceAdvancement: true,
    newHistoryObservationRequiredBeforeEvaluation: false,
    historyAppendDecision: 'defer-until-current-evaluation',
  });
});

test('current source audit records Last.fm advancement and only route-level NAVER runtime evidence', async () => {
  const audit = await readAudit();

  assert.equal(audit.evaluatedAgainstMain, 'e5d828d3cf8a198c17e0983b8b3d7c3722e4d571');
  assert.equal(audit.lastfm.snapshotDate, '2026-09-26');
  assert.equal(audit.lastfm.historyRowCount, 480);
  assert.equal(audit.lastfm.snapshotDateCount, 48);
  assert.equal(audit.lastfm.deltaReadyCount, 10);
  assert.equal(audit.lastfm.needsReviewCount, 0);
  assert.equal(audit.lastfm.sourceAdvancedBeyondCarrierCutoff, true);

  assert.equal(
    audit.naverRuntime.schedulerRouteObservedAt,
    '2026-09-26T14:22:00.000Z',
  );
  assert.equal(
    audit.naverRuntime.deploymentId,
    'dpl_9CGFYLpGx2naCLtUNMrzZbr2eTUd',
  );
  assert.equal(audit.naverRuntime.httpStatus, 200);
  assert.equal(
    audit.naverRuntime.currentStoredEvidenceReproducedForReadiness,
    false,
  );
});

test('a current attested no-op evaluation may satisfy freshness without inventing a new history row', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);

  const futureAudit: MomentumLiveShadowSourceCurrentnessAudit = {
    ...audit,
    carrier: {
      ...audit.carrier,
      historicalOnly: false,
    },
    naverRuntime: {
      ...audit.naverRuntime,
      currentStoredEvidenceReproducedForReadiness: true,
    },
    currentEvaluation: {
      currentDualSourceCategoricalEvaluationPerformed: true,
      currentCarrierProduced: false,
      currentNoOpEvaluationAttested: true,
    },
  };

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: futureAudit,
  });

  assert.equal(result.state, 'public-route-candidate');
  assert.equal(result.publicRouteDesignReady, true);
  assert.equal(result.currentEvaluation.performed, true);
  assert.equal(result.currentEvaluation.currentCarrierProduced, false);
  assert.equal(result.currentEvaluation.currentNoOpEvaluationAttested, true);
  assert.equal(result.currentEvaluation.satisfiesFreshness, true);
  assert.equal(result.blockers.length, 0);
  assert.equal(
    result.freshnessPolicy.newHistoryObservationRequiredBeforeEvaluation,
    false,
  );
});

test('runtime carrier and currentness audit mismatch fails closed', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);

  const mismatchedAudit: MomentumLiveShadowSourceCurrentnessAudit = {
    ...audit,
    carrier: {
      ...audit.carrier,
      carrierRecordId: 'f'.repeat(64),
    },
  };

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: mismatchedAudit,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.publicRouteDesignReady, false);
  assert.ok(
    result.blockers.includes('runtime-carrier-source-audit-mismatch'),
  );
});
