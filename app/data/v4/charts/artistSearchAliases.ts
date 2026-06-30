import type {
  ArtistIndexChartProfile,
  ArtistIndexGroupType,
} from './artistIndexChartData';

export const groupTypeLabels: Record<ArtistIndexGroupType, string> = {
  girl_group: '걸그룹',
  boy_group: '보이그룹',
  solo: '솔로',
  mixed: '혼성',
  unit: '유닛',
};

export const artistKoreanAliases: Partial<Record<string, string[]>> = {
  aespa: ['에스파'],
  ive: ['아이브'],
  riize: ['라이즈'],
  seventeen: ['세븐틴'],
  newjeans: ['뉴진스'],
  lesserafim: ['르세라핌'],
  bts: ['방탄소년단', '비티에스'],
  blackpink: ['블랙핑크'],
  twice: ['트와이스'],
  'nct-dream': ['엔시티 드림', '엔시티드림', 'NCT 드림'],
  'nct-127': ['엔시티 127', '엔시티127', 'NCT 127'],
  'stray-kids': ['스트레이 키즈', '스트레이키즈', '스키즈'],
  zerobaseone: ['제로베이스원', '제베원'],
  txt: ['투모로우바이투게더', '투바투'],
  enhypen: ['엔하이픈'],
  itzy: ['있지'],
  nmixx: ['엔믹스'],
  gidle: ['아이들', '여자아이들'],
  'kiss-of-life': ['키스오브라이프', '키오프'],
  babymonster: ['베이비몬스터'],
  illit: ['아일릿'],
  tws: ['투어스'],
  boynextdoor: ['보이넥스트도어'],
  hearts2hearts: ['하츠투하츠'],
  rescene: ['리센느'],
};

export function normalizeArtistSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]/g, '');
}

export function getArtistAliases(artistId: string) {
  return artistKoreanAliases[artistId] ?? [];
}

export function getArtistSearchTargets(profile: ArtistIndexChartProfile) {
  return [
    profile.artistName,
    profile.ticker,
    profile.artistId,
    groupTypeLabels[profile.groupType],
    ...getArtistAliases(profile.artistId),
  ];
}

export function artistMatchesSearch(
  profile: ArtistIndexChartProfile,
  query: string,
) {
  const normalizedQuery = normalizeArtistSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return getArtistSearchTargets(profile)
    .map(normalizeArtistSearchText)
    .some((value) => value.includes(normalizedQuery));
}
