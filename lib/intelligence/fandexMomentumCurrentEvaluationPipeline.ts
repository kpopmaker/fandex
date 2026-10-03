import {
  deriveFandexNaverMediaAttentionMomentumResearch,
  type FandexNaverMediaAttentionMomentumResearchResult,
} from './fandexNaverMediaAttentionMomentumResearch';
import {
  evaluateFandexMomentumTemporalNormalizationResearch,
  type FandexMomentumTemporalNormalizationResearchResult,
} from './fandexMomentumTemporalNormalizationResearch';
import {
  evaluateFandexMomentumCrossFamilyCombinationResearch,
  type FandexMomentumCrossFamilyCombinationResearchResult,
} from './fandexMomentumCrossFamilyCombinationResearch';
import {
  executeFandexMomentumCurrentEvaluation,
  type FandexMomentumCurrentEvaluationExecutionResult,
} from './fandexMomentumCurrentEvaluationExecution';
import type {
  MomentumCurrentDualSourceEvaluationEvidence,
} from './fandexMomentumCategoricalOutputAttestation';
import type {
  MomentumCarrierTail,
} from './fandexMomentumCarrierPersistenceDecision';
import type {
  NaverNewsIssuePointFrozenMethodologyResult,
} from '../server/ingestion/naverNewsIssuePointFrozenMethodology';

export const FANDEX_MOMENTUM_CURRENT_EVALUATION_PIPELINE_VERSION =
  'momentum-current-evaluation-pipeline-v1' as const;

type LatestNaverStoredEvidence =
  MomentumCurrentDualSourceEvaluationEvidence['latestNaverStoredEvidence'];

type EvaluationIdentity = Readonly<{
  evaluatedAgainstMain: string;
  evaluationHead: string;
  workflowRunId: number;
  workflowJobId: number;
  evaluatedAt: string;
}>;

type PipelineSafety = Readonly<{
  databaseMode: 'read-only';
  databaseWrites: 0;
  historyWritePerformed: false;
  productMetricReads: 0;
  productMetricWrites: 0;
  previewFallbackReads: 0;
  registryMutations: 0;
  productionActivations: 0;
}>;

export type FandexMomentumCurrentEvaluationPipelineResult =
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_CURRENT_EVALUATION_PIPELINE_VERSION;
      state: 'not-ready';
      stage:
        | 'naver-stored-evidence'
        | 'media-attention'
        | 'temporal-normalization'
        | 'cross-family';
      reason: string;
      safety: PipelineSafety;
    }>
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_CURRENT_EVALUATION_PIPELINE_VERSION;
      state: 'blocked';
      stage: 'carrier-classification';
      reason:
        | 'alignment-regression'
        | 'same-cutoff-state-change-revision-review-required';
      safety: PipelineSafety;
    }>
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_CURRENT_EVALUATION_PIPELINE_VERSION;
      state: 'evaluated';
      v140: FandexNaverMediaAttentionMomentumResearchResult;
      v141: FandexMomentumTemporalNormalizationResearchResult;
      v142: FandexMomentumCrossFamilyCombinationResearchResult;
      evaluationEvidence: MomentumCurrentDualSourceEvaluationEvidence;
      execution: FandexMomentumCurrentEvaluationExecutionResult;
      safety: PipelineSafety;
    }>;

export type FandexMomentumCurrentEvaluationPipelineDependencies = Readonly<{
  deriveMediaAttention?: typeof deriveFandexNaverMediaAttentionMomentumResearch;
  evaluateTemporal?: typeof evaluateFandexMomentumTemporalNormalizationResearch;
  evaluateCrossFamily?: typeof evaluateFandexMomentumCrossFamilyCombinationResearch;
  executeCurrentEvaluation?: typeof executeFandexMomentumCurrentEvaluation;
}>;

const SAFETY = Object.freeze({
  databaseMode: 'read-only' as const,
  databaseWrites: 0 as const,
  historyWritePerformed: false as const,
  productMetricReads: 0 as const,
  productMetricWrites: 0 as const,
  previewFallbackReads: 0 as const,
  registryMutations: 0 as const,
  productionActivations: 0 as const,
});

function notReady(
  stage: Extract<
    FandexMomentumCurrentEvaluationPipelineResult,
    { state: 'not-ready' }
  >['stage'],
  reason: string,
): FandexMomentumCurrentEvaluationPipelineResult {
  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CURRENT_EVALUATION_PIPELINE_VERSION,
    state: 'not-ready' as const,
    stage,
    reason,
    safety: SAFETY,
  });
}

function classification(
  carrier: MomentumCarrierTail,
  output: FandexMomentumCrossFamilyCombinationResearchResult,
):
  | Readonly<{
      kind: 'blocked';
      reason:
        | 'alignment-regression'
        | 'same-cutoff-state-change-revision-review-required';
    }>
  | Readonly<{
      kind: 'accepted';
      classification:
        | 'attested-no-op-same-cutoff-same-state'
        | 'attested-no-op-cutoff-advanced-same-state'
        | 'new-carrier-direction-state-changed'
        | 'new-carrier-persistence-state-changed'
        | 'new-carrier-direction-and-persistence-changed';
      newHistoryObservationRequired: boolean;
      attestedNoOp: boolean;
    }> {
  if (output.alignmentCutoffAt === null) {
    return Object.freeze({
      kind: 'blocked' as const,
      reason: 'alignment-regression' as const,
    });
  }

  const currentCutoff = Date.parse(carrier.alignmentCutoffAt);
  const nextCutoff = Date.parse(output.alignmentCutoffAt);
  const directionChanged =
    carrier.directionalConsensus !== output.directionalConsensus;
  const persistenceChanged =
    carrier.persistenceConsensus !== output.persistenceConsensus;

  if (nextCutoff < currentCutoff) {
    return Object.freeze({
      kind: 'blocked' as const,
      reason: 'alignment-regression' as const,
    });
  }

  if (nextCutoff === currentCutoff) {
    if (directionChanged || persistenceChanged) {
      return Object.freeze({
        kind: 'blocked' as const,
        reason:
          'same-cutoff-state-change-revision-review-required' as const,
      });
    }
    return Object.freeze({
      kind: 'accepted' as const,
      classification: 'attested-no-op-same-cutoff-same-state' as const,
      newHistoryObservationRequired: false,
      attestedNoOp: true,
    });
  }

  if (!directionChanged && !persistenceChanged) {
    return Object.freeze({
      kind: 'accepted' as const,
      classification: 'attested-no-op-cutoff-advanced-same-state' as const,
      newHistoryObservationRequired: false,
      attestedNoOp: true,
    });
  }

  if (directionChanged && persistenceChanged) {
    return Object.freeze({
      kind: 'accepted' as const,
      classification:
        'new-carrier-direction-and-persistence-changed' as const,
      newHistoryObservationRequired: true,
      attestedNoOp: false,
    });
  }

  if (directionChanged) {
    return Object.freeze({
      kind: 'accepted' as const,
      classification: 'new-carrier-direction-state-changed' as const,
      newHistoryObservationRequired: true,
      attestedNoOp: false,
    });
  }

  return Object.freeze({
    kind: 'accepted' as const,
    classification: 'new-carrier-persistence-state-changed' as const,
    newHistoryObservationRequired: true,
    attestedNoOp: false,
  });
}

export function evaluateFandexMomentumCurrentEvaluationPipeline(
  input: Readonly<{
    canonicalArtistId: string;
    lastfmHistoryCsv: string;
    naverIssuePoints: readonly NaverNewsIssuePointFrozenMethodologyResult[];
    latestNaverStoredEvidence: LatestNaverStoredEvidence;
    currentCarrier: MomentumCarrierTail;
    identity: EvaluationIdentity;
  }>,
  dependencies: FandexMomentumCurrentEvaluationPipelineDependencies = {},
): FandexMomentumCurrentEvaluationPipelineResult {
  if (
    input.latestNaverStoredEvidence.exactOfficialProtocol !== true
    || input.latestNaverStoredEvidence.seriesStatus !== 'available'
    || input.latestNaverStoredEvidence.expectedSlotCount <= 0
    || input.latestNaverStoredEvidence.reproducedSnapshotCount
      !== input.latestNaverStoredEvidence.expectedSlotCount
  ) {
    return notReady(
      'naver-stored-evidence',
      'current-naver-stored-evidence-incomplete',
    );
  }

  const deriveMediaAttention =
    dependencies.deriveMediaAttention
    ?? deriveFandexNaverMediaAttentionMomentumResearch;
  const v140 = deriveMediaAttention(input.naverIssuePoints);
  if (
    v140.canonicalArtistId !== input.canonicalArtistId
    || (
      v140.state !== 'direction-observed'
      && v140.state !== 'flat-observed'
      && v140.state !== 'persistence-observed'
    )
  ) {
    return notReady('media-attention', v140.state);
  }

  const evaluateTemporal =
    dependencies.evaluateTemporal
    ?? evaluateFandexMomentumTemporalNormalizationResearch;
  const v141 = evaluateTemporal({
    canonicalArtistId: input.canonicalArtistId,
    lastfmHistoryCsv: input.lastfmHistoryCsv,
    naverComponent: v140,
  });
  if (v141.state !== 'aligned-normalized-research') {
    return notReady('temporal-normalization', v141.state);
  }

  const evaluateCrossFamily =
    dependencies.evaluateCrossFamily
    ?? evaluateFandexMomentumCrossFamilyCombinationResearch;
  const v142 = evaluateCrossFamily(v141);
  if (
    v142.state === 'blocked'
    || v142.alignmentCutoffAt === null
  ) {
    return notReady('cross-family', v142.state);
  }

  const decision = classification(input.currentCarrier, v142);
  if (decision.kind === 'blocked') {
    return Object.freeze({
      contractVersion: FANDEX_MOMENTUM_CURRENT_EVALUATION_PIPELINE_VERSION,
      state: 'blocked' as const,
      stage: 'carrier-classification' as const,
      reason: decision.reason,
      safety: SAFETY,
    });
  }

  const evidence: MomentumCurrentDualSourceEvaluationEvidence =
    Object.freeze({
      contractVersion:
        'momentum-current-dual-source-categorical-evaluation-evidence-v1',
      evaluatedAgainstMain: input.identity.evaluatedAgainstMain,
      evaluationHead: input.identity.evaluationHead,
      workflowRunId: input.identity.workflowRunId,
      workflowJobId: input.identity.workflowJobId,
      evaluatedAt: input.identity.evaluatedAt,
      canonicalArtistId: input.canonicalArtistId,
      latestNaverStoredEvidence: input.latestNaverStoredEvidence,
      categoricalEvaluation: Object.freeze({
        state: v142.state,
        alignmentCutoffAt: v142.alignmentCutoffAt,
        directionalConsensus: v142.directionalConsensus,
        persistenceConsensus: v142.persistenceConsensus,
        qualitativeDirectionEvidenceUsable:
          v142.combinationDecision.qualitativeDirectionEvidenceUsable,
        productMomentumScore: null,
        digest: v142.digest,
      }),
      decision: Object.freeze({
        classification: decision.classification,
        currentDualSourceCategoricalEvaluationPerformed: true as const,
        currentNaverStoredEvidenceReproducedForReadiness: true as const,
        newHistoryObservationRequired:
          decision.newHistoryObservationRequired,
        attestedNoOp: decision.attestedNoOp,
      }),
      safety: Object.freeze({
        databaseMode: 'read-only',
        databaseWrites: 0,
        productMetricReads: 0,
        productMetricWrites: 0,
        previewFallbackReads: 0,
        registryMutations: 0,
        productionActivations: 0,
      }),
    });

  const execute =
    dependencies.executeCurrentEvaluation
    ?? executeFandexMomentumCurrentEvaluation;
  const execution = execute({
    currentCarrier: input.currentCarrier,
    evaluationEvidence: evidence,
  });

  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CURRENT_EVALUATION_PIPELINE_VERSION,
    state: 'evaluated' as const,
    v140,
    v141,
    v142,
    evaluationEvidence: evidence,
    execution,
    safety: SAFETY,
  });
}
