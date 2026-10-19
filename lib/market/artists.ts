import {
  artistMetadata,
  type ArtistMetadata,
} from '../../app/data/v4/charts/artistMetadata';

export type MarketArtist = {
  id: string;
  name: string;
  koreanName: string;
  ticker: string;
  groupType: 'boy_group' | 'girl_group' | 'mixed';
  company: string | null;
  searchText: string;
};

function isGroup(
  artist: ArtistMetadata,
): artist is ArtistMetadata & { groupType: MarketArtist['groupType'] } {
  return (
    artist.groupType === 'boy_group' ||
    artist.groupType === 'girl_group' ||
    artist.groupType === 'mixed'
  );
}

export const MARKET_ARTISTS: readonly MarketArtist[] = artistMetadata
  .filter(isGroup)
  .map((artist) => ({
    id: artist.artistId,
    name: artist.displayName,
    koreanName: artist.koreanName,
    ticker: artist.ticker,
    groupType: artist.groupType,
    company: artist.company ?? null,
    searchText: [
      artist.artistId,
      artist.displayName,
      artist.koreanName,
      artist.ticker,
      ...artist.aliases,
    ]
      .join(' ')
      .toLowerCase()
      .replace(/\s+/g, ''),
  }));

const BY_ID = new Map(MARKET_ARTISTS.map((artist) => [artist.id, artist]));

export function findArtist(id: string): MarketArtist | null {
  return BY_ID.get(id) ?? null;
}

export function searchArtists(query: string): MarketArtist[] {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return [...MARKET_ARTISTS];
  return MARKET_ARTISTS.filter((artist) => artist.searchText.includes(normalized));
}

export const GROUP_TYPE_LABEL: Record<MarketArtist['groupType'], string> = {
  boy_group: '보이그룹',
  girl_group: '걸그룹',
  mixed: '혼성그룹',
};
