import { sha256Canonical } from '../shared/canonicalDigest';
import {
  ALTERNATIVE_EVIDENCE_CONTRACT_VERSION,
  type AlternativeEvidence,
} from './contracts';
import {
  fromDirectAlbumObservation,
  type CanonicalAlbumFeatureInput,
} from './canonicalAlbumFeatureInput';
import type { DirectAlbumObservation } from './directAlbumProvider';
import {
  normalizeAgainstPreviousComparableRelease,
  selectDirectObservationRevisionHead,
  type AlbumNormalizedReleaseReaction,
  type AlbumNormalizationCandidate,
} from './albumNormalizationResearch';
import {
  ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION,
  type LuminateAlbumObservationStoredRow,
  type LuminateObservationAuthorizationSnapshot,
} from './luminateAlbumObservationIntakeResearch';
import {
  IU_LUMINATE_BASELINE_ACQUISITION_BOUNDARY_RESEARCH,
  IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH,
  type IuLuminateBaselineAcquisitionTarget,
} from './iuLuminateBaselineAcquisitionResearch';
import { IU_THE_WINNING_RELEASE_ID } from './iuTheWinningResearchEvidence';

export const IU_LUMINATE_STORED_NORMALIZATION_RESEARCH_VERSION =
  'iu-luminate-stored-normalization-research-v1' as const;

export const IU_LUMINATE_STORED_NORMALIZATION_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: IU_LUMINATE_STORED_NORMALIZATION_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'luminate-music' as const,
  sourceStore: 'fandex.album_research_observation_records' as const,
  currentReleaseId: IU_THE_WINNING_RELEASE_ID,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productionPromotionAllowed: false as const,
  revisionHeadRequired: true as const,
  exactStoredPayloadIntegrityRequired: true as const,
  authorizationSnapshotRequired: true as const,
  boundedBaselineSearch: true as const,
  exhaustedBoundedSearchMeansInsufficientHistory: false as const,
  exhaustedBoundedSearchMeansIdentityExtensionRequired: true as const,
  effects: Object.freeze({ databaseReads: 0 as const, databaseWrites: 0 as const, externalCalls: 0 as const }),
});

export type LuminateObservationResearchStoredRow = Pick<
  LuminateAlbumObservationStoredRow,
  | 'record_id'
  | 'record_version'
  | 'provider'
  | 'source_entity_id'
  | 'source_record_id'
  | 'observation_id'
  | 'payload_digest'
  | 'fandex_artist_id'
  | 'fandex_release_id'
  | 'provider_period'
  | 'record_state'
  | 'supersedes_record_id'
  | 'intake_plan_digest'
  | 'write_grant_digest'
  | 'authorization_snapshot'
  | 'observation_payload'
  | 'observed_at'
  | 'collected_at'
  | 'revision_observed_at'
>;

export type HydratedLuminateObservationResearch = Readonly<{
  row: LuminateObservationResearchStoredRow;
  observation: DirectAlbumObservation;
  evidence: AlternativeEvidence;
}>;

export type IuLuminateStoredNormalizationResult = Readonly<{
  state:
    | 'available'
    | 'current-observation-missing'
    | 'current-observation-conflicting'
    | 'baseline-observation-conflicting'
    | 'identity-extension-required'
    | 'blocked';
  territory: 'US' | 'CA';
  currentReleaseId: typeof IU_THE_WINNING_RELEASE_ID;
  selectedBaselineReleaseId: string | null;
  selectedBaselineTitle: string | null;
  attemptedBaselineReleaseIds: readonly string[];
  reaction: AlbumNormalizedReleaseReaction | null;
  blockers: readonly string[];
}>;

const HEX64_RE = /^[0-9a-f]{64}$/;

function isAuthorizationSnapshot(value: unknown): value is LuminateObservationAuthorizationSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Partial<LuminateObservationAuthorizationSnapshot>;
  return snapshot.acquisition === 'allowed'
    && snapshot.automation === 'allowed'
    && snapshot.rawStorage === 'not-required'
    && snapshot.normalizedStorage === 'allowed'
    && snapshot.retention === 'allowed'
    && snapshot.commercialUse === 'allowed'
    && snapshot.derivedPublication === 'allowed'
    && snapshot.rawRedistribution === 'not-required'
    && typeof snapshot.agreementEvidenceId === 'string'
    && snapshot.agreementEvidenceId.length > 0
    && typeof snapshot.postTerminationPolicyEvidenceId === 'string'
    && snapshot.postTerminationPolicyEvidenceId.length > 0
    && Array.isArray(snapshot.authorizedTerritories)
    && snapshot.authorizedTerritories.every((territory) => territory === 'US' || territory === 'CA');
}

function assertStoredRowIntegrity(row: LuminateObservationResearchStoredRow): void {
  if (row.record_version !== ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION) {
    throw new Error('luminate_stored_normalization_record_version_invalid');
  }
  if (row.provider !== 'luminate-music') {
    throw new Error('luminate_stored_normalization_provider_invalid');
  }
  for (const digest of [
    row.record_id,
    row.source_entity_id,
    row.source_record_id,
    row.observation_id,
    row.payload_digest,
    row.intake_plan_digest,
    row.write_grant_digest,
  ]) {
    if (!HEX64_RE.test(digest)) throw new Error('luminate_stored_normalization_digest_invalid');
  }
  if (!isAuthorizationSnapshot(row.authorization_snapshot)) {
    throw new Error('luminate_stored_normalization_authorization_snapshot_invalid');
  }

  const observation = row.observation_payload;
  if (sha256Canonical(observation) !== row.payload_digest) {
    throw new Error('luminate_stored_normalization_payload_digest_mismatch');
  }
  if (observation.observationId !== row.observation_id
      || observation.providerId !== row.provider
      || observation.fandexArtistId !== row.fandex_artist_id
      || observation.fandexReleaseId !== row.fandex_release_id
      || observation.providerPeriod !== row.provider_period
      || observation.observedAt !== row.observed_at
      || observation.collectedAt !== row.collected_at
      || observation.revisionObservedAt !== row.revision_observed_at) {
    throw new Error('luminate_stored_normalization_column_payload_mismatch');
  }
  if (observation.syntheticFixture) {
    throw new Error('luminate_stored_normalization_synthetic_payload_forbidden');
  }
  if (observation.semantic !== 'first-week-sale'
      || observation.unit !== 'physical-units'
      || observation.scopeRole !== 'release-total'
      || observation.parentObservationId !== null) {
    throw new Error('luminate_stored_normalization_scope_invalid');
  }
  if (observation.territory !== 'US' && observation.territory !== 'CA') {
    throw new Error('luminate_stored_normalization_territory_invalid');
  }
  if (!row.authorization_snapshot.authorizedTerritories.includes(observation.territory)) {
    throw new Error('luminate_stored_normalization_territory_not_authorized');
  }
  if (row.record_state === 'original') {
    if (row.supersedes_record_id !== null || observation.supersedesObservationId !== null) {
      throw new Error('luminate_stored_normalization_original_lineage_invalid');
    }
  } else if (row.record_state === 'revised') {
    if (!row.supersedes_record_id || !observation.supersedesObservationId) {
      throw new Error('luminate_stored_normalization_revision_lineage_invalid');
    }
  } else {
    throw new Error('luminate_stored_normalization_record_state_invalid');
  }
}

export function hydrateLuminateObservationResearchStoredRow(
  row: LuminateObservationResearchStoredRow,
): HydratedLuminateObservationResearch {
  assertStoredRowIntegrity(row);
  const observation = row.observation_payload;
  const evidenceBase = {
    contractVersion: ALTERNATIVE_EVIDENCE_CONTRACT_VERSION,
    evidenceId: `stored:luminate-album-observation:${row.record_id}`,
    origin: 'direct-licensed-provider' as const,
    sourceId: row.source_record_id,
    sourceUrl: null,
    acquisitionProvider: 'luminate-music',
    reportedProvider: 'luminate-music',
    observedAt: row.observed_at,
    collectedAt: row.collected_at,
    sourcePublishedAt: observation.providerPublishedAt,
    researchOnly: true as const,
  };
  const evidence: AlternativeEvidence = Object.freeze({
    ...evidenceBase,
    evidenceDigest: sha256Canonical(evidenceBase),
  });
  return Object.freeze({ row, observation, evidence });
}

function targetByReleaseId(releaseId: string): IuLuminateBaselineAcquisitionTarget | null {
  return IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH
    .find((target) => target.fandexReleaseId === releaseId) ?? null;
}

function featureForHydrated(
  hydrated: HydratedLuminateObservationResearch,
): CanonicalAlbumFeatureInput {
  const features = fromDirectAlbumObservation(hydrated.observation, hydrated.evidence);
  const feature = features.find((candidate) =>
    candidate.featureKey === 'physicalPurchaseAbsoluteLevel'
      && candidate.eligibilityState === 'feature-resolver-candidate');
  if (!feature) throw new Error('luminate_stored_normalization_absolute_feature_missing');
  return feature;
}

function candidateForHydrated(
  hydrated: HydratedLuminateObservationResearch,
  target: IuLuminateBaselineAcquisitionTarget,
): AlbumNormalizationCandidate {
  return Object.freeze({
    releaseDate: target.releaseDate,
    releaseEligibilityState: 'eligible' as const,
    feature: featureForHydrated(hydrated),
  });
}

function rowsForReleaseLane(
  hydrated: readonly HydratedLuminateObservationResearch[],
  releaseId: string,
  territory: 'US' | 'CA',
): readonly HydratedLuminateObservationResearch[] {
  return hydrated.filter((item) =>
    item.observation.fandexArtistId === 'iu'
      && item.observation.fandexReleaseId === releaseId
      && item.observation.territory === territory
      && item.observation.format === 'physical'
      && item.observation.scopeRole === 'release-total');
}

function activeReleaseObservation(
  hydrated: readonly HydratedLuminateObservationResearch[],
  releaseId: string,
  territory: 'US' | 'CA',
): Readonly<{
  state: 'resolved' | 'missing' | 'conflicting';
  item: HydratedLuminateObservationResearch | null;
}> {
  const lane = rowsForReleaseLane(hydrated, releaseId, territory);
  if (lane.length === 0) return Object.freeze({ state: 'missing' as const, item: null });
  const head = selectDirectObservationRevisionHead(lane.map((item) => item.observation));
  if (head.state !== 'resolved' || !head.observation) {
    return Object.freeze({ state: 'conflicting' as const, item: null });
  }
  const item = lane.find((candidate) => candidate.observation.observationId === head.observation!.observationId) ?? null;
  return item
    ? Object.freeze({ state: 'resolved' as const, item })
    : Object.freeze({ state: 'conflicting' as const, item: null });
}

export function resolveIuLuminateStoredNormalization(
  rows: readonly LuminateObservationResearchStoredRow[],
  territory: 'US' | 'CA',
): IuLuminateStoredNormalizationResult {
  let hydrated: readonly HydratedLuminateObservationResearch[];
  try {
    hydrated = Object.freeze(rows.map(hydrateLuminateObservationResearchStoredRow));
  } catch (error) {
    return Object.freeze({
      state: 'blocked' as const,
      territory,
      currentReleaseId: IU_THE_WINNING_RELEASE_ID,
      selectedBaselineReleaseId: null,
      selectedBaselineTitle: null,
      attemptedBaselineReleaseIds: Object.freeze([]),
      reaction: null,
      blockers: Object.freeze([
        error instanceof Error ? error.message : 'luminate_stored_normalization_hydration_failed',
      ]),
    });
  }

  const currentHead = activeReleaseObservation(hydrated, IU_THE_WINNING_RELEASE_ID, territory);
  if (currentHead.state === 'missing') {
    return Object.freeze({
      state: 'current-observation-missing' as const,
      territory,
      currentReleaseId: IU_THE_WINNING_RELEASE_ID,
      selectedBaselineReleaseId: null,
      selectedBaselineTitle: null,
      attemptedBaselineReleaseIds: Object.freeze([]),
      reaction: null,
      blockers: Object.freeze(['luminate-current-the-winning-observation-missing']),
    });
  }
  if (currentHead.state === 'conflicting' || !currentHead.item) {
    return Object.freeze({
      state: 'current-observation-conflicting' as const,
      territory,
      currentReleaseId: IU_THE_WINNING_RELEASE_ID,
      selectedBaselineReleaseId: null,
      selectedBaselineTitle: null,
      attemptedBaselineReleaseIds: Object.freeze([]),
      reaction: null,
      blockers: Object.freeze(['luminate-current-the-winning-revision-head-conflicting']),
    });
  }

  const currentTarget = targetByReleaseId(IU_THE_WINNING_RELEASE_ID);
  if (!currentTarget) throw new Error('iu_luminate_current_target_missing');
  const current = candidateForHydrated(currentHead.item, currentTarget);
  const attempted: string[] = [];

  for (const target of IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH) {
    if (target.role !== 'baseline-candidate') continue;
    attempted.push(target.fandexReleaseId);
    const baselineHead = activeReleaseObservation(hydrated, target.fandexReleaseId, territory);
    if (baselineHead.state === 'missing') continue;
    if (baselineHead.state === 'conflicting' || !baselineHead.item) {
      return Object.freeze({
        state: 'baseline-observation-conflicting' as const,
        territory,
        currentReleaseId: IU_THE_WINNING_RELEASE_ID,
        selectedBaselineReleaseId: target.fandexReleaseId,
        selectedBaselineTitle: target.canonicalTitle,
        attemptedBaselineReleaseIds: Object.freeze(attempted),
        reaction: null,
        blockers: Object.freeze(['luminate-baseline-revision-head-conflicting']),
      });
    }

    const baseline = candidateForHydrated(baselineHead.item, target);
    const reaction = normalizeAgainstPreviousComparableRelease(current, [baseline]);
    if (reaction.state === 'available') {
      return Object.freeze({
        state: 'available' as const,
        territory,
        currentReleaseId: IU_THE_WINNING_RELEASE_ID,
        selectedBaselineReleaseId: target.fandexReleaseId,
        selectedBaselineTitle: target.canonicalTitle,
        attemptedBaselineReleaseIds: Object.freeze(attempted),
        reaction,
        blockers: Object.freeze([]),
      });
    }
    if (reaction.state === 'blocked') {
      continue;
    }
  }

  return Object.freeze({
    state: 'identity-extension-required' as const,
    territory,
    currentReleaseId: IU_THE_WINNING_RELEASE_ID,
    selectedBaselineReleaseId: null,
    selectedBaselineTitle: null,
    attemptedBaselineReleaseIds: Object.freeze(attempted),
    reaction: null,
    blockers: Object.freeze([
      'luminate-comparable-baseline-not-found-in-bounded-identity-set',
      IU_LUMINATE_BASELINE_ACQUISITION_BOUNDARY_RESEARCH.state,
    ]),
  });
}
