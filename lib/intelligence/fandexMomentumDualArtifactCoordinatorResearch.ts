import { sha256Canonical } from '../shared/canonicalDigest';
import {
  evaluateFandexMomentumCommonCutoffAdvancementGateResearch,
  type FandexMomentumCommonCutoffAdvancementGateResult,
  type FandexMomentumSourceEvidenceWatermark,
} from './fandexMomentumCommonCutoffAdvancementGateResearch';
import {
  appendFandexMomentumUnifiedHistoryFromArtifactResearch,
  type FandexMomentumAppendFromArtifactResearchResult,
} from './fandexMomentumAppendFromArtifactResearch';
import {
  latestFandexMomentumEvaluationBoundaryResearch,
  parseFandexMomentumEvaluationWatermarkJsonl,
  persistFandexMomentumEvaluationWatermarkResearch,
  type FandexMomentumEvaluationWatermarkPersistenceResult,
} from './fandexMomentumEvaluationWatermarkResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';
import {
  parseFandexMomentumUnifiedHistoryJsonl,
} from './fandexMomentumUnifiedHistoryResearch';

export const FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_VERSION =
  'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1' as const;

export const FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    historyArtifact: 'v147-unified-history-jsonl' as const,
    evaluationWatermarkArtifact: 'v151-evaluation-watermark-jsonl' as const,
    gateContract: 'v150-common-cutoff-advancement-gate' as const,
    historyMutationContract: 'v148-append-from-artifact' as const,
    watermarkMutationContract: 'v151-evaluation-watermark-persistence' as const,
    sourceOnlyAdvanceWritesHistory: false as const,
    sourceOnlyAdvanceWritesWatermark: true as const,
    exactReplayWritesHistory: false as const,
    exactReplayWritesWatermark: false as const,
    commonCutoffAdvanceWritesHistory: true as const,
    commonCutoffAdvanceWritesWatermark: true as const,
    blockedEvaluationWritesHistory: false as const,
    blockedEvaluationWritesWatermark: false as const,
    postconditionVerificationRequired: true as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    mainSchemaMigrationPerformed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumDualArtifactCoordinatorState =
  | 'watermark-only-appended'
  | 'dual-appended'
  | 'no-op'
  | 'blocked';

export type FandexMomentumDualArtifactCoordinatorResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_VERSION;
  state: FandexMomentumDualArtifactCoordinatorState;
  gate: FandexMomentumCommonCutoffAdvancementGateResult;
  historyDisposition: 'not-invoked' | 'appended' | 'no-op';
  watermarkDisposition: 'appended' | 'no-op' | 'blocked';
  priorHistoryRecordCount: number;
  resultingHistoryRecordCount: number;
  priorWatermarkRecordCount: number;
  resultingWatermarkRecordCount: number;
  historyJsonl: string;
  watermarkJsonl: string;
  priorHistoryDigest: string;
  resultingHistoryDigest: string;
  priorWatermarkDigest: string;
  resultingWatermarkDigest: string;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
    historyWrites: 0 | 1;
    watermarkWrites: 0 | 1;
  }>;
  digest: string;
}>;

function artifactDigest(value: string): string {
  return sha256Canonical({ artifactJsonl: value });
}

function assertHistoryApplication(
  gate: FandexMomentumCommonCutoffAdvancementGateResult,
  applied: FandexMomentumAppendFromArtifactResearchResult | null,
): void {
  if (gate.state === 'source-advanced-cutoff-unchanged') {
    if (applied !== null) {
      throw new Error('momentum_v152_history_invoked_for_source_only_advance');
    }
    return;
  }

  if (gate.state === 'exact-evaluation-replay') {
    if (
      !applied
      || applied.state !== 'no-op'
      || applied.decision.changeKind !== 'exact-replay'
      || applied.effects.artifactAppends !== 0
    ) {
      throw new Error('momentum_v152_exact_replay_history_postcondition_failed');
    }
    return;
  }

  if (
    gate.state === 'common-cutoff-advanced-categorical-replay'
    || gate.state === 'common-cutoff-advanced-categorical-change'
  ) {
    if (
      !applied
      || applied.state !== 'appended'
      || applied.effects.artifactAppends !== 1
    ) {
      throw new Error('momentum_v152_common_cutoff_history_append_failed');
    }
    return;
  }

  if (applied !== null) {
    throw new Error('momentum_v152_blocked_history_invoked');
  }
}

function assertWatermarkApplication(
  gate: FandexMomentumCommonCutoffAdvancementGateResult,
  persisted: FandexMomentumEvaluationWatermarkPersistenceResult,
): void {
  if (
    gate.state === 'source-advanced-cutoff-unchanged'
    || gate.state === 'common-cutoff-advanced-categorical-replay'
    || gate.state === 'common-cutoff-advanced-categorical-change'
  ) {
    if (
      persisted.state !== 'appended'
      || persisted.effects.watermarkWrites !== 1
    ) {
      throw new Error('momentum_v152_watermark_append_postcondition_failed');
    }
    return;
  }

  if (gate.state === 'exact-evaluation-replay') {
    if (
      persisted.state !== 'no-op'
      || persisted.effects.watermarkWrites !== 0
    ) {
      throw new Error('momentum_v152_watermark_replay_postcondition_failed');
    }
    return;
  }

  if (
    persisted.state !== 'blocked'
    || persisted.effects.watermarkWrites !== 0
  ) {
    throw new Error('momentum_v152_blocked_watermark_postcondition_failed');
  }
}

function coordinatorState(
  gate: FandexMomentumCommonCutoffAdvancementGateResult,
): FandexMomentumDualArtifactCoordinatorState {
  if (gate.state === 'source-advanced-cutoff-unchanged') {
    return 'watermark-only-appended';
  }
  if (
    gate.state === 'common-cutoff-advanced-categorical-replay'
    || gate.state === 'common-cutoff-advanced-categorical-change'
  ) {
    return 'dual-appended';
  }
  if (gate.state === 'exact-evaluation-replay') {
    return 'no-op';
  }
  return 'blocked';
}

export function coordinateFandexMomentumDualArtifactEvaluationResearch(
  input: Readonly<{
    historyJsonl: string;
    watermarkJsonl: string;
    result: FandexMomentumOutputFormEligibilityResearchResult;
    sourceEvidence: FandexMomentumSourceEvidenceWatermark;
    evaluatedAt: string;
    recordedAt: string;
  }>,
): FandexMomentumDualArtifactCoordinatorResult {
  const priorHistory = parseFandexMomentumUnifiedHistoryJsonl(input.historyJsonl);
  const priorWatermarks = parseFandexMomentumEvaluationWatermarkJsonl(
    input.watermarkJsonl,
  );
  const previousEvaluationBoundary =
    latestFandexMomentumEvaluationBoundaryResearch(input.watermarkJsonl);

  if (
    previousEvaluationBoundary
    && priorHistory.at(-1)
    && previousEvaluationBoundary.canonicalArtistId
      !== priorHistory.at(-1)!.canonicalArtistId
  ) {
    throw new Error('momentum_v152_cross_artifact_artist_mismatch');
  }

  const gate = evaluateFandexMomentumCommonCutoffAdvancementGateResearch({
    historyJsonl: input.historyJsonl,
    result: input.result,
    sourceEvidence: input.sourceEvidence,
    evaluatedAt: input.evaluatedAt,
    previousEvaluationBoundary,
  });

  const historyApplied = gate.invokeV148Allowed
    ? appendFandexMomentumUnifiedHistoryFromArtifactResearch({
      historyJsonl: input.historyJsonl,
      result: input.result,
      recordedAt: input.recordedAt,
    })
    : null;

  const watermarkPersisted = persistFandexMomentumEvaluationWatermarkResearch({
    watermarkJsonl: input.watermarkJsonl,
    gate,
  });

  assertHistoryApplication(gate, historyApplied);
  assertWatermarkApplication(gate, watermarkPersisted);

  const nextHistoryJsonl =
    historyApplied?.artifactJsonl ?? input.historyJsonl;
  const nextWatermarkJsonl = watermarkPersisted.watermarkJsonl;
  const resultingHistory = parseFandexMomentumUnifiedHistoryJsonl(
    nextHistoryJsonl,
  );
  const resultingWatermarks = parseFandexMomentumEvaluationWatermarkJsonl(
    nextWatermarkJsonl,
  );

  const state = coordinatorState(gate);
  const historyWrites = historyApplied?.effects.artifactAppends ?? 0;
  const watermarkWrites = watermarkPersisted.effects.watermarkWrites;

  if (state === 'watermark-only-appended') {
    if (
      nextHistoryJsonl !== input.historyJsonl
      || historyWrites !== 0
      || resultingHistory.length !== priorHistory.length
      || watermarkWrites !== 1
      || resultingWatermarks.length !== priorWatermarks.length + 1
    ) {
      throw new Error('momentum_v152_watermark_only_postcondition_failed');
    }
  } else if (state === 'dual-appended') {
    if (
      historyWrites !== 1
      || watermarkWrites !== 1
      || resultingHistory.length !== priorHistory.length + 1
      || resultingWatermarks.length !== priorWatermarks.length + 1
      || resultingHistory.at(-1)?.alignmentCutoffAt !== gate.currentCutoffAt
      || resultingHistory.at(-1)?.sourceV143Digest
        !== gate.nextEvaluationBoundary.sourceV143Digest
    ) {
      throw new Error('momentum_v152_dual_append_postcondition_failed');
    }
  } else if (state === 'no-op') {
    if (
      nextHistoryJsonl !== input.historyJsonl
      || nextWatermarkJsonl !== input.watermarkJsonl
      || historyWrites !== 0
      || watermarkWrites !== 0
    ) {
      throw new Error('momentum_v152_noop_postcondition_failed');
    }
  } else if (
    nextHistoryJsonl !== input.historyJsonl
    || nextWatermarkJsonl !== input.watermarkJsonl
    || historyWrites !== 0
    || watermarkWrites !== 0
  ) {
    throw new Error('momentum_v152_blocked_postcondition_failed');
  }

  const latestWatermark =
    resultingWatermarks.at(-1)?.evaluationBoundary ?? null;
  if (
    state === 'watermark-only-appended'
    || state === 'dual-appended'
  ) {
    if (
      !latestWatermark
      || latestWatermark.commonAlignmentCutoffAt !== gate.currentCutoffAt
      || latestWatermark.sourceV143Digest
        !== gate.nextEvaluationBoundary.sourceV143Digest
      || latestWatermark.directionalConsensus
        !== gate.nextEvaluationBoundary.directionalConsensus
      || latestWatermark.persistenceConsensus
        !== gate.nextEvaluationBoundary.persistenceConsensus
    ) {
      throw new Error('momentum_v152_cross_artifact_boundary_postcondition_failed');
    }
  }

  let historyDisposition:
    FandexMomentumDualArtifactCoordinatorResult['historyDisposition'];
  if (historyApplied === null) {
    historyDisposition = 'not-invoked';
  } else if (historyApplied.state === 'appended') {
    historyDisposition = 'appended';
  } else if (historyApplied.state === 'no-op') {
    historyDisposition = 'no-op';
  } else {
    throw new Error('momentum_v152_unexpected_history_disposition');
  }
  const watermarkDisposition:
    FandexMomentumDualArtifactCoordinatorResult['watermarkDisposition'] =
    watermarkPersisted.state;
  const priorHistoryDigest = artifactDigest(input.historyJsonl);
  const resultingHistoryDigest = artifactDigest(nextHistoryJsonl);
  const priorWatermarkDigest = artifactDigest(input.watermarkJsonl);
  const resultingWatermarkDigest = artifactDigest(nextWatermarkJsonl);

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_DUAL_ARTIFACT_COORDINATOR_RESEARCH_VERSION,
    state,
    gate,
    historyDisposition,
    watermarkDisposition,
    priorHistoryRecordCount: priorHistory.length,
    resultingHistoryRecordCount: resultingHistory.length,
    priorWatermarkRecordCount: priorWatermarks.length,
    resultingWatermarkRecordCount: resultingWatermarks.length,
    priorHistoryDigest,
    resultingHistoryDigest,
    priorWatermarkDigest,
    resultingWatermarkDigest,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      historyWrites: historyWrites as 0 | 1,
      watermarkWrites: watermarkWrites as 0 | 1,
    }),
  };

  return Object.freeze({
    ...payload,
    historyJsonl: nextHistoryJsonl,
    watermarkJsonl: nextWatermarkJsonl,
    digest: sha256Canonical(payload),
  });
}
