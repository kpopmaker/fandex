import {
  readFandexMomentumCategoricalCarrierResearch,
  writeFandexMomentumCategoricalCarrierResearch,
  type FandexMomentumCategoricalCarrierRepository,
  type FandexMomentumCategoricalCarrierStoredRecord,
} from './fandexMomentumCategoricalCarrierResearch';
import {
  evaluateFandexMomentumCarrierChangeResearch,
  type FandexMomentumCarrierChangeDecision,
} from './fandexMomentumCarrierChangeResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';

export const FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_VERSION =
  'v146_fandex_momentum_append_adapter_research_v1' as const;

export const FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    upstreamDecisionContract:
      'v145_fandex_momentum_carrier_change_research_v1' as const,
    upstreamCarrierContract:
      'v144_fandex_momentum_categorical_carrier_research_v1' as const,
    exactReplayAppendAllowed: false as const,
    blockedDecisionWriteAllowed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    mainSchemaMigrationPerformed: false as const,
    productActivationAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumAppendAdapterResearchResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_VERSION;
  state: 'appended' | 'no-op';
  decision: FandexMomentumCarrierChangeDecision;
  previousRecordId: string | null;
  resultingRecord: FandexMomentumCategoricalCarrierStoredRecord | null;
  recordCountBefore: number;
  recordCountAfter: number;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    carrierWrites: 0 | 1;
  }>;
}>;

export async function applyFandexMomentumAppendAdapterResearch(
  input: Readonly<{
    result: FandexMomentumOutputFormEligibilityResearchResult;
    collectedAt: string;
    repository: FandexMomentumCategoricalCarrierRepository;
  }>,
): Promise<FandexMomentumAppendAdapterResearchResult> {
  const before = await readFandexMomentumCategoricalCarrierResearch({
    canonicalArtistId: input.result.canonicalArtistId,
    repository: input.repository,
  });
  const previous = before.latestRecord;

  const decision = evaluateFandexMomentumCarrierChangeResearch({
    result: input.result,
    previous,
  });

  if (decision.state === 'blocked') {
    throw new Error(
      `momentum_v146_change_blocked:${decision.changeKind}:${decision.blockers.join(',')}`,
    );
  }

  if (decision.state === 'no-op') {
    return Object.freeze({
      contractVersion: FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_VERSION,
      state: 'no-op' as const,
      decision,
      previousRecordId: previous?.recordId ?? null,
      resultingRecord: previous,
      recordCountBefore: before.recordCount,
      recordCountAfter: before.recordCount,
      effects: Object.freeze({
        productMetricReads: 0 as const,
        productMetricWrites: 0 as const,
        previewFallbackReads: 0 as const,
        carrierWrites: 0 as const,
      }),
    });
  }

  const write = await writeFandexMomentumCategoricalCarrierResearch({
    result: input.result,
    collectedAt: input.collectedAt,
    repository: input.repository,
  });

  const after = await readFandexMomentumCategoricalCarrierResearch({
    canonicalArtistId: input.result.canonicalArtistId,
    repository: input.repository,
  });

  if (
    write.state !== 'inserted'
    || after.recordCount !== before.recordCount + 1
    || after.latestRecord?.recordId !== write.record.recordId
    || after.latestRecord.alignmentCutoffAt !== decision.nextAlignmentCutoffAt
  ) {
    throw new Error('momentum_v146_append_postcondition_failed');
  }

  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_APPEND_ADAPTER_RESEARCH_VERSION,
    state: 'appended' as const,
    decision,
    previousRecordId: previous?.recordId ?? null,
    resultingRecord: write.record,
    recordCountBefore: before.recordCount,
    recordCountAfter: after.recordCount,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      carrierWrites: 1 as const,
    }),
  });
}
