import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  appendFandexMomentumUnifiedHistoryFromArtifactResearch,
  FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumAppendFromArtifactResearch';
import {
  parseFandexMomentumUnifiedHistoryJsonl,
} from '../lib/intelligence/fandexMomentumUnifiedHistoryResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';

function result(input: Readonly<{
  cutoff: string;
  direction:
    | 'direction-corroborated-down'
    | 'direction-conflicted';
  persistence:
    | 'one-direction-repeated'
    | 'persistence-not-applicable';
  digest: string;
}>): FandexMomentumOutputFormEligibilityResearchResult {
  return {
    contractVersion: 'v143_fandex_momentum_output_form_eligibility_research_v1',
    sourceContractVersion: 'v142_fandex_momentum_cross_family_combination_research_v1',
    state: 'categorical-research-output-only',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: input.cutoff,
    currentResearchOutput: {
      outputForm: 'structured-categorical-evidence',
      directionalConsensus: input.direction,
      persistenceConsensus: input.persistence,
      qualitativeDirectionEvidenceUsable:
        input.direction === 'direction-corroborated-down',
      levelPercentileSpreadDiagnostic: 50,
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
    digest: input.digest,
    effects: {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    },
  };
}

async function committed() {
  return readFile(
    new URL('../data/momentum-research/iu_cross_family_evidence_state_v147.jsonl', import.meta.url),
    'utf8',
  );
}

test('v148 is artifact-first, append-only, and Product-isolated', () => {
  assert.equal(
    FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_DESCRIPTOR.priorStateSource,
    'v147-unified-history-artifact',
  );
  assert.equal(
    FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_DESCRIPTOR.priorStateReconstructionRequired,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_DESCRIPTOR.exactReplayMutatesArtifact,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_DESCRIPTOR.appendPreservesExistingBytes,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_DESCRIPTOR.productMetricReadAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_DESCRIPTOR.productionEligible,
    false,
  );
});

test('v148 exact replay returns the committed artifact byte-for-byte unchanged', async () => {
  const history = await committed();
  const applied = appendFandexMomentumUnifiedHistoryFromArtifactResearch({
    historyJsonl: history,
    result: result({
      cutoff: '2026-09-20T01:59:13.000Z',
      direction: 'direction-conflicted',
      persistence: 'persistence-not-applicable',
      digest: '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
    }),
    recordedAt: '2026-09-20T06:30:00.000Z',
  });

  assert.equal(applied.state, 'no-op');
  assert.equal(applied.decision.changeKind, 'exact-replay');
  assert.equal(applied.artifactJsonl, history);
  assert.equal(applied.priorRecordCount, 2);
  assert.equal(applied.resultingRecordCount, 2);
  assert.equal(applied.effects.artifactAppends, 0);
});

test('v148 later cutoff appends exactly one hash-linked record while preserving prior bytes', async () => {
  const history = await committed();
  const applied = appendFandexMomentumUnifiedHistoryFromArtifactResearch({
    historyJsonl: history,
    result: result({
      cutoff: '2026-09-21T01:59:13.000Z',
      direction: 'direction-conflicted',
      persistence: 'persistence-not-applicable',
      digest: '3'.repeat(64),
    }),
    recordedAt: '2026-09-21T05:30:00.000Z',
  });

  assert.equal(applied.state, 'appended');
  assert.equal(applied.decision.changeKind, 'cutoff-advanced-same-state');
  assert.equal(applied.priorRecordCount, 2);
  assert.equal(applied.resultingRecordCount, 3);
  assert.equal(applied.effects.artifactAppends, 1);
  assert.ok(applied.artifactJsonl.startsWith(history));

  const records = parseFandexMomentumUnifiedHistoryJsonl(applied.artifactJsonl);
  assert.equal(records[2].sequence, 3);
  assert.equal(records[2].previousRecordDigest, records[1].recordDigest);
  assert.equal(records[2].previousSourceV143Digest, records[1].sourceV143Digest);
});

test('v148 classifies future direction+persistence transition directly from artifact latest state', async () => {
  const history = await committed();
  const applied = appendFandexMomentumUnifiedHistoryFromArtifactResearch({
    historyJsonl: history,
    result: result({
      cutoff: '2026-09-21T01:59:13.000Z',
      direction: 'direction-corroborated-down',
      persistence: 'one-direction-repeated',
      digest: '4'.repeat(64),
    }),
    recordedAt: '2026-09-21T05:30:00.000Z',
  });

  assert.equal(applied.state, 'appended');
  assert.equal(applied.decision.changeKind, 'direction-and-persistence-changed');
  assert.equal(applied.decision.directionalConsensusChanged, true);
  assert.equal(applied.decision.persistenceConsensusChanged, true);
});

test('v148 same-cutoff changed lineage is blocked without mutating artifact bytes', async () => {
  const history = await committed();
  const applied = appendFandexMomentumUnifiedHistoryFromArtifactResearch({
    historyJsonl: history,
    result: result({
      cutoff: '2026-09-20T01:59:13.000Z',
      direction: 'direction-conflicted',
      persistence: 'persistence-not-applicable',
      digest: '5'.repeat(64),
    }),
    recordedAt: '2026-09-20T06:30:00.000Z',
  });

  assert.equal(applied.state, 'blocked');
  assert.equal(applied.decision.changeKind, 'same-cutoff-conflict');
  assert.equal(applied.artifactJsonl, history);
  assert.equal(applied.effects.artifactAppends, 0);
});

test('v148 regressed cutoff is blocked without mutating artifact bytes', async () => {
  const history = await committed();
  const applied = appendFandexMomentumUnifiedHistoryFromArtifactResearch({
    historyJsonl: history,
    result: result({
      cutoff: '2026-09-19T01:59:13.000Z',
      direction: 'direction-conflicted',
      persistence: 'persistence-not-applicable',
      digest: '6'.repeat(64),
    }),
    recordedAt: '2026-09-20T06:30:00.000Z',
  });

  assert.equal(applied.state, 'blocked');
  assert.equal(applied.decision.changeKind, 'out-of-order-cutoff');
  assert.equal(applied.artifactJsonl, history);
  assert.equal(applied.effects.artifactAppends, 0);
});

test('v148 fails closed on malformed prior artifact before classification', () => {
  assert.throws(
    () => appendFandexMomentumUnifiedHistoryFromArtifactResearch({
      historyJsonl: '{"bad":true}\n',
      result: result({
        cutoff: '2026-09-21T01:59:13.000Z',
        direction: 'direction-conflicted',
        persistence: 'persistence-not-applicable',
        digest: '7'.repeat(64),
      }),
      recordedAt: '2026-09-21T05:30:00.000Z',
    }),
    /momentum_v147_/,
  );
});
