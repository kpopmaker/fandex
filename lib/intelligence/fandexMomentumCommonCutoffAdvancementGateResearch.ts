import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';
import {
  parseFandexMomentumUnifiedHistoryJsonl,
} from './fandexMomentumUnifiedHistoryResearch';

export const FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_VERSION =
  'v150_fandex_momentum_common_cutoff_advancement_gate_research_v1' as const;

export const FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    priorHistorySource: 'v147-unified-history-artifact' as const,
    sourceEvidenceWatermarksRequired: true as const,
    sourceAdvanceWithoutCommonCutoffAdvanceCreatesHistoryRecord: false as const,
    commonCutoffAdvanceRequiredForHistoryAppend: true as const,
    sameCutoffChangedCategoricalStateAllowed: false as const,
    regressedCutoffAllowed: false as const,
    delegatesAppendSemanticsToV148: true as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumSourceEvidenceWatermark = Readonly<{
  lastfmEvidenceId: string;
  lastfmLatestComponentEndAt: string;
  naverEvidenceId: string;
  naverThroughSlotStart: string;
}>;

export type FandexMomentumCommonCutoffEvaluationBoundary = Readonly<{
  canonicalArtistId: string;
  evaluatedAt: string;
  commonAlignmentCutoffAt: string;
  sourceV143Digest: string;
  directionalConsensus:
    FandexMomentumOutputFormEligibilityResearchResult['currentResearchOutput']['directionalConsensus'];
  persistenceConsensus:
    FandexMomentumOutputFormEligibilityResearchResult['currentResearchOutput']['persistenceConsensus'];
  sourceEvidence: FandexMomentumSourceEvidenceWatermark;
}>;

export type FandexMomentumCommonCutoffAdvancementGateState =
  | 'source-advanced-cutoff-unchanged'
  | 'common-cutoff-advanced-categorical-replay'
  | 'common-cutoff-advanced-categorical-change'
  | 'exact-evaluation-replay'
  | 'same-cutoff-conflict'
  | 'out-of-order-cutoff'
  | 'blocked';

export type FandexMomentumCommonCutoffAdvancementGateResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_VERSION;
  state: FandexMomentumCommonCutoffAdvancementGateState;
  canonicalArtistId: string;
  previousHistoryCutoffAt: string | null;
  previousEvaluationCutoffAt: string | null;
  currentCutoffAt: string;
  sourceEvidenceAdvanced: boolean;
  sourceEvidenceChanged: boolean;
  lastfmEvidenceAdvanced: boolean;
  naverEvidenceAdvanced: boolean;
  commonCutoffAdvanced: boolean;
  commonCutoffUnchanged: boolean;
  commonCutoffRegressed: boolean;
  directionalConsensusChangedFromHistory: boolean;
  persistenceConsensusChangedFromHistory: boolean;
  sourceDigestChangedFromHistory: boolean;
  historyObservationEligible: boolean;
  invokeV148Allowed: boolean;
  expectedV148Disposition:
    | 'not-invoked'
    | 'no-op-exact-replay'
    | 'append-cutoff-advanced-same-state'
    | 'append-categorical-change'
    | 'blocked-same-cutoff-conflict'
    | 'blocked-out-of-order';
  nextEvaluationBoundary: FandexMomentumCommonCutoffEvaluationBoundary;
  blockers: readonly string[];
  digest: string;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
    historyWrites: 0;
  }>;
}>;

function timestamp(value: string, error: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(error);
  return parsed;
}

function validateWatermark(
  watermark: FandexMomentumSourceEvidenceWatermark,
): void {
  if (!watermark.lastfmEvidenceId || !watermark.naverEvidenceId) {
    throw new Error('momentum_v150_source_evidence_id_invalid');
  }
  timestamp(
    watermark.lastfmLatestComponentEndAt,
    'momentum_v150_lastfm_end_invalid',
  );
  timestamp(
    watermark.naverThroughSlotStart,
    'momentum_v150_naver_through_invalid',
  );
}

function evidenceRelation(
  previous: FandexMomentumSourceEvidenceWatermark | null,
  current: FandexMomentumSourceEvidenceWatermark,
) {
  validateWatermark(current);
  if (!previous) {
    return Object.freeze({
      changed: true,
      advanced: true,
      lastfmAdvanced: true,
      naverAdvanced: true,
    });
  }
  validateWatermark(previous);

  const lastfmPrevious = timestamp(
    previous.lastfmLatestComponentEndAt,
    'momentum_v150_previous_lastfm_end_invalid',
  );
  const lastfmCurrent = timestamp(
    current.lastfmLatestComponentEndAt,
    'momentum_v150_lastfm_end_invalid',
  );
  const naverPrevious = timestamp(
    previous.naverThroughSlotStart,
    'momentum_v150_previous_naver_through_invalid',
  );
  const naverCurrent = timestamp(
    current.naverThroughSlotStart,
    'momentum_v150_naver_through_invalid',
  );

  if (lastfmCurrent < lastfmPrevious || naverCurrent < naverPrevious) {
    throw new Error('momentum_v150_source_watermark_regressed');
  }

  const lastfmAdvanced =
    lastfmCurrent > lastfmPrevious
    || current.lastfmEvidenceId !== previous.lastfmEvidenceId;
  const naverAdvanced =
    naverCurrent > naverPrevious
    || current.naverEvidenceId !== previous.naverEvidenceId;

  return Object.freeze({
    changed:
      current.lastfmEvidenceId !== previous.lastfmEvidenceId
      || current.naverEvidenceId !== previous.naverEvidenceId
      || lastfmCurrent !== lastfmPrevious
      || naverCurrent !== naverPrevious,
    advanced: lastfmAdvanced || naverAdvanced,
    lastfmAdvanced,
    naverAdvanced,
  });
}

export function evaluateFandexMomentumCommonCutoffAdvancementGateResearch(
  input: Readonly<{
    historyJsonl: string;
    result: FandexMomentumOutputFormEligibilityResearchResult;
    sourceEvidence: FandexMomentumSourceEvidenceWatermark;
    evaluatedAt: string;
    previousEvaluationBoundary?: FandexMomentumCommonCutoffEvaluationBoundary | null;
  }>,
): FandexMomentumCommonCutoffAdvancementGateResult {
  if (
    input.result.state !== 'categorical-research-output-only'
    || !input.result.alignmentCutoffAt
    || input.result.currentResearchOutput.productMomentumScore !== null
  ) {
    throw new Error('momentum_v150_source_not_eligible');
  }
  timestamp(input.evaluatedAt, 'momentum_v150_evaluated_at_invalid');

  const history = parseFandexMomentumUnifiedHistoryJsonl(input.historyJsonl);
  const latest = history.at(-1) ?? null;
  if (
    latest
    && latest.canonicalArtistId !== input.result.canonicalArtistId
  ) {
    throw new Error('momentum_v150_history_artist_mismatch');
  }

  const previousEvaluation = input.previousEvaluationBoundary ?? null;
  if (
    previousEvaluation
    && previousEvaluation.canonicalArtistId !== input.result.canonicalArtistId
  ) {
    throw new Error('momentum_v150_evaluation_artist_mismatch');
  }

  const evidence = evidenceRelation(
    previousEvaluation?.sourceEvidence ?? null,
    input.sourceEvidence,
  );

  const currentCutoffMs = timestamp(
    input.result.alignmentCutoffAt,
    'momentum_v150_current_cutoff_invalid',
  );
  const historyCutoffMs = latest
    ? timestamp(latest.alignmentCutoffAt, 'momentum_v150_history_cutoff_invalid')
    : null;

  const commonCutoffAdvanced =
    historyCutoffMs === null || currentCutoffMs > historyCutoffMs;
  const commonCutoffUnchanged =
    historyCutoffMs !== null && currentCutoffMs === historyCutoffMs;
  const commonCutoffRegressed =
    historyCutoffMs !== null && currentCutoffMs < historyCutoffMs;

  const directionChanged = latest
    ? latest.directionalConsensus
      !== input.result.currentResearchOutput.directionalConsensus
    : false;
  const persistenceChanged = latest
    ? latest.persistenceConsensus
      !== input.result.currentResearchOutput.persistenceConsensus
    : false;
  const sourceDigestChanged = latest
    ? latest.sourceV143Digest !== input.result.digest
    : true;

  let state: FandexMomentumCommonCutoffAdvancementGateState;
  let historyObservationEligible = false;
  let invokeV148Allowed = false;
  let expectedV148Disposition:
    FandexMomentumCommonCutoffAdvancementGateResult['expectedV148Disposition'];
  const blockers: string[] = [];

  if (commonCutoffRegressed) {
    state = 'out-of-order-cutoff';
    expectedV148Disposition = 'blocked-out-of-order';
    blockers.push('common-alignment-cutoff-regressed');
  } else if (commonCutoffUnchanged) {
    if (!directionChanged && !persistenceChanged && !sourceDigestChanged) {
      if (evidence.advanced) {
        state = 'source-advanced-cutoff-unchanged';
        expectedV148Disposition = 'not-invoked';
      } else {
        state = 'exact-evaluation-replay';
        expectedV148Disposition = 'no-op-exact-replay';
        invokeV148Allowed = true;
      }
    } else {
      state = 'same-cutoff-conflict';
      expectedV148Disposition = 'blocked-same-cutoff-conflict';
      blockers.push('same-cutoff-categorical-or-lineage-changed');
    }
  } else if (commonCutoffAdvanced) {
    historyObservationEligible = true;
    invokeV148Allowed = true;
    if (!directionChanged && !persistenceChanged) {
      state = 'common-cutoff-advanced-categorical-replay';
      expectedV148Disposition = 'append-cutoff-advanced-same-state';
    } else {
      state = 'common-cutoff-advanced-categorical-change';
      expectedV148Disposition = 'append-categorical-change';
    }
  } else {
    state = 'blocked';
    expectedV148Disposition = 'not-invoked';
    blockers.push('common-cutoff-state-unresolved');
  }

  const nextEvaluationBoundary = Object.freeze({
    canonicalArtistId: input.result.canonicalArtistId,
    evaluatedAt: input.evaluatedAt,
    commonAlignmentCutoffAt: input.result.alignmentCutoffAt,
    sourceV143Digest: input.result.digest,
    directionalConsensus:
      input.result.currentResearchOutput.directionalConsensus,
    persistenceConsensus:
      input.result.currentResearchOutput.persistenceConsensus,
    sourceEvidence: Object.freeze({ ...input.sourceEvidence }),
  });

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_COMMON_CUTOFF_ADVANCEMENT_GATE_RESEARCH_VERSION,
    state,
    canonicalArtistId: input.result.canonicalArtistId,
    previousHistoryCutoffAt: latest?.alignmentCutoffAt ?? null,
    previousEvaluationCutoffAt:
      previousEvaluation?.commonAlignmentCutoffAt ?? null,
    currentCutoffAt: input.result.alignmentCutoffAt,
    sourceEvidenceAdvanced: evidence.advanced,
    sourceEvidenceChanged: evidence.changed,
    lastfmEvidenceAdvanced: evidence.lastfmAdvanced,
    naverEvidenceAdvanced: evidence.naverAdvanced,
    commonCutoffAdvanced,
    commonCutoffUnchanged,
    commonCutoffRegressed,
    directionalConsensusChangedFromHistory: directionChanged,
    persistenceConsensusChangedFromHistory: persistenceChanged,
    sourceDigestChangedFromHistory: sourceDigestChanged,
    historyObservationEligible,
    invokeV148Allowed,
    expectedV148Disposition,
    nextEvaluationBoundary,
    blockers: Object.freeze(blockers),
  };

  return Object.freeze({
    ...payload,
    digest: sha256Canonical(payload),
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      historyWrites: 0 as const,
    }),
  });
}
