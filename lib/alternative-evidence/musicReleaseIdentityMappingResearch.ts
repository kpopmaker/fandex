import { sha256Canonical } from '../shared/canonicalDigest';
import {
  normalizeIdentityText,
  type FandexReleaseIdentity,
  type IdentityResolutionState,
  type IdentityReviewState,
  type ReleaseType,
} from './identityFoundation';
import type { MusicBrainzReleaseGroupResearchObservation } from './musicbrainzAlbumCatalogResearch';

export const MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_CONTRACT_VERSION =
  'music-release-identity-mapping-research-v1' as const;

export const MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  automaticResolutionAllowed: false as const,
  semantics: 'provider-release-group-to-fandex-release-identity-candidate' as const,
});

export type MusicReleaseProviderMappingReference = Readonly<{
  providerId: 'musicbrainz';
  providerReleaseGroupId: string;
  evidenceRefs: readonly string[];
}>;

export type FandexReleaseIdentityResearchReference = Readonly<{
  release: FandexReleaseIdentity;
  aliases: readonly string[];
  providerMappings: readonly MusicReleaseProviderMappingReference[];
  evidenceRefs: readonly string[];
}>;

export type MusicReleaseIdentityMappingMatchMode =
  | 'explicit-provider-mapping'
  | 'title-type-date'
  | 'title-type'
  | 'title-only'
  | 'none'
  | 'conflicting-provider-mapping';

export type MusicReleaseIdentityMappingResearch = Readonly<{
  contractVersion: typeof MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  productMethodologyFrozen: false;
  providerId: 'musicbrainz';
  canonicalArtistId: string;
  providerArtistId: string;
  providerReleaseGroupId: string;
  observedTitle: string;
  observedFirstReleaseDate: string | null;
  observedPrimaryType: string | null;
  observedSecondaryTypes: readonly string[];
  observedCanonicalArtistCreditState: MusicBrainzReleaseGroupResearchObservation['canonicalArtistCreditState'];
  matchMode: MusicReleaseIdentityMappingMatchMode;
  candidateFandexReleaseIds: readonly string[];
  candidateFandexReleaseFamilyIds: readonly string[];
  resolvedFandexReleaseId: string | null;
  resolvedFandexReleaseFamilyId: string | null;
  resolutionState: IdentityResolutionState;
  reviewState: IdentityReviewState;
  canonicalArtistScopeState: 'unreviewed' | 'confirmed-in-scope' | 'confirmed-out-of-scope';
  evidenceRefs: readonly string[];
  blockers: readonly string[];
  mappingDigest: string;
}>;

const uniq = (values: readonly string[]) => Object.freeze([...new Set(values)]);

function canonicalIds(reference: FandexReleaseIdentityResearchReference) {
  return {
    releaseId: reference.release.fandexReleaseId,
    familyId: reference.release.fandexReleaseFamilyId,
  };
}

function titleMatches(
  observation: MusicBrainzReleaseGroupResearchObservation,
  reference: FandexReleaseIdentityResearchReference,
): boolean {
  const observed = normalizeIdentityText(observation.title);
  const candidates = [reference.release.canonicalTitle, ...reference.aliases]
    .map((value) => normalizeIdentityText(value))
    .filter((value): value is string => value !== null);
  return observed !== null && candidates.includes(observed);
}

function primaryTypeCompatible(primaryType: string | null, releaseType: ReleaseType): boolean {
  if (primaryType === null) return true;
  if (primaryType === 'Album') {
    return ['album', 'full-album', 'repackage', 'compilation', 'live-album'].includes(releaseType);
  }
  if (primaryType === 'EP') return ['ep', 'mini-album'].includes(releaseType);
  if (primaryType === 'Single') return ['single', 'single-album'].includes(releaseType);
  return releaseType === 'unknown';
}

function dateMatches(
  observation: MusicBrainzReleaseGroupResearchObservation,
  reference: FandexReleaseIdentityResearchReference,
): boolean {
  if (observation.firstReleaseDate === null || reference.release.releaseDate === null) return false;
  return observation.firstReleaseDate === reference.release.releaseDate;
}

function baseResult(
  observation: MusicBrainzReleaseGroupResearchObservation,
  input: Readonly<{
    matchMode: MusicReleaseIdentityMappingMatchMode;
    candidates: readonly FandexReleaseIdentityResearchReference[];
    resolved?: FandexReleaseIdentityResearchReference | null;
    resolutionState: IdentityResolutionState;
    reviewState: IdentityReviewState;
    blockers: readonly string[];
    evidenceRefs?: readonly string[];
    canonicalArtistScopeState?: 'unreviewed' | 'confirmed-in-scope' | 'confirmed-out-of-scope';
  }>,
): MusicReleaseIdentityMappingResearch {
  const candidateFandexReleaseIds = uniq(input.candidates
    .map((reference) => canonicalIds(reference).releaseId)
    .filter((value): value is string => value !== null));
  const candidateFandexReleaseFamilyIds = uniq(input.candidates
    .map((reference) => canonicalIds(reference).familyId)
    .filter((value): value is string => value !== null));
  const resolvedFandexReleaseId = input.resolved?.release.fandexReleaseId ?? null;
  const resolvedFandexReleaseFamilyId = input.resolved?.release.fandexReleaseFamilyId ?? null;
  const shape = {
    contractVersion: MUSIC_RELEASE_IDENTITY_MAPPING_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
    productMethodologyFrozen: false as const,
    providerId: 'musicbrainz' as const,
    canonicalArtistId: observation.canonicalArtistId,
    providerArtistId: observation.providerArtistId,
    providerReleaseGroupId: observation.providerReleaseGroupId,
    observedTitle: observation.title,
    observedFirstReleaseDate: observation.firstReleaseDate,
    observedPrimaryType: observation.primaryType,
    observedSecondaryTypes: Object.freeze([...observation.secondaryTypes]),
    observedCanonicalArtistCreditState: observation.canonicalArtistCreditState,
    matchMode: input.matchMode,
    candidateFandexReleaseIds,
    candidateFandexReleaseFamilyIds,
    resolvedFandexReleaseId,
    resolvedFandexReleaseFamilyId,
    resolutionState: input.resolutionState,
    reviewState: input.reviewState,
    canonicalArtistScopeState: input.canonicalArtistScopeState ?? 'unreviewed' as const,
    evidenceRefs: uniq(input.evidenceRefs ?? []),
    blockers: uniq(input.blockers),
  };
  return Object.freeze({ ...shape, mappingDigest: sha256Canonical(shape) });
}

export function proposeMusicBrainzReleaseIdentityMapping(
  observation: MusicBrainzReleaseGroupResearchObservation,
  references: readonly FandexReleaseIdentityResearchReference[],
): MusicReleaseIdentityMappingResearch {
  if (observation.canonicalArtistCreditState === 'absent') {
    return baseResult(observation, {
      matchMode: 'none', candidates: [], resolutionState: 'rejected', reviewState: 'rejected',
      blockers: ['canonical-artist-credit-absent'],
    });
  }

  const creditBlockers = observation.canonicalArtistCreditState === 'multi-artist-credit'
    ? ['multi-artist-credit-review-required']
    : observation.canonicalArtistCreditState === 'unresolved'
      ? ['canonical-artist-credit-unresolved', 'review-required']
      : [];

  const explicit = references.filter((reference) => reference.providerMappings.some((mapping) =>
    mapping.providerId === 'musicbrainz'
      && mapping.providerReleaseGroupId === observation.providerReleaseGroupId));
  if (explicit.length > 1) {
    return baseResult(observation, {
      matchMode: 'conflicting-provider-mapping', candidates: explicit,
      resolutionState: 'conflicting', reviewState: 'conflicting',
      blockers: [...creditBlockers, 'conflicting-provider-mapping'],
      evidenceRefs: explicit.flatMap((reference) => reference.evidenceRefs),
    });
  }
  if (explicit.length === 1) {
    const reference = explicit[0];
    const providerEvidence = reference.providerMappings
      .filter((mapping) => mapping.providerReleaseGroupId === observation.providerReleaseGroupId)
      .flatMap((mapping) => mapping.evidenceRefs);
    const canResolve = reference.release.resolutionState === 'resolved'
      && ['human-reviewed', 'provider-verified'].includes(reference.release.reviewState)
      && observation.canonicalArtistCreditState === 'sole-credit';
    return baseResult(observation, {
      matchMode: 'explicit-provider-mapping', candidates: explicit,
      resolved: canResolve ? reference : null,
      resolutionState: canResolve ? 'resolved' : 'candidate',
      reviewState: canResolve ? reference.release.reviewState : 'machine-candidate',
      blockers: canResolve ? [] : [...creditBlockers, 'review-required'],
      evidenceRefs: [...reference.evidenceRefs, ...providerEvidence],
      canonicalArtistScopeState: canResolve ? 'confirmed-in-scope' : 'unreviewed',
    });
  }

  const byTitle = references.filter((reference) => titleMatches(observation, reference));
  if (byTitle.length === 0) {
    return baseResult(observation, {
      matchMode: 'none', candidates: [], resolutionState: 'unresolved', reviewState: 'unreviewed',
      blockers: [...creditBlockers, 'release-unresolved'],
    });
  }

  const byType = byTitle.filter((reference) =>
    primaryTypeCompatible(observation.primaryType, reference.release.releaseType));
  if (byType.length === 0) {
    return baseResult(observation, {
      matchMode: 'title-only', candidates: byTitle, resolutionState: 'conflicting', reviewState: 'conflicting',
      blockers: [...creditBlockers, 'release-type-conflict', 'review-required'],
      evidenceRefs: byTitle.flatMap((reference) => reference.evidenceRefs),
    });
  }

  const byDate = byType.filter((reference) => dateMatches(observation, reference));
  const pool = byDate.length > 0 ? byDate : byType;
  const matchMode: MusicReleaseIdentityMappingMatchMode = byDate.length > 0
    ? 'title-type-date'
    : 'title-type';
  const dateBlockers = byDate.length === 0 && observation.firstReleaseDate !== null
    ? ['release-date-not-corroborated']
    : [];

  if (pool.length === 1) {
    return baseResult(observation, {
      matchMode, candidates: pool, resolutionState: 'candidate', reviewState: 'machine-candidate',
      blockers: [...creditBlockers, ...dateBlockers, 'review-required'],
      evidenceRefs: pool[0].evidenceRefs,
    });
  }

  return baseResult(observation, {
    matchMode, candidates: pool, resolutionState: 'ambiguous', reviewState: 'unreviewed',
    blockers: [...creditBlockers, ...dateBlockers, 'release-ambiguous', 'review-required'],
    evidenceRefs: pool.flatMap((reference) => reference.evidenceRefs),
  });
}

export function confirmMusicBrainzReleaseIdentityMapping(
  proposal: MusicReleaseIdentityMappingResearch,
  reference: FandexReleaseIdentityResearchReference,
  input: Readonly<{
    reviewState: 'human-reviewed' | 'provider-verified';
    canonicalArtistScopeDecision: 'confirmed-in-scope' | 'confirmed-out-of-scope';
    evidenceRefs: readonly string[];
  }>,
): MusicReleaseIdentityMappingResearch {
  const releaseId = reference.release.fandexReleaseId;
  if (releaseId === null) throw new Error('fandex_release_id_required');
  if (!proposal.candidateFandexReleaseIds.includes(releaseId)) {
    throw new Error('release_not_in_mapping_candidates');
  }
  if (input.evidenceRefs.length === 0) throw new Error('mapping_confirmation_evidence_required');
  if (input.canonicalArtistScopeDecision === 'confirmed-out-of-scope') {
    return Object.freeze({
      ...proposal,
      resolvedFandexReleaseId: null,
      resolvedFandexReleaseFamilyId: null,
      resolutionState: 'rejected',
      reviewState: input.reviewState,
      canonicalArtistScopeState: 'confirmed-out-of-scope',
      evidenceRefs: uniq([...proposal.evidenceRefs, ...input.evidenceRefs]),
      blockers: uniq([...proposal.blockers.filter((blocker) => blocker !== 'review-required'), 'canonical-artist-scope-excluded']),
      mappingDigest: sha256Canonical({
        supersedes: proposal.mappingDigest,
        releaseId,
        decision: input.canonicalArtistScopeDecision,
        reviewState: input.reviewState,
        evidenceRefs: input.evidenceRefs,
      }),
    });
  }
  const shape = {
    ...proposal,
    resolvedFandexReleaseId: releaseId,
    resolvedFandexReleaseFamilyId: reference.release.fandexReleaseFamilyId,
    resolutionState: 'resolved' as const,
    reviewState: input.reviewState,
    canonicalArtistScopeState: 'confirmed-in-scope' as const,
    evidenceRefs: uniq([...proposal.evidenceRefs, ...reference.evidenceRefs, ...input.evidenceRefs]),
    blockers: Object.freeze([] as string[]),
  };
  return Object.freeze({ ...shape, mappingDigest: sha256Canonical({ ...shape, supersedes: proposal.mappingDigest }) });
}

export function releaseIdentityEnrichmentFromMapping(
  mapping: MusicReleaseIdentityMappingResearch,
): Readonly<{
  artistId: string | null;
  artistState: IdentityResolutionState;
  releaseId: string | null;
  releaseState: IdentityResolutionState;
  releaseFamilyId: string | null;
}> {
  const resolved = mapping.resolutionState === 'resolved'
    && mapping.canonicalArtistScopeState === 'confirmed-in-scope'
    && mapping.resolvedFandexReleaseId !== null;
  return Object.freeze({
    artistId: resolved ? mapping.canonicalArtistId : null,
    artistState: resolved ? 'resolved' : 'unresolved',
    releaseId: resolved ? mapping.resolvedFandexReleaseId : null,
    releaseState: resolved ? 'resolved' : mapping.resolutionState,
    releaseFamilyId: resolved ? mapping.resolvedFandexReleaseFamilyId : null,
  });
}
