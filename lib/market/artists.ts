import universeFile from '../../data/market/universe.json';

export type GroupType = 'boy_group' | 'girl_group' | 'mixed' | 'unknown';

export type MarketArtist = {
  id: string;
  name: string;
  koreanName: string;
  ticker: string;
  groupType: GroupType;
  agency: string | null;
  searchText: string;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}

export const MARKET_ARTISTS: readonly MarketArtist[] = universeFile.groups.map((group) => ({
  id: group.id,
  name: group.englishName,
  koreanName: group.koreanName,
  ticker: group.ticker,
  groupType: group.groupType as GroupType,
  agency: group.agency,
  searchText: normalize([group.id, group.ticker, ...group.matchNames].join(' ')),
}));

const BY_ID = new Map(MARKET_ARTISTS.map((artist) => [artist.id, artist]));

export function findArtist(id: string): MarketArtist | null {
  return BY_ID.get(id) ?? null;
}

export function matchesQuery(artist: { searchText: string }, query: string): boolean {
  const needle = normalize(query);
  return !needle || artist.searchText.includes(needle);
}

export const GROUP_TYPE_LABEL: Record<GroupType, string> = {
  boy_group: '보이그룹',
  girl_group: '걸그룹',
  mixed: '혼성그룹',
  unknown: '그룹',
};
