import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';
import {
  evaluateFandexMomentumCommonCutoffAdvancementGateResearch,
  type FandexMomentumCommonCutoffEvaluationBoundary,
  type FandexMomentumSourceEvidenceWatermark,
} from '../lib/intelligence/fandexMomentumCommonCutoffAdvancementGateResearch';
import {
  FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_DESCRIPTOR,
  digestFandexMomentumEvaluationBoundarySemanticState,
  latestFandexMomentumEvaluationBoundaryResearch,
  parseFandexMomentumEvaluationWatermarkJsonl,
  persistFandexMomentumEvaluationWatermarkResearch,
} from '../lib/intelligence/fandexMomentumEvaluationWatermarkResearch';

const historyUrl = new URL(
  '../data/momentum-research/iu_cross_family_evidence_state_v147.jsonl',
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

function watermark(input?: Readonly<{
  lastfmId?: string;
  lastfmEnd?: string;
  naverId?: string;
  naverThrough?: string;
}>): FandexMomentumSourceEvidenceWatermark {
  return {
    lastfmEvidenceId: input?.lastfmId ?? '723cf73abb93882779edc0621a12381ab80e464c',
    lastfmLatestComponentEndAt:
      input?.lastfmEnd ?? '2026-09-20T01:59:13.000Z',
    naverEvidenceId:
      input?.naverId
      ?? 'cc9abd83d82ab18c7304977070f95f1a5e2960c128cc6f1cba83a190d9a8afad',
    naverThroughSlotStart:
      input?.naverThrough ?? '2026-09-20T06:00:00.000Z',
  };
}

function boundary(
  sourceEvidence = watermark(),
): FandexMomentumCommonCutoffEvaluationBoundary {
  return {
    canonicalArtistId: 'iu',
    evaluatedAt: '2026-09-20T07:04:00.000Z',
    commonAlignmentCutoffAt: '2026-09-20T01:59:13.000Z',
    sourceV143Digest:
      '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    sourceEvidence,
  };
}

test('v151 is a separate append-only evaluation watermark ledger', () => {
  assert.equal(
    FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_DESCRIPTOR.storageForm,
    'append-only-jsonl-hash-chain',
  );
  assert.equal(
    FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_DESCRIPTOR
      .separateFromCategoricalHistory,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_DESCRIPTOR
      .sourceAdvanceCutoffUnchangedCreatesRecord,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_DESCRIPTOR
      .exactEvaluationReplayCreatesRecord,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_EVALUATION_WATERMARK_RESEARCH_DESCRIPTOR
      .categoricalHistoryWriteAllowed,
    false,
  );
});

test('source-only advance appends watermark while categorical history remains untouched', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const previous = boundary();
  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: watermark({
      naverId: '21a47c4d99698dfa18dd802f05ca5210a6618139529a0f917598854398b8e0c5',
      naverThrough: '2026-09-20T14:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T14:10:00.000Z',
    previousEvaluationBoundary: previous,
  });

  assert.equal(gate.state, 'source-advanced-cutoff-unchanged');

  const persisted = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: '',
    gate,
  });

  assert.equal(persisted.state, 'appended');
  assert.equal(persisted.priorRecordCount, 0);
  assert.equal(persisted.resultingRecordCount, 1);
  assert.equal(persisted.effects.watermarkWrites, 1);
  assert.equal(persisted.effects.categoricalHistoryWrites, 0);

  const records = parseFandexMomentumEvaluationWatermarkJsonl(
    persisted.watermarkJsonl,
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].gateState, 'source-advanced-cutoff-unchanged');
  assert.equal(
    records[0].evaluationBoundary.sourceEvidence.naverThroughSlotStart,
    '2026-09-20T14:00:00.000Z',
  );
});

test('exact evaluation replay is byte-for-byte watermark no-op even when evaluatedAt changes', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const firstGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: watermark({
      naverId: '21a47c4d99698dfa18dd802f05ca5210a6618139529a0f917598854398b8e0c5',
      naverThrough: '2026-09-20T14:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T14:10:00.000Z',
    previousEvaluationBoundary: boundary(),
  });
  const first = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: '',
    gate: firstGate,
  });
  const latest = latestFandexMomentumEvaluationBoundaryResearch(
    first.watermarkJsonl,
  );
  assert.ok(latest);

  const replayGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: latest!.sourceEvidence,
    evaluatedAt: '2026-09-20T14:15:00.000Z',
    previousEvaluationBoundary: latest,
  });
  assert.equal(replayGate.state, 'exact-evaluation-replay');
  assert.notEqual(
    replayGate.nextEvaluationBoundary.evaluatedAt,
    latest!.evaluatedAt,
  );
  assert.equal(
    digestFandexMomentumEvaluationBoundarySemanticState(
      replayGate.nextEvaluationBoundary,
    ),
    digestFandexMomentumEvaluationBoundarySemanticState(latest!),
  );

  const replay = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: first.watermarkJsonl,
    gate: replayGate,
  });
  assert.equal(replay.state, 'no-op');
  assert.equal(replay.watermarkJsonl, first.watermarkJsonl);
  assert.equal(replay.priorRecordCount, 1);
  assert.equal(replay.resultingRecordCount, 1);
  assert.equal(replay.effects.watermarkWrites, 0);
});

test('common cutoff advance with same category appends a second watermark record', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const firstGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: watermark({
      naverId: '21a47c4d99698dfa18dd802f05ca5210a6618139529a0f917598854398b8e0c5',
      naverThrough: '2026-09-20T14:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T14:10:00.000Z',
    previousEvaluationBoundary: boundary(),
  });
  const first = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: '',
    gate: firstGate,
  });
  const latest = latestFandexMomentumEvaluationBoundaryResearch(
    first.watermarkJsonl,
  );
  assert.ok(latest);

  const advancedGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result({
      cutoff: '2026-09-21T01:58:00.000Z',
      digest: '3'.repeat(64),
    }),
    sourceEvidence: watermark({
      lastfmId: 'lastfm-blob-next',
      lastfmEnd: '2026-09-21T01:58:00.000Z',
      naverId: 'naver-next',
      naverThrough: '2026-09-21T02:00:00.000Z',
    }),
    evaluatedAt: '2026-09-21T02:05:00.000Z',
    previousEvaluationBoundary: latest,
  });
  assert.equal(
    advancedGate.state,
    'common-cutoff-advanced-categorical-replay',
  );

  const second = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: first.watermarkJsonl,
    gate: advancedGate,
  });
  assert.equal(second.state, 'appended');
  assert.equal(second.resultingRecordCount, 2);

  const records = parseFandexMomentumEvaluationWatermarkJsonl(
    second.watermarkJsonl,
  );
  assert.equal(records[1].previousRecordDigest, records[0].recordDigest);
  assert.equal(
    records[1].gateState,
    'common-cutoff-advanced-categorical-replay',
  );
});

test('common cutoff advance with categorical change also persists evaluation watermark', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const firstGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: watermark({
      naverId: '21a47c4d99698dfa18dd802f05ca5210a6618139529a0f917598854398b8e0c5',
      naverThrough: '2026-09-20T14:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T14:10:00.000Z',
    previousEvaluationBoundary: boundary(),
  });
  const first = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: '',
    gate: firstGate,
  });
  const latest = latestFandexMomentumEvaluationBoundaryResearch(
    first.watermarkJsonl,
  );
  assert.ok(latest);

  const changedGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result({
      cutoff: '2026-09-21T01:58:00.000Z',
      direction: 'direction-corroborated-up',
      persistence: 'one-direction-repeated',
      digest: '4'.repeat(64),
    }),
    sourceEvidence: watermark({
      lastfmId: 'lastfm-blob-next',
      lastfmEnd: '2026-09-21T01:58:00.000Z',
      naverId: 'naver-next',
      naverThrough: '2026-09-21T02:00:00.000Z',
    }),
    evaluatedAt: '2026-09-21T02:05:00.000Z',
    previousEvaluationBoundary: latest,
  });
  assert.equal(
    changedGate.state,
    'common-cutoff-advanced-categorical-change',
  );

  const second = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: first.watermarkJsonl,
    gate: changedGate,
  });
  assert.equal(second.state, 'appended');
  assert.equal(second.effects.categoricalHistoryWrites, 0);
  assert.equal(second.effects.watermarkWrites, 1);
});

test('conflict and regressed-cutoff gate states do not mutate watermark ledger', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const firstGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: watermark({
      naverId: '21a47c4d99698dfa18dd802f05ca5210a6618139529a0f917598854398b8e0c5',
      naverThrough: '2026-09-20T14:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T14:10:00.000Z',
    previousEvaluationBoundary: boundary(),
  });
  const first = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: '',
    gate: firstGate,
  });
  const latest = latestFandexMomentumEvaluationBoundaryResearch(
    first.watermarkJsonl,
  );
  assert.ok(latest);

  const conflictGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result({
      direction: 'direction-corroborated-up',
      persistence: 'one-direction-repeated',
      digest: '5'.repeat(64),
    }),
    sourceEvidence: watermark({
      naverId: 'naver-later',
      naverThrough: '2026-09-20T15:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T15:05:00.000Z',
    previousEvaluationBoundary: latest,
  });
  assert.equal(conflictGate.state, 'same-cutoff-conflict');

  const conflict = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: first.watermarkJsonl,
    gate: conflictGate,
  });
  assert.equal(conflict.state, 'blocked');
  assert.equal(conflict.watermarkJsonl, first.watermarkJsonl);

  const regressedGate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result({
      cutoff: '2026-09-19T01:56:03.000Z',
      digest: '6'.repeat(64),
    }),
    sourceEvidence: latest!.sourceEvidence,
    evaluatedAt: '2026-09-20T15:06:00.000Z',
    previousEvaluationBoundary: latest,
  });
  assert.equal(regressedGate.state, 'out-of-order-cutoff');

  const regressed = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: first.watermarkJsonl,
    gate: regressedGate,
  });
  assert.equal(regressed.state, 'blocked');
  assert.equal(regressed.watermarkJsonl, first.watermarkJsonl);
});

test('watermark hash-chain detects record tampering', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: watermark({
      naverId: '21a47c4d99698dfa18dd802f05ca5210a6618139529a0f917598854398b8e0c5',
      naverThrough: '2026-09-20T14:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T14:10:00.000Z',
    previousEvaluationBoundary: boundary(),
  });
  const persisted = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: '',
    gate,
  });
  const parsed = JSON.parse(persisted.watermarkJsonl.trim());
  parsed.evaluationBoundary.sourceEvidence.naverThroughSlotStart =
    '2026-09-20T15:00:00.000Z';

  assert.throws(
    () => parseFandexMomentumEvaluationWatermarkJsonl(
      JSON.stringify(parsed) + '\n',
    ),
    /semantic_boundary_digest_mismatch|record_digest_mismatch/,
  );
});
