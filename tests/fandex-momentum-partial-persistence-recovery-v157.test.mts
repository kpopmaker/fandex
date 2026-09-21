import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';
import type {
  FandexMomentumSourceEvidenceWatermark,
} from '../lib/intelligence/fandexMomentumCommonCutoffAdvancementGateResearch';
import {
  evaluateFandexMomentumManifestGuardedPreflightResearch,
  type FandexMomentumManifestGuardedPreflightPrepared,
} from '../lib/intelligence/fandexMomentumManifestGuardedPreflightResearch';
import {
  evaluateFandexMomentumTripleArtifactAcceptanceResearch,
} from '../lib/intelligence/fandexMomentumTripleArtifactAcceptanceResearch';
import {
  FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_DESCRIPTOR,
  planFandexMomentumPartialPersistenceRecoveryResearch,
} from '../lib/intelligence/fandexMomentumPartialPersistenceRecoveryResearch';

const historyUrl = new URL(
  '../data/momentum-research/iu_cross_family_evidence_state_v147.jsonl',
  import.meta.url,
);
const watermarkUrl = new URL(
  '../data/momentum-research/iu_evaluation_watermark_v151.jsonl',
  import.meta.url,
);
const manifestUrl = new URL(
  '../data/momentum-research/iu_paired_artifact_manifest_v154.jsonl',
  import.meta.url,
);

function result(input?: Readonly<{
  cutoff?: string;
  digest?: string;
}>): FandexMomentumOutputFormEligibilityResearchResult {
  return {
    contractVersion: 'v143_fandex_momentum_output_form_eligibility_research_v1',
    sourceContractVersion: 'v142_fandex_momentum_cross_family_combination_research_v1',
    state: 'categorical-research-output-only',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: input?.cutoff ?? '2026-09-20T01:59:13.000Z',
    currentResearchOutput: {
      outputForm: 'structured-categorical-evidence',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      qualitativeDirectionEvidenceUsable: false,
      levelPercentileSpreadDiagnostic: 100,
      productMomentumScore: null,
    },
    numericEligibility: {
      status: 'not-eligible',
      unmetRequirements: [
        'numeric-estimand-defined',
        'independent-calibration-target-established',
        'non-circular-observed-calibration-dataset-available',
        'data-derived-mapping-or-weights-established',
        'out-of-sample-validation-passed',
        'conflict-and-missingness-numeric-policy-validated',
        'product-schema-migration-prevents-preview-fallback',
      ],
      numericEstimand: null,
      calibrationTarget: null,
      mappingOrWeights: null,
      outOfSampleValidation: null,
      additionalFamiliesAloneSufficient: false,
      legacyPreviewSeedCalibrationAllowed: false,
    },
    currentProductSchema: {
      metricValueKind: 'number-or-null',
      weightedScoreRequiresNumericValue: true,
      currentMomentumSourceStage: 'derived_signal',
      currentMomentumQualityLabel: 'preview',
      previewFallbackEnabled: true,
      previewFallbackExample: null,
      categoricalEvidenceFitsCurrentMomentumSlot: false,
    },
    researchCarrier: {
      observationContractVersion: 'fandex-observation-v1',
      categoricalRawValueSupported: true,
      recommendedVariableId: 'momentum.cross-family-evidence-state.research',
      registryBindingEstablished: false,
      productMetricBindingEstablished: false,
    },
    blockers: [],
    digest:
      input?.digest
      ?? '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
    effects: {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    },
  };
}

function source(input?: Readonly<{
  lastfmId?: string;
  lastfmEnd?: string;
  naverId?: string;
  naverThrough?: string;
}>): FandexMomentumSourceEvidenceWatermark {
  return {
    lastfmEvidenceId:
      input?.lastfmId ?? '723cf73abb93882779edc0621a12381ab80e464c',
    lastfmLatestComponentEndAt:
      input?.lastfmEnd ?? '2026-09-20T01:59:13.000Z',
    naverEvidenceId:
      input?.naverId
      ?? 'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d',
    naverThroughSlotStart:
      input?.naverThrough ?? '2026-09-21T00:00:00.000Z',
  };
}

async function artifacts() {
  const [historyJsonl, watermarkJsonl, manifestJsonl] = await Promise.all([
    readFile(historyUrl, 'utf8'),
    readFile(watermarkUrl, 'utf8'),
    readFile(manifestUrl, 'utf8'),
  ]);
  return { historyJsonl, watermarkJsonl, manifestJsonl };
}

async function currentPreflight() {
  const { historyJsonl, watermarkJsonl, manifestJsonl } = await artifacts();
  const preflight = evaluateFandexMomentumManifestGuardedPreflightResearch({
    historyJsonl,
    watermarkJsonl,
    manifestJsonl,
    result: result(),
    sourceEvidence: source(),
    evaluatedAt: '2026-09-21T01:30:00.000Z',
    recordedAt: '2026-09-21T01:30:00.000Z',
    manifestedAt: '2026-09-21T01:30:00.000Z',
  });
  assert.equal(preflight.state, 'evaluation-prepared');
  return {
    historyJsonl,
    watermarkJsonl,
    manifestJsonl,
    preflight: preflight as FandexMomentumManifestGuardedPreflightPrepared,
  };
}

async function dualPreflight() {
  const { historyJsonl, watermarkJsonl, manifestJsonl } = await artifacts();
  const preflight = evaluateFandexMomentumManifestGuardedPreflightResearch({
    historyJsonl,
    watermarkJsonl,
    manifestJsonl,
    result: result({
      cutoff: '2026-09-21T01:58:00.000Z',
      digest: '3'.repeat(64),
    }),
    sourceEvidence: source({
      lastfmId: 'lastfm-next',
      lastfmEnd: '2026-09-21T01:58:00.000Z',
      naverId: 'naver-next',
      naverThrough: '2026-09-21T02:00:00.000Z',
    }),
    evaluatedAt: '2026-09-21T02:05:00.000Z',
    recordedAt: '2026-09-21T02:05:00.000Z',
    manifestedAt: '2026-09-21T02:05:00.000Z',
  });
  assert.equal(preflight.state, 'evaluation-prepared');
  return {
    historyJsonl,
    watermarkJsonl,
    manifestJsonl,
    preflight: preflight as FandexMomentumManifestGuardedPreflightPrepared,
  };
}

test('v157 is research-only planning and never rewrites already-correct artifacts', () => {
  assert.equal(
    FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_DESCRIPTOR
      .rewritesAlreadyCorrectArtifact,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_DESCRIPTOR
      .manifestAheadAutoRepairAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_DESCRIPTOR
      .physicalPersistencePerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('accepted resulting triple needs no recovery and allows next evaluation', async () => {
  const { preflight } = await currentPreflight();
  const acceptance = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: preflight.proposedHistoryJsonl,
    observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
    observedManifestJsonl: preflight.proposedManifestJsonl,
  });
  assert.equal(acceptance.state, 'accepted-resulting-triple');

  const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
    preflight,
    acceptance,
  });
  assert.equal(plan.state, 'no-recovery-needed');
  assert.equal(plan.readyForNextEvaluation, true);
  assert.equal(plan.safeRecoveryPlanAvailable, false);
  assert.deepEqual(plan.proposedWrites, {
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
  assert.equal(plan.historyWriteJsonl, null);
  assert.equal(plan.watermarkWriteJsonl, null);
  assert.equal(plan.manifestWriteJsonl, null);
});

test('current exact-replay with missing next manifest proposes manifest only', async () => {
  const { historyJsonl, watermarkJsonl, manifestJsonl, preflight } =
    await currentPreflight();
  assert.deepEqual(preflight.proposedWrites, {
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 1,
  });

  const acceptance = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(acceptance.state, 'manifest-write-not-applied');

  const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
    preflight,
    acceptance,
  });
  assert.equal(plan.state, 'recovery-plan-prepared');
  assert.equal(plan.readyForNextEvaluation, false);
  assert.equal(plan.safeRecoveryPlanAvailable, true);
  assert.deepEqual(plan.proposedWrites, {
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 1,
  });
  assert.equal(plan.historyWriteJsonl, null);
  assert.equal(plan.watermarkWriteJsonl, null);
  assert.equal(plan.manifestWriteJsonl, preflight.proposedManifestJsonl);
});

test('writes-not-applied proposes only the original required writes', async () => {
  const { historyJsonl, watermarkJsonl, manifestJsonl, preflight } =
    await dualPreflight();
  const acceptance = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(acceptance.state, 'writes-not-applied');

  const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
    preflight,
    acceptance,
  });
  assert.equal(plan.state, 'recovery-plan-prepared');
  assert.deepEqual(plan.proposedWrites, {
    historyWrites: 1,
    watermarkWrites: 1,
    manifestWrites: 1,
  });
  assert.equal(plan.historyWriteJsonl, preflight.proposedHistoryJsonl);
  assert.equal(plan.watermarkWriteJsonl, preflight.proposedWatermarkJsonl);
  assert.equal(plan.manifestWriteJsonl, preflight.proposedManifestJsonl);
});

test('partial-history-only never rewrites history and proposes missing watermark plus manifest', async () => {
  const { watermarkJsonl, manifestJsonl, preflight } = await dualPreflight();
  const acceptance = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: preflight.proposedHistoryJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(acceptance.state, 'partial-history-only');

  const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
    preflight,
    acceptance,
  });
  assert.deepEqual(plan.proposedWrites, {
    historyWrites: 0,
    watermarkWrites: 1,
    manifestWrites: 1,
  });
  assert.equal(plan.historyWriteJsonl, null);
  assert.equal(plan.watermarkWriteJsonl, preflight.proposedWatermarkJsonl);
  assert.equal(plan.manifestWriteJsonl, preflight.proposedManifestJsonl);
});

test('partial-watermark-only never rewrites watermark and proposes missing history plus manifest', async () => {
  const { historyJsonl, manifestJsonl, preflight } = await dualPreflight();
  const acceptance = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(acceptance.state, 'partial-watermark-only');

  const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
    preflight,
    acceptance,
  });
  assert.deepEqual(plan.proposedWrites, {
    historyWrites: 1,
    watermarkWrites: 0,
    manifestWrites: 1,
  });
  assert.equal(plan.historyWriteJsonl, preflight.proposedHistoryJsonl);
  assert.equal(plan.watermarkWriteJsonl, null);
  assert.equal(plan.manifestWriteJsonl, preflight.proposedManifestJsonl);
});

test('complete data pair with missing manifest proposes manifest only', async () => {
  const { manifestJsonl, preflight } = await dualPreflight();
  const acceptance = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: preflight.proposedHistoryJsonl,
    observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(
    acceptance.state,
    'history-watermark-applied-manifest-missing',
  );

  const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
    preflight,
    acceptance,
  });
  assert.deepEqual(plan.proposedWrites, {
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 1,
  });
  assert.equal(plan.historyWriteJsonl, null);
  assert.equal(plan.watermarkWriteJsonl, null);
  assert.equal(plan.manifestWriteJsonl, preflight.proposedManifestJsonl);
});

test('manifest-ahead states fail closed without proposing any data repair', async () => {
  const { historyJsonl, watermarkJsonl, preflight } = await dualPreflight();

  const states = [
    evaluateFandexMomentumTripleArtifactAcceptanceResearch({
      preflight,
      observedHistoryJsonl: historyJsonl,
      observedWatermarkJsonl: watermarkJsonl,
      observedManifestJsonl: preflight.proposedManifestJsonl,
    }),
    evaluateFandexMomentumTripleArtifactAcceptanceResearch({
      preflight,
      observedHistoryJsonl: historyJsonl,
      observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
      observedManifestJsonl: preflight.proposedManifestJsonl,
    }),
    evaluateFandexMomentumTripleArtifactAcceptanceResearch({
      preflight,
      observedHistoryJsonl: preflight.proposedHistoryJsonl,
      observedWatermarkJsonl: watermarkJsonl,
      observedManifestJsonl: preflight.proposedManifestJsonl,
    }),
  ];

  for (const acceptance of states) {
    assert.match(acceptance.state, /^manifest-applied-required-/);
    const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
      preflight,
      acceptance,
    });
    assert.equal(plan.state, 'recovery-blocked');
    assert.equal(plan.readyForNextEvaluation, false);
    assert.equal(plan.safeRecoveryPlanAvailable, false);
    assert.deepEqual(plan.proposedWrites, {
      historyWrites: 0,
      watermarkWrites: 0,
      manifestWrites: 0,
    });
    assert.equal(plan.historyWriteJsonl, null);
    assert.equal(plan.watermarkWriteJsonl, null);
    assert.equal(plan.manifestWriteJsonl, null);
    assert.ok(plan.blockers.includes('manifest-ahead-auto-repair-forbidden'));
  }
});

test('unexpected artifact state fails closed', async () => {
  const { watermarkJsonl, manifestJsonl, preflight } = await dualPreflight();
  const acceptance = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: preflight.proposedHistoryJsonl + 'tampered\n',
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(acceptance.state, 'unexpected-artifact-state');

  const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
    preflight,
    acceptance,
  });
  assert.equal(plan.state, 'recovery-blocked');
  assert.ok(
    plan.blockers.includes(
      'unexpected-artifact-state-auto-repair-forbidden',
    ),
  );
});

test('recovery planning itself has zero physical and Product effects', async () => {
  const { historyJsonl, watermarkJsonl, manifestJsonl, preflight } =
    await currentPreflight();
  const acceptance = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  const plan = planFandexMomentumPartialPersistenceRecoveryResearch({
    preflight,
    acceptance,
  });

  assert.deepEqual(plan.effects, {
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    databaseWrites: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});
