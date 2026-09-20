import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';
import {
  FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_DESCRIPTOR,
  FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_VERSION,
  evaluateFandexMomentumCommonCutoffAdvancementGateResearch,
  type FandexMomentumCommonCutoffEvaluationBoundary,
  type FandexMomentumSourceEvidenceWatermark,
} from '../lib/intelligence/fandexMomentumCommonCutoffAdvancementGateResearch';

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
    lastfmEvidenceId: input?.lastfmId ?? 'lastfm-blob-a',
    lastfmLatestComponentEndAt:
      input?.lastfmEnd ?? '2026-09-20T01:59:13.000Z',
    naverEvidenceId: input?.naverId ?? 'naver-job-a',
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

test('v150 descriptor requires common-cutoff advance before new history observation', () => {
  assert.equal(
    FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_DESCRIPTOR
      .sourceAdvanceWithoutCommonCutoffAdvanceCreatesHistoryRecord,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_DESCRIPTOR
      .commonCutoffAdvanceRequiredForHistoryAppend,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_DESCRIPTOR
      .delegatesAppendSemanticsToV148,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('source evidence may advance while common cutoff stays fixed without creating history', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const previous = boundary();
  const currentWatermark = watermark({
    naverId: 'naver-job-b',
    naverThrough: '2026-09-20T12:00:00.000Z',
  });

  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: currentWatermark,
    evaluatedAt: '2026-09-20T12:05:00.000Z',
    previousEvaluationBoundary: previous,
  });

  assert.equal(gate.contractVersion, FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_VERSION);
  assert.equal(gate.state, 'source-advanced-cutoff-unchanged');
  assert.equal(gate.sourceEvidenceAdvanced, true);
  assert.equal(gate.naverEvidenceAdvanced, true);
  assert.equal(gate.lastfmEvidenceAdvanced, false);
  assert.equal(gate.commonCutoffUnchanged, true);
  assert.equal(gate.historyObservationEligible, false);
  assert.equal(gate.invokeV148Allowed, false);
  assert.equal(gate.expectedV148Disposition, 'not-invoked');
  assert.equal(gate.effects.historyWrites, 0);
});

test('exact evaluation replay may delegate to v148 no-op without history write', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const previous = boundary();

  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: result(),
    sourceEvidence: previous.sourceEvidence,
    evaluatedAt: '2026-09-20T07:05:00.000Z',
    previousEvaluationBoundary: previous,
  });

  assert.equal(gate.state, 'exact-evaluation-replay');
  assert.equal(gate.sourceEvidenceAdvanced, false);
  assert.equal(gate.commonCutoffUnchanged, true);
  assert.equal(gate.historyObservationEligible, false);
  assert.equal(gate.invokeV148Allowed, true);
  assert.equal(gate.expectedV148Disposition, 'no-op-exact-replay');
});

test('advanced common cutoff with same category becomes append-eligible replay observation', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const previous = boundary();
  const next = result({
    cutoff: '2026-09-21T01:58:00.000Z',
    digest: '3'.repeat(64),
  });

  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: next,
    sourceEvidence: watermark({
      lastfmId: 'lastfm-blob-b',
      lastfmEnd: '2026-09-21T01:58:00.000Z',
      naverId: 'naver-job-c',
      naverThrough: '2026-09-21T02:00:00.000Z',
    }),
    evaluatedAt: '2026-09-21T02:05:00.000Z',
    previousEvaluationBoundary: previous,
  });

  assert.equal(gate.state, 'common-cutoff-advanced-categorical-replay');
  assert.equal(gate.commonCutoffAdvanced, true);
  assert.equal(gate.directionalConsensusChangedFromHistory, false);
  assert.equal(gate.persistenceConsensusChangedFromHistory, false);
  assert.equal(gate.historyObservationEligible, true);
  assert.equal(gate.invokeV148Allowed, true);
  assert.equal(
    gate.expectedV148Disposition,
    'append-cutoff-advanced-same-state',
  );
});

test('advanced common cutoff with category change becomes append-eligible change observation', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const previous = boundary();
  const next = result({
    cutoff: '2026-09-21T01:58:00.000Z',
    direction: 'direction-corroborated-up',
    persistence: 'one-direction-repeated',
    digest: '4'.repeat(64),
  });

  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: next,
    sourceEvidence: watermark({
      lastfmId: 'lastfm-blob-b',
      lastfmEnd: '2026-09-21T01:58:00.000Z',
      naverId: 'naver-job-c',
      naverThrough: '2026-09-21T02:00:00.000Z',
    }),
    evaluatedAt: '2026-09-21T02:05:00.000Z',
    previousEvaluationBoundary: previous,
  });

  assert.equal(gate.state, 'common-cutoff-advanced-categorical-change');
  assert.equal(gate.directionalConsensusChangedFromHistory, true);
  assert.equal(gate.persistenceConsensusChangedFromHistory, true);
  assert.equal(gate.historyObservationEligible, true);
  assert.equal(gate.invokeV148Allowed, true);
  assert.equal(gate.expectedV148Disposition, 'append-categorical-change');
});

test('same-cutoff changed categorical payload remains a conflict even when source evidence advanced', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const previous = boundary();
  const changed = result({
    direction: 'direction-corroborated-up',
    persistence: 'one-direction-repeated',
    digest: '5'.repeat(64),
  });

  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: changed,
    sourceEvidence: watermark({
      naverId: 'naver-job-b',
      naverThrough: '2026-09-20T12:00:00.000Z',
    }),
    evaluatedAt: '2026-09-20T12:05:00.000Z',
    previousEvaluationBoundary: previous,
  });

  assert.equal(gate.state, 'same-cutoff-conflict');
  assert.equal(gate.sourceEvidenceAdvanced, true);
  assert.equal(gate.historyObservationEligible, false);
  assert.equal(gate.invokeV148Allowed, false);
  assert.equal(
    gate.expectedV148Disposition,
    'blocked-same-cutoff-conflict',
  );
  assert.ok(gate.blockers.includes('same-cutoff-categorical-or-lineage-changed'));
});

test('regressed common cutoff is blocked before v148', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const previous = boundary();
  const regressed = result({
    cutoff: '2026-09-19T01:56:03.000Z',
    digest: '6'.repeat(64),
  });

  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl,
    result: regressed,
    sourceEvidence: previous.sourceEvidence,
    evaluatedAt: '2026-09-20T07:05:00.000Z',
    previousEvaluationBoundary: previous,
  });

  assert.equal(gate.state, 'out-of-order-cutoff');
  assert.equal(gate.commonCutoffRegressed, true);
  assert.equal(gate.historyObservationEligible, false);
  assert.equal(gate.invokeV148Allowed, false);
  assert.equal(gate.expectedV148Disposition, 'blocked-out-of-order');
});

test('source watermark regression fails closed independently of common cutoff', async () => {
  const historyJsonl = await readFile(historyUrl, 'utf8');
  const previous = boundary();

  assert.throws(
    () => evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
      historyJsonl,
      result: result(),
      sourceEvidence: watermark({
        naverThrough: '2026-09-20T05:00:00.000Z',
      }),
      evaluatedAt: '2026-09-20T07:05:00.000Z',
      previousEvaluationBoundary: previous,
    }),
    /source_watermark_regressed/,
  );
});
