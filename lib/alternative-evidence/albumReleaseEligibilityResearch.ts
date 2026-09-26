import type { FandexReleaseIdentity, ReleaseType } from './identityFoundation';

export const ALBUM_RELEASE_ELIGIBILITY_RESEARCH_CONTRACT_VERSION =
  'album-release-eligibility-research-v1' as const;

export const ALBUM_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_RELEASE_ELIGIBILITY_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  canonicalIdentityRequired: true as const,
  productionRuleSelectedAtCanonicalLayer: true as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  primaryEligibleReleaseTypes: Object.freeze(['album', 'full-album', 'ep', 'mini-album'] as const),
  familyContributionRule: 'earliest-eligible-primary-release-per-family' as const,
  soleCanonicalArtistRequired: true as const,
  excludedReleaseTypes: Object.freeze([
    'single',
    'single-album',
    'repackage',
    'compilation',
    'live-album',
    'ost',
    'soundtrack',
    'unknown',
  ] as const),
  arbitraryNumericThresholdsUsed: false as const,
});

const ELIGIBLE_TYPES = new Set<ReleaseType>(['album', 'full-album', 'ep', 'mini-album']);

export type AlbumReleaseEligibilityDecision = Readonly<{
  state: 'eligible' | 'ineligible' | 'unresolved';
  releaseId: string | null;
  releaseFamilyId: string | null;
  reasons: readonly string[];
}>;

export function evaluateCanonicalAlbumReleaseEligibility(
  release: FandexReleaseIdentity,
  canonicalArtistId: string,
): AlbumReleaseEligibilityDecision {
  const reasons: string[] = [];

  if (release.resolutionState !== 'resolved' || release.fandexReleaseId === null) {
    return Object.freeze({
      state: 'unresolved',
      releaseId: release.fandexReleaseId,
      releaseFamilyId: release.fandexReleaseFamilyId,
      reasons: Object.freeze(['canonical-release-unresolved']),
    });
  }
  if (release.reviewState !== 'human-reviewed' && release.reviewState !== 'provider-verified') {
    return Object.freeze({
      state: 'unresolved',
      releaseId: release.fandexReleaseId,
      releaseFamilyId: release.fandexReleaseFamilyId,
      reasons: Object.freeze(['canonical-release-review-unresolved']),
    });
  }
  if (release.fandexReleaseFamilyId === null) {
    return Object.freeze({
      state: 'unresolved',
      releaseId: release.fandexReleaseId,
      releaseFamilyId: null,
      reasons: Object.freeze(['canonical-release-family-unresolved']),
    });
  }
  if (release.releaseDate === null) {
    return Object.freeze({
      state: 'unresolved',
      releaseId: release.fandexReleaseId,
      releaseFamilyId: release.fandexReleaseFamilyId,
      reasons: Object.freeze(['canonical-release-date-unresolved']),
    });
  }

  const soleCanonicalArtist = release.artistIds.length === 1 && release.artistIds[0] === canonicalArtistId;
  if (!soleCanonicalArtist) reasons.push('canonical-artist-not-sole-release-credit');
  if (!ELIGIBLE_TYPES.has(release.releaseType)) reasons.push(`release-type-${release.releaseType}-excluded`);

  return Object.freeze({
    state: reasons.length === 0 ? 'eligible' as const : 'ineligible' as const,
    releaseId: release.fandexReleaseId,
    releaseFamilyId: release.fandexReleaseFamilyId,
    reasons: Object.freeze(reasons),
  });
}

export type AlbumReleaseFamilyEligibilityRow = Readonly<{
  release: FandexReleaseIdentity;
  decision: AlbumReleaseEligibilityDecision;
  familyRole: 'primary-baseline-release' | 'family-extension-excluded' | 'not-eligible' | 'unresolved';
}>;

export function resolveAlbumReleaseFamilyEligibility(
  releases: readonly FandexReleaseIdentity[],
  canonicalArtistId: string,
): readonly AlbumReleaseFamilyEligibilityRow[] {
  const decisions = releases.map((release) => ({
    release,
    decision: evaluateCanonicalAlbumReleaseEligibility(release, canonicalArtistId),
  }));

  const earliestEligibleByFamily = new Map<string, string>();
  for (const { release, decision } of decisions) {
    if (decision.state !== 'eligible' || !release.fandexReleaseFamilyId || !release.releaseDate || !release.fandexReleaseId) continue;
    const existingReleaseId = earliestEligibleByFamily.get(release.fandexReleaseFamilyId);
    if (!existingReleaseId) {
      earliestEligibleByFamily.set(release.fandexReleaseFamilyId, release.fandexReleaseId);
      continue;
    }
    const existing = releases.find((candidate) => candidate.fandexReleaseId === existingReleaseId);
    if (existing?.releaseDate && release.releaseDate < existing.releaseDate) {
      earliestEligibleByFamily.set(release.fandexReleaseFamilyId, release.fandexReleaseId);
    }
  }

  return Object.freeze(decisions.map(({ release, decision }) => {
    if (decision.state === 'unresolved') {
      return Object.freeze({ release, decision, familyRole: 'unresolved' as const });
    }
    if (decision.state === 'ineligible') {
      return Object.freeze({ release, decision, familyRole: 'not-eligible' as const });
    }
    const selected = release.fandexReleaseFamilyId !== null
      && earliestEligibleByFamily.get(release.fandexReleaseFamilyId) === release.fandexReleaseId;
    return Object.freeze({
      release,
      decision,
      familyRole: selected ? 'primary-baseline-release' as const : 'family-extension-excluded' as const,
    });
  }));
}
