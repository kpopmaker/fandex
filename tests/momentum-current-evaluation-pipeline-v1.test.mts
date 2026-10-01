import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateFandexMomentumCurrentEvaluationPipeline,
} from '../lib/intelligence/fandexMomentumCurrentEvaluationPipeline';
import type {
  FandexNaverMediaAttentionMomentumResearchResult,
} from '../lib/intelligence/fandexNaverMediaAttentionMomentumResearch';
import type {
  FandexMomentumTemporalNormalizationResearchResult,
} from '../lib/intelligence/fandexMomentumTemporalNormalizationResearch';
import type {
  FandexMomentumCrossFamilyCombinationResearchResult,
} from '../lib/intelligence/fandexMomentumCrossFamilyCombinationResearch';
import type {
  MomentumCarrierTail,
} from '../lib/intelligence/fandexMomentumCarrierPersistenceDecision';

const carrier: MomentumCarrierTail = Object.freeze({
  canonicalArtistId: 'iu',
  carrierRecordId:
    '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd',
  alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
  directionalConsensus: 'direction-conflicted',
  persistenceConsensus: 'persistence-not-applicable',
  sourceLineage: Object.freeze({
    kind: 'legacy-v143',
    sourceContractVersion:
      'v143_fandex_momentum_output_form_eligibility_research_v1',
    sourceDigest:
      '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
  }),
});

const latestNaverStoredEvidence = Object.freeze({
  throughSlotStart: '2026-10-03T08:00:00.000Z',
  jobId:
    '104b763e07956126f502b9f9635eea2e4db082ed53a50b6f0a07299823b159a6',
  collectionKey: 'sched-v125-naver-news-20261003t080000z-f1ed381d367d',
  exactOfficialProtocol: true,
  seriesStatus: 'available',
  expectedSlotCount: 57,
  reproducedSnapshotCount: 57,
});

const identity = Object.freeze({
  evaluatedAgainstMain: 'a'.repeat(40),
  evaluationHead: 'b'.repeat(40),
  workflowRunId: 123,
  workflowJobId: 456,
  evaluatedAt: '2026-10-03T08:10:00.000Z',
});

function v140() {
  return {
    state: 'direction-observed',
    canonicalArtistId: 'iu',
  } as unknown as FandexNaverMediaAttentionMomentumResearchResult;
}

function v141() {
  return {
    state: 'aligned-normalized-research',
  } as unknown as FandexMomentumTemporalNormalizationResearchResult;
}

function v142(
  overrides: Partial<FandexMomentumCrossFamilyCombinationResearchResult> = {},
) {
  return {
    contractVersion:
      'v142_fandex_momentum_cross_family_combination_research_v1',
    state: 'cross-family-direction-conflicted',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: '2026-10-03T02:45:54.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    combinationDecision: {
      qualitativeDirectionEvidenceUsable: false,
      numericCompositeAllowed: false,
      equalWeightAverageAllowed: false,
      percentileAverageAllowed: false,
      persistenceWeightingAllowed: false,
      productMomentumScore: null,
    },
    digest: 'c'.repeat(64),
    ...overrides,
  } as unknown as FandexMomentumCrossFamilyCombinationResearchResult;
}

test('fails closed before evaluation when Stored Evidence coverage is incomplete', () => {
  const value = evaluateFandexMomentumCurrentEvaluationPipeline({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: '',
    naverIssuePoints: [],
    latestNaverStoredEvidence: {
      ...latestNaverStoredEvidence,
      seriesStatus: 'unavailable',
      reproducedSnapshotCount: 3,
    },
    currentCarrier: carrier,
    identity,
  });

  assert.equal(value.state, 'not-ready');
  if (value.state !== 'not-ready') return;
  assert.equal(value.stage, 'naver-stored-evidence');
  assert.equal(value.safety.databaseWrites, 0);
});

test('advanced cutoff with unchanged categorical state becomes attested no-op', () => {
  const value = evaluateFandexMomentumCurrentEvaluationPipeline({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: 'unused-by-stub',
    naverIssuePoints: [],
    latestNaverStoredEvidence,
    currentCarrier: carrier,
    identity,
  }, {
    deriveMediaAttention: () => v140(),
    evaluateTemporal: () => v141(),
    evaluateCrossFamily: () => v142(),
  });

  assert.equal(value.state, 'evaluated');
  if (value.state !== 'evaluated') return;
  assert.equal(
    value.evaluationEvidence.decision.classification,
    'attested-no-op-cutoff-advanced-same-state',
  );
  assert.equal(value.execution.state, 'attested-no-op');
  assert.equal(value.execution.safety.historyWritePerformed, false);
});

test('advanced cutoff with changed direction and persistence produces append candidate only', () => {
  const value = evaluateFandexMomentumCurrentEvaluationPipeline({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: 'unused-by-stub',
    naverIssuePoints: [],
    latestNaverStoredEvidence,
    currentCarrier: carrier,
    identity,
  }, {
    deriveMediaAttention: () => v140(),
    evaluateTemporal: () => v141(),
    evaluateCrossFamily: () => v142({
      state: 'cross-family-direction-corroborated',
      directionalConsensus: 'direction-corroborated-up',
      persistenceConsensus: 'one-direction-repeated',
      combinationDecision: {
        qualitativeDirectionEvidenceUsable: true,
        numericCompositeAllowed: false,
        equalWeightAverageAllowed: false,
        percentileAverageAllowed: false,
        persistenceWeightingAllowed: false,
        productMomentumScore: null,
      },
    }),
  });

  assert.equal(value.state, 'evaluated');
  if (value.state !== 'evaluated') return;
  assert.equal(
    value.evaluationEvidence.decision.classification,
    'new-carrier-direction-and-persistence-changed',
  );
  assert.equal(value.execution.state, 'append-v2-carrier-candidate');
  assert.equal(value.execution.safety.historyWritePerformed, false);
});

test('same-cutoff state change is revision-review blocked', () => {
  const value = evaluateFandexMomentumCurrentEvaluationPipeline({
    canonicalArtistId: 'iu',
    lastfmHistoryCsv: 'unused-by-stub',
    naverIssuePoints: [],
    latestNaverStoredEvidence,
    currentCarrier: carrier,
    identity,
  }, {
    deriveMediaAttention: () => v140(),
    evaluateTemporal: () => v141(),
    evaluateCrossFamily: () => v142({
      alignmentCutoffAt: carrier.alignmentCutoffAt,
      directionalConsensus: 'direction-corroborated-up',
    }),
  });

  assert.equal(value.state, 'blocked');
  if (value.state !== 'blocked') return;
  assert.equal(
    value.reason,
    'same-cutoff-state-change-revision-review-required',
  );
});
