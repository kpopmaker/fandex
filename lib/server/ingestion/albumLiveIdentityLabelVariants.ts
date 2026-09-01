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
import {
  findAlbumArtistCandidates,
  reconcileAlbumLiveIdentity,
  type AlbumLiveIdentityAudit,
  type AlbumLiveIdentityRegistry,
  type AlbumLiveIdentityResult,
  type AlbumProviderIdentityInput,
} from './albumLiveIdentityReconciliation';

export const ALBUM_LIVE_IDENTITY_LABEL_VARIANTS_VERSION = 'album-live-identity-label-variants-v1' as const;

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.map(value => value.trim()).filter(Boolean))]);
}

/**
 * Conservative provider-label parsing only.
 *
 * Supported:
 *   Stray Kids (스트레이 키즈) -> [full, Stray Kids, 스트레이 키즈]
 *   아일릿(ILLIT)             -> [full, 아일릿, ILLIT]
 *
 * Not supported:
 *   substring matching
 *   edit distance / fuzzy matching
 *   token containment
 *   multiple or nested parenthetical groups
 */
export function extractConservativeProviderArtistLabelVariants(
  rawArtistText: string | null,
): readonly string[] {
  if (rawArtistText === null) return Object.freeze([]);
  const original = rawArtistText.trim();
  if (!original) return Object.freeze([]);

  const match = original.match(/^([^()]*)\s*\(([^()]*)\)\s*$/u);
  if (!match) return Object.freeze([original]);
  const outside = match[1].trim();
  const inside = match[2].trim();
  if (!outside || !inside) return Object.freeze([original]);
  return unique([original, outside, inside]);
}

function augmentCandidateAliases(
  registry: AlbumLiveIdentityRegistry,
  candidateIds: readonly string[],
  rawArtistText: string | null,
): AlbumLiveIdentityRegistry {
  if (!rawArtistText?.trim() || candidateIds.length === 0) return registry;
  const candidateSet = new Set(candidateIds);
  return Object.freeze({
    ...registry,
    artists: Object.freeze(registry.artists.map((artist) => candidateSet.has(artist.fandexArtistId)
      ? Object.freeze({
          ...artist,
          aliases: unique([...artist.aliases, rawArtistText]),
        })
      : artist)),
  });
}

/**
 * Reviewed mappings are evaluated only against the original provider input.
 * Label variants may add machine candidates, but can never broaden a reviewed
 * provider mapping into a resolved identity.
 */
export function reconcileAlbumLiveIdentityWithLabelVariants(
  input: AlbumProviderIdentityInput,
  registry: AlbumLiveIdentityRegistry,
): AlbumLiveIdentityResult {
  const direct = reconcileAlbumLiveIdentity(input, registry);
  if (direct.audit.status === 'resolved'
    || direct.audit.status === 'release-review-required'
    || direct.audit.status === 'conflicting') {
    return direct;
  }

  const variants = extractConservativeProviderArtistLabelVariants(input.rawArtistText);
  if (variants.length <= 1) return direct;

  const candidateIds = unique(variants.flatMap(variant => findAlbumArtistCandidates(variant, registry.artists)));
  const directCandidateIds = [...direct.audit.artistCandidateIds].sort();
  const mergedCandidateIds = [...new Set([...directCandidateIds, ...candidateIds])].sort();
  if (mergedCandidateIds.length === 0) return direct;
  if (mergedCandidateIds.length === directCandidateIds.length
    && mergedCandidateIds.every((id, index) => id === directCandidateIds[index])) {
    return direct;
  }

  // Re-run the core reconciliation with a temporary candidate-only alias overlay.
  // Reviewed mapping matching still receives the untouched original provider input,
  // so this can only produce candidate/ambiguous states, never a new reviewed resolve.
  return reconcileAlbumLiveIdentity(
    input,
    augmentCandidateAliases(registry, mergedCandidateIds, input.rawArtistText),
  );
}

export function createCircleRetailVariantAwareIdentityResolver(
  registry: AlbumLiveIdentityRegistry,
  onAudit?: (audit: AlbumLiveIdentityAudit, rowIndex: number) => void,
): CircleRetailIdentityResolver {
  return (row: CircleRetailRawRow, rowIndex): CircleRetailIdentityResolution => {
    const result = reconcileAlbumLiveIdentityWithLabelVariants({
      provider: 'circle-retail',
      providerArtistId: null,
      providerReleaseId: null,
      providerSkuId: row.Barcode,
      rawArtistText: row.Artist,
      rawReleaseText: row.Album,
    }, registry);
    onAudit?.(result.audit, rowIndex);
    return result.resolution;
  };
}

export function createHanteoVariantAwareIdentityResolver(
  registry: AlbumLiveIdentityRegistry,
  onAudit?: (audit: AlbumLiveIdentityAudit, rowIndex: number) => void,
): HanteoAlbumIdentityResolver {
  return (row: HanteoAlbumQualifiedRow, rowIndex): HanteoAlbumIdentityResolution => {
    const result = reconcileAlbumLiveIdentityWithLabelVariants({
      provider: 'hanteo',
      providerArtistId: row.providerArtistId,
      providerReleaseId: row.providerTargetId,
      providerSkuId: null,
      rawArtistText: row.artistRaw,
      rawReleaseText: row.releaseRaw,
    }, registry);
    onAudit?.(result.audit, rowIndex);
    return result.resolution;
  };
}
