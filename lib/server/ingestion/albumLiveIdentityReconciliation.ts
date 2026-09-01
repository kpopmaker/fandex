import {
  normalizeIdentityText,
  type IdentityResolutionState,
  type IdentityReviewState,
} from '../../alternative-evidence/identityFoundation';
import type {
  CircleRetailIdentityResolution,
  CircleRetailIdentityResolver,
  CircleRetailRawRow,
} from '../../alternative-evidence/circleRetailAdapter';
import type {
  HanteoAlbumIdentityResolution,
  HanteoAlbumIdentityResolver,
} from '../../alternative-evidence/hanteoAlbumAdapter';
import type { HanteoAlbumQualifiedRow } from '../../alternative-evidence/hanteoAlbumDiscovery';

export const ALBUM_LIVE_IDENTITY_RECONCILIATION_VERSION = 'album-live-identity-reconciliation-v1' as const;

export type AlbumIdentityProvider = 'circle-retail' | 'hanteo';
export type AlbumIdentityReviewState = Extract<IdentityReviewState, 'human-reviewed' | 'provider-verified'>;

export type AlbumArtistCatalogEntry = Readonly<{
  fandexArtistId: string;
  canonicalName: string;
  aliases: readonly string[];
}>;

export type AlbumArtistUniverseSource = Readonly<{
  id: string;
  nameKo: string;
  nameEn: string;
  profile: Readonly<{
    aliases: readonly string[];
    koreanAliases: readonly string[];
    englishAliases: readonly string[];
  }>;
}>;

export type AlbumReviewedArtistMapping = Readonly<{
  provider: AlbumIdentityProvider;
  providerArtistId: string | null;
  providerArtistText: string | null;
  fandexArtistId: string;
  reviewState: AlbumIdentityReviewState;
  evidenceIds: readonly string[];
}>;

export type AlbumReviewedReleaseMapping = Readonly<{
  provider: AlbumIdentityProvider;
  providerReleaseId: string | null;
  providerSkuId: string | null;
  providerReleaseText: string | null;
  fandexArtistId: string;
  fandexReleaseId: string;
  fandexReleaseFamilyId: string | null;
  reviewState: AlbumIdentityReviewState;
  evidenceIds: readonly string[];
}>;

export type AlbumLiveIdentityRegistry = Readonly<{
  artists: readonly AlbumArtistCatalogEntry[];
  reviewedArtistMappings: readonly AlbumReviewedArtistMapping[];
  reviewedReleaseMappings: readonly AlbumReviewedReleaseMapping[];
}>;

export type AlbumProviderIdentityInput = Readonly<{
  provider: AlbumIdentityProvider;
  providerArtistId: string | null;
  providerReleaseId: string | null;
  providerSkuId: string | null;
  rawArtistText: string | null;
  rawReleaseText: string | null;
}>;

export type AlbumLiveIdentityStatus =
  | 'resolved'
  | 'artist-candidate-only'
  | 'artist-review-required'
  | 'release-review-required'
  | 'ambiguous'
  | 'conflicting'
  | 'no-match';

export type AlbumLiveIdentityAudit = Readonly<{
  contractVersion: typeof ALBUM_LIVE_IDENTITY_RECONCILIATION_VERSION;
  provider: AlbumIdentityProvider;
  status: AlbumLiveIdentityStatus;
  artistCandidateIds: readonly string[];
  matchedArtistMapping: AlbumReviewedArtistMapping | null;
  matchedReleaseMapping: AlbumReviewedReleaseMapping | null;
  blockers: readonly string[];
  evidenceIds: readonly string[];
}>;

export type AlbumLiveIdentityResult = Readonly<{
  audit: AlbumLiveIdentityAudit;
  resolution: Readonly<{
    fandexArtistId: string | null;
    fandexReleaseId: string | null;
    fandexReleaseFamilyId: string | null;
    artistResolutionState: IdentityResolutionState;
    artistReviewState: IdentityReviewState;
    releaseResolutionState: IdentityResolutionState;
    releaseReviewState: IdentityReviewState;
    evidenceIds: readonly string[];
  }>;
}>;

function requireNonBlank(value: string, code: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(code);
  return trimmed;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.map(value => value.trim()).filter(Boolean))]);
}

function normalizedEquals(left: string | null, right: string | null): boolean {
  const l = normalizeIdentityText(left);
  const r = normalizeIdentityText(right);
  return l !== null && r !== null && l === r;
}

function artistMappingKey(mapping: AlbumReviewedArtistMapping): string {
  return [
    mapping.provider,
    mapping.providerArtistId ?? '',
    normalizeIdentityText(mapping.providerArtistText) ?? '',
  ].join('|');
}

function releaseMappingKey(mapping: AlbumReviewedReleaseMapping): string {
  return [
    mapping.provider,
    mapping.providerReleaseId ?? '',
    mapping.providerSkuId ?? '',
    normalizeIdentityText(mapping.providerReleaseText) ?? '',
  ].join('|');
}

export function buildAlbumArtistCatalogFromUniverse(
  artists: readonly AlbumArtistUniverseSource[],
): readonly AlbumArtistCatalogEntry[] {
  return Object.freeze(artists.map((artist) => Object.freeze({
    fandexArtistId: requireNonBlank(artist.id, 'album_identity_artist_id_required'),
    canonicalName: requireNonBlank(artist.nameKo || artist.nameEn, 'album_identity_artist_name_required'),
    aliases: uniqueStrings([
      artist.nameKo,
      artist.nameEn,
      ...artist.profile.aliases,
      ...artist.profile.koreanAliases,
      ...artist.profile.englishAliases,
    ]),
  })));
}

export function validateAlbumLiveIdentityRegistry(registry: AlbumLiveIdentityRegistry): void {
  const artistIds = new Set<string>();
  for (const artist of registry.artists) {
    requireNonBlank(artist.fandexArtistId, 'album_identity_artist_id_required');
    requireNonBlank(artist.canonicalName, 'album_identity_artist_name_required');
    if (artistIds.has(artist.fandexArtistId)) throw new Error('album_identity_duplicate_artist_id');
    artistIds.add(artist.fandexArtistId);
  }

  const artistKeys = new Set<string>();
  for (const mapping of registry.reviewedArtistMappings) {
    if (!artistIds.has(mapping.fandexArtistId)) throw new Error('album_identity_artist_mapping_unknown_fandex_artist');
    if (!mapping.providerArtistId && !mapping.providerArtistText?.trim()) {
      throw new Error('album_identity_artist_mapping_provider_key_required');
    }
    if (mapping.evidenceIds.length === 0 || mapping.evidenceIds.some(id => !id.trim())) {
      throw new Error('album_identity_artist_mapping_evidence_required');
    }
    const key = artistMappingKey(mapping);
    if (artistKeys.has(key)) throw new Error('album_identity_duplicate_artist_mapping');
    artistKeys.add(key);
  }

  const releaseKeys = new Set<string>();
  for (const mapping of registry.reviewedReleaseMappings) {
    if (!artistIds.has(mapping.fandexArtistId)) throw new Error('album_identity_release_mapping_unknown_fandex_artist');
    requireNonBlank(mapping.fandexReleaseId, 'album_identity_release_id_required');
    if (!mapping.providerReleaseId && !mapping.providerSkuId && !mapping.providerReleaseText?.trim()) {
      throw new Error('album_identity_release_mapping_provider_key_required');
    }
    if (mapping.evidenceIds.length === 0 || mapping.evidenceIds.some(id => !id.trim())) {
      throw new Error('album_identity_release_mapping_evidence_required');
    }
    const key = releaseMappingKey(mapping);
    if (releaseKeys.has(key)) throw new Error('album_identity_duplicate_release_mapping');
    releaseKeys.add(key);
  }
}

export function findAlbumArtistCandidates(
  rawArtistText: string | null,
  artists: readonly AlbumArtistCatalogEntry[],
): readonly string[] {
  const normalized = normalizeIdentityText(rawArtistText);
  if (!normalized) return Object.freeze([]);
  const matches = artists
    .filter((artist) => uniqueStrings([artist.canonicalName, ...artist.aliases])
      .some(alias => normalizeIdentityText(alias) === normalized))
    .map(artist => artist.fandexArtistId);
  return Object.freeze([...new Set(matches)].sort());
}

function artistMappingMatches(input: AlbumProviderIdentityInput, mapping: AlbumReviewedArtistMapping): boolean {
  if (mapping.provider !== input.provider) return false;
  if (mapping.providerArtistId !== null) {
    if (input.providerArtistId === null || mapping.providerArtistId !== input.providerArtistId) return false;
    if (mapping.providerArtistText && input.rawArtistText
      && !normalizedEquals(mapping.providerArtistText, input.rawArtistText)) return false;
    return true;
  }
  return mapping.providerArtistText !== null
    && normalizedEquals(mapping.providerArtistText, input.rawArtistText);
}

function releaseMappingMatches(input: AlbumProviderIdentityInput, mapping: AlbumReviewedReleaseMapping): boolean {
  if (mapping.provider !== input.provider) return false;
  if (mapping.providerReleaseId !== null) {
    if (input.providerReleaseId === null || mapping.providerReleaseId !== input.providerReleaseId) return false;
  }
  if (mapping.providerSkuId !== null) {
    if (input.providerSkuId === null || mapping.providerSkuId !== input.providerSkuId) return false;
  }
  if (mapping.providerReleaseText !== null && input.rawReleaseText !== null
    && !normalizedEquals(mapping.providerReleaseText, input.rawReleaseText)) return false;
  if (mapping.providerReleaseId === null && mapping.providerSkuId === null) {
    return mapping.providerReleaseText !== null
      && normalizedEquals(mapping.providerReleaseText, input.rawReleaseText);
  }
  return true;
}

function unresolvedResult(input: Readonly<{
  provider: AlbumIdentityProvider;
  status: AlbumLiveIdentityStatus;
  artistCandidateIds: readonly string[];
  matchedArtistMapping?: AlbumReviewedArtistMapping | null;
  matchedReleaseMapping?: AlbumReviewedReleaseMapping | null;
  blockers: readonly string[];
}>): AlbumLiveIdentityResult {
  const evidenceIds = uniqueStrings([
    ...(input.matchedArtistMapping?.evidenceIds ?? []),
    ...(input.matchedReleaseMapping?.evidenceIds ?? []),
  ]);
  const artistCandidate = input.artistCandidateIds.length === 1 ? input.artistCandidateIds[0] : null;
  const artistState: IdentityResolutionState = input.status === 'ambiguous'
    ? 'ambiguous'
    : artistCandidate ? 'candidate' : 'unresolved';
  return Object.freeze({
    audit: Object.freeze({
      contractVersion: ALBUM_LIVE_IDENTITY_RECONCILIATION_VERSION,
      provider: input.provider,
      status: input.status,
      artistCandidateIds: Object.freeze([...input.artistCandidateIds]),
      matchedArtistMapping: input.matchedArtistMapping ?? null,
      matchedReleaseMapping: input.matchedReleaseMapping ?? null,
      blockers: uniqueStrings(input.blockers),
      evidenceIds,
    }),
    resolution: Object.freeze({
      fandexArtistId: artistCandidate,
      fandexReleaseId: null,
      fandexReleaseFamilyId: null,
      artistResolutionState: artistState,
      artistReviewState: artistCandidate ? 'machine-candidate' : 'unreviewed',
      releaseResolutionState: 'unresolved',
      releaseReviewState: 'unreviewed',
      evidenceIds,
    }),
  });
}

export function reconcileAlbumLiveIdentity(
  input: AlbumProviderIdentityInput,
  registry: AlbumLiveIdentityRegistry,
): AlbumLiveIdentityResult {
  validateAlbumLiveIdentityRegistry(registry);
  const artistCandidates = findAlbumArtistCandidates(input.rawArtistText, registry.artists);
  if (artistCandidates.length > 1) {
    return unresolvedResult({
      provider: input.provider,
      status: 'ambiguous',
      artistCandidateIds: artistCandidates,
      blockers: ['artist-ambiguous', 'review-required'],
    });
  }

  const artistMappings = registry.reviewedArtistMappings.filter(mapping => artistMappingMatches(input, mapping));
  if (artistMappings.length > 1) {
    return unresolvedResult({
      provider: input.provider,
      status: 'conflicting',
      artistCandidateIds: artistCandidates,
      blockers: ['conflicting-artist-mapping'],
    });
  }
  const artistMapping = artistMappings[0] ?? null;

  if (!artistMapping) {
    return unresolvedResult({
      provider: input.provider,
      status: artistCandidates.length === 1 ? 'artist-candidate-only' : 'no-match',
      artistCandidateIds: artistCandidates,
      blockers: artistCandidates.length === 1
        ? ['artist-review-required', 'release-review-required']
        : ['artist-unresolved', 'release-unresolved'],
    });
  }

  if (artistCandidates.length === 1 && artistCandidates[0] !== artistMapping.fandexArtistId) {
    return unresolvedResult({
      provider: input.provider,
      status: 'conflicting',
      artistCandidateIds: artistCandidates,
      matchedArtistMapping: artistMapping,
      blockers: ['artist-text-mapping-conflict'],
    });
  }

  const releaseMappings = registry.reviewedReleaseMappings.filter(mapping => releaseMappingMatches(input, mapping));
  if (releaseMappings.length > 1) {
    return unresolvedResult({
      provider: input.provider,
      status: 'conflicting',
      artistCandidateIds: artistCandidates,
      matchedArtistMapping: artistMapping,
      blockers: ['conflicting-release-mapping'],
    });
  }
  const releaseMapping = releaseMappings[0] ?? null;
  if (!releaseMapping) {
    const evidenceIds = uniqueStrings(artistMapping.evidenceIds);
    return Object.freeze({
      audit: Object.freeze({
        contractVersion: ALBUM_LIVE_IDENTITY_RECONCILIATION_VERSION,
        provider: input.provider,
        status: 'release-review-required' as const,
        artistCandidateIds: Object.freeze([...artistCandidates]),
        matchedArtistMapping: artistMapping,
        matchedReleaseMapping: null,
        blockers: Object.freeze(['release-review-required']),
        evidenceIds,
      }),
      resolution: Object.freeze({
        fandexArtistId: artistMapping.fandexArtistId,
        fandexReleaseId: null,
        fandexReleaseFamilyId: null,
        artistResolutionState: 'resolved' as const,
        artistReviewState: artistMapping.reviewState,
        releaseResolutionState: 'review-required' as const,
        releaseReviewState: 'unreviewed' as const,
        evidenceIds,
      }),
    });
  }

  if (releaseMapping.fandexArtistId !== artistMapping.fandexArtistId) {
    return unresolvedResult({
      provider: input.provider,
      status: 'conflicting',
      artistCandidateIds: artistCandidates,
      matchedArtistMapping: artistMapping,
      matchedReleaseMapping: releaseMapping,
      blockers: ['artist-release-mapping-conflict'],
    });
  }

  const evidenceIds = uniqueStrings([...artistMapping.evidenceIds, ...releaseMapping.evidenceIds]);
  return Object.freeze({
    audit: Object.freeze({
      contractVersion: ALBUM_LIVE_IDENTITY_RECONCILIATION_VERSION,
      provider: input.provider,
      status: 'resolved' as const,
      artistCandidateIds: Object.freeze([...artistCandidates]),
      matchedArtistMapping: artistMapping,
      matchedReleaseMapping: releaseMapping,
      blockers: Object.freeze([]),
      evidenceIds,
    }),
    resolution: Object.freeze({
      fandexArtistId: artistMapping.fandexArtistId,
      fandexReleaseId: releaseMapping.fandexReleaseId,
      fandexReleaseFamilyId: releaseMapping.fandexReleaseFamilyId,
      artistResolutionState: 'resolved' as const,
      artistReviewState: artistMapping.reviewState,
      releaseResolutionState: 'resolved' as const,
      releaseReviewState: releaseMapping.reviewState,
      evidenceIds,
    }),
  });
}

export function reconcileCircleRetailIdentity(
  row: CircleRetailRawRow,
  registry: AlbumLiveIdentityRegistry,
): AlbumLiveIdentityResult {
  return reconcileAlbumLiveIdentity({
    provider: 'circle-retail',
    providerArtistId: null,
    providerReleaseId: null,
    providerSkuId: row.Barcode,
    rawArtistText: row.Artist,
    rawReleaseText: row.Album,
  }, registry);
}

export function reconcileHanteoAlbumIdentity(
  row: HanteoAlbumQualifiedRow,
  registry: AlbumLiveIdentityRegistry,
): AlbumLiveIdentityResult {
  return reconcileAlbumLiveIdentity({
    provider: 'hanteo',
    providerArtistId: row.providerArtistId,
    providerReleaseId: row.providerTargetId,
    providerSkuId: null,
    rawArtistText: row.artistRaw,
    rawReleaseText: row.releaseRaw,
  }, registry);
}

export function createCircleRetailLiveIdentityResolver(
  registry: AlbumLiveIdentityRegistry,
  onAudit?: (audit: AlbumLiveIdentityAudit, rowIndex: number) => void,
): CircleRetailIdentityResolver {
  validateAlbumLiveIdentityRegistry(registry);
  return (row, rowIndex): CircleRetailIdentityResolution => {
    const result = reconcileCircleRetailIdentity(row, registry);
    onAudit?.(result.audit, rowIndex);
    return result.resolution;
  };
}

export function createHanteoLiveIdentityResolver(
  registry: AlbumLiveIdentityRegistry,
  onAudit?: (audit: AlbumLiveIdentityAudit, rowIndex: number) => void,
): HanteoAlbumIdentityResolver {
  validateAlbumLiveIdentityRegistry(registry);
  return (row, rowIndex): HanteoAlbumIdentityResolution => {
    const result = reconcileHanteoAlbumIdentity(row, registry);
    onAudit?.(result.audit, rowIndex);
    return result.resolution;
  };
}
