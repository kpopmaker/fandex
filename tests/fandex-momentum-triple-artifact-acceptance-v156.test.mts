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
  FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumTripleArtifactAcceptanceResearch';

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
      ?? '39ec4ddeeda1eedd906bc33288e1550a6c8fd3aeb1f46be590e661fcb6c41a9c',
    naverThroughSlotStart:
      input?.naverThrough ?? '2026-09-20T15:00:00.000Z',
  };
}

async function artifacts() {
  const [manifestJsonl, historyJsonl, watermarkJsonl] = await Promise.all([
    readFile(manifestUrl, 'utf8'),
    readFile(historyUrl, 'utf8'),
    readFile(watermarkUrl, 'utf8'),
  ]);
  return { manifestJsonl, historyJsonl, watermarkJsonl };
}

async function currentPreflight() {
  const { manifestJsonl, historyJsonl, watermarkJsonl } = await artifacts();
  const preflight = evaluateFandexMomentumManifestGuardedPreflightResearch({
    manifestJsonl,
    historyJsonl,
    watermarkJsonl,
    result: result(),
    sourceEvidence: source(),
    evaluatedAt: '2026-09-20T16:20:00.000Z',
    recordedAt: '2026-09-20T16:20:00.000Z',
    manifestedAt: '2026-09-20T16:20:00.000Z',
  });
  assert.equal(preflight.state, 'evaluation-prepared');
  return {
    manifestJsonl,
    historyJsonl,
    watermarkJsonl,
    preflight: preflight as FandexMomentumManifestGuardedPreflightPrepared,
  };
}

async function dualPreflight() {
  const { manifestJsonl, historyJsonl, watermarkJsonl } = await artifacts();
  const preflight = evaluateFandexMomentumManifestGuardedPreflightResearch({
    manifestJsonl,
    historyJsonl,
    watermarkJsonl,
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
    manifestJsonl,
    historyJsonl,
    watermarkJsonl,
    preflight: preflight as FandexMomentumManifestGuardedPreflightPrepared,
  };
}

test('v156 accepts only the exact expected history/watermark/manifest triple', () => {
  assert.equal(
    FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_DESCRIPTOR
      .verifiesHistoryWatermarkAndManifestTogether,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_DESCRIPTOR
      .acceptsOnlyExactExpectedTriple,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_DESCRIPTOR
      .detectsPairAppliedManifestMissing,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_DESCRIPTOR
      .databaseWriteAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('current exact-replay proposal accepts only after manifest sequence 3 is observed', async () => {
  const { manifestJsonl, historyJsonl, watermarkJsonl, preflight } =
    await currentPreflight();

  const beforeManifest = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(beforeManifest.state, 'manifest-write-not-applied');
  assert.equal(beforeManifest.readyForNextEvaluation, false);
  assert.deepEqual(beforeManifest.blockers, [
    'triple-artifact-manifest-write-missing',
  ]);

  const accepted = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: preflight.proposedManifestJsonl,
  });
  assert.equal(accepted.state, 'accepted-resulting-triple');
  assert.equal(accepted.pairAcceptance.state, 'expected-no-write-pair');
  assert.equal(accepted.manifestAtResult, true);
  assert.equal(accepted.exactExpectedTripleObserved, true);
  assert.equal(accepted.readyForNextEvaluation, true);
  assert.deepEqual(accepted.blockers, []);
  assert.deepEqual(accepted.effects, {
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    databaseWrites: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});

test('dual-write proposal detects no writes, one-sided writes, and pair-without-manifest', async () => {
  const { manifestJsonl, historyJsonl, watermarkJsonl, preflight } =
    await dualPreflight();

  const none = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(none.state, 'writes-not-applied');
  assert.equal(none.readyForNextEvaluation, false);

  const historyOnly = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: preflight.proposedHistoryJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(historyOnly.state, 'partial-history-only');
  assert.deepEqual(historyOnly.blockers, [
    'triple-artifact-watermark-write-missing',
    'triple-artifact-manifest-write-missing',
  ]);

  const watermarkOnly = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(watermarkOnly.state, 'partial-watermark-only');
  assert.deepEqual(watermarkOnly.blockers, [
    'triple-artifact-history-write-missing',
    'triple-artifact-manifest-write-missing',
  ]);

  const pairOnly = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: preflight.proposedHistoryJsonl,
    observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
    observedManifestJsonl: manifestJsonl,
  });
  assert.equal(
    pairOnly.state,
    'history-watermark-applied-manifest-missing',
  );
  assert.deepEqual(pairOnly.blockers, [
    'triple-artifact-manifest-write-missing',
  ]);
});

test('manifest-ahead states identify each missing required pair write', async () => {
  const { historyJsonl, watermarkJsonl, preflight } = await dualPreflight();

  const pairMissing = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: watermarkJsonl,
    observedManifestJsonl: preflight.proposedManifestJsonl,
  });
  assert.equal(pairMissing.state, 'manifest-applied-required-pair-missing');
  assert.deepEqual(pairMissing.blockers, [
    'triple-artifact-history-write-missing',
    'triple-artifact-watermark-write-missing',
  ]);

  const historyMissing = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: historyJsonl,
    observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
    observedManifestJsonl: preflight.proposedManifestJsonl,
  });
  assert.equal(
    historyMissing.state,
    'manifest-applied-required-history-missing',
  );
  assert.deepEqual(historyMissing.blockers, [
    'triple-artifact-history-write-missing',
  ]);

  const watermarkMissing =
    evaluateFandexMomentumTripleArtifactAcceptanceResearch({
      preflight,
      observedHistoryJsonl: preflight.proposedHistoryJsonl,
      observedWatermarkJsonl: watermarkJsonl,
      observedManifestJsonl: preflight.proposedManifestJsonl,
    });
  assert.equal(
    watermarkMissing.state,
    'manifest-applied-required-watermark-missing',
  );
  assert.deepEqual(watermarkMissing.blockers, [
    'triple-artifact-watermark-write-missing',
  ]);
});

test('dual-write proposal becomes ready only when the exact proposed triple is observed', async () => {
  const { preflight } = await dualPreflight();

  const accepted = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: preflight.proposedHistoryJsonl,
    observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
    observedManifestJsonl: preflight.proposedManifestJsonl,
  });
  assert.equal(accepted.state, 'accepted-resulting-triple');
  assert.equal(accepted.pairAcceptance.state, 'accepted-resulting-pair');
  assert.equal(accepted.manifestAtResult, true);
  assert.equal(accepted.exactExpectedTripleObserved, true);
  assert.equal(accepted.readyForNextEvaluation, true);
});

test('tampered history, watermark, or manifest bytes fail closed', async () => {
  const { preflight } = await dualPreflight();

  const historyTampered = evaluateFandexMomentumTripleArtifactAcceptanceResearch({
    preflight,
    observedHistoryJsonl: preflight.proposedHistoryJsonl + 'tampered\n',
    observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
    observedManifestJsonl: preflight.proposedManifestJsonl,
  });
  assert.equal(historyTampered.state, 'unexpected-artifact-state');
  assert.equal(historyTampered.readyForNextEvaluation, false);

  const watermarkTampered =
    evaluateFandexMomentumTripleArtifactAcceptanceResearch({
      preflight,
      observedHistoryJsonl: preflight.proposedHistoryJsonl,
      observedWatermarkJsonl: preflight.proposedWatermarkJsonl + 'tampered\n',
      observedManifestJsonl: preflight.proposedManifestJsonl,
    });
  assert.equal(watermarkTampered.state, 'unexpected-artifact-state');
  assert.equal(watermarkTampered.readyForNextEvaluation, false);

  const manifestLines = preflight.proposedManifestJsonl
    .split(/\r?\n/)
    .filter(Boolean);
  const manifestTampered =
    manifestLines.slice(0, -1).join('\n') + '\n';
  const missingFinalManifest =
    evaluateFandexMomentumTripleArtifactAcceptanceResearch({
      preflight,
      observedHistoryJsonl: preflight.proposedHistoryJsonl,
      observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
      observedManifestJsonl: manifestTampered,
    });
  assert.equal(
    missingFinalManifest.state,
    'history-watermark-applied-manifest-missing',
  );

  const invalidManifest = preflight.proposedManifestJsonl + '{}\n';
  assert.throws(
    () => evaluateFandexMomentumTripleArtifactAcceptanceResearch({
      preflight,
      observedHistoryJsonl: preflight.proposedHistoryJsonl,
      observedWatermarkJsonl: preflight.proposedWatermarkJsonl,
      observedManifestJsonl: invalidManifest,
    }),
    /momentum_v154_/,
  );
});
