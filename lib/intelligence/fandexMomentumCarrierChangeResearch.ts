import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumCategoricalCarrierStoredRecord,
} from './fandexMomentumCategoricalCarrierResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';

export const FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_VERSION =
  'v145_fandex_momentum_carrier_change_research_v1' as const;

export const FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    targetVariable: 'momentum.cross-family-evidence-state.research' as const,
    storageMutationPerformed: false as const,
    mainSchemaMigrationPerformed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumCarrierChangeKind =
  | 'initial-observation'
  | 'cutoff-advanced-same-state'
  | 'direction-state-changed'
  | 'persistence-state-changed'
  | 'direction-and-persistence-changed'
  | 'exact-replay'
  | 'same-cutoff-conflict'
  | 'out-of-order-cutoff';

export type FandexMomentumCarrierChangeDecision = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_VERSION;
  canonicalArtistId: string;
  state: 'append' | 'no-op' | 'blocked';
  changeKind: FandexMomentumCarrierChangeKind;
  previousRecordId: string | null;
  previousObservationId: string | null;
  previousAlignmentCutoffAt: string | null;
  nextAlignmentCutoffAt: string;
  directionalConsensusChanged: boolean;
  persistenceConsensusChanged: boolean;
  sourceDigestChanged: boolean;
  appendRequired: boolean;
  blockers: readonly string[];
  digest: string;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
  }>;
}>;

function timestamp(value: string, error: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(error);
  return parsed;
}

export function evaluateFandexMomentumCarrierChangeResearch(
  input: Readonly<{
    result: FandexMomentumOutputFormEligibilityResearchResult;
    previous: FandexMomentumCategoricalCarrierStoredRecord | null;
  }>,
): FandexMomentumCarrierChangeDecision {
  const { result, previous } = input;
  if (
    result.state !== 'categorical-research-output-only'
    || !result.alignmentCutoffAt
    || result.currentResearchOutput.productMomentumScore !== null
  ) {
    throw new Error('momentum_v145_source_not_eligible');
  }

  const nextCutoff = timestamp(
    result.alignmentCutoffAt,
    'momentum_v145_next_cutoff_invalid',
  );
  let state: FandexMomentumCarrierChangeDecision['state'] = 'append';
  let changeKind: FandexMomentumCarrierChangeKind = 'initial-observation';
  const blockers: string[] = [];

  const directionChanged = previous
    ? previous.directionalConsensus
      !== result.currentResearchOutput.directionalConsensus
    : false;
  const persistenceChanged = previous
    ? previous.persistenceConsensus
      !== result.currentResearchOutput.persistenceConsensus
    : false;
  const sourceDigestChanged = previous
    ? previous.sourceV143Digest !== result.digest
    : false;

  if (previous) {
    if (previous.canonicalArtistId !== result.canonicalArtistId) {
      throw new Error('momentum_v145_artist_mismatch');
    }
    const previousCutoff = timestamp(
      previous.alignmentCutoffAt,
      'momentum_v145_previous_cutoff_invalid',
    );

    if (nextCutoff < previousCutoff) {
      state = 'blocked';
      changeKind = 'out-of-order-cutoff';
      blockers.push('alignment-cutoff-regressed');
    } else if (nextCutoff === previousCutoff) {
      if (!directionChanged && !persistenceChanged && !sourceDigestChanged) {
        state = 'no-op';
        changeKind = 'exact-replay';
      } else {
        state = 'blocked';
        changeKind = 'same-cutoff-conflict';
        blockers.push('same-cutoff-payload-or-lineage-changed');
      }
    } else if (directionChanged && persistenceChanged) {
      changeKind = 'direction-and-persistence-changed';
    } else if (directionChanged) {
      changeKind = 'direction-state-changed';
    } else if (persistenceChanged) {
      changeKind = 'persistence-state-changed';
    } else {
      changeKind = 'cutoff-advanced-same-state';
    }
  }

  const payload = {
    contractVersion: FANDEX_MOMENTUM_CARRIER_CHANGE_RESEARCH_VERSION,
    canonicalArtistId: result.canonicalArtistId,
    state,
    changeKind,
    previousRecordId: previous?.recordId ?? null,
    previousObservationId: previous?.observationId ?? null,
    previousAlignmentCutoffAt: previous?.alignmentCutoffAt ?? null,
    nextAlignmentCutoffAt: result.alignmentCutoffAt,
    directionalConsensusChanged: directionChanged,
    persistenceConsensusChanged: persistenceChanged,
    sourceDigestChanged,
    appendRequired: state === 'append',
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
    }),
  });
}
