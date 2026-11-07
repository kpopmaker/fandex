// 활동 중인 그룹 명단(data/market/universe.json)을 만든다.
// 원본: app/data/v4/artistUniverse.ts (355팀) 중 entityType=group, lifecycleStatus=active.
// 실행: npx tsx scripts/market/build-universe.mts

import { writeFileSync, mkdirSync } from 'node:fs';
import { artistUniverseV4 } from '../../app/data/v4/artistUniverse';

type GroupType = 'boy_group' | 'girl_group' | 'mixed' | 'unknown';

// 성별 구분. 확실하지 않은 팀은 넣지 않는다(unknown → 랭킹 '전체'에만 표시).
const GIRL = new Set([
  'aespa', 'ive', 'illit', 'lesserafim', 'newjeans', 'nmixx', 'babymonster', 'blackpink', 'twice',
  'gidle', 'itzy', 'kissoflife', 'meovv', 'izna', 'redvelvet', 'mamamoo', 'qwer', 'girlsgeneration',
  '2ne1', 'niziu', 'katseye', 'stayc', 'triples', 'dreamcatcher', 'billlie', 'apink', 'ohmygirl',
  'viviz', 'fromis9', 'hearts2hearts', 'kep1er', 'artms', 'unis', 'rescene', 'wjsn', 'kiiikiii',
  'seeya', 'davichi', 'gyeongseoyeji', 'ioi', 'girlset', 'babydontcry', 'purplekiss', 'lightsum',
  'kara', 'csr', 'youngposse', 'secret', 'candyshop', 'badvillain', 'h1key', 'saymyname',
  'fiftyfifty', 'ichillin', 'madein', 'classy', 'vvup',
]);
const MIXED = new Set(['kard', 'alldayproject', 'balmingtiger']);
const BOY = new Set([
  'riize', 'tws', 'boynextdoor', 'straykids', 'seventeen', 'bts', 'enhypen', 'txt', 'ateez',
  'zerobaseone', 'nctdream', 'nct127', 'nctwish', 'treasure', 'theboyz', 'monstax', 'exo', 'day6',
  'shinee', 'superjunior', 'tvxq', 'wayv', 'bigbang', 'winner', 'xdinaryheroes', 'andteam',
  'p1harmony', 'xikers', 'cravity', 'oneus', 'btob', 'nexz', 'onf', 'kickflip', 'nowadays',
  'allhours', 'thenewsix', 'epex', 'tempest', '8turn', 'younite', 'cortis', 'buzz', 'jannabi',
  'nflying', 'epikhigh', 'melomance', 'nerdconnection', 'standingegg', 'thenuts', 'idid', 'ikon',
  '82major', 'highlight', 'ahof', 'ampersandone', 'plave', 'touched', 'lucy', 'nssign', 'hori7on',
  '2pm', 'boystory', 'ftisland', 'cnblue', 'sf9', 'hifiunicorn', 'axmxp', 'goldenchild', 'drippin',
  'onewe', 'alphadriveone', 'lun8', 'astro', 'pentagon', 'peppertones', 'dragonpony', 'oddyouth',
  'mcnd', 'teentop', 'b1a4', 'xlov', 'dkb', 'tunexx', 'newbeat', 'asc2nt', 'evnne', 'vixx',
  'verivery', 'idntt', 'onepact', 'waker', 'dxmon', 'fantasyboys', 'pow', 'whib', 'aimers',
  'trendz', 'tiot', 'blitzers', 'justb', 'ghost9', 'wei', 'ntx', 'ninei', 'omegax', 'ab6ix',
  'silicagel', 'idiotape',
]);

// 355팀 원본 명단에 없는 그룹(2026-11-07 사용자 요청으로 추가). newsQueries가 있으면 수집기가 그 검색어를 쓴다.
const EXTRA_GROUPS = [
  { id: 'a2olite', koreanName: 'A2O LITE', englishName: 'A2O LITE', ticker: 'A2OL', groupType: 'girl_group', agency: 'A2O Entertainment', debutDate: '2026-10-13', matchNames: ['A2O LITE', 'A2O 라이트', '에이투오 라이트'], newsQueries: ['A2O LITE'] },
  { id: 'a2osoul', koreanName: 'A2O SOUL', englishName: 'A2O SOUL', ticker: 'A2OS', groupType: 'boy_group', agency: 'A2O Entertainment', debutDate: '2026-10-13', matchNames: ['A2O SOUL', 'A2O 소울', '에이투오 소울'], newsQueries: ['A2O SOUL'] },
  { id: 'lngshot', koreanName: '롱샷', englishName: 'LNGSHOT', ticker: 'LNGSHOT', groupType: 'boy_group', agency: 'MORE VISION', debutDate: '2026-01-13', matchNames: ['롱샷', 'LNGSHOT'], newsQueries: ['롱샷 LNGSHOT', 'LNGSHOT'] },
  { id: 'closeyoureyes', koreanName: '클로즈 유어 아이즈', englishName: 'CLOSE YOUR EYES', ticker: 'CYE', groupType: 'boy_group', agency: 'UNCORE', debutDate: null, matchNames: ['클로즈 유어 아이즈', '클로즈유어아이즈', 'CLOSE YOUR EYES', '클유아'], newsQueries: ['클로즈 유어 아이즈'] },
  { id: 'atheart', koreanName: '앳하트', englishName: 'AtHeart', ticker: 'ATHRT', groupType: 'girl_group', agency: 'Titan Content', debutDate: null, matchNames: ['앳하트', 'AtHeart', 'ATHEART'], newsQueries: ['앳하트'] },
  { id: 'ifeye', koreanName: '이프아이', englishName: 'ifeye', ticker: 'IFEYE', groupType: 'girl_group', agency: null, debutDate: null, matchNames: ['이프아이', 'ifeye', 'IFEYE'], newsQueries: ['이프아이'] },
  { id: 'everglow', koreanName: '에버글로우', englishName: 'EVERGLOW', ticker: 'EVGLW', groupType: 'girl_group', agency: 'CHXXTA COMPANY', debutDate: '2019-03-18', matchNames: ['에버글로우', 'EVERGLOW'], newsQueries: ['에버글로우'] },
  { id: 'got7', koreanName: '갓세븐', englishName: 'GOT7', ticker: 'GOT7', groupType: 'boy_group', agency: null, debutDate: '2014-01-16', matchNames: ['갓세븐', 'GOT7'], newsQueries: ['갓세븐'] },
  { id: 'infinite', koreanName: '인피니트', englishName: 'INFINITE', ticker: 'INFNT', groupType: 'boy_group', agency: 'INFINITE COMPANY', debutDate: '2010-06-09', matchNames: ['인피니트', 'INFINITE'], newsQueries: ['인피니트'] },
  // 2026-11-07 2차 점검으로 추가
  { id: 'hypeprincess', koreanName: '하입프린세스', englishName: 'H//PE Princess', ticker: 'HYPEP', groupType: 'girl_group', agency: null, debutDate: '2026-05-27', matchNames: ['하입프린세스', '하입 프린세스', 'H//PE Princess', 'HYPE PRINCESS'], newsQueries: ['하입프린세스'] },
  { id: '1verse', koreanName: '원버스', englishName: '1VERSE', ticker: '1VERSE', groupType: 'boy_group', agency: 'Singing Beetle', debutDate: null, matchNames: ['원버스', '1VERSE'], newsQueries: ['원버스 1VERSE', '1VERSE'] },
] as const;

// 원본에 데뷔일이 없는 그룹의 데뷔 연도(세대 구분용). 확실하지 않은 팀은 넣지 않는다.
const DEBUT_YEAR: Record<string, number> = {
  kiiikiii: 2025, alldayproject: 2025, cortis: 2025, buzz: 2003, seeya: 2006, davichi: 2008,
  jannabi: 2014, nflying: 2015, epikhigh: 2003, melomance: 2015, nerdconnection: 2017,
  standingegg: 2010, ioi: 2016, thenuts: 2002, idid: 2025, aen: 2026, ikon: 2015, '82major': 2023,
  highlight: 2009, ahof: 2025, ampersandone: 2023, plave: 2023, touched: 2023, lucy: 2020,
  nssign: 2023, '2pm': 2008, girlset: 2024, ftisland: 2007, cnblue: 2010, sf9: 2016, onewe: 2019,
  purplekiss: 2021, alphadriveone: 2026, peppertones: 2004, teentop: 2010, kara: 2007, b1a4: 2011,
  kard: 2017, xlov: 2025, secret: 2009, idntt: 2025, classy: 2022, balmingtiger: 2018,
  silicagel: 2015, idiotape: 2010, closeyoureyes: 2025, atheart: 2025, ifeye: 2025, '1verse': 2025,
};

function generationOf(year: number | null): number | null {
  if (!year) return null;
  if (year <= 2002) return 1;
  if (year <= 2011) return 2;
  if (year <= 2017) return 3;
  if (year <= 2022) return 4;
  return 5;
}

function groupType(id: string): GroupType {
  if (GIRL.has(id)) return 'girl_group';
  if (BOY.has(id)) return 'boy_group';
  if (MIXED.has(id)) return 'mixed';
  return 'unknown';
}

const groups = artistUniverseV4.filter(
  (artist) => artist.entityType === 'group' && artist.lifecycleStatus === 'active',
);

const universe = groups.map((artist) => {
  const koreanName = artist.profile.koreanAliases[0] ?? artist.nameKo;
  const englishName = artist.profile.englishAliases[0] ?? artist.nameEn;
  const matchNames = Array.from(
    new Set(
      [koreanName, englishName, ...artist.profile.koreanAliases, ...artist.profile.englishAliases]
        .map((name) => name.trim())
        .filter((name) => name.length >= 2)
        // '아이들'은 일반 명사(children)라 매칭에 쓰지 않는다
        .filter((name) => !(artist.id === 'gidle' && name === '아이들')),
    ),
  );
  return {
    id: artist.id,
    koreanName,
    englishName,
    ticker: artist.ticker,
    groupType: groupType(artist.id),
    agency: artist.agency || null,
    debutDate: artist.debutDate ?? null,
    naverQuery: artist.profile.naverNewsQuery ?? `${koreanName} ${englishName}`,
    matchNames,
    excludeKeywords: artist.profile.excludeKeywords,
    lastfmName: englishName,
    newsQueries: [] as string[],
    debutYear: null as number | null,
    generation: null as number | null,
  };
});

for (const extra of EXTRA_GROUPS) {
  if (universe.some((group) => group.id === extra.id)) continue;
  universe.push({
    id: extra.id,
    koreanName: extra.koreanName,
    englishName: extra.englishName,
    ticker: extra.ticker,
    groupType: extra.groupType,
    agency: extra.agency,
    debutDate: extra.debutDate,
    naverQuery: extra.newsQueries[0],
    matchNames: [...extra.matchNames],
    excludeKeywords: [],
    lastfmName: extra.englishName,
    newsQueries: [...extra.newsQueries],
    debutYear: null,
    generation: null,
  });
}

for (const group of universe) {
  const year = group.debutDate ? Number(group.debutDate.slice(0, 4)) : (DEBUT_YEAR[group.id] ?? null);
  group.debutYear = year;
  group.generation = generationOf(year);
}

mkdirSync('data/market', { recursive: true });
writeFileSync(
  'data/market/universe.json',
  `${JSON.stringify({ version: 'market-universe-v1', source: 'app/data/v4/artistUniverse.ts', count: universe.length, groups: universe }, null, 1)}\n`,
);

const unknown = universe.filter((group) => group.groupType === 'unknown').map((group) => group.id);
const noGeneration = universe.filter((group) => group.generation === null).map((group) => group.id);
console.log(`groups: ${universe.length}, gender unknown: ${unknown.length} (${unknown.join(', ')})`);
console.log(`generation unknown: ${noGeneration.length} (${noGeneration.join(', ')})`);
