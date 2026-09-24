import { sha256Canonical } from '../shared/canonicalDigest';
import { bindCanonicalArtistToNaverNews } from '../server/ingestion/naverNewsArtistBinding';
import {
  buildNaverNewsJobIdentity,
} from '../server/ingestion/naverNewsContracts';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../server/ingestion/naverNewsScheduler';

export const FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_VERSION =
  'v153_fandex_momentum_source_provenance_research_v1' as const;

export const FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    purpose: 'separate-deterministic-lineage-and-runtime-observation-from-live-stored-evidence-reproduction' as const,
    snapshotEvidenceMayClaimLiveStoredEvidenceReproductionWithoutRead: false as const,
    runtimeInvocationAloneProvesStoredEvidencePayload: false as const,
    deterministicJobLineageRequired: true as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumNaverSourceSnapshotEvidence = Readonly<{
  canonicalArtistId: string;
  naverEvidenceId: string;
  naverCollectionKey: string;
  naverThroughSlotStart: string;
  naverStatus: 'succeeded';
  naverRawEvidenceCount: number;
  naverNormalizedRecordCount: number;
  naverDuplicateRecordCount: number;
  naverRejectedItemCount: number;
}>;

export type FandexMomentumProductionRuntimeObservation = Readonly<{
  observedAt: string;
  requestPath: '/api/internal/naver-news/shadow-scheduler';
  httpStatus: 200;
  deploymentId: string;
  branch: 'main';
}>;

export type FandexMomentumSourceProvenanceResearchResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_VERSION;
  state:
    | 'stored-evidence-read-reproduced'
    | 'lineage-runtime-verified-stored-evidence-not-reproduced';
  canonicalArtistId: string;
  naverThroughSlotStart: string;
  naverCollectionKey: string;
  naverEvidenceId: string;
  deterministicLineageVerified: true;
  productionRuntimeInvocationObserved: true;
  runtimeObservationMapsToEvidenceSlot: true;
  snapshotEvidenceInternallyConsistent: true;
  storedEvidenceReproducedThisEvaluation: boolean;
  provenanceStrength:
    | 'stored-evidence-read-reproduced'
    | 'deterministic-lineage-plus-production-runtime-invocation';
  currentRealClaimScope:
    | 'live-stored-evidence-reproduced'
    | 'source-snapshot-with-runtime-lineage';
  futureLiveRefreshEligible: boolean;
  blockers: readonly string[];
  digest: string;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
  }>;
}>;

function exactIso(value: string, error: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error(error);
  }
  return timestamp;
}

function assertNonNegativeInteger(value: number, error: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(error);
}

export function evaluateFandexMomentumSourceProvenanceResearch(
  input: Readonly<{
    snapshot: FandexMomentumNaverSourceSnapshotEvidence;
    runtimeObservation: FandexMomentumProductionRuntimeObservation;
    storedEvidenceReproducedThisEvaluation: boolean;
  }>,
): FandexMomentumSourceProvenanceResearchResult {
  const { snapshot, runtimeObservation } = input;
  const binding = bindCanonicalArtistToNaverNews(snapshot.canonicalArtistId);
  if (binding.canonicalArtistId !== snapshot.canonicalArtistId) {
    throw new Error('momentum_v153_artist_binding_invalid');
  }

  exactIso(
    snapshot.naverThroughSlotStart,
    'momentum_v153_through_slot_invalid',
  );
  exactIso(
    runtimeObservation.observedAt,
    'momentum_v153_runtime_observed_at_invalid',
  );

  for (const value of [
    snapshot.naverRawEvidenceCount,
    snapshot.naverNormalizedRecordCount,
    snapshot.naverDuplicateRecordCount,
    snapshot.naverRejectedItemCount,
  ]) {
    assertNonNegativeInteger(value, 'momentum_v153_snapshot_count_invalid');
  }
  if (
    snapshot.naverRawEvidenceCount
      !== snapshot.naverNormalizedRecordCount
        + snapshot.naverDuplicateRecordCount
        + snapshot.naverRejectedItemCount
  ) {
    throw new Error('momentum_v153_snapshot_count_reconciliation_invalid');
  }

  const evidencePlan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: snapshot.naverThroughSlotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (
    evidencePlan.slotStart !== snapshot.naverThroughSlotStart
    || evidencePlan.collectionKey !== snapshot.naverCollectionKey
  ) {
    throw new Error('momentum_v153_collection_lineage_invalid');
  }

  const identity = buildNaverNewsJobIdentity(evidencePlan.command);
  if (identity.jobId !== snapshot.naverEvidenceId) {
    throw new Error('momentum_v153_job_lineage_invalid');
  }

  if (
    runtimeObservation.requestPath
      !== '/api/internal/naver-news/shadow-scheduler'
    || runtimeObservation.httpStatus !== 200
    || runtimeObservation.branch !== 'main'
    || !runtimeObservation.deploymentId
  ) {
    throw new Error('momentum_v153_runtime_observation_invalid');
  }

  const runtimePlan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: runtimeObservation.observedAt,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (
    runtimePlan.slotStart !== snapshot.naverThroughSlotStart
    || runtimePlan.collectionKey !== snapshot.naverCollectionKey
  ) {
    throw new Error('momentum_v153_runtime_slot_mismatch');
  }

  const reproduced = input.storedEvidenceReproducedThisEvaluation === true;
  const state = reproduced
    ? 'stored-evidence-read-reproduced' as const
    : 'lineage-runtime-verified-stored-evidence-not-reproduced' as const;
  const provenanceStrength = reproduced
    ? 'stored-evidence-read-reproduced' as const
    : 'deterministic-lineage-plus-production-runtime-invocation' as const;
  const currentRealClaimScope = reproduced
    ? 'live-stored-evidence-reproduced' as const
    : 'source-snapshot-with-runtime-lineage' as const;
  const blockers = reproduced
    ? Object.freeze([] as string[])
    : Object.freeze(['stored-evidence-live-reproduction-unavailable']);

  const payload = {
    contractVersion: FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_VERSION,
    state,
    canonicalArtistId: snapshot.canonicalArtistId,
    naverThroughSlotStart: snapshot.naverThroughSlotStart,
    naverCollectionKey: snapshot.naverCollectionKey,
    naverEvidenceId: snapshot.naverEvidenceId,
    deterministicLineageVerified: true as const,
    productionRuntimeInvocationObserved: true as const,
    runtimeObservationMapsToEvidenceSlot: true as const,
    snapshotEvidenceInternallyConsistent: true as const,
    storedEvidenceReproducedThisEvaluation: reproduced,
    provenanceStrength,
    currentRealClaimScope,
    futureLiveRefreshEligible: reproduced,
    blockers,
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
