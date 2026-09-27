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
const EVALUATION_URL = new URL(
  '../data/momentum-product/iu_momentum_current_dual_source_evaluation_v1.json',
  import.meta.url,
);

async function readAudit(): Promise<MomentumLiveShadowSourceCurrentnessAudit> {
  return JSON.parse(
    await readFile(AUDIT_URL, 'utf8'),
  ) as MomentumLiveShadowSourceCurrentnessAudit;
}

test('current IU live-shadow readiness requires persistence of the newly evaluated carrier cutoff', async () => {
  const result = await getMomentumLiveShadowProductReadinessForIU();

  assert.equal(result.contractVersion, 'momentum-live-shadow-product-readiness-v2');
  assert.equal(result.state, 'current-carrier-persistence-required');
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
    true,
  );
  assert.equal(result.sourceCurrentness.sourceAdvancementObserved, true);

  assert.deepEqual(result.currentEvaluation, {
    performed: true,
    currentCarrierProduced: false,
    currentNoOpEvaluationAttested: false,
    classification: 'new-carrier-cutoff-advanced-same-state',
    alignmentCutoffAt: '2026-09-26T02:15:48.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    categoricalEvaluationDigest:
      '11ce6df788a9f3f44cc96a1ce8693a7ebb58e684b251027a7af7055d45346dd9',
    newHistoryObservationRequired: true,
    satisfiesFreshness: false,
  });

  assert.ok(
    result.blockers.includes('current-carrier-persistence-not-performed'),
  );
  assert.ok(
    result.blockers.includes(
      'historical-carrier-not-current-activation-evidence',
    ),
  );
  assert.ok(
    !result.blockers.includes(
      'current-dual-source-categorical-evaluation-not-performed',
    ),
  );
  assert.ok(
    !result.blockers.includes(
      'current-naver-stored-evidence-not-reproduced-for-readiness',
    ),
  );
});

test('freshness policy records append-required only after current evaluation', async () => {
  const result = await getMomentumLiveShadowProductReadinessForIU();

  assert.deepEqual(result.freshnessPolicy, {
    arbitraryAgeThresholdAllowed: false,
    maximumAgeDays: null,
    currentCategoricalEvaluationRequiredAfterSourceAdvancement: true,
    newHistoryObservationRequiredBeforeEvaluation: false,
    historyAppendDecision: 'append-required-cutoff-advanced',
  });
});

test('current source audit records exact current NAVER Stored Evidence reproduction', async () => {
  const audit = await readAudit();

  assert.equal(
    audit.evaluatedAgainstMain,
    'dd05caeab4682a642cf63e61f4f12b67182ecc9e',
  );
  assert.equal(audit.lastfm.snapshotDate, '2026-09-26');
  assert.equal(audit.lastfm.historyRowCount, 480);
  assert.equal(audit.lastfm.snapshotDateCount, 48);
  assert.equal(audit.lastfm.deltaReadyCount, 10);
  assert.equal(audit.lastfm.needsReviewCount, 0);

  assert.equal(
    audit.naverRuntime.currentStoredEvidenceReproducedForReadiness,
    true,
  );
  assert.equal(
    audit.naverRuntime.latestStoredEvidenceThroughSlotStart,
    '2026-09-27T00:00:00.000Z',
  );
  assert.equal(
    audit.naverRuntime.latestStoredEvidenceJobId,
    '495b3cb12feef467824be1ede6b1ff541036c6a2a2f203a3c4e60def66490d8b',
  );
  assert.equal(audit.naverRuntime.reproducedSnapshotCount, 273);
  assert.equal(audit.naverRuntime.evaluationWorkflowRunId, 36281349343);
});

test('recorded evaluation evidence matches the currentness audit classification', async () => {
  const [audit, raw] = await Promise.all([
    readAudit(),
    readFile(EVALUATION_URL, 'utf8'),
  ]);
  const evidence = JSON.parse(raw) as {
    evaluatedAgainstMain: string;
    workflowRunId: number;
    categoricalEvaluation: {
      alignmentCutoffAt: string;
      directionalConsensus: string;
      persistenceConsensus: string;
      productMomentumScore: number | null;
      digest: string;
    };
    decision: {
      classification: string;
      newHistoryObservationRequired: boolean;
      attestedNoOp: boolean;
    };
    safety: {
      databaseWrites: number;
      productMetricReads: number;
      productMetricWrites: number;
      previewFallbackReads: number;
      registryMutations: number;
      productionActivations: number;
    };
  };

  assert.equal(evidence.evaluatedAgainstMain, audit.evaluatedAgainstMain);
  assert.equal(evidence.workflowRunId, 36281349343);
  assert.equal(
    evidence.categoricalEvaluation.alignmentCutoffAt,
    audit.currentEvaluation.alignmentCutoffAt,
  );
  assert.equal(
    evidence.categoricalEvaluation.directionalConsensus,
    audit.currentEvaluation.directionalConsensus,
  );
  assert.equal(
    evidence.categoricalEvaluation.persistenceConsensus,
    audit.currentEvaluation.persistenceConsensus,
  );
  assert.equal(
    evidence.categoricalEvaluation.digest,
    audit.currentEvaluation.categoricalEvaluationDigest,
  );
  assert.equal(evidence.categoricalEvaluation.productMomentumScore, null);
  assert.equal(
    evidence.decision.classification,
    'new-carrier-cutoff-advanced-same-state',
  );
  assert.equal(evidence.decision.newHistoryObservationRequired, true);
  assert.equal(evidence.decision.attestedNoOp, false);
  assert.deepEqual(evidence.safety, {
    databaseWrites: 0,
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    registryMutations: 0,
    productionActivations: 0,
  });
});

test('an attested same-cutoff no-op may satisfy freshness without a new history row', async () => {
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
    freshnessPolicy: {
      ...audit.freshnessPolicy,
      historyAppendDecision: 'no-append-current-no-op',
    },
    currentEvaluation: {
      currentDualSourceCategoricalEvaluationPerformed: true,
      currentCarrierProduced: false,
      currentNoOpEvaluationAttested: true,
      classification: 'attested-no-op-same-cutoff-same-state',
      alignmentCutoffAt: audit.carrier.alignmentCutoffAt,
      directionalConsensus: audit.carrier.directionalConsensus,
      persistenceConsensus: audit.carrier.persistenceConsensus,
      categoricalEvaluationDigest: 'a'.repeat(64),
      newHistoryObservationRequired: false,
    },
  };

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: futureAudit,
  });

  assert.equal(result.state, 'public-route-candidate');
  assert.equal(result.publicRouteDesignReady, true);
  assert.equal(result.currentEvaluation.currentCarrierProduced, false);
  assert.equal(result.currentEvaluation.currentNoOpEvaluationAttested, true);
  assert.equal(result.currentEvaluation.newHistoryObservationRequired, false);
  assert.equal(result.currentEvaluation.satisfiesFreshness, true);
  assert.equal(result.blockers.length, 0);
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
