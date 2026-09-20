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
  FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_DESCRIPTOR,
  evaluateFandexMomentumManifestGuardedPreflightResearch,
} from '../lib/intelligence/fandexMomentumManifestGuardedPreflightResearch';
import {
  parseFandexMomentumPairedArtifactManifestJsonl,
} from '../lib/intelligence/fandexMomentumPairedArtifactManifestResearch';

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

test('v155 is a research-only preflight before any v152 invocation', () => {
  assert.equal(
    FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_DESCRIPTOR
      .currentPairAcceptanceRequiredBeforeCoordinator,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_DESCRIPTOR
      .blockedPreflightInvokesCoordinator,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_DESCRIPTOR
      .returnsProposedTripleArtifactBoundary,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_DESCRIPTOR
      .physicalPersistencePerformed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('current committed pair passes preflight and prepares an exact-replay manifest intent', async () => {
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
  if (preflight.state !== 'evaluation-prepared') return;
  assert.equal(
    preflight.currentPairAcceptance.state,
    'expected-no-write-pair',
  );
  assert.equal(preflight.currentPairAcceptance.readyForNextEvaluation, true);
  assert.equal(preflight.coordinatorInvoked, true);
  assert.equal(preflight.coordinator.state, 'no-op');
  assert.equal(preflight.coordinator.gate.state, 'exact-evaluation-replay');
  assert.equal(preflight.nextManifest.sequence, 3);
  assert.equal(preflight.nextManifest.coordinatorState, 'no-op');
  assert.equal(
    preflight.nextManifest.previousManifestDigest,
    'f75a89c363dcb06a5a534e132b25f710aa8cb12bb5be23e3c7a99f3875c0e9af',
  );
  assert.deepEqual(preflight.proposedWrites, {
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 1,
  });
  assert.equal(preflight.proposedHistoryJsonl, historyJsonl);
  assert.equal(preflight.proposedWatermarkJsonl, watermarkJsonl);
  assert.equal(preflight.readyForPhysicalPersistence, true);
  assert.deepEqual(preflight.blockers, []);
  assert.deepEqual(preflight.effects, {
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    databaseWrites: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });

  const proposedManifest =
    parseFandexMomentumPairedArtifactManifestJsonl(
      preflight.proposedManifestJsonl,
    );
  assert.equal(proposedManifest.length, 3);
  assert.equal(
    proposedManifest[2].manifestDigest,
    preflight.nextManifest.manifestDigest,
  );
});

test('unexpected current artifact bytes block before coordinator invocation', async () => {
  const { manifestJsonl, historyJsonl, watermarkJsonl } = await artifacts();
  let calls = 0;
  const preflight = evaluateFandexMomentumManifestGuardedPreflightResearch({
    manifestJsonl,
    historyJsonl: historyJsonl + 'tampered\n',
    watermarkJsonl,
    result: result(),
    sourceEvidence: source(),
    evaluatedAt: '2026-09-20T16:21:00.000Z',
    recordedAt: '2026-09-20T16:21:00.000Z',
    manifestedAt: '2026-09-20T16:21:00.000Z',
  }, {
    coordinate() {
      calls += 1;
      throw new Error('coordinator_must_not_run');
    },
  });

  assert.equal(calls, 0);
  assert.equal(preflight.state, 'preflight-blocked');
  assert.equal(preflight.coordinatorInvoked, false);
  assert.equal(
    preflight.currentPairAcceptance?.state,
    'unexpected-artifact-state',
  );
  assert.deepEqual(preflight.blockers, ['paired-artifact-state-unexpected']);
  assert.equal(preflight.coordinator, null);
  assert.equal(preflight.nextManifest, null);
  assert.equal(preflight.proposedHistoryJsonl, null);
  assert.equal(preflight.proposedWatermarkJsonl, null);
  assert.equal(preflight.proposedManifestJsonl, null);
  assert.equal(preflight.readyForPhysicalPersistence, false);
});

test('missing manifest blocks without coordinator invocation', async () => {
  const { historyJsonl, watermarkJsonl } = await artifacts();
  let calls = 0;
  const preflight = evaluateFandexMomentumManifestGuardedPreflightResearch({
    manifestJsonl: '',
    historyJsonl,
    watermarkJsonl,
    result: result(),
    sourceEvidence: source(),
    evaluatedAt: '2026-09-20T16:22:00.000Z',
    recordedAt: '2026-09-20T16:22:00.000Z',
    manifestedAt: '2026-09-20T16:22:00.000Z',
  }, {
    coordinate() {
      calls += 1;
      throw new Error('coordinator_must_not_run');
    },
  });

  assert.equal(calls, 0);
  assert.equal(preflight.state, 'preflight-blocked');
  assert.equal(preflight.currentPairAcceptance, null);
  assert.deepEqual(preflight.blockers, ['paired-artifact-manifest-missing']);
});

test('accepted pair can prepare a future dual-artifact plus manifest transaction without writing it', async () => {
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
  if (preflight.state !== 'evaluation-prepared') return;
  assert.equal(preflight.coordinator.state, 'dual-appended');
  assert.equal(
    preflight.coordinator.gate.state,
    'common-cutoff-advanced-categorical-replay',
  );
  assert.equal(preflight.nextManifest.sequence, 3);
  assert.equal(preflight.nextManifest.coordinatorState, 'dual-appended');
  assert.deepEqual(preflight.nextManifest.expectedWrites, {
    historyWrites: 1,
    watermarkWrites: 1,
  });
  assert.deepEqual(preflight.proposedWrites, {
    historyWrites: 1,
    watermarkWrites: 1,
    manifestWrites: 1,
  });
  assert.notEqual(preflight.proposedHistoryJsonl, historyJsonl);
  assert.notEqual(preflight.proposedWatermarkJsonl, watermarkJsonl);
  assert.equal(
    parseFandexMomentumPairedArtifactManifestJsonl(
      preflight.proposedManifestJsonl,
    ).length,
    3,
  );
  assert.equal(preflight.effects.historyWrites, 0);
  assert.equal(preflight.effects.watermarkWrites, 0);
  assert.equal(preflight.effects.manifestWrites, 0);
});

test('invalid manifest chain fails closed before any coordinator dependency can run', async () => {
  const { manifestJsonl, historyJsonl, watermarkJsonl } = await artifacts();
  const lines = manifestJsonl.split(/\r?\n/).filter(Boolean);
  let calls = 0;

  assert.throws(
    () => evaluateFandexMomentumManifestGuardedPreflightResearch({
      manifestJsonl: lines[1] + '\n',
      historyJsonl,
      watermarkJsonl,
      result: result(),
      sourceEvidence: source(),
      evaluatedAt: '2026-09-20T16:23:00.000Z',
      recordedAt: '2026-09-20T16:23:00.000Z',
      manifestedAt: '2026-09-20T16:23:00.000Z',
    }, {
      coordinate() {
        calls += 1;
        throw new Error('coordinator_must_not_run');
      },
    }),
    /momentum_v154_manifest_order_invalid|momentum_v154_first_manifest_link_invalid/,
  );
  assert.equal(calls, 0);
});


test('committed v155 current-real audit reproduces the exact preflight proposal', async () => {
  const [auditRaw, manifestJsonl, historyJsonl, watermarkJsonl] = await Promise.all([
    readFile(
      new URL(
        '../data/momentum-research/iu_manifest_guarded_preflight_v155_20260920T162000Z.json',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(manifestUrl, 'utf8'),
    readFile(historyUrl, 'utf8'),
    readFile(watermarkUrl, 'utf8'),
  ]);
  const audit = JSON.parse(auditRaw);

  const preflight = evaluateFandexMomentumManifestGuardedPreflightResearch({
    manifestJsonl,
    historyJsonl,
    watermarkJsonl,
    result: result(),
    sourceEvidence: source(),
    evaluatedAt: audit.evaluatedAt,
    recordedAt: audit.recordedAt,
    manifestedAt: audit.manifestedAt,
  });

  assert.equal(preflight.state, 'evaluation-prepared');
  if (preflight.state !== 'evaluation-prepared') return;
  assert.equal(preflight.digest, audit.preflight.digest);
  assert.equal(
    preflight.currentPairAcceptance.digest,
    audit.preflight.currentPairAcceptance.digest,
  );
  assert.equal(
    preflight.coordinator.digest,
    audit.preflight.coordinator.digest,
  );
  assert.equal(
    preflight.nextManifest.manifestDigest,
    audit.preflight.nextManifest.manifestDigest,
  );
  assert.equal(
    preflight.nextManifest.previousManifestDigest,
    audit.preflight.nextManifest.previousManifestDigest,
  );
  assert.deepEqual(preflight.proposedWrites, audit.preflight.proposedWrites);
  assert.equal(
    parseFandexMomentumPairedArtifactManifestJsonl(
      preflight.proposedManifestJsonl,
    ).length,
    audit.preflight.proposedManifestRecordCount,
  );
  assert.equal(preflight.proposedHistoryJsonl === historyJsonl, true);
  assert.equal(preflight.proposedWatermarkJsonl === watermarkJsonl, true);
  assert.equal(audit.preflight.physicalPersistencePerformed, false);
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
