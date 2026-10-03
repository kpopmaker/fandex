import { getArtistV4ById } from '../../app/data/v4/artistUniverse';
import type { ArtistVerificationStatus } from '../../app/data/v4/types';
import type { MusicChartCanonicalBinding } from './musicChartEvidenceAdapter';

export const MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION =
  'music-chart-canonical-identity-binding-v1' as const;

export type MusicChartCanonicalIdentityBindingEntry = Readonly<{
  canonicalArtistId: string;
  artistLabel: string;
  registryArtistFound: boolean;
  registryVerificationStatus: ArtistVerificationStatus | null;
  state:
    | 'shared-registry-verified'
    | 'shared-registry-unverified'
    | 'shared-registry-missing';
}>;

export type MusicChartCanonicalIdentityBindingAssessment = Readonly<{
  contractVersion:
    typeof MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION;
  entries: readonly MusicChartCanonicalIdentityBindingEntry[];
  integrationMode: 'shared-registry' | 'external-binding';
  productCanonicalIdentityIntegrated: boolean;
  blockers: readonly string[];
  automaticArtistLabelResolutionAllowed: false;
  canonicalIdMutationAllowed: false;
  scoreFieldsPresent: false;
}>;

type RegistryArtist = Readonly<{
  id: string;
  collection: Readonly<{
    verificationStatus: ArtistVerificationStatus;
  }>;
}>;

export type MusicChartCanonicalArtistRegistryLookup =
  (canonicalArtistId: string) => RegistryArtist | undefined;

const defaultRegistryLookup: MusicChartCanonicalArtistRegistryLookup =
  canonicalArtistId => getArtistV4ById(canonicalArtistId);

export function assessMusicChartSharedCanonicalBindings(
  bindings: readonly MusicChartCanonicalBinding[],
  lookup: MusicChartCanonicalArtistRegistryLookup = defaultRegistryLookup,
): MusicChartCanonicalIdentityBindingAssessment {
  if (bindings.length === 0) {
    throw new Error('music_chart_shared_registry_bindings_empty');
  }

  const seenLabels = new Set<string>();
  const seenCanonicalIds = new Set<string>();
  const entries: MusicChartCanonicalIdentityBindingEntry[] = [];
  const blockers: string[] = [];

  for (const binding of bindings) {
    const canonicalArtistId = binding.canonicalArtistId.trim();
    const artistLabel = binding.artist.trim();

    if (!canonicalArtistId || !artistLabel) {
      throw new Error('music_chart_shared_registry_binding_invalid');
    }
    if (seenLabels.has(artistLabel) || seenCanonicalIds.has(canonicalArtistId)) {
      throw new Error('music_chart_shared_registry_binding_duplicate');
    }
    seenLabels.add(artistLabel);
    seenCanonicalIds.add(canonicalArtistId);

    const registryArtist = lookup(canonicalArtistId);
    if (!registryArtist || registryArtist.id !== canonicalArtistId) {
      entries.push(Object.freeze({
        canonicalArtistId,
        artistLabel,
        registryArtistFound: false,
        registryVerificationStatus: null,
        state: 'shared-registry-missing' as const,
      }));
      blockers.push(`shared-registry-artist-missing:${canonicalArtistId}`);
      continue;
    }

    const verificationStatus = registryArtist.collection.verificationStatus;
    if (verificationStatus !== 'verified') {
      entries.push(Object.freeze({
        canonicalArtistId,
        artistLabel,
        registryArtistFound: true,
        registryVerificationStatus: verificationStatus,
        state: 'shared-registry-unverified' as const,
      }));
      blockers.push(
        `shared-registry-artist-unverified:${canonicalArtistId}:${verificationStatus}`,
      );
      continue;
    }

    entries.push(Object.freeze({
      canonicalArtistId,
      artistLabel,
      registryArtistFound: true,
      registryVerificationStatus: verificationStatus,
      state: 'shared-registry-verified' as const,
    }));
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)].sort());
  const productCanonicalIdentityIntegrated =
    entries.length === bindings.length && uniqueBlockers.length === 0;

  return Object.freeze({
    contractVersion: MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
    entries: Object.freeze(entries),
    integrationMode: productCanonicalIdentityIntegrated
      ? 'shared-registry' as const
      : 'external-binding' as const,
    productCanonicalIdentityIntegrated,
    blockers: uniqueBlockers,
    automaticArtistLabelResolutionAllowed: false as const,
    canonicalIdMutationAllowed: false as const,
    scoreFieldsPresent: false as const,
  });
}
