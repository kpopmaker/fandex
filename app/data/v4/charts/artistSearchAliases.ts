import type {
  ArtistIndexGroupType,
} from './artistIndexChartData';

type SearchableArtist = {
  artistId: string;
  artistName: string;
  ticker: string;
  groupType: ArtistIndexGroupType;
};

export const groupTypeLabels: Record<ArtistIndexGroupType, string> = {
  girl_group: '걸그룹',
  boy_group: '보이그룹',
  solo: '솔로',
  mixed: '혼성',
  unit: '유닛',
};

const artistSearchAliases: Partial<Record<string, string[]>> = {
  aespa: ['에스파', 'a espa'],
  ive: ['아이브'],
  riize: ['라이즈'],
  seventeen: ['세븐틴', 'svt'],
  newjeans: ['뉴진스', 'new jeans'],
  lesserafim: ['르세라핌', 'le sserafim', 'le-sserafim', 'lesserafim'],
  bts: ['방탄소년단', '비티에스', 'bangtan', 'bangtan boys'],
  blackpink: ['블랙핑크', 'black pink'],
  twice: ['트와이스'],
  'nct-dream': ['엔시티 드림', '엔시티드림', 'nct dream', 'nctdream'],
  'nct-127': ['엔시티 127', '엔시티127', 'nct 127', 'nct127'],
  'stray-kids': ['스트레이 키즈', '스트레이키즈', '스키즈', 'stray kids'],
  zerobaseone: ['제로베이스원', '제베원', 'zero base one', 'zb1'],
  txt: ['투모로우바이투게더', '투바투', 'tomorrow x together'],
  enhypen: ['엔하이픈'],
  itzy: ['있지'],
  nmixx: ['엔믹스'],
  gidle: ['아이들', '여자아이들', 'g idle', 'g-idle', '(g)i-dle'],
  'kiss-of-life': ['키스오브라이프', '키오프', 'kiss of life'],
  babymonster: ['베이비몬스터', 'baby monster'],
  illit: ['아일릿'],
  tws: ['투어스'],
  boynextdoor: ['보이넥스트도어', '보넥도', 'boy next door'],
  hearts2hearts: ['하츠투하츠', 'h2h', 'hearts to hearts'],
  rescene: ['리센느'],
};

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[\s_.-]/g, '');
}

export function normalizeArtistSearchText(value: string) {
  return normalizeSearchText(value);
}

export function getArtistSearchAliases(artistId: string) {
  return artistSearchAliases[artistId] ?? [];
}

export function getArtistAliases(artistId: string) {
  return getArtistSearchAliases(artistId);
}

export function getArtistSearchTokens(artist: SearchableArtist) {
  const baseTokens = [
    artist.artistId,
    artist.artistName,
    artist.ticker,
    artist.groupType,
    groupTypeLabels[artist.groupType],
    ...getArtistSearchAliases(artist.artistId),
  ];
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
