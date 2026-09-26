import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MOMENTUM_POST_EXECUTION_PRODUCT_READINESS_VERSION,
  MOMENTUM_RESEARCH_OUTPUT_BOUNDARY,
  evaluateMomentumPostExecutionProductReadiness,
} from '../lib/product/readiness/momentumPostExecutionProductReadiness';

async function currentLastfmStatus() {
  const raw = await readFile(
    new URL('../data/lastfm-cloud/lastfm_cloud_status_latest.json', import.meta.url),
    'utf8',
  );
  return JSON.parse(raw) as {
    snapshotDate: string;
    historyRowCount: number;
    snapshotDateCount: number;
    deltaReadyCount: number;
    needsReviewCount: number;
    scoreUsage: string;
  };
}

test('post-execution readiness accepts current evidence but refuses numeric Product promotion', async () => {
  const status = await currentLastfmStatus();
  const result = evaluateMomentumPostExecutionProductReadiness({
    lastfmSnapshotDate: status.snapshotDate,
    lastfmHistoryRowCount: status.historyRowCount,
    lastfmSnapshotDateCount: status.snapshotDateCount,
    lastfmDeltaReadyCount: status.deltaReadyCount,
    lastfmNeedsReviewCount: status.needsReviewCount,
    lastfmScoreUsage: status.scoreUsage,
  });

  assert.equal(
    result.contractVersion,
    MOMENTUM_POST_EXECUTION_PRODUCT_READINESS_VERSION,
  );
  assert.equal(result.state, 'categorical-product-contract-required');
  assert.equal(result.productActivationReady, false);
  assert.equal(result.productPublicationReady, false);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.legacyGrowthMomentumPointReuseAllowed, false);
  assert.equal(result.previewFallbackAllowed, false);
  assert.equal(result.productMomentumScore, null);
});

test('successful one-shot Production verifier evidence is bound into readiness', async () => {
  const status = await currentLastfmStatus();
  const result = evaluateMomentumPostExecutionProductReadiness({
    lastfmSnapshotDate: status.snapshotDate,
    lastfmHistoryRowCount: status.historyRowCount,
    lastfmSnapshotDateCount: status.snapshotDateCount,
    lastfmDeltaReadyCount: status.deltaReadyCount,
    lastfmNeedsReviewCount: status.needsReviewCount,
    lastfmScoreUsage: status.scoreUsage,
  });

  assert.equal(result.verifierEvidence.authorizationConsumed, true);
  assert.equal(result.verifierEvidence.executionPerformed, true);
  assert.equal(result.verifierEvidence.successfulExecutionCount, 1);
  assert.equal(result.verifierEvidence.evidenceRows, 100);
  assert.equal(result.verifierEvidence.normalizedRecords, 100);
  assert.equal(result.verifierEvidence.databaseReadOnly, true);
  assert.equal(result.verifierEvidence.databaseWritesObserved, 0);
  assert.equal(result.verifierEvidence.verifierOutputAccepted, true);
});

test('current Last.fm history is evidence but its preview score is never Product truth', async () => {
  const status = await currentLastfmStatus();
  const result = evaluateMomentumPostExecutionProductReadiness({
    lastfmSnapshotDate: status.snapshotDate,
    lastfmHistoryRowCount: status.historyRowCount,
    lastfmSnapshotDateCount: status.snapshotDateCount,
    lastfmDeltaReadyCount: status.deltaReadyCount,
    lastfmNeedsReviewCount: status.needsReviewCount,
    lastfmScoreUsage: status.scoreUsage,
  });

  assert.equal(result.lastfmEvidence.snapshotDate, '2026-09-26');
  assert.equal(result.lastfmEvidence.historyRowCount, 480);
  assert.equal(result.lastfmEvidence.snapshotDateCount, 48);
  assert.equal(result.lastfmEvidence.deltaReadyCount, 10);
  assert.equal(result.lastfmEvidence.needsReviewCount, 0);
  assert.equal(
    result.lastfmEvidence.scoreUsage,
    'preview_only_not_master_score',
  );
  assert.equal(result.lastfmEvidence.previewScoreAcceptedAsProductTruth, false);
});

test('v142-v144 research boundary remains evidence-consensus-not-score', () => {
  assert.equal(
    MOMENTUM_RESEARCH_OUTPUT_BOUNDARY.combinationMode,
    'evidence-consensus-not-score',
  );
  assert.equal(
    MOMENTUM_RESEARCH_OUTPUT_BOUNDARY.outputForm,
    'structured-categorical-evidence',
  );
  assert.equal(MOMENTUM_RESEARCH_OUTPUT_BOUNDARY.productMomentumScore, null);
  assert.equal(
    MOMENTUM_RESEARCH_OUTPUT_BOUNDARY.numericProductScoreEligible,
    false,
  );
  assert.equal(
    MOMENTUM_RESEARCH_OUTPUT_BOUNDARY.ordinalStateToNumberMappingAllowed,
    false,
  );
  assert.equal(
    MOMENTUM_RESEARCH_OUTPUT_BOUNDARY.equalWeightsAllowedByDefault,
    false,
  );
  assert.equal(
    MOMENTUM_RESEARCH_OUTPUT_BOUNDARY.percentileAverageAllowed,
    false,
  );
  assert.equal(
    MOMENTUM_RESEARCH_OUTPUT_BOUNDARY.legacyPreviewSeedCalibrationAllowed,
    false,
  );
});

test('current legacy growthMomentumPoint cannot silently carry categorical evidence', async () => {
  const status = await currentLastfmStatus();
  const result = evaluateMomentumPostExecutionProductReadiness({
    lastfmSnapshotDate: status.snapshotDate,
    lastfmHistoryRowCount: status.historyRowCount,
    lastfmSnapshotDateCount: status.snapshotDateCount,
    lastfmDeltaReadyCount: status.deltaReadyCount,
    lastfmNeedsReviewCount: status.needsReviewCount,
    lastfmScoreUsage: status.scoreUsage,
  });

  assert.equal(result.currentProductSchema.legacyVariablePresent, true);
  assert.equal(result.currentProductSchema.momentumSourceStage, 'derived_signal');
  assert.equal(result.currentProductSchema.momentumQualityLabel, 'preview');
  assert.equal(
    result.currentProductSchema.numericSlotCompatibleWithResearchOutput,
    false,
  );
  assert.ok(
    result.blockers.includes('current-momentum-product-slot-numeric-only'),
  );
  assert.ok(
    result.blockers.includes(
      'legacy-preview-fallback-would-mask-real-momentum-state',
    ),
  );
});

test('next Product shape is a separate non-numeric evidence-consensus contract', async () => {
  const status = await currentLastfmStatus();
  const result = evaluateMomentumPostExecutionProductReadiness({
    lastfmSnapshotDate: status.snapshotDate,
    lastfmHistoryRowCount: status.historyRowCount,
    lastfmSnapshotDateCount: status.snapshotDateCount,
    lastfmDeltaReadyCount: status.deltaReadyCount,
    lastfmNeedsReviewCount: status.needsReviewCount,
    lastfmScoreUsage: status.scoreUsage,
  });

  assert.deepEqual(result.requiredProductShape, {
    constructId: 'momentumEvidenceConsensus',
    outputForm: 'structured-categorical-evidence',
    separateNonNumericContractRequired: true,
    storedEvidenceTraceRequired: true,
    noSyntheticFallbackRequired: true,
    publicRouteRequiredBeforeProductionActual: true,
  });
  assert.ok(result.blockers.includes('categorical-product-contract-not-implemented'));
  assert.ok(
    result.blockers.includes(
      'categorical-stored-evidence-read-model-not-implemented',
    ),
  );
  assert.ok(result.blockers.includes('categorical-public-route-not-implemented'));
});

test('invalid execution/source evidence blocks readiness instead of becoming missing/zero', () => {
  const result = evaluateMomentumPostExecutionProductReadiness({
    lastfmSnapshotDate: 'invalid',
    lastfmHistoryRowCount: 0,
    lastfmSnapshotDateCount: 0,
    lastfmDeltaReadyCount: 9,
    lastfmNeedsReviewCount: 1,
    lastfmScoreUsage: 'master_score',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.productMomentumScore, null);
  assert.ok(
    result.blockers.includes('lastfm-current-history-evidence-invalid'),
  );
});
