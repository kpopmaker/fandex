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
  coordinateFandexMomentumDualArtifactEvaluationResearch,
  FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumDualArtifactCoordinatorResearch';
import {
  parseFandexMomentumUnifiedHistoryJsonl,
} from '../lib/intelligence/fandexMomentumUnifiedHistoryResearch';
import {
  parseFandexMomentumEvaluationWatermarkJsonl,
} from '../lib/intelligence/fandexMomentumEvaluationWatermarkResearch';

const historyUrl = new URL(
  '../data/momentum-research/iu_cross_family_evidence_state_v147.jsonl',
  import.meta.url,
);
const watermarkUrl = new URL(
  '../data/momentum-research/iu_evaluation_watermark_v151.jsonl',
  import.meta.url,
);

function result(input?: Readonly<{
  cutoff?: string;
  direction?:
    | 'direction-corroborated-up'
    | 'direction-corroborated-down'
    | 'flat-corroborated'
    | 'direction-conflicted'
    | 'direction-insufficient';
  persistence?:
    | 'both-directions-repeated'
    | 'one-direction-repeated'
    | 'neither-direction-repeated'
    | 'persistence-not-applicable';
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
      directionalConsensus: input?.direction ?? 'direction-conflicted',
      persistenceConsensus: input?.persistence ?? 'persistence-not-applicable',
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
  return Promise.all([
    readFile(historyUrl, 'utf8'),
    readFile(watermarkUrl, 'utf8'),
  ]);
}

test('v152 coordinator owns only research artifact coordination boundaries', () => {
  assert.equal(
    FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_DESCRIPTOR
      .historyArtifact,
    'v147-unified-history-jsonl',
  );
  assert.equal(
    FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_DESCRIPTOR
      .evaluationWatermarkArtifact,
    'v151-evaluation-watermark-jsonl',
  );
  assert.equal(
    FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_DESCRIPTOR
      .sourceOnlyAdvanceWritesHistory,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_DESCRIPTOR
      .commonCutoffAdvanceWritesHistory,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_DESCRIPTOR
      .productMetricReadAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('committed current-real boundary is exact replay and mutates neither artifact', async () => {
  const [historyJsonl, watermarkJsonl] = await artifacts();
  const coordinated = coordinateFandexMomentumDualArtifactEvaluationResearch({
    historyJsonl,
    watermarkJsonl,
    result: result(),
    sourceEvidence: source(),
    evaluatedAt: '2026-09-20T14:20:00.000Z',
    recordedAt: '2026-09-20T14:20:00.000Z',
  });

  assert.equal(coordinated.state, 'no-op');
  assert.equal(coordinated.gate.state, 'exact-evaluation-replay');
  assert.equal(coordinated.historyDisposition, 'no-op');
  assert.equal(coordinated.watermarkDisposition, 'no-op');
  assert.equal(coordinated.historyJsonl, historyJsonl);
  assert.equal(coordinated.watermarkJsonl, watermarkJsonl);
  assert.equal(coordinated.effects.historyWrites, 0);
  assert.equal(coordinated.effects.watermarkWrites, 0);
});

test('source-only advancement appends watermark only', async () => {
  const [historyJsonl, watermarkJsonl] = await artifacts();
  const coordinated = coordinateFandexMomentumDualArtifactEvaluationResearch({
    historyJsonl,
    watermarkJsonl,
    result: result(),
    sourceEvidence: source({
      naverId: 'naver-later-source-only',
      naverThrough: '2026-09-20T22:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T22:05:00.000Z',
    recordedAt: '2026-09-20T22:05:00.000Z',
  });

  assert.equal(coordinated.state, 'watermark-only-appended');
  assert.equal(coordinated.gate.state, 'source-advanced-cutoff-unchanged');
  assert.equal(coordinated.historyDisposition, 'not-invoked');
  assert.equal(coordinated.watermarkDisposition, 'appended');
  assert.equal(coordinated.historyJsonl, historyJsonl);
  assert.equal(coordinated.effects.historyWrites, 0);
  assert.equal(coordinated.effects.watermarkWrites, 1);

  const watermarks = parseFandexMomentumEvaluationWatermarkJsonl(
    coordinated.watermarkJsonl,
  );
  assert.equal(watermarks.length, 3);
  assert.equal(
    watermarks[2].evaluationBoundary.sourceEvidence.naverThroughSlotStart,
    '2026-09-20T22:00:00.000Z',
  );
});

test('advanced common cutoff with same category appends both artifacts once', async () => {
  const [historyJsonl, watermarkJsonl] = await artifacts();
  const coordinated = coordinateFandexMomentumDualArtifactEvaluationResearch({
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
  });

  assert.equal(coordinated.state, 'dual-appended');
  assert.equal(
    coordinated.gate.state,
    'common-cutoff-advanced-categorical-replay',
  );
  assert.equal(coordinated.historyDisposition, 'appended');
  assert.equal(coordinated.watermarkDisposition, 'appended');
  assert.equal(coordinated.effects.historyWrites, 1);
  assert.equal(coordinated.effects.watermarkWrites, 1);

  const history = parseFandexMomentumUnifiedHistoryJsonl(
    coordinated.historyJsonl,
  );
  const watermarks = parseFandexMomentumEvaluationWatermarkJsonl(
    coordinated.watermarkJsonl,
  );
  assert.equal(history.length, 3);
  assert.equal(watermarks.length, 3);
  assert.equal(history[2].alignmentCutoffAt, '2026-09-21T01:58:00.000Z');
  assert.equal(
    watermarks[2].evaluationBoundary.commonAlignmentCutoffAt,
    history[2].alignmentCutoffAt,
  );
  assert.equal(
    watermarks[2].evaluationBoundary.sourceV143Digest,
    history[2].sourceV143Digest,
  );
});

test('advanced common cutoff with categorical change still appends both once', async () => {
  const [historyJsonl, watermarkJsonl] = await artifacts();
  const coordinated = coordinateFandexMomentumDualArtifactEvaluationResearch({
    historyJsonl,
    watermarkJsonl,
    result: result({
      cutoff: '2026-09-21T01:58:00.000Z',
      direction: 'direction-corroborated-up',
      persistence: 'one-direction-repeated',
      digest: '4'.repeat(64),
    }),
    sourceEvidence: source({
      lastfmId: 'lastfm-next-change',
      lastfmEnd: '2026-09-21T01:58:00.000Z',
      naverId: 'naver-next-change',
      naverThrough: '2026-09-21T02:00:00.000Z',
    }),
    evaluatedAt: '2026-09-21T02:06:00.000Z',
    recordedAt: '2026-09-21T02:06:00.000Z',
  });

  assert.equal(coordinated.state, 'dual-appended');
  assert.equal(
    coordinated.gate.state,
    'common-cutoff-advanced-categorical-change',
  );
  assert.equal(coordinated.effects.historyWrites, 1);
  assert.equal(coordinated.effects.watermarkWrites, 1);

  const history = parseFandexMomentumUnifiedHistoryJsonl(
    coordinated.historyJsonl,
  );
  assert.equal(history[2].directionalConsensus, 'direction-corroborated-up');
  assert.equal(history[2].persistenceConsensus, 'one-direction-repeated');
});

test('same-cutoff conflict blocks both artifacts byte-for-byte', async () => {
  const [historyJsonl, watermarkJsonl] = await artifacts();
  const coordinated = coordinateFandexMomentumDualArtifactEvaluationResearch({
    historyJsonl,
    watermarkJsonl,
    result: result({
      digest: '5'.repeat(64),
    }),
    sourceEvidence: source({
      naverId: 'naver-conflict',
      naverThrough: '2026-09-20T22:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T22:05:00.000Z',
    recordedAt: '2026-09-20T22:05:00.000Z',
  });

  assert.equal(coordinated.state, 'blocked');
  assert.equal(coordinated.gate.state, 'same-cutoff-conflict');
  assert.equal(coordinated.historyDisposition, 'not-invoked');
  assert.equal(coordinated.watermarkDisposition, 'blocked');
  assert.equal(coordinated.historyJsonl, historyJsonl);
  assert.equal(coordinated.watermarkJsonl, watermarkJsonl);
  assert.equal(coordinated.effects.historyWrites, 0);
  assert.equal(coordinated.effects.watermarkWrites, 0);
});

test('regressed common cutoff blocks both artifacts byte-for-byte', async () => {
  const [historyJsonl, watermarkJsonl] = await artifacts();
  const coordinated = coordinateFandexMomentumDualArtifactEvaluationResearch({
    historyJsonl,
    watermarkJsonl,
    result: result({
      cutoff: '2026-09-19T01:56:03.000Z',
      digest: '6'.repeat(64),
    }),
    sourceEvidence: source(),
    evaluatedAt: '2026-09-20T22:06:00.000Z',
    recordedAt: '2026-09-20T22:06:00.000Z',
  });

  assert.equal(coordinated.state, 'blocked');
  assert.equal(coordinated.gate.state, 'out-of-order-cutoff');
  assert.equal(coordinated.historyJsonl, historyJsonl);
  assert.equal(coordinated.watermarkJsonl, watermarkJsonl);
});

test('malformed prior artifact fails closed before coordination', async () => {
  const [historyJsonl, watermarkJsonl] = await artifacts();

  assert.throws(
    () => coordinateFandexMomentumDualArtifactEvaluationResearch({
      historyJsonl: '{"bad":true}\n',
      watermarkJsonl,
      result: result(),
      sourceEvidence: source(),
      evaluatedAt: '2026-09-20T22:07:00.000Z',
      recordedAt: '2026-09-20T22:07:00.000Z',
    }),
    /momentum_v147_/,
  );

  assert.throws(
    () => coordinateFandexMomentumDualArtifactEvaluationResearch({
      historyJsonl,
      watermarkJsonl: '{"bad":true}\n',
      result: result(),
      sourceEvidence: source(),
      evaluatedAt: '2026-09-20T22:07:00.000Z',
      recordedAt: '2026-09-20T22:07:00.000Z',
    }),
    /momentum_v151_/,
  );
});


test('committed v152 current-real audit proves watermark-only apply then idempotent replay', async () => {
  const audit = JSON.parse(await readFile(
    new URL('../data/momentum-research/iu_current_real_v152_20260920T150000Z.json', import.meta.url),
    'utf8',
  ));

  assert.equal(
    audit.contractVersion,
    'v152_fandex_momentum_current_real_dual_artifact_audit_v1',
  );
  assert.equal(audit.v143.alignmentCutoffAt, '2026-09-20T01:59:13.000Z');
  assert.equal(
    audit.v143.digest,
    '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
  );

  assert.equal(audit.initialV152Application.state, 'watermark-only-appended');
  assert.equal(
    audit.initialV152Application.gateState,
    'source-advanced-cutoff-unchanged',
  );
  assert.equal(audit.initialV152Application.historyRecordCountBefore, 2);
  assert.equal(audit.initialV152Application.historyRecordCountAfter, 2);
  assert.equal(audit.initialV152Application.watermarkRecordCountBefore, 1);
  assert.equal(audit.initialV152Application.watermarkRecordCountAfter, 2);
  assert.equal(audit.initialV152Application.effects.historyWrites, 0);
  assert.equal(audit.initialV152Application.effects.watermarkWrites, 1);

  assert.equal(audit.committedReplayValidation.state, 'no-op');
  assert.equal(
    audit.committedReplayValidation.gateState,
    'exact-evaluation-replay',
  );
  assert.equal(audit.committedReplayValidation.historyRecordCountBefore, 2);
  assert.equal(audit.committedReplayValidation.historyRecordCountAfter, 2);
  assert.equal(audit.committedReplayValidation.watermarkRecordCountBefore, 2);
  assert.equal(audit.committedReplayValidation.watermarkRecordCountAfter, 2);
  assert.equal(audit.committedReplayValidation.effects.historyWrites, 0);
  assert.equal(audit.committedReplayValidation.effects.watermarkWrites, 0);

  assert.equal(
    audit.initialV152Application.resultingWatermarkDigest,
    audit.committedReplayValidation.watermarkDigest,
  );
});
