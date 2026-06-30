import type { ArtistGroupType } from './artistMetadata';
import {
  getArtistMetadata,
  getArtistMetadataAliases,
} from './artistMetadata';

type SearchableArtist = {
  artistId: string;
  artistName: string;
  ticker: string;
  groupType: ArtistGroupType;
};

export const groupTypeLabels: Record<ArtistGroupType, string> = {
  girl_group: '걸그룹',
  boy_group: '보이그룹',
  solo: '솔로',
  mixed: '혼성',
  unit: '유닛',
};

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[\s_.-]/g, '');
}

export function normalizeArtistSearchText(value: string) {
  return normalizeSearchText(value);
}

export function getArtistSearchAliases(artistId: string) {
  const metadata = getArtistMetadata(artistId);

  if (!metadata) {
    return [];
  }

  return Array.from(
    new Set([
      metadata.koreanName,
      ...getArtistMetadataAliases(artistId),
    ].filter(Boolean)),
  );
}

export function getArtistAliases(artistId: string) {
  return getArtistSearchAliases(artistId);
}

export function getArtistSearchTokens(artist: SearchableArtist) {
  const metadata = getArtistMetadata(artist.artistId);
  const baseTokens = [
    artist.artistId,
    artist.artistName,
    artist.ticker,
    artist.groupType,
    groupTypeLabels[artist.groupType],
    metadata?.displayName,
    metadata?.koreanName,
    metadata?.ticker,
    ...getArtistSearchAliases(artist.artistId),
  ].filter((token): token is string => Boolean(token));
  const normalizedTokens = baseTokens.map(normalizeSearchText);

  return Array.from(new Set([...baseTokens, ...normalizedTokens]));
}

export function getArtistSearchTargets(artist: SearchableArtist) {
  return getArtistSearchTokens(artist);
}

export function artistMatchesSearch(
  artist: SearchableArtist,
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return getArtistSearchTokens(artist)
    .map(normalizeSearchText)
    .some((value) => value.includes(normalizedQuery));
}
