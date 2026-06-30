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
  triples: ['트리플에스', '트리플S', 'triple s'],
  nexz: ['넥스지'],
  meovv: ['미야오'],
  izna: ['이즈나'],
  cortis: ['코르티스'],
  ateez: ['에이티즈'],
  'the-boyz': ['더보이즈', 'the boyz'],
  'monsta-x': ['몬스타엑스', 'monsta x'],
  exo: ['엑소'],
  shinee: ['샤이니'],
  'red-velvet': ['레드벨벳', 'red velvet'],
  'nct-wish': ['엔시티 위시', '엔시티위시', 'nct wish'],
  wayv: ['웨이션브이', '웨이션V', 'way v'],
  treasure: ['트레저'],
  mamamoo: ['마마무'],
  'oh-my-girl': ['오마이걸', 'oh my girl'],
  stayc: ['스테이씨'],
  'fromis-9': ['프로미스나인', '프로미스 9', 'fromis 9'],
  kep1er: ['케플러'],
  viviz: ['비비지'],
  billlie: ['빌리'],
  'h1-key': ['하이키', 'h1 key'],
  qwer: ['큐더블유이알'],
  artms: ['아르테미스'],
  'purple-kiss': ['퍼플키스', 'purple kiss'],
  everglow: ['에버글로우'],
  weeekly: ['위클리'],
  wjsn: ['우주소녀'],
  'girls-generation': ['소녀시대', '걸스제너레이션', 'girls generation', 'snsd'],
  highlight: ['하이라이트'],
  cravity: ['크래비티'],
  xikers: ['싸이커스'],
  p1harmony: ['피원하모니', 'p1 harmony'],
  tempest: ['템페스트'],
  evnne: ['이븐'],
  oneus: ['원어스'],
  cix: ['씨아이엑스'],
  ab6ix: ['에이비식스'],
  sf9: ['에스에프나인'],
  epex: ['이펙스'],
  katseye: ['캣츠아이'],
  vcha: ['비춰'],
  andteam: ['앤팀', '앤TEAM', 'and team'],
  xg: ['엑스지'],
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
