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
] as const;

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
  });
}

mkdirSync('data/market', { recursive: true });
writeFileSync(
  'data/market/universe.json',
  `${JSON.stringify({ version: 'market-universe-v1', source: 'app/data/v4/artistUniverse.ts', count: universe.length, groups: universe }, null, 1)}\n`,
);

const unknown = universe.filter((group) => group.groupType === 'unknown').map((group) => group.id);
console.log(`groups: ${universe.length}, gender unknown: ${unknown.length} (${unknown.join(', ')})`);
