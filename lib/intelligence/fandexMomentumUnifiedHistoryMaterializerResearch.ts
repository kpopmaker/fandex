import {
  buildFandexMomentumUnifiedHistoryRecord,
  serializeFandexMomentumUnifiedHistoryRecord,
} from './fandexMomentumUnifiedHistoryResearch';
import {
  evaluateFandexMomentumCarrierChangeResearch,
} from './fandexMomentumCarrierChangeResearch';
import type {
  FandexMomentumCategoricalCarrierStoredRecord,
} from './fandexMomentumCategoricalCarrierResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';

export function materializeFandexMomentumUnifiedHistoryResearch(
  input: Readonly<{
    previous: Readonly<{
      result: FandexMomentumOutputFormEligibilityResearchResult;
      recordedAt: string;
    }>;
    current: Readonly<{
      result: FandexMomentumOutputFormEligibilityResearchResult;
      recordedAt: string;
    }>;
  }>,
): Readonly<{
  jsonl: string;
  firstRecordDigest: string;
  secondRecordDigest: string;
  firstObservationId: string;
  secondObservationId: string;
}> {
  const firstDecision = evaluateFandexMomentumCarrierChangeResearch({
    result: input.previous.result,
    previous: null,
  });
  const first = buildFandexMomentumUnifiedHistoryRecord({
    result: input.previous.result,
    decision: firstDecision,
    sequence: 1,
    recordedAt: input.previous.recordedAt,
  });

  const previousStored: FandexMomentumCategoricalCarrierStoredRecord = {
    recordId: first.recordDigest,
    observationId: first.observation.observationId,
    canonicalArtistId: first.canonicalArtistId,
    variableId: 'momentum.cross-family-evidence-state.research',
    alignmentCutoffAt: first.alignmentCutoffAt,
    directionalConsensus: first.directionalConsensus,
    persistenceConsensus: first.persistenceConsensus,
    sourceV143Digest: first.sourceV143Digest,
    observationDigest: '',
    payload: first.observation,
  };

  const secondDecision = evaluateFandexMomentumCarrierChangeResearch({
    result: input.current.result,
    previous: previousStored,
  });
  const second = buildFandexMomentumUnifiedHistoryRecord({
    result: input.current.result,
    decision: secondDecision,
    sequence: 2,
    recordedAt: input.current.recordedAt,
    previousRecord: first,
  });

  const jsonl = [
    serializeFandexMomentumUnifiedHistoryRecord(first),
    serializeFandexMomentumUnifiedHistoryRecord(second),
    '',
  ].join('\n');

  return Object.freeze({
    jsonl,
    firstRecordDigest: first.recordDigest,
    secondRecordDigest: second.recordDigest,
    firstObservationId: first.observation.observationId,
    secondObservationId: second.observation.observationId,
  });
}
