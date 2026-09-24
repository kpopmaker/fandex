import { sha256Canonical } from '../shared/canonicalDigest';
import {
  evaluateFandexMomentumCarrierChangeResearch,
  type FandexMomentumCarrierChangeDecision,
} from './fandexMomentumCarrierChangeResearch';
import type {
  FandexMomentumCategoricalCarrierStoredRecord,
} from './fandexMomentumCategoricalCarrierResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';
import {
  buildFandexMomentumUnifiedHistoryRecord,
  parseFandexMomentumUnifiedHistoryJsonl,
  serializeFandexMomentumUnifiedHistoryRecord,
  type FandexMomentumUnifiedHistoryRecord,
} from './fandexMomentumUnifiedHistoryResearch';

export const FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_VERSION =
  'v148_fandex_momentum_append_from_artifact_research_v1' as const;

export const FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    priorStateSource: 'v147-unified-history-artifact' as const,
    priorStateReconstructionRequired: false as const,
    exactReplayMutatesArtifact: false as const,
    blockedDecisionMutatesArtifact: false as const,
    appendPreservesExistingBytes: true as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    mainSchemaMigrationPerformed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumAppendFromArtifactResearchResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_VERSION;
  state: 'appended' | 'no-op' | 'blocked';
  decision: FandexMomentumCarrierChangeDecision;
  priorRecordCount: number;
  resultingRecordCount: number;
  priorLatestRecordDigest: string | null;
  resultingLatestRecordDigest: string | null;
  artifactJsonl: string;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
    artifactAppends: 0 | 1;
  }>;
}>;

function asCarrierPrevious(
  record: FandexMomentumUnifiedHistoryRecord | null,
): FandexMomentumCategoricalCarrierStoredRecord | null {
  if (!record) return null;
  return Object.freeze({
    recordId: record.recordDigest,
    observationId: record.observation.observationId,
    canonicalArtistId: record.canonicalArtistId,
    variableId: 'momentum.cross-family-evidence-state.research' as const,
    alignmentCutoffAt: record.alignmentCutoffAt,
    directionalConsensus: record.directionalConsensus,
    persistenceConsensus: record.persistenceConsensus,
    sourceV143Digest: record.sourceV143Digest,
    observationDigest: sha256Canonical(record.observation),
    payload: record.observation,
  });
}

function unchangedResult(
  input: Readonly<{
    state: 'no-op' | 'blocked';
    decision: FandexMomentumCarrierChangeDecision;
    records: readonly FandexMomentumUnifiedHistoryRecord[];
    artifactJsonl: string;
  }>,
): FandexMomentumAppendFromArtifactResearchResult {
  const latest = input.records.at(-1) ?? null;
  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_VERSION,
    state: input.state,
    decision: input.decision,
    priorRecordCount: input.records.length,
    resultingRecordCount: input.records.length,
    priorLatestRecordDigest: latest?.recordDigest ?? null,
    resultingLatestRecordDigest: latest?.recordDigest ?? null,
    artifactJsonl: input.artifactJsonl,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      artifactAppends: 0 as const,
    }),
  });
}

export function appendFandexMomentumUnifiedHistoryFromArtifactResearch(
  input: Readonly<{
    historyJsonl: string;
    result: FandexMomentumOutputFormEligibilityResearchResult;
    recordedAt: string;
  }>,
): FandexMomentumAppendFromArtifactResearchResult {
  const records = parseFandexMomentumUnifiedHistoryJsonl(input.historyJsonl);
  const previous = records.at(-1) ?? null;
  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: input.result,
    previous: asCarrierPrevious(previous),
  });

  if (decision.state === 'blocked') {
    return unchangedResult({
      state: 'blocked',
      decision,
      records,
      artifactJsonl: input.historyJsonl,
    });
  }

  if (decision.state === 'no-op') {
    return unchangedResult({
      state: 'no-op',
      decision,
      records,
      artifactJsonl: input.historyJsonl,
    });
  }

  const next = buildFandexMomentumUnifiedHistoryRecord({
    result: input.result,
    decision,
    sequence: records.length + 1,
    recordedAt: input.recordedAt,
    previousRecord: previous,
  });
  const delimiter = input.historyJsonl.length === 0 || input.historyJsonl.endsWith('\n')
    ? ''
    : '\n';
  const artifactJsonl =
    input.historyJsonl
    + delimiter
    + serializeFandexMomentumUnifiedHistoryRecord(next)
    + '\n';

  const verified = parseFandexMomentumUnifiedHistoryJsonl(artifactJsonl);
  const resultingLatest = verified.at(-1) ?? null;

  if (
    verified.length !== records.length + 1
    || resultingLatest?.recordDigest !== next.recordDigest
    || resultingLatest.previousRecordDigest !== previous?.recordDigest
    || resultingLatest.previousSourceV143Digest !== previous?.sourceV143Digest
  ) {
    throw new Error('momentum_v148_append_postcondition_failed');
  }

  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_APPEND_FROM_ARTIFACT_RESEARCH_VERSION,
    state: 'appended' as const,
    decision,
    priorRecordCount: records.length,
    resultingRecordCount: verified.length,
    priorLatestRecordDigest: previous?.recordDigest ?? null,
    resultingLatestRecordDigest: next.recordDigest,
    artifactJsonl,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      artifactAppends: 1 as const,
    }),
  });
}
